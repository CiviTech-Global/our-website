import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, Handshake, X } from 'lucide-react';
import { useOrderAction, useOrders } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { agoText, money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { UNLIMITED_REVISIONS, type ServiceOrder } from '@/types/work';

/**
 * Service orders on both sides: what the reader bought, and what they were
 * asked to deliver. A seller accepts (which opens a contract) or declines
 * with a reason; a buyer may cancel while the seller has not answered.
 */
export default function ServiceOrdersPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const side = params.get('side') === 'seller' ? 'seller' : 'buyer';
  const { data, isLoading } = useOrders(side);
  useDocumentTitle(t.work.ordersTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.work.ordersTitle} />
      <div className="flex gap-2" role="tablist">
        {(['buyer', 'seller'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={side === value}
            onClick={() => setParams(value === 'seller' ? { side: 'seller' } : {}, { replace: true })}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              side === value
                ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                : 'border-border-default text-text-secondary',
            )}
          >
            {value === 'buyer' ? t.work.buying : t.work.selling}
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.work.ordersEmpty}
          action={
            <Link to="/freelance-services">
              <Button variant="outline">{t.work.servicesTitle}</Button>
            </Link>
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {data?.map((order) => (
          <OrderRow key={order.id} order={order} side={side} />
        ))}
      </ul>
    </div>
  );
}

function OrderRow({ order, side }: { order: ServiceOrder; side: 'buyer' | 'seller' }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const action = useOrderAction();
  const [declining, setDeclining] = useState(false);
  const number = (value: number) => formatNumber(value, locale);
  const waiting = order.status === 'REQUESTED';

  async function run(kind: 'accept' | 'cancel', message: string) {
    try {
      await action.mutateAsync({ id: order.id, action: kind });
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  order.status === 'ACCEPTED' ? 'success' : order.status === 'REQUESTED' ? 'warning' : order.status === 'DECLINED' ? 'danger' : 'default'
                }
              >
                {t.work.orderStatus[order.status]}
              </Badge>
              <Badge>{t.work.tiers[order.tier]}</Badge>
              <span className="text-xs text-text-tertiary">
                #{order.code} · {agoText(order.createdAt, locale, t)}
              </span>
            </div>
            <h2 className="font-semibold text-text-primary">
              <Link to={`/freelance-services/${order.service.code}`} className="hover:underline">
                {order.service.title}
              </Link>
            </h2>
            <p className="text-sm text-text-secondary">
              {order.packageName} · {fill(t.work.daysCount, { count: number(order.deliveryDays) })} ·{' '}
              {order.revisions === UNLIMITED_REVISIONS ? t.work.unlimitedRevisions : fill(t.work.revisionsCount, { count: number(order.revisions) })}
            </p>
            {order.counterparty?.username && (
              <p className="text-sm text-text-tertiary">
                {side === 'buyer' ? t.work.aboutSeller : t.work.aboutClient}:{' '}
                <Link to={`/profiles/${order.counterparty.username}`} className="hover:underline">
                  @{order.counterparty.username}
                </Link>
              </p>
            )}
          </div>
          <p className="text-lg font-semibold text-text-primary">{money(order.price, order.currency, locale, t)}</p>
        </div>

        {order.extras.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {order.extras.map((extra) => (
              <li key={extra.title}>
                <Badge>
                  + {extra.title} ({money(extra.price, order.currency, locale, t)})
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {(order.requirementAnswers.length > 0 || order.note) && (
          <details className="rounded-xl bg-surface-muted p-3 text-sm" open={side === 'seller' && waiting}>
            <summary className="cursor-pointer font-medium text-text-primary">{t.work.buyerAnswers}</summary>
            <dl className="mt-2 flex flex-col gap-2">
              {order.service.requirements.map((question, index) => (
                <div key={question}>
                  <dt className="text-text-tertiary">{question}</dt>
                  <dd className="whitespace-pre-line text-text-secondary">{order.requirementAnswers[index] ?? '—'}</dd>
                </div>
              ))}
              {order.note && (
                <div>
                  <dt className="text-text-tertiary">{t.work.orderNote}</dt>
                  <dd className="whitespace-pre-line text-text-secondary">{order.note}</dd>
                </div>
              )}
            </dl>
          </details>
        )}

        {order.declineReason && (
          <p className="text-sm text-text-secondary">
            <span className="font-medium">{t.work.declineReason} </span>
            {order.declineReason}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {side === 'seller' && waiting && (
            <>
              <Button size="sm" isLoading={action.isPending} onClick={() => void run('accept', t.work.orderAccepted)}>
                <Check className="size-4" aria-hidden="true" />
                {t.work.accept}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeclining(true)}>
                <X className="size-4" aria-hidden="true" />
                {t.work.decline}
              </Button>
            </>
          )}
          {side === 'buyer' && waiting && (
            <Button size="sm" variant="ghost" isLoading={action.isPending} onClick={() => void run('cancel', t.work.orderCancelled)}>
              <X className="size-4" aria-hidden="true" />
              {t.work.cancelOrder}
            </Button>
          )}
          {order.award && (
            <Link to="/dashboard/awards">
              <Button size="sm" variant="outline">
                <Handshake className="size-4" aria-hidden="true" />
                {t.work.openContract}
              </Button>
            </Link>
          )}
        </div>
      </Card>
      {declining && <DeclineModal orderId={order.id} onClose={() => setDeclining(false)} />}
    </li>
  );
}

function DeclineModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const action = useOrderAction();
  const [reason, setReason] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await action.mutateAsync({ id: orderId, action: 'decline', reason: reason.trim() });
      showToast(t.work.orderDeclined, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.work.decline}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label={t.work.declineReason} htmlFor="decline-reason">
          <TextArea id="decline-reason" required minLength={5} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <Button type="submit" isLoading={action.isPending}>
          {t.work.decline}
        </Button>
      </form>
    </Modal>
  );
}
