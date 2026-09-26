import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ImageOff, Info, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { useCheckout } from '@/api/trademaster';
import { useCart, toBasket } from '@/lib/cart';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatMoney } from '@/lib/marketplace';
import { toPersianDigits } from '@/i18n/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';

const EMPTY_DELIVERY = {
  recipientName: '',
  recipientPhone: '',
  province: '',
  city: '',
  address: '',
  postalCode: '',
  buyerNote: '',
};

/**
 * The basket, and the one form that turns it into orders.
 *
 * Not split across two pages. A basket with three lines and a delivery address
 * is one decision, and putting a page break in the middle of it buys a
 * progress indicator at the cost of a step people abandon.
 *
 * The basket is grouped by shop and says so, because the server makes one order
 * per shop and three confirmations arriving unannounced would read as a bug.
 */
export default function CartPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  useDocumentTitle(t.trademaster.cart);

  const cart = useCart();
  const checkout = useCheckout();
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = (name: keyof typeof delivery) => (value: string) =>
    setDelivery((prev) => ({ ...prev, [name]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      const created = await checkout.mutateAsync({
        lines: toBasket(cart.lines),
        delivery: {
          recipientName: delivery.recipientName,
          recipientPhone: delivery.recipientPhone,
          province: delivery.province,
          city: delivery.city,
          address: delivery.address,
          postalCode: delivery.postalCode || undefined,
          buyerNote: delivery.buyerNote || undefined,
        },
      });

      // Only once the server has the orders. Clearing optimistically would lose
      // somebody's basket on a failure they then have to rebuild from memory.
      cart.clear();
      showToast(
        created.length > 1
          ? t.trademaster.ordersCreated.replace('{count}', number(created.length))
          : t.trademaster.orderPlaced,
        'success'
      );
      void navigate('/dashboard/orders');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title={t.trademaster.cartEmpty}
          description={t.trademaster.cartEmptyBody}
          icon={<ShoppingBag aria-hidden="true" />}
          action={
            <Link to="/marketplace/products">
              <Button>{t.trademaster.products}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-text-primary">{t.trademaster.cart}</h1>

      {cart.byShop.length > 1 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-border-default bg-surface-muted p-3 text-sm text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t.trademaster.splitNote}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          {cart.byShop.map((shop) => (
            <section key={shop.slug}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-tertiary">
                <Store className="h-4 w-4" aria-hidden="true" />
                <Link to={`/marketplace/shops/${shop.slug}`} className="hover:underline">
                  {shop.name}
                </Link>
              </h2>

              <ul className="flex flex-col divide-y divide-border-default rounded-xl border border-border-default">
                {shop.lines.map((line) => (
                  <li
                    key={`${line.productId}:${line.variantId ?? ''}`}
                    className="flex items-center gap-3 p-3"
                  >
                    {line.coverUrl ? (
                      <img
                        src={apiAssetSrc(line.coverUrl)}
                        alt={line.title}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-tertiary"
                        aria-hidden="true"
                      >
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary">{line.title}</p>
                      {line.variantLabel && (
                        <p className="text-sm text-text-tertiary">{line.variantLabel}</p>
                      )}
                      <p className="text-sm text-text-secondary">
                        {formatMoney(line.unitPrice, locale)} {t.market.currency}
                      </p>
                    </div>

                    <label className="flex shrink-0 items-center gap-2">
                      <span className="sr-only">{t.trademaster.quantity}</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={line.quantity}
                        onChange={(e) =>
                          cart.setQuantity(line, Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
                        }
                        className="w-20"
                        dir="ltr"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => cart.remove(line)}
                      aria-label={t.trademaster.removeLine}
                      className="shrink-0 text-text-tertiary transition hover:text-text-primary"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border-default p-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t.trademaster.subtotal}</dt>
                <dd className="font-medium text-text-primary">
                  {formatMoney(cart.subtotal.toString(), locale)} {t.market.currency}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t.trademaster.shippingCost}</dt>
                <dd className="text-text-tertiary">{t.trademaster.shippingLater}</dd>
              </div>
            </dl>

            {/* Said plainly rather than hidden in small print: the figure above
                is a copy made when each item was added, and the server prices
                the order when it is placed. */}
            <p className="mt-3 text-xs text-text-tertiary">{t.trademaster.priceNote}</p>
          </div>
        </aside>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-10 max-w-2xl">
        <h2 className="mb-4 text-xl font-semibold text-text-primary">
          {t.trademaster.deliveryDetails}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.trademaster.recipientName}>
            <Input
              value={delivery.recipientName}
              onChange={(e) => set('recipientName')(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.trademaster.recipientPhone}>
            <Input
              value={delivery.recipientPhone}
              onChange={(e) => set('recipientPhone')(e.target.value)}
              dir="ltr"
              required
            />
          </FormField>
          <FormField label={t.trademaster.province}>
            <Input
              value={delivery.province}
              onChange={(e) => set('province')(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.trademaster.city}>
            <Input value={delivery.city} onChange={(e) => set('city')(e.target.value)} required />
          </FormField>
          <FormField label={t.trademaster.postalCode}>
            <Input
              value={delivery.postalCode}
              onChange={(e) => set('postalCode')(e.target.value)}
              dir="ltr"
            />
          </FormField>
        </div>

        <FormField label={t.trademaster.address} className="mt-4">
          <TextArea
            value={delivery.address}
            onChange={(e) => set('address')(e.target.value)}
            rows={3}
            required
          />
        </FormField>

        <FormField label={t.trademaster.buyerNote} className="mt-4">
          <TextArea
            value={delivery.buyerNote}
            onChange={(e) => set('buyerNote')(e.target.value)}
            rows={2}
          />
        </FormField>

        {/* Signing in is required by the API, so it is said here rather than
            discovered after the form is filled in. */}
        {!user ? (
          <Link to="/login" className="mt-6 inline-block">
            <Button type="button">{t.auth.loginSubmit}</Button>
          </Link>
        ) : (
          <Button type="submit" className="mt-6" disabled={checkout.isPending}>
            {t.trademaster.placeOrder}
          </Button>
        )}
      </form>
    </div>
  );
}
