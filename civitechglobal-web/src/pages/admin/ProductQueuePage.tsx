import { ImageOff, Package, Store } from 'lucide-react';
import { useProductQueue, useProductReview, useReviewProduct } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant } from '@/lib/marketplace';
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
import type { ModerationStatus, ProductQueueRow } from '@/types/trademaster';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = [
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

/**
 * The product queue.
 *
 * A product needs more than the summary row to judge — the full description,
 * every picture, and the options with their own prices — so unlike the shop
 * queue each card fetches its detail when it is opened. That is one request
 * per product a reviewer actually looks at, rather than serialising twelve
 * pictures and forty options for every row in the page.
 */
export default function ProductQueuePage() {
  const { t } = useLocale();
  useDocumentTitle(t.trademaster.queueProducts);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'PENDING_REVIEW' },
  });

  const { data, isLoading } = useProductQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status as ModerationStatus,
    search: controls.search || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.trademaster.queueProducts} className="mb-2" />

      <ListToolbar
        controls={controls}
        searchPlaceholder={t.trademaster.searchQueueProducts}
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
          icon={<Package aria-hidden="true" />}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <ProductCard row={row} />
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

function ProductCard({ row }: { row: ProductQueueRow }) {
  const { t, locale } = useLocale();
  const review = useReviewProduct();

  // Fetched for every card in the page. The detail carries the description,
  // the pictures and the options, all of which a reviewer needs before
  // deciding, and there are twenty rows at most.
  const { data: detail } = useProductReview(row.id);

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const price = formatMoney(row.price, locale);
  const shopApproved = detail ? detail.business.moderationStatus === 'APPROVED' : true;

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-28 shrink-0 overflow-hidden rounded border border-app-border-light bg-app-subtle">
          <StaffImage
            path={row.coverImageId ? `/trademaster/admin/products/images/${row.coverImageId}` : null}
            alt=""
            className="size-full object-contain"
            fallback={
              <div className="flex size-full items-center justify-center text-app-text-4">
                <ImageOff className="size-6" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-title-sm font-semibold text-app-text">{row.title}</p>
            <Badge variant={moderationVariant(row.moderationStatus)}>
              {t.market[row.moderationStatus]}
            </Badge>
          </div>

          <p className="mt-1 text-label text-app-text-4">
            <span className="ltr font-mono">{row.code}</span>
            {` · ${formatDate(row.createdAt, locale)}`}
          </p>

          <p className="mt-0.5 inline-flex items-center gap-1 text-label text-app-text-4">
            <Store className="size-3" aria-hidden="true" />
            {t.trademaster.shopLabel}: {row.business.name}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {price && <Badge variant="success">{`${price} ${t.market.currency}`}</Badge>}
            {detail && (
              <>
                <Badge>{`${t.trademaster.stock}: ${number(detail.stock)}`}</Badge>
                {detail.category && <Badge>{detail.category.name}</Badge>}
                {detail.negotiable && <Badge variant="info">{t.trademaster.negotiable}</Badge>}
              </>
            )}
          </div>

          <p className="mt-3 whitespace-pre-line text-body leading-6 text-app-text">
            {row.summary}
          </p>

          {detail?.description && (
            <p className="mt-2 whitespace-pre-line text-body leading-6 text-app-text-3">
              {detail.description}
            </p>
          )}

          {/* Every picture, not just the cover: one bad photograph among
              twelve is exactly what the queue exists to catch. */}
          {detail && detail.images.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {detail.images.slice(1).map((image) => (
                <li
                  key={image.id}
                  className="size-16 overflow-hidden rounded border border-app-border-light bg-app-subtle"
                >
                  <StaffImage
                    path={`/trademaster/admin/products/images/${image.id}`}
                    alt={image.caption ?? ''}
                    className="size-full object-cover"
                    fallback={<span />}
                  />
                </li>
              ))}
            </ul>
          )}

          {detail && detail.variants.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {detail.variants.map((variant) => (
                <li key={variant.id}>
                  <Badge>
                    {variant.label}
                    {variant.price ? ` · ${formatMoney(variant.price, locale)}` : ''}
                    {` · ${number(variant.stock)}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {!shopApproved && (
            <p className="mt-3 rounded-lg bg-app-surface-2 p-2 text-label text-app-text-2">
              {t.trademaster.shopNotApprovedWarning}
            </p>
          )}
        </div>
      </div>

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id: row.id, payload: input })}
      />
    </Card>
  );
}
