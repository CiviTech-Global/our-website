import { Star } from 'lucide-react';
import { serviceImagePath, useFeatureService, useReviewService, useServiceQueue } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { fill, formatNumber } from '@/lib/jobFormat';
import { moderationVariant } from '@/lib/marketplace';
import { money } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import type { ModerationStatus } from '@/types/marketplace';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];

/**
 * The services queue: each submitted service with its gallery, packages and
 * extras, so a reviewer can judge the whole offer — and, once live, put it
 * among the featured.
 */
export default function ServiceQueuePage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  useDocumentTitle(t.work.serviceQueueTitle);
  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: 'PENDING_REVIEW' } });
  const { data, isLoading } = useServiceQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });
  const review = useReviewService();
  const feature = useFeatureService();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.work.serviceQueueTitle} className="mb-2" />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.market.searchQueueProjects}
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
      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.emptyQueue} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{row.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">{row.code}</span>
                    {row.submittedAt && ` · ${formatDate(row.submittedAt, locale)}`}
                  </p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {t.market.submittedBy}: {row.owner.firstName} {row.owner.lastName} <span className="ltr">({row.owner.email})</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.featured && <Badge variant="warning">{t.work.featured}</Badge>}
                  <Badge variant={moderationVariant(row.moderationStatus)}>{t.market[row.moderationStatus]}</Badge>
                </div>
              </div>

              {row.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {row.images.map((image) => (
                    <div key={image.id} className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                      <StaffImage path={serviceImagePath(image.id, 'staff')} alt={image.originalName} className="size-full object-cover" fallback={null} />
                    </div>
                  ))}
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-app-text-3">{t.work.aboutService}</summary>
                <p className="mt-2 whitespace-pre-line text-app-text-3">{row.description}</p>
              </details>

              <div className="grid gap-2 sm:grid-cols-3">
                {row.packages.map((pkg) => (
                  <div key={pkg.tier} className="rounded-lg border border-app-border-light p-2 text-sm">
                    <p className="font-medium text-app-text">
                      {t.work.tiers[pkg.tier]}: {pkg.name}
                    </p>
                    <p className="text-app-text-3">
                      {money(pkg.price, pkg.currency ?? 'IRT', locale, t)} · {fill(t.work.daysCount, { count: formatNumber(pkg.deliveryDays, locale) })}
                    </p>
                    <p className="text-label text-app-text-4">{pkg.description}</p>
                  </div>
                ))}
              </div>
              {row.extras.length > 0 && (
                <p className="text-label text-app-text-4">
                  {t.work.extras}: {row.extras.map((extra) => `${extra.title} (${money(extra.price, row.packages[0]?.currency ?? 'IRT', locale, t)})`).join('، ')}
                </p>
              )}

              {row.moderationStatus === 'APPROVED' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  isLoading={feature.isPending}
                  onClick={() =>
                    feature.mutate(
                      { id: row.id, featured: !row.featured },
                      { onError: (error) => showToast(apiMessage(error, t.common.error), 'error') },
                    )
                  }
                >
                  <Star className="size-4" aria-hidden="true" />
                  {row.featured ? t.work.unfeature : t.work.feature}
                </Button>
              ) : (
                <ReviewActions isPending={review.isPending} onReview={(input) => review.mutateAsync({ id: row.id, ...input })} />
              )}
            </Card>
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && <Pagination page={controls.page} totalPages={data.totalPages} onPageChange={controls.setPage} />}
    </div>
  );
}
