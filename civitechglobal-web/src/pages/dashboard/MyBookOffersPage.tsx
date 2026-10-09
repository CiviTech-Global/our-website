import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Eye, Pencil, Plus, Send, Tag } from 'lucide-react';
import { offerPhotoPath, useBookRequests, useOwnOffers, useQuickEditOffer, useSetOfferOpen, useSubmitOffer } from '@/api/bookshop';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { moderationVariant, stateVariant } from '@/lib/marketplace';
import { money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { BookCover, GradeBadge } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import { BookRequestCard } from '@/components/books/BookRequestCard';
import type { OwnOffer } from '@/types/bookshop';

/**
 * The seller's side of the book market: the copies they offer and the
 * requests to buy them.
 *
 * A bookshop changes prices and stock far more often than anything else, so
 * those two are edited in place; the rest of a copy goes through the editor
 * (and back through review). Waiting requests are counted on each copy and on
 * the tab, because an unanswered buyer is the thing most worth noticing here.
 */
export default function MyBookOffersPage() {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'requests' ? 'requests' : 'copies';
  const { data: offers, isLoading } = useOwnOffers();
  const { data: requests, isLoading: requestsLoading } = useBookRequests('seller');
  const waiting = requests?.filter((request) => request.status === 'REQUESTED').length ?? 0;
  useDocumentTitle(t.bookshop.myBooksTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.bookshop.myBooksTitle}
        actions={
          <Link to="/dashboard/books/sell">
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              {t.bookshop.sellBook}
            </Button>
          </Link>
        }
      />
      <div className="flex gap-2" role="tablist">
        {(['copies', 'requests'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setParams(value === 'requests' ? { tab: 'requests' } : {}, { replace: true })}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
              tab === value
                ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                : 'border-border-default text-text-secondary',
            )}
          >
            {value === 'copies' ? t.bookshop.tabCopies : t.bookshop.tabRequests}
            {value === 'requests' && waiting > 0 && <Badge variant="warning">{formatNumber(waiting, locale)}</Badge>}
          </button>
        ))}
      </div>

      {tab === 'copies' && (
        <>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}
          {!isLoading && offers?.length === 0 && (
            <EmptyState
              title={t.bookshop.myBooksEmpty}
              action={
                <Link to="/dashboard/books/sell">
                  <Button variant="outline">{t.bookshop.sellBook}</Button>
                </Link>
              }
            />
          )}
          <ul className="flex flex-col gap-3">
            {offers?.map((offer) => (
              <OfferRow key={offer.id} offer={offer} />
            ))}
          </ul>
        </>
      )}

      {tab === 'requests' && (
        <>
          {requestsLoading && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}
          {!requestsLoading && requests?.length === 0 && <EmptyState title={t.bookshop.requestsEmpty} />}
          <ul className="flex flex-col gap-3">
            {requests?.map((request) => (
              <BookRequestCard key={request.id} request={request} side="seller" />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function OfferRow({ offer }: { offer: OwnOffer }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const setOpen = useSetOfferOpen();
  const submit = useSubmitOffer();
  const [editing, setEditing] = useState(false);
  const book = offer.book;
  const live = offer.moderationStatus === 'APPROVED';
  const editable = offer.moderationStatus === 'DRAFT' || offer.moderationStatus === 'REJECTED';
  const waiting = offer.requests.REQUESTED ?? 0;
  const accepted = offer.requests.ACCEPTED ?? 0;

  async function toggle(open: boolean) {
    try {
      await setOpen.mutateAsync({ id: offer.id, open });
      showToast(t.bookshop.saved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function send() {
    try {
      await submit.mutateAsync(offer.id);
      showToast(t.bookshop.submitted, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <li>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="w-16 shrink-0">
          {/* No catalogue cover yet: the seller's own first photo, which only they (and staff) can load. */}
          {!book?.coverUrl && offer.photos[0] ? (
            <div className="aspect-[2/3] w-full overflow-hidden rounded-md border border-border-default bg-surface-muted">
              <StaffImage path={offerPhotoPath(offer.photos[0].id, 'own')} alt={book?.title ?? ''} className="size-full object-cover" fallback={null} />
            </div>
          ) : (
            <BookCover url={book?.coverUrl} title={book?.title ?? ''} size="sm" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={moderationVariant(offer.moderationStatus)}>{t.market[offer.moderationStatus]}</Badge>
            {live && <Badge variant={stateVariant(offer.state)}>{t.market[offer.state]}</Badge>}
            {offer.grade && <GradeBadge grade={offer.grade} />}
            {live && <Badge variant={offer.quantity > 0 ? 'success' : 'default'}>{offer.quantity > 0 ? t.bookshop.inStock : t.bookshop.outOfStock}</Badge>}
            <span className="text-xs text-text-tertiary">#{offer.code}</span>
          </div>
          <h2 className="font-semibold text-text-primary">
            {book && live ? (
              <Link to={`/books/${book.code}`} className="hover:underline">
                {book.title}
              </Link>
            ) : (
              book?.title ?? '—'
            )}
          </h2>
          {book && <p className="text-sm text-text-secondary">{namesText(book.authors, locale)}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{money(offer.price, offer.currency, locale, t)}</span>
            {offer.negotiable && <span>{t.bookshop.negotiable}</span>}
            <span>{fill(t.bookshop.quantityLeft, { n: formatNumber(offer.quantity, locale) })}</span>
            {offer.soldCount > 0 && <span>{fill(t.bookshop.sold, { n: formatNumber(offer.soldCount, locale) })}</span>}
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" aria-hidden="true" />
              {formatNumber(offer.viewCount, locale)}
            </span>
            {waiting > 0 && (
              <Link to="/dashboard/books?tab=requests" className="font-medium text-brand-amber-700 hover:underline dark:text-brand-amber-400">
                {fill(t.bookshop.waitingRequests, { n: formatNumber(waiting, locale) })}
              </Link>
            )}
            {accepted > 0 && <span>{t.bookshop.accepted}: {formatNumber(accepted, locale)}</span>}
          </p>
          {offer.moderationStatus === 'REJECTED' && offer.reviewNote && (
            <p className="mt-2 rounded-lg bg-brand-red-50 p-2 text-sm text-brand-red-800 dark:bg-brand-red-900/20 dark:text-brand-red-300">{offer.reviewNote}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {live && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Tag className="size-4" aria-hidden="true" />
              {t.bookshop.quickEdit}
            </Button>
          )}
          <Link to={`/dashboard/books/${offer.id}/edit`}>
            <Button variant="ghost" size="sm" className="w-full">
              <Pencil className="size-4" aria-hidden="true" />
              {t.common.edit}
            </Button>
          </Link>
          {editable && (
            <Button size="sm" isLoading={submit.isPending} disabled={offer.photos.length === 0} onClick={() => void send()}>
              <Send className="size-4" aria-hidden="true" />
              {t.bookshop.submitForReview}
            </Button>
          )}
          {live && (
            <Button variant="ghost" size="sm" isLoading={setOpen.isPending} onClick={() => void toggle(offer.state !== 'OPEN')}>
              {offer.state === 'OPEN' ? t.bookshop.close : t.bookshop.open}
            </Button>
          )}
        </div>
      </Card>
      {editing && <QuickEditModal offer={offer} onClose={() => setEditing(false)} />}
    </li>
  );
}

function QuickEditModal({ offer, onClose }: { offer: OwnOffer; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const quick = useQuickEditOffer();
  const [price, setPrice] = useState(offer.price);
  const [quantity, setQuantity] = useState(offer.quantity);
  const [negotiable, setNegotiable] = useState(offer.negotiable);
  const [shipping, setShipping] = useState(offer.shippingCost ?? '');

  async function save(event: FormEvent) {
    event.preventDefault();
    const shippingDigits = toLatinDigits(shipping).replace(/[^0-9]/g, '');
    try {
      await quick.mutateAsync({
        id: offer.id,
        price: toLatinDigits(price).replace(/[^0-9]/g, ''),
        quantity,
        negotiable,
        shippingCost: shippingDigits === '' ? null : shippingDigits,
      });
      showToast(t.bookshop.quickEditSaved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.bookshop.quickEdit}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.bookshop.priceLabel} htmlFor="q-price">
            <Input id="q-price" required inputMode="numeric" className="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
          <FormField label={t.bookshop.quantityLabel} htmlFor="q-qty">
            <Input id="q-qty" type="number" min={0} max={999} className="ltr" value={quantity} onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))} />
          </FormField>
        </div>
        {offer.deliveryOptions.some((option) => option !== 'IN_PERSON') && (
          <FormField label={t.bookshop.shippingLabel} htmlFor="q-shipping" hint={t.bookshop.shippingHint}>
            <Input id="q-shipping" inputMode="numeric" className="ltr" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </FormField>
        )}
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" className="size-4 rounded border-border-default" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />
          {t.bookshop.negotiableLabel}
        </label>
        <Button type="submit" isLoading={quick.isPending}>
          {t.common.save}
        </Button>
      </form>
    </Modal>
  );
}
