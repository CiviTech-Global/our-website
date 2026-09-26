import { MapPin, Store } from 'lucide-react';
import { useReviewShop, useShopQueue } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { moderationVariant } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import type { ModerationStatus, ShopQueueRow } from '@/types/trademaster';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = [
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

/**
 * The shop queue.
 *
 * Nothing to expand, like the book queue: a shop is a name, a trade, a place
 * and a logo, and all four fit on the card. The logo is a real part of the
 * judgement — whether this is a business or somebody's holiday photograph —
 * so it has to be visible before any decision is taken, which is why it is
 * fetched through the staff endpoint rather than the public one.
 *
 * Refusing or returning a shop also sends its approved products back to the
 * product queue. The note under the decision says so, because a reviewer who
 * does not know that will not understand why the other queue grew.
 */
export default function ShopQueuePage() {
  const { t } = useLocale();
  useDocumentTitle(t.trademaster.queueShops);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'PENDING_REVIEW' },
  });

  const { data, isLoading } = useShopQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status as ModerationStatus,
    search: controls.search || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.trademaster.queueShops}
        description={t.trademaster.rejectCascadeNote}
        className="mb-2"
      />

      <ListToolbar
        controls={controls}
        searchPlaceholder={t.trademaster.searchQueueShops}
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
          title={controls.activeCount > 0 ? t.list.noResults : t.trademaster.emptyQueue}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
          icon={<Store aria-hidden="true" />}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <ShopCard row={row} />
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

function ShopCard({ row }: { row: ShopQueueRow }) {
  const { t, locale } = useLocale();
  const review = useReviewShop();

  const where = [row.city, row.province].filter(Boolean).join('، ');
  const owner = [row.owner.firstName, row.owner.lastName].filter(Boolean).join(' ');

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded border border-app-border-light bg-app-subtle">
          <StaffImage
            // The staff endpoint, not the public one: an unapproved shop's
            // logo is not served publicly, which is the whole point of
            // reviewing it before it appears.
            path={row.logoUrl ? `/trademaster/admin/shops/${row.id}/logo` : null}
            alt=""
            className="size-full object-contain"
            fallback={
              <div className="flex size-full items-center justify-center text-app-text-4">
                <Store className="size-6" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-title-sm font-semibold text-app-text">{row.name}</p>
            <Badge variant={moderationVariant(row.moderationStatus)}>
              {t.market[row.moderationStatus]}
            </Badge>
          </div>

          <p className="mt-1 text-label text-app-text-4">
            <span className="ltr font-mono">{row.code}</span>
            {` · ${formatDate(row.createdAt, locale)}`}
          </p>

          <p className="mt-0.5 text-label text-app-text-4">
            {t.trademaster.ownerLabel}: {owner || '—'}{' '}
            <span className="ltr">({row.owner.email})</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {row.industry && <Badge>{row.industry}</Badge>}
            {where && (
              <Badge>
                <MapPin className="me-1 inline size-3" aria-hidden="true" />
                {where}
              </Badge>
            )}
          </div>

          <p className="mt-3 whitespace-pre-line text-body leading-6 text-app-text">
            {row.summary}
          </p>
        </div>
      </div>

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id: row.id, payload: input })}
      />
    </Card>
  );
}
