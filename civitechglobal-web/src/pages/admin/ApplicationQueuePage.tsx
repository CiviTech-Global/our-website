import { useState } from 'react';
import { useApplicationQueue, useReviewApplication } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { formatMoney, moderationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import type { ModerationStatus } from '@/types/marketplace';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = [
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

/**
 * The application queue.
 *
 * Each row carries the posting it answers, because the only question being
 * asked here is whether this is worth the employer's time — and that cannot be
 * judged without knowing what the role is. Approving is what delivers it.
 */
export default function ApplicationQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueApplications);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ModerationStatus>('PENDING_REVIEW');

  const { data, isLoading } = useApplicationQueue({ page, pageSize: PAGE_SIZE, status });
  const review = useReviewApplication();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">{t.market.queueApplications}</h1>
        <Select
          className="w-auto"
          value={status}
          aria-label={t.admin.status}
          onChange={(e) => {
            setStatus(e.target.value as ModerationStatus);
            setPage(1);
          }}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.emptyQueue} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {row.applicant.firstName} {row.applicant.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    <span className="ltr">{row.applicant.email}</span>
                    {' · '}
                    {formatDate(row.createdAt, locale)}
                  </p>
                </div>
                <Badge variant={moderationVariant(row.moderationStatus)}>
                  {t.market[row.moderationStatus]}
                </Badge>
              </div>

              <div className="mt-3 rounded-lg border border-border-default bg-surface-200 p-3">
                <p className="text-xs font-medium text-text-secondary">{t.market.queueJobs}</p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">
                  {row.job.title}
                  {row.job.companyName && ` — ${row.job.companyName}`}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-text-secondary">
                  {row.job.description}
                </p>
              </div>

              {row.expectedSalary && (
                <p className="mt-3 text-sm text-text-secondary">
                  {t.market.expectedSalary}: {formatMoney(row.expectedSalary, locale)}{' '}
                  {t.market.currency}
                </p>
              )}

              {row.coverLetter && (
                <p className="mt-2 whitespace-pre-line text-sm text-text-primary">
                  {row.coverLetter}
                </p>
              )}

              {row.cvOriginalName && (
                <p className="mt-2 text-xs text-text-muted">
                  {t.market.cv}: {row.cvOriginalName}
                </p>
              )}

              <ReviewActions
                isPending={review.isPending}
                onReview={(input) => review.mutateAsync({ id: row.id, ...input })}
              />
            </Card>
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={Math.ceil(data.total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
