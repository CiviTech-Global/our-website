import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { reviewFileUrls, useApplicationQueue, useReviewApplication } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { formatMoney, moderationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilePreview } from '@/components/ui/FilePreview';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
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

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'PENDING_REVIEW' },
  });
  const [previewing, setPreviewing] = useState<{ url: string; filename: string } | null>(null);

  const { data, isLoading } = useApplicationQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });
  const review = useReviewApplication();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.market.queueApplications} description={t.app.queueDescriptions.applications} className="mb-2" />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.market.searchQueueApplications}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<ModerationStatus>
            label={t.app.filterByStatus}
            value={controls.filters.status as ModerationStatus}
            segments={STATUSES.map((value) => ({ value, label: t.market[value] }))}
            onChange={(value) => controls.setFilter('status', value)}
          />
        }
      />


      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.market.emptyQueue}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">
                    {row.applicant.firstName} {row.applicant.lastName}
                  </p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr">{row.applicant.email}</span>
                    {' · '}
                    {formatDate(row.createdAt, locale)}
                  </p>
                </div>
                <Badge variant={moderationVariant(row.moderationStatus)}>
                  {t.market[row.moderationStatus]}
                </Badge>
              </div>

              <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                <p className="text-label font-medium text-app-text-3">{t.market.queueJobs}</p>
                <p className="mt-0.5 text-body font-medium text-app-text">
                  {row.job.title}
                  {row.job.companyName && ` — ${row.job.companyName}`}
                </p>
                <p className="mt-1 line-clamp-3 text-label text-app-text-3">
                  {row.job.description}
                </p>
              </div>

              {row.expectedSalary && (
                <p className="mt-3 text-body text-app-text-3">
                  {t.market.expectedSalary}: {formatMoney(row.expectedSalary, locale)}{' '}
                  {t.market.currency}
                </p>
              )}

              {row.coverLetter && (
                <p className="mt-2 whitespace-pre-line text-body text-app-text">
                  {row.coverLetter}
                </p>
              )}

              {row.cvOriginalName && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreviewing({
                        url: reviewFileUrls.applicationCv(row.id),
                        filename: row.cvOriginalName!,
                      })
                    }
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    {t.market.cv}: {row.cvOriginalName}
                  </Button>
                </div>
              )}

              <ReviewActions
                isPending={review.isPending}
                onReview={(input) => review.mutateAsync({ id: row.id, ...input })}
              />
            </Card>
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <Pagination
          page={controls.page}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
        />
      )}

      {previewing && (
        <FilePreview
          url={previewing.url}
          filename={previewing.filename}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
