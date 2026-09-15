import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useBidQueue, useReviewBid } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, formatRange } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 20;

/**
 * The offer queue — the one review that is about a number rather than about
 * conduct.
 *
 * Each row puts the price next to the scope and the client's budget, because
 * "is this fair" has no meaning without them. A reviewer who thinks it is low
 * can suggest a better figure; the suggestion travels to the bidder as advice
 * and never changes the offer, which is why it sits beside the decision rather
 * than inside it.
 */
export default function BidQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueBids);

  const [page, setPage] = useState(1);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  const { data, isLoading } = useBidQueue({ page, pageSize: PAGE_SIZE });
  const review = useReviewBid();

  const days = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t.market.queueBids}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.market.fairnessHint}</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.emptyQueue} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => {
          const budget = row.project.budgetUnknown
            ? t.market.budgetUnknown
            : formatRange(row.project.budgetMin, row.project.budgetMax, locale, t);

          return (
            <li key={row.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {row.isCompanyOffer ? (
                      <p className="flex items-center gap-1.5 font-medium text-brand-green-600">
                        <Building2 className="size-4" aria-hidden="true" />
                        {t.market.companyOffer}
                      </p>
                    ) : (
                      <p className="font-medium text-text-primary">
                        {row.bidder?.firstName} {row.bidder?.lastName}{' '}
                        <span className="ltr text-xs text-text-muted">({row.bidder?.email})</span>
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDate(row.createdAt, locale)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-lg font-semibold text-text-primary">
                      {formatMoney(row.amount, locale)}{' '}
                      <span className="text-sm font-normal">{t.market.currency}</span>
                    </p>
                    {row.deliveryDays && (
                      <p className="text-xs text-text-muted">
                        {days(row.deliveryDays)} {t.market.deliveryDays}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border-default bg-surface-200 p-3">
                  <p className="text-xs font-medium text-text-secondary">{t.market.projectScope}</p>
                  <p className="mt-0.5 text-sm font-medium text-text-primary">
                    {row.project.title}{' '}
                    <span className="ltr font-mono text-xs text-text-muted">
                      {row.project.code}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-4 text-xs text-text-secondary">
                    {row.project.description}
                  </p>
                  {budget && (
                    <p className="mt-2 text-xs text-text-secondary">
                      {t.market.clientBudget}: <Badge variant="info">{budget}</Badge>
                    </p>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-line text-sm text-text-primary">{row.message}</p>

                <ReviewActions
                  isPending={review.isPending}
                  onReview={(input) =>
                    review.mutateAsync({
                      id: row.id,
                      ...input,
                      // Only travels when a reviewer actually typed one: an
                      // empty box is not an opinion that the price is zero.
                      suggestedAmount:
                        suggestions[row.id]?.replace(/[^0-9]/g, '') || undefined,
                    })
                  }
                >
                  <FormField
                    label={t.market.suggestedAmount}
                    htmlFor={`suggested-${row.id}`}
                    hint={t.market.suggestedAmountHint}
                  >
                    <Input
                      id={`suggested-${row.id}`}
                      inputMode="numeric"
                      className="ltr"
                      value={suggestions[row.id] ?? ''}
                      onChange={(e) =>
                        setSuggestions((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </FormField>
                </ReviewActions>
              </Card>
            </li>
          );
        })}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
