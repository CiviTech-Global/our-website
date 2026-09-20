import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { useState } from 'react';
import { useJobForReview, useJobQueue, useReviewJob } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { formatRange, moderationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { ListingOpsPanel } from '@/components/admin/ListingOpsPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
 * The job posting queue.
 *
 * Approving here is what publishes the advert, so the full text has to be
 * readable before the decision — the row alone says nothing about whether the
 * posting is one we want on the board.
 */
export default function JobQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueJobs);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'PENDING_REVIEW' },
  });
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useJobQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.market.queueJobs} description={t.app.queueDescriptions.jobPosts} className="mb-2" />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.market.searchQueueJobs}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<ModerationStatus>
            label={t.app.filterByStatus}
            value={controls.filters.status as ModerationStatus}
            segments={STATUSES.map((value) => ({ value, label: t.market[value] }))}
            onChange={(value) => {
              controls.setFilter('status', value);
              // An expanded row belongs to the list that was on screen; keeping
              // it open across a filter change leaves a detail panel for a job
              // the new list may not contain.
              setOpenId(null);
            }}
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
                  <p className="font-medium text-app-text">{row.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {row.companyName && `${row.companyName} · `}
                    <span className="ltr font-mono">{row.code}</span>
                    {row.submittedAt && ` · ${formatDate(row.submittedAt, locale)}`}
                  </p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {t.market.submittedBy}: {row.author.firstName} {row.author.lastName}{' '}
                    <span className="ltr">({row.author.email})</span>
                  </p>
                </div>
                <Badge variant={moderationVariant(row.moderationStatus)}>
                  {t.market[row.moderationStatus]}
                </Badge>
              </div>

              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                >
                  {openId === row.id ? t.common.close : t.market.review}
                </Button>
              </div>

              {openId === row.id && <JobReviewPanel id={row.id} />}
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
    </div>
  );
}

function JobReviewPanel({ id }: { id: string }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useJobForReview(id);
  const review = useReviewJob();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const pay = data.salaryUndisclosed
    ? t.market.salaryUndisclosed
    : formatRange(data.salaryMin, data.salaryMax, locale, t);
  const where = [data.city, data.province].filter(Boolean).join('، ');

  return (
    <div className="mt-4 border-t border-app-border-light pt-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="info">{t.market[data.employmentType]}</Badge>
        <Badge>{t.market[data.workArrangement]}</Badge>
        {pay && <Badge variant="success">{pay}</Badge>}
        {where && <Badge>{where}</Badge>}
      </div>

      <p className="mt-4 whitespace-pre-line text-body leading-6 text-app-text">
        {data.description}
      </p>

      {data.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.skills.map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ListingOpsPanel kind="job" id={id} featured={data.featured} />
      </div>

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id, ...input })}
      />
    </div>
  );
}
