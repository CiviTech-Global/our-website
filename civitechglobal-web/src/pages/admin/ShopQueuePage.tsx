import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeftRight, MapPin, PackagePlus, Plus, Search, Store, X } from 'lucide-react';
import {
  useReviewShop,
  useShopOwnerSearch,
  useShopQueue,
  useShopReview,
  useTransferShopOwner,
  type ShopOwnerOption,
} from '@/api/trademaster';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { moderationVariant } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Modal } from '@/components/ui/Modal';
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
        actions={
          <Link to="/admin/trademaster/shops/new">
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              {t.trademaster.desk.openShop}
            </Button>
          </Link>
        }
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
  const [transferOpen, setTransferOpen] = useState(false);

  /**
   * Fetched for every card in the page, as the product queue does.
   *
   * The queue row carries a name, a one-line summary and a city. Everything a
   * shop is actually judged on — the description, the address, the phone
   * number, the website — is only in the detail, so without this the desk was
   * approving storefronts it had not read. Twenty rows at most, and a reviewer
   * who has to click into each one reads fewer of them.
   */
  const { data: detail } = useShopReview(row.id);

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

          {detail?.description && (
            <p className="mt-2 whitespace-pre-line text-body leading-6 text-app-text-3">
              {detail.description}
            </p>
          )}

          {detail && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-label sm:grid-cols-2">
              {detail.address && (
                <Field label={t.trademaster.address} value={detail.address} />
              )}
              {detail.phone && <Field label={t.trademaster.phone} value={detail.phone} ltr />}
              {detail.email && <Field label={t.trademaster.email} value={detail.email} ltr />}
              {detail.website && (
                <Field
                  label={t.trademaster.website}
                  ltr
                  value={
                    // Not a link. Opening an unreviewed seller's URL from the
                    // admin panel on a click meant for reading is the kind of
                    // thing a review desk should not do by accident.
                    detail.website
                  }
                />
              )}
            </dl>
          )}

          {/* What the desk said last time, so a second look does not repeat
              feedback the seller has already acted on. */}
          {detail?.reviewNote && (
            <p className="mt-3 rounded border border-app-border-light bg-app-fill p-2 text-label text-app-text-3">
              <span className="font-medium">{t.market.reviewNote}: </span>
              {detail.reviewNote}
            </p>
          )}
          {detail?.internalNote && (
            <p className="mt-1.5 rounded border border-app-border-light bg-app-subtle p-2 text-label text-app-text-4">
              <span className="font-medium">{t.market.internalNote}: </span>
              {detail.internalNote}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Stock is listed only in a live shop, as on the seller's own path. */}
        {row.moderationStatus === 'APPROVED' && (
          <Link to={`/admin/trademaster/shops/${row.id}/products/new`}>
            <Button variant="outline" size="sm">
              <PackagePlus className="size-4" aria-hidden="true" />
              {t.trademaster.desk.addListing}
            </Button>
          </Link>
        )}
        <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="size-4" aria-hidden="true" />
          {t.trademaster.desk.transferOwner}
        </Button>
      </div>

      <ReviewActions
        isPending={review.isPending}
        onReview={(input) => review.mutateAsync({ id: row.id, payload: input })}
      />

      <TransferOwnerModal shop={row} isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
    </Card>
  );
}

/**
 * Handing the shop to a different member.
 *
 * The same member search the open-a-shop form uses, and one deliberate press:
 * the shop and everything in it moves, and both the old and the new owner are
 * notified. There is no undo on this screen — the way back is the same dialog
 * on the same shop.
 */
function TransferOwnerModal({
  shop,
  isOpen,
  onClose,
}: {
  shop: ShopQueueRow;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const desk = t.trademaster.desk;
  const { showToast } = useToast();
  const transfer = useTransferShopOwner();

  const [owner, setOwner] = useState<ShopOwnerOption | null>(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const owners = useShopOwnerSearch(isOpen && !owner ? ownerQuery : '');

  function close() {
    setOwner(null);
    setOwnerQuery('');
    onClose();
  }

  async function handleTransfer() {
    if (!owner) {
      showToast(desk.ownerRequired, 'error');
      return;
    }
    try {
      await transfer.mutateAsync({ id: shop.id, ownerId: owner.id });
      showToast(desk.transferred, 'success');
      close();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={desk.transferOwner}>
      <div className="flex flex-col gap-3">
        <p className="text-body text-app-text-2">
          {desk.transferHint.replace('{shop}', shop.name)}
        </p>

        {owner ? (
          <div className="flex items-start justify-between gap-2 rounded-[var(--radius-control)] border border-app-primary bg-app-primary-soft p-3">
            <div className="min-w-0">
              <p className="text-label text-app-text-3">{desk.ownerChosen}</p>
              <p className="truncate font-semibold text-app-text">
                {owner.firstName} {owner.lastName}
              </p>
              <p className="truncate text-label text-app-text-3" dir="ltr">
                {owner.email}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOwner(null)} aria-label={desk.ownerChange}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="relative">
              <span className="sr-only">{desk.ownerSearch}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-app-icon" aria-hidden="true" />
              <Input
                value={ownerQuery}
                onChange={(e) => setOwnerQuery(e.target.value)}
                placeholder={desk.ownerSearch}
                className="ps-9"
                maxLength={80}
              />
            </label>
            {owners.isFetching && <Spinner label={t.common.loading} />}
            {owners.data && owners.data.length === 0 && (
              <p className="text-label text-app-text-3">{desk.ownerNone}</p>
            )}
            {owners.data && owners.data.length > 0 && (
              <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                {owners.data.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => setOwner(option)}
                      className="flex w-full flex-col rounded-[var(--radius-control)] px-3 py-2 text-start hover:bg-app-hover"
                    >
                      <span className="font-medium text-app-text">
                        {option.firstName} {option.lastName}
                      </span>
                      <span className="truncate text-label text-app-text-3" dir="ltr">
                        {option.email}
                        {option.username ? ` · @${option.username}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {t.common.cancel}
          </Button>
          <Button type="button" onClick={() => void handleTransfer()} disabled={!owner} isLoading={transfer.isPending}>
            {desk.transferConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** One label-and-value pair in the reviewer's summary of a shop. */
function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-app-text-4">{label}:</dt>
      <dd className={ltr ? 'ltr min-w-0 truncate text-app-text-2' : 'min-w-0 text-app-text-2'}>
        {value}
      </dd>
    </div>
  );
}
