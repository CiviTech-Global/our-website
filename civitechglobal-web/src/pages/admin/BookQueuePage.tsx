import { StaffImage } from '@/components/ui/StaffImage';
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useBookQueue, useReviewBook } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl, Toolbar } from '@/components/app/SegmentedControl';
import { CompanyBadge } from '@/components/marketplace/CompanyBadge';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import type { BookQueueRow, ModerationStatus } from '@/types/marketplace';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];

/**
 * The book queue.
 *
 * Unlike the job and project queues there is nothing to expand: a book listing
 * is short enough to judge in full from the row, and the photograph — which is
 * most of the judgement — has to be visible anyway. So everything a reviewer
 * needs is on the card, and the decision sits under it.
 */
export default function BookQueuePage() {
  const { t } = useLocale();
  useDocumentTitle(t.books.queueTitle);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ModerationStatus>('PENDING_REVIEW');

  const { data, isLoading } = useBookQueue({ page, pageSize: PAGE_SIZE, status });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.books.queueTitle} description={t.books.queueDescription} className="mb-2" />
      <Toolbar>
        <SegmentedControl<ModerationStatus>
          label={t.app.filterByStatus}
          value={status}
          segments={STATUSES.map((value) => ({ value, label: t.market[value] }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </Toolbar>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState title={t.books.queueEmpty} icon={<BookOpen aria-hidden="true" />} />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <QueueCard row={row} />
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

function QueueCard({ row }: { row: BookQueueRow }) {
  const { t, locale } = useLocale();
  const review = useReviewBook();

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const price = formatMoney(row.price, locale);
  const where = [row.city, row.province].filter(Boolean).join('، ');

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        {/* The picture is most of the decision: is this the book, is it the
            condition claimed, is it somebody's living room by mistake. */}
        <div className="h-40 w-32 shrink-0 overflow-hidden rounded border border-app-border-light bg-app-subtle">
          <StaffImage
            path={row.coverUrl ? `/market/admin/books/${row.id}/cover` : null}
            alt=""
            className="size-full object-contain"
            fallback={
              <div className="flex size-full items-center justify-center text-app-text-4">
                <BookOpen className="size-6" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-title-sm font-semibold text-app-text">{row.title}</p>
            <Badge variant={moderationVariant(row.moderationStatus)}>{t.market[row.moderationStatus]}</Badge>
            {row.postedByCompany && <CompanyBadge short />}
          </div>

          <p className="mt-0.5 text-body text-app-text-3">
            {t.books.by.replace('{author}', row.bookAuthor)}
          </p>

          <p className="mt-1 text-label text-app-text-4">
            <span className="ltr font-mono">{row.code}</span>
            {row.submittedAt && ` · ${formatDate(row.submittedAt, locale)}`}
          </p>
          <p className="mt-0.5 text-label text-app-text-4">
            {row.postedByCompany ? t.books.queueCompanyListing : t.books.queueSeller}
            {!row.postedByCompany && (
              <>
                : {row.seller.firstName} {row.seller.lastName}{' '}
                <span className="ltr">({row.seller.email})</span>
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant={row.condition === 'NEW' ? 'success' : 'default'}>
              {t.books.conditions[row.condition]}
            </Badge>
            {price && <Badge variant="success">{`${price} ${t.market.currency}`}</Badge>}
            {row.publisher && <Badge>{row.publisher}</Badge>}
            {row.publishYear && <Badge>{number(row.publishYear)}</Badge>}
            {row.isbn && (
              <Badge>
                <span className="ltr">{row.isbn}</span>
              </Badge>
            )}
            {where && <Badge>{where}</Badge>}
          </div>

          <p className="mt-3 whitespace-pre-line text-body leading-6 text-app-text">{row.description}</p>
        </div>
      </div>

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id: row.id, ...input })}
      />
    </Card>
  );
}
