import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Check, CheckCheck, MessageSquare, Star, X } from 'lucide-react';
import { useBookRequestAction } from '@/api/bookshop';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { fill, formatNumber } from '@/lib/jobFormat';
import { agoText, money } from '@/lib/workFormat';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { BookCover, GradeBadge } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import type { BookRequestRow, BookRequestStatus } from '@/types/bookshop';

const STATUS_TONE: Record<BookRequestStatus, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  REQUESTED: 'warning',
  ACCEPTED: 'info',
  DECLINED: 'danger',
  CANCELLED: 'default',
  COMPLETED: 'success',
};

/**
 * One request to buy, as either side sees it.
 *
 * The seller accepts or declines a waiting request, then marks an accepted one
 * handed over; the buyer can withdraw until then. Both reach the request's
 * conversation from here, and once it is handed over, the contracts page where
 * they review each other.
 */
export function BookRequestCard({ request, side }: { request: BookRequestRow; side: 'buyer' | 'seller' }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const action = useBookRequestAction();
  const [declining, setDeclining] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const open = request.status === 'REQUESTED' || request.status === 'ACCEPTED';

  async function run(kind: 'accept' | 'cancel' | 'complete', message: string) {
    try {
      await action.mutateAsync({ id: request.id, action: kind });
      showToast(message, 'success');
      setConfirming(false);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-14 shrink-0">
            <BookCover url={request.book?.coverUrl} title={request.book?.title ?? ''} size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_TONE[request.status]}>{t.bookshop.requestStatus[request.status]}</Badge>
              {request.listing.grade && <GradeBadge grade={request.listing.grade} />}
              <span className="text-xs text-text-tertiary">
                #{request.code} · {fill(t.bookshop.requestedOn, { ago: agoText(request.createdAt, locale, t) })}
              </span>
            </div>
            <h2 className="font-semibold text-text-primary">
              {request.book ? (
                <Link to={`/books/${request.book.code}`} className="hover:underline">
                  {request.book.title}
                </Link>
              ) : (
                '—'
              )}
            </h2>
            {request.book && <p className="text-sm text-text-secondary">{namesText(request.book.authors, locale)}</p>}
            {request.counterparty && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
                <span className="text-text-tertiary">{side === 'seller' ? t.bookshop.buyer : t.bookshop.seller}:</span>
                <Link to={`/profiles/${request.counterparty.username}`} className="font-medium text-text-primary hover:underline">
                  @{request.counterparty.username}
                </Link>
                {request.counterparty.ratingCount > 0 && <RatingStars avg={request.counterparty.ratingAvg} count={request.counterparty.ratingCount} />}
              </p>
            )}
          </div>
          <div className="shrink-0 text-end text-sm">
            <p className="font-semibold text-text-primary">{money(request.total, request.currency, locale, t)}</p>
            <p className="text-xs text-text-tertiary">
              {formatNumber(request.quantity, locale)} × {money(request.unitPrice, request.currency, locale, t)}
            </p>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div className="flex gap-1.5">
            <dt className="text-text-tertiary">{t.bookshop.deliveryMethod}:</dt>
            <dd className="text-text-primary">{t.bookshop.delivery[request.deliveryMethod]}</dd>
          </div>
          {request.deliveryMethod !== 'IN_PERSON' && (
            <div className="flex gap-1.5">
              <dt className="text-text-tertiary">{t.bookshop.shipping}:</dt>
              <dd className="text-text-primary">
                {request.shippingCost === null
                  ? t.bookshop.shippingAsk
                  : request.shippingCost === '0'
                    ? t.bookshop.shippingFree
                    : money(request.shippingCost, request.currency, locale, t)}
              </dd>
            </div>
          )}
          {request.offeredPrice && (
            <div className="flex gap-1.5">
              <dt className="text-text-tertiary">{t.bookshop.offeredPrice}:</dt>
              <dd className="font-medium text-brand-amber-700 dark:text-brand-amber-400">{money(request.offeredPrice, request.currency, locale, t)}</dd>
            </div>
          )}
          {(request.listing.city || request.listing.province) && (
            <div className="flex gap-1.5">
              <dt className="text-text-tertiary">{t.bookshop.location}:</dt>
              <dd className="text-text-primary">{[request.listing.city, request.listing.province].filter(Boolean).join('، ')}</dd>
            </div>
          )}
        </dl>

        {request.note && <p className="whitespace-pre-line rounded-lg bg-surface-muted p-3 text-sm text-text-secondary">{request.note}</p>}
        {request.status === 'DECLINED' && request.declineReason && (
          <p className="rounded-lg bg-brand-red-50 p-3 text-sm text-brand-red-800 dark:bg-brand-red-900/20 dark:text-brand-red-300">{request.declineReason}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link to={`/dashboard/messages/k/${request.id}`}>
            <Button variant="ghost" size="sm">
              <MessageSquare className="size-4" aria-hidden="true" />
              {t.bookshop.openChat}
              {request.unreadMessages > 0 && <Badge variant="info">{fill(t.bookshop.unreadMessages, { n: formatNumber(request.unreadMessages, locale) })}</Badge>}
            </Button>
          </Link>
          {request.status === 'COMPLETED' && request.award && (
            <Link to="/dashboard/awards">
              <Button variant="outline" size="sm">
                <Star className="size-4" aria-hidden="true" />
                {t.bookshop.leaveReview}
              </Button>
            </Link>
          )}
          {side === 'seller' && request.status === 'REQUESTED' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setDeclining(true)}>
                <X className="size-4" aria-hidden="true" />
                {t.bookshop.decline}
              </Button>
              <Button size="sm" isLoading={action.isPending} onClick={() => void run('accept', t.bookshop.accepted)}>
                <Check className="size-4" aria-hidden="true" />
                {t.bookshop.accept}
              </Button>
            </>
          )}
          {side === 'seller' && request.status === 'ACCEPTED' && (
            <Button size="sm" onClick={() => setConfirming(true)}>
              <CheckCheck className="size-4" aria-hidden="true" />
              {t.bookshop.markHandedOver}
            </Button>
          )}
          {side === 'buyer' && open && (
            <Button variant="outline" size="sm" isLoading={action.isPending} onClick={() => void run('cancel', t.bookshop.cancelled)}>
              <X className="size-4" aria-hidden="true" />
              {t.bookshop.cancelRequest}
            </Button>
          )}
        </div>
      </Card>

      {declining && <DeclineModal requestId={request.id} onClose={() => setDeclining(false)} />}
      {confirming && (
        <Modal isOpen onClose={() => setConfirming(false)} title={t.bookshop.markHandedOver}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">{t.bookshop.markHandedOverConfirm}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button isLoading={action.isPending} onClick={() => void run('complete', t.bookshop.completed)}>
                {t.bookshop.markHandedOver}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </li>
  );
}

function DeclineModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const action = useBookRequestAction();
  const [reason, setReason] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await action.mutateAsync({ id: requestId, action: 'decline', reason: reason.trim() });
      showToast(t.bookshop.declined, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.bookshop.decline}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label={t.bookshop.declineReason} htmlFor="decline-reason">
          <TextArea id="decline-reason" required minLength={3} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <Button type="submit" isLoading={action.isPending}>
          {t.bookshop.decline}
        </Button>
      </form>
    </Modal>
  );
}
