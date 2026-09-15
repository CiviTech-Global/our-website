import { useState } from 'react';
import { useJobForReview, useJobQueue, useReviewJob } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { formatRange, moderationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { ListingOpsPanel } from '@/components/admin/ListingOpsPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
 * The job posting queue.
 *
 * Approving here is what publishes the advert, so the full text has to be
 * readable before the decision — the row alone says nothing about whether the
 * posting is one we want on the board.
 */
export default function JobQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueJobs);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ModerationStatus>('PENDING_REVIEW');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useJobQueue({ page, pageSize: PAGE_SIZE, status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">{t.market.queueJobs}</h1>
        <Select
          className="w-auto"
          value={status}
          aria-label={t.admin.status}
          onChange={(e) => {
            setStatus(e.target.value as ModerationStatus);
            setPage(1);
            setOpenId(null);
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
                  <p className="font-medium text-text-primary">{row.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {row.companyName && `${row.companyName} · `}
                    <span className="ltr font-mono">{row.code}</span>
                    {row.submittedAt && ` · ${formatDate(row.submittedAt, locale)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
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
    <div className="mt-4 border-t border-border-default pt-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="info">{t.market[data.employmentType]}</Badge>
        <Badge>{t.market[data.workArrangement]}</Badge>
        {pay && <Badge variant="success">{pay}</Badge>}
        {where && <Badge>{where}</Badge>}
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-text-primary">
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
