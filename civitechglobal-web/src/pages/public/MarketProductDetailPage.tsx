import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Eye, ImageOff, Info, Mail, MapPin, Phone, ShoppingBag, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicProduct, usePublicProducts } from '@/api/trademaster';
import { useCart } from '@/lib/cart';
import { features } from '@/lib/features';
import { useToast } from '@/contexts/ToastContext';
import { toPersianDigits } from '@/i18n/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { KindBadge, MarketplaceNav } from '@/components/trademaster/MarketplaceUi';
import { PRODUCT_GRID, formatCount } from '@/lib/marketFormat';
import { ProductCard } from './MarketProductsPage';
import type { ProductVariant } from '@/types/trademaster';

/** Below this, say how many are left rather than just "in stock". */
const LOW_STOCK_THRESHOLD = 5;

/**
 * One product.
 *
 * There is no basket and no checkout, because there is no payment yet, and a
 * button that looks like it buys something is worse than no button. The page
 * says plainly that the purchase happens off the site and gives the seller's
 * details to make that possible.
 *
 * The variant picker changes the displayed price and stock but submits
 * nothing; a variant with no price of its own means "same as the product",
 * which is the common case.
 */
export default function MarketProductDetailPage() {
  const { shopSlug, productSlug } = useParams<{ shopSlug: string; productSlug: string }>();
  const { t, locale } = useLocale();

  const { data: product, isLoading, isError } = usePublicProduct(shopSlug, productSlug);

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const cart = useCart();
  const { showToast } = useToast();

  useDocumentTitle(product?.title ?? t.trademaster.products, { description: product?.summary });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24">
        <EmptyState title={t.errors.notFoundTitle} description={t.errors.notFoundBody} />
      </div>
    );
  }

  const variant: ProductVariant | undefined = variantId
    ? product.variants.find((candidate) => candidate.id === variantId)
    : undefined;

  // A variant's null price means "same as the product" rather than free.
  const shownPrice = formatMoney(variant?.price ?? product.price, locale);
  const isService = product.kind === 'SERVICE';
  const shownStock = variant ? variant.stock : product.stock;

  // The server's own answer — options counted, services always available — so
  // the page and the board can never disagree about whether it can be had.
  const anyStock = product.available;

  const images = product.images;
  const cover = images[Math.min(activeImage, images.length - 1)];

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  // An option of a service is never sold out; of a product, when it has none.
  const optionSold = (option: ProductVariant) => !isService && option.stock === 0;

  /** How many of this exact product-and-variant are already in the basket. */
  const inBasket = cart.lines
    .filter((line) => line.productId === product.id && (line.variantId ?? null) === variantId)
    .reduce((total, line) => total + line.quantity, 0);

  const handleAdd = () => {
    cart.add({
      productId: product.id,
      variantId: variantId ?? undefined,
      quantity,
      title: product.title,
      variantLabel: variant?.label,
      // The variant's own price when it has one, the product's otherwise —
      // the same rule the server applies, so the basket shows what will be
      // charged rather than a different number.
      unitPrice: variant?.price ?? product.price,
      currency: product.currency,
      coverUrl: images[0]?.url ?? null,
      shopSlug: product.shop.slug,
      shopName: product.shop.name,
    });

    showToast(t.trademaster.addedToCart, 'success');
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <MarketplaceNav className="mb-8" />

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Pictures */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-surface-muted">
            {cover ? (
              <img
                src={apiAssetSrc(cover.url)}
                // The caption when the seller wrote one, since that describes
                // this particular picture; the product name otherwise.
                alt={cover.caption || product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-text-tertiary"
                aria-hidden="true"
              >
                <ImageOff className="h-10 w-10" />
              </div>
            )}
          </div>

          {cover?.caption && (
            <p className="mt-2 text-sm text-text-tertiary">{cover.caption}</p>
          )}

          {images.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {images.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={t.showcase.shotOf
                      .replace('{index}', String(index + 1))
                      .replace('{total}', String(images.length))}
                    aria-current={index === activeImage}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                      index === activeImage ? 'border-border-strong' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={apiAssetSrc(image.url)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The offer */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={product.kind} />
              {product.category && (
                <p className="text-sm text-text-tertiary">{product.category.name}</p>
              )}
            </div>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">{product.title}</h1>
            <p className="mt-3 text-text-secondary">{product.summary}</p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            {shownPrice && (
              <span className="text-2xl font-bold text-text-primary">
                {shownPrice}{' '}
                <span className="text-base font-normal text-text-tertiary">
                  {t.market.currency}
                </span>
              </span>
            )}
            {product.negotiable && <Badge variant="info">{t.trademaster.negotiable}</Badge>}
            {/* A service has no stock to report. */}
            {!isService && (
              <Badge variant={anyStock ? 'success' : 'default'}>
                {anyStock ? t.trademaster.inStock : t.trademaster.outOfStock}
              </Badge>
            )}
          </div>

          {!isService && anyStock && shownStock > 0 && shownStock <= LOW_STOCK_THRESHOLD && (
            <p className="text-sm text-text-secondary">
              {t.trademaster.lowStock.replace('{count}', formatCount(shownStock, locale))}
            </p>
          )}

          {product.variants.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">
                {t.trademaster.variants}
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((option) => {
                  const selected = option.id === variantId;
                  const sold = optionSold(option);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={sold}
                      onClick={() => setVariantId(selected ? null : option.id)}
                      aria-pressed={selected}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? 'border-border-strong bg-surface-muted font-medium text-text-primary'
                          : 'border-border-default text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      {option.label}
                      {sold && ` — ${t.trademaster.outOfStock}`}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Add to the basket, while buying exists at all. The seller block
              below carries their phone and email, which is how a buyer reaches
              them while the module is a catalogue. */}
          {features.tradeMasterOrders && !isService && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-secondary">{t.trademaster.quantity}</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.min(100, shownStock))}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value.replace(/[^0-9]/g, '')) || 1))}
                disabled={!anyStock}
                dir="ltr"
                className="w-24 rounded-lg border border-border-default bg-surface-default px-3 py-2 text-text-primary disabled:opacity-50"
              />
            </label>

            <button
              type="button"
              onClick={handleAdd}
              // Out of stock, or a product with options and none chosen. The
              // server refuses both, so this only saves the round trip — and
              // says which of the two it is, which the server's message cannot.
              disabled={!anyStock || (product.variants.length > 0 && !variantId)}
              className="inline-flex items-center gap-2 rounded-lg bg-surface-inverse px-4 py-2 font-medium text-text-inverse transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {product.variants.length > 0 && !variantId
                ? t.trademaster.chooseVariant
                : t.trademaster.addToCart}
            </button>

            {inBasket > 0 && (
              <Link
                to="/marketplace/cart"
                className="text-sm text-text-secondary underline hover:text-text-primary"
              >
                {t.trademaster.inCart}: {number(inBasket)}
              </Link>
            )}
          </div>
          )}

          {/* Money still does not move on the site; the basket ends in an order
              the seller fulfils and is paid for off-platform for now. */}
          <div className="flex items-start gap-2 rounded-lg border border-border-default bg-surface-muted p-3 text-sm text-text-secondary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{isService ? t.trademaster.hub.bookService : t.trademaster.noPaymentYet}</p>
          </div>

          {/* The seller */}
          <section className="rounded-xl border border-border-default p-4">
            <h2 className="mb-3 text-sm font-medium text-text-tertiary">
              {t.trademaster.soldBy}
            </h2>
            <div className="flex items-start gap-3">
              {product.shop.logoUrl ? (
                <img
                  src={apiAssetSrc(product.shop.logoUrl)}
                  alt={product.shop.name}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-tertiary"
                  aria-hidden="true"
                >
                  <Store className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <Link
                  to={`/marketplace/shops/${product.shop.slug}`}
                  className="font-semibold text-text-primary hover:underline"
                >
                  {product.shop.name}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
                  {product.shop.summary}
                </p>

                {(product.shop.phone || product.shop.email) && (
                  <p className="mt-2 text-xs font-medium text-text-tertiary">
                    {t.trademaster.contactSeller}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {[product.shop.city, product.shop.province].filter(Boolean).length > 0 && (
                    <span className="inline-flex items-center gap-1 text-text-tertiary">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {[product.shop.city, product.shop.province].filter(Boolean).join('، ')}
                    </span>
                  )}
                  {product.shop.phone && (
                    <a
                      href={`tel:${product.shop.phone}`}
                      className="inline-flex items-center gap-1 text-text-secondary hover:underline"
                      dir="ltr"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {product.shop.phone}
                    </a>
                  )}
                  {product.shop.email && (
                    <a
                      href={`mailto:${product.shop.email}`}
                      className="inline-flex items-center gap-1 text-text-secondary hover:underline"
                      dir="ltr"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      {product.shop.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          <p className="inline-flex items-center gap-1 text-sm text-text-tertiary">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {t.trademaster.views.replace('{count}', formatCount(product.views, locale))}
          </p>
        </div>
      </div>

      {product.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold text-text-primary">
            {t.trademaster.productDescription}
          </h2>
          <p className="whitespace-pre-line text-text-secondary">{product.description}</p>
        </section>
      )}

      <MoreFromShop shopSlug={product.shop.slug} exceptId={product.id} />
    </div>
  );
}

/**
 * The rest of this seller's catalogue.
 *
 * A shop is the unit a buyer actually trusts here — they are choosing a
 * potter, not a mug — and without this the only way from one of their things
 * to the next was back out to the board and a search. Four at most: this is a
 * footnote to the product above it, not a second board.
 */
function MoreFromShop({ shopSlug, exceptId }: { shopSlug: string; exceptId: string }) {
  const { t } = useLocale();

  // Five asked for, four shown: the listing being read is in this shop too,
  // so asking for exactly four would leave three whenever it comes back.
  const { data } = usePublicProducts({ shopSlug, page: 1, pageSize: 6, sort: 'newest' });

  const others = (data?.items ?? []).filter((item) => item.id !== exceptId).slice(0, 5);
  if (others.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        {t.trademaster.moreFromShop}
      </h2>
      {/* ProductCard is its own <li>; wrapping it in another made a list
          item inside a list item, which is not a list any more. */}
      <ul className={PRODUCT_GRID}>
        {others.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </ul>
    </section>
  );
}
