import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Info, Package, Store } from 'lucide-react';
import {
  useConfirmPayment,
  useMoveOrder,
  useMyOrders,
  useStartPayment,
} from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { Order, OrderStatus } from '@/types/trademaster';

const PAGE_SIZE = 10;

/** Which colour a status carries. Terminal-and-bad is the only one that shouts. */
export function orderVariant(status: OrderStatus): BadgeVariant {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'PAID':
    case 'CONFIRMED':
    case 'SHIPPED':
      return 'info';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * A buyer's own orders, and the payment return.
 *
 * The gateway sends the buyer back here with `?reference=…`, so this page is
 * also the confirmation step. It runs once per reference: confirmPayment is
 * idempotent server-side, but firing it on every render would still mean a
 * request per keystroke elsewhere on the page.
 */
export default function MyOrdersPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  useDocumentTitle(t.trademaster.myOrders);

  const [params, setParams] = useSearchParams();
  const controls = useListControls({ pageSize: PAGE_SIZE });
  const { data, isLoading } = useMyOrders({ page: controls.page, pageSize: PAGE_SIZE });

  const confirm = useConfirmPayment();
  const startPayment = useStartPayment();
  const move = useMoveOrder();

  const reference = params.get('reference');
  // Guards against a second run in React's development double-invoke, and
  // against the effect re-firing when the search params object is replaced.
  const confirmed = useRef<string | null>(null);

  useEffect(() => {
    if (!reference || confirmed.current === reference) return;
    confirmed.current = reference;

    void (async () => {
      try {
        const result = await confirm.mutateAsync(reference);
        showToast(
          result.status === 'SUCCEEDED'
            ? t.trademaster.paymentSucceeded
            : result.status === 'PENDING'
              ? t.trademaster.paymentPending
              : t.trademaster.paymentFailed,
          result.status === 'SUCCEEDED' ? 'success' : 'error'
        );
      } catch (error) {
        showToast(apiMessage(error, t.common.error), 'error');
      } finally {
        // Taken out of the address so a refresh does not look like a second
        // payment, and so the reference does not sit in history.
        const next = new URLSearchParams(params);
        next.delete('reference');
        setParams(next, { replace: true });
      }
    })();
  }, [reference, confirm, params, setParams, showToast, t]);

  async function pay(order: Order) {
    try {
      const { redirectUrl } = await startPayment.mutateAsync({
        orderId: order.id,
        returnPath: '/dashboard/orders',
      });

      if (redirectUrl) {
        showToast(t.trademaster.paymentStarted, 'info');
        window.location.assign(redirectUrl);
        return;
      }
      // A driver that needs no redirect has already settled; the list refetch
      // will show it.
      showToast(t.trademaster.paymentSucceeded, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function cancel(order: Order) {
    if (!window.confirm(t.trademaster.confirmCancel)) return;
    try {
      await move.mutateAsync({ id: order.id, to: 'CANCELLED' });
      showToast(t.trademaster.moved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function receive(order: Order) {
    try {
      await move.mutateAsync({ id: order.id, to: 'DELIVERED' });
      showToast(t.trademaster.moved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.trademaster.myOrders}
        description={t.trademaster.myOrdersSubtitle}
        className="mb-2"
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={t.trademaster.noOrders}
          icon={<Package aria-hidden="true" />}
          action={
            <Link to="/marketplace/products">
              <Button>{t.trademaster.products}</Button>
            </Link>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((order) => (
          <li key={order.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ltr font-mono text-label text-app-text-4">{order.code}</span>
                <Badge variant={orderVariant(order.status)}>
                  {t.trademaster.orderStatus[order.status]}
                </Badge>
                {order.business && (
                  <span className="inline-flex items-center gap-1 text-label text-app-text-3">
                    <Store className="size-3.5" aria-hidden="true" />
                    <Link
                      to={`/marketplace/shops/${order.business.slug}`}
                      className="hover:underline"
                    >
                      {order.business.name}
                    </Link>
                  </span>
                )}
                <span className="ms-auto text-label text-app-text-4">
                  {formatDate(order.createdAt, locale)}
                </span>
              </div>

              <ul className="flex flex-col gap-1 text-body text-app-text-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap gap-x-2">
                    <span>{item.titleAtPurchase}</span>
                    {item.variantAtPurchase && (
                      <span className="text-app-text-4">({item.variantAtPurchase})</span>
                    )}
                    <span className="text-app-text-4">× {number(item.quantity)}</span>
                    <span className="ms-auto">
                      {formatMoney(item.lineTotal, locale)} {t.market.currency}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-app-border-1 pt-2 text-label">
                <div className="flex gap-1">
                  <dt className="text-app-text-4">{t.trademaster.subtotal}:</dt>
                  <dd>{formatMoney(order.subtotal, locale)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-app-text-4">{t.trademaster.shippingCost}:</dt>
                  <dd>
                    {order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT'
                      ? t.trademaster.shippingLater
                      : formatMoney(order.shipping, locale)}
                  </dd>
                </div>
                <div className="flex gap-1 font-medium">
                  <dt className="text-app-text-4">{t.trademaster.orderTotal}:</dt>
                  <dd>
                    {formatMoney(order.total, locale)} {t.market.currency}
                  </dd>
                </div>
              </dl>

              {order.trackingCode && (
                <p className="text-label text-app-text-3">
                  {t.trademaster.trackingLabel}:{' '}
                  <span className="ltr font-mono">{order.trackingCode}</span>
                  {order.trackingCarrier && ` — ${order.trackingCarrier}`}
                </p>
              )}

              {order.cancelReason && (
                <p className="rounded-lg bg-app-surface-2 p-2 text-label text-app-text-2">
                  {order.cancelReason}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
                  <>
                    <Button size="sm" onClick={() => void pay(order)} disabled={startPayment.isPending}>
                      {t.trademaster.payNow}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void cancel(order)}>
                      {t.trademaster.cancelOrder}
                    </Button>
                  </>
                )}

                {order.status === 'SHIPPED' && (
                  <Button size="sm" onClick={() => void receive(order)}>
                    {t.trademaster.markDelivered}
                  </Button>
                )}
              </div>

              {(order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') && (
                <p className="flex items-start gap-1.5 text-caption text-app-text-4">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t.trademaster.paymentSandboxNote}
                </p>
              )}
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
