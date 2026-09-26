import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Package, User } from 'lucide-react';
import { useMoveOrder, useOwnShops, useShopOrders } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { orderVariant } from './MyOrdersPage';
import type { Order, OrderStatus } from '@/types/trademaster';

const PAGE_SIZE = 10;

/** The statuses a seller filters by, in the order work reaches them. */
const FILTERS: OrderStatus[] = ['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

/**
 * The seller's side of an order.
 *
 * Defaults to PAID, because that is the only status that represents work
 * waiting: PENDING orders are buyers who have not paid and are nobody's job
 * yet, and everything after SHIPPED is a record rather than a task.
 *
 * Confirming is the one move that carries a number — shipping depends on where
 * it is going — so it opens a small form. The rest are single presses, because
 * a dialog asking "are you sure" before marking something shipped is a click
 * tax on the commonest action of the day.
 */
export default function ShopOrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, locale } = useLocale();
  const { showToast } = useToast();

  const { data: shops } = useOwnShops();
  const shop = shops?.find((candidate) => candidate.id === shopId);
  useDocumentTitle(t.trademaster.shopOrders);

  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: 'PAID' } });
  const { data, isLoading } = useShopOrders(shopId, {
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status as OrderStatus,
  });

  const move = useMoveOrder();
  const [confirming, setConfirming] = useState<Order | null>(null);
  const [shipping, setShipping] = useState('');
  const [tracking, setTracking] = useState({ carrier: '', code: '' });

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const digits = (value: string) => value.replace(/[^0-9]/g, '');

  async function run(promise: Promise<unknown>) {
    try {
      await promise;
      showToast(t.trademaster.moved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!confirming) return;

    await run(
      move.mutateAsync({
        id: confirming.id,
        to: 'CONFIRMED',
        // Zero is a legitimate answer — collection in person, or free delivery.
        shipping: digits(shipping) || '0',
      })
    );
    setConfirming(null);
    setShipping('');
  }

  async function handleShip(order: Order) {
    await run(
      move.mutateAsync({
        id: order.id,
        to: 'SHIPPED',
        trackingCarrier: tracking.carrier || undefined,
        trackingCode: tracking.code || undefined,
      })
    );
    setTracking({ carrier: '', code: '' });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={shop ? `${t.trademaster.shopOrders} — ${shop.name}` : t.trademaster.shopOrders}
        description={t.trademaster.shopOrdersSubtitle}
        className="mb-2"
        actions={
          <Link to="/dashboard/shops">
            <Button variant="ghost">{t.trademaster.myShops}</Button>
          </Link>
        }
      />

      <SegmentedControl<OrderStatus>
        label={t.app.filterByStatus}
        value={controls.filters.status as OrderStatus}
        segments={FILTERS.map((value) => ({ value, label: t.trademaster.orderStatus[value] }))}
        onChange={(value) => controls.setFilter('status', value)}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState title={t.trademaster.noShopOrders} icon={<Package aria-hidden="true" />} />
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
                <span className="ms-auto text-label text-app-text-4">
                  {formatDate(order.createdAt, locale)}
                </span>
              </div>

              {order.buyer && (
                <p className="inline-flex items-center gap-1.5 text-label text-app-text-3">
                  <User className="size-3.5" aria-hidden="true" />
                  {t.trademaster.buyerLabel}:{' '}
                  {[order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(' ') || '—'}{' '}
                  <span className="ltr">({order.buyer.email})</span>
                </p>
              )}

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

              <div className="border-t border-app-border-1 pt-2">
                <p className="text-label text-app-text-4">{t.trademaster.deliverTo}</p>
                <p className="text-body text-app-text-2">
                  {order.recipientName} — <span className="ltr">{order.recipientPhone}</span>
                </p>
                <p className="text-body text-app-text-3">
                  {[order.province, order.city, order.address].filter(Boolean).join('، ')}
                  {order.postalCode && ` — ${order.postalCode}`}
                </p>
                {order.buyerNote && (
                  <p className="mt-1 rounded-lg bg-app-surface-2 p-2 text-label text-app-text-2">
                    {order.buyerNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {order.status === 'PAID' && (
                  <Button size="sm" onClick={() => setConfirming(order)}>
                    {t.trademaster.confirmOrder}
                  </Button>
                )}

                {order.status === 'CONFIRMED' && (
                  <>
                    <Input
                      value={tracking.carrier}
                      onChange={(e) => setTracking((prev) => ({ ...prev, carrier: e.target.value }))}
                      placeholder={t.trademaster.carrierLabel}
                      aria-label={t.trademaster.carrierLabel}
                      className="w-40"
                    />
                    <Input
                      value={tracking.code}
                      onChange={(e) => setTracking((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder={t.trademaster.trackingCodeLabel}
                      aria-label={t.trademaster.trackingCodeLabel}
                      className="w-40"
                      dir="ltr"
                    />
                    <Button size="sm" onClick={() => void handleShip(order)}>
                      {t.trademaster.markShipped}
                    </Button>
                  </>
                )}

                {order.status === 'SHIPPED' && (
                  <Button
                    size="sm"
                    onClick={() => void run(move.mutateAsync({ id: order.id, to: 'DELIVERED' }))}
                  >
                    {t.trademaster.markDelivered}
                  </Button>
                )}

                {(order.status === 'PAID' ||
                  order.status === 'CONFIRMED' ||
                  order.status === 'SHIPPED') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void run(move.mutateAsync({ id: order.id, to: 'REFUNDED' }))}
                  >
                    {t.trademaster.refundOrder}
                  </Button>
                )}
              </div>
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

      <Modal
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        title={t.trademaster.confirmOrder}
      >
        <form onSubmit={(event) => void handleConfirm(event)} className="flex flex-col gap-4">
          <FormField label={t.trademaster.shippingLabel} hint={t.market.currency}>
            <Input
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              inputMode="numeric"
              dir="ltr"
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={move.isPending}>
              {t.trademaster.confirmOrder}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
