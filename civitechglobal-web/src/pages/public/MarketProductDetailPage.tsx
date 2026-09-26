import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Eye, ImageOff, Info, Mail, MapPin, Phone, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicProduct } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
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
  const shownStock = variant ? variant.stock : product.stock;

  // With variants, the product's own stock is ignored — the server does the
  // same when deciding whether anything is available.
  const anyStock = product.variants.length
    ? product.variants.some((candidate) => candidate.stock > 0)
    : product.stock > 0;

  const images = product.images;
  const cover = images[Math.min(activeImage, images.length - 1)];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
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
            {product.category && (
              <p className="text-sm text-text-tertiary">{product.category.name}</p>
            )}
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
            <Badge variant={anyStock ? 'success' : 'default'}>
              {anyStock ? t.trademaster.inStock : t.trademaster.outOfStock}
            </Badge>
          </div>

          {anyStock && shownStock > 0 && shownStock <= LOW_STOCK_THRESHOLD && (
            <p className="text-sm text-text-secondary">
              {t.trademaster.lowStock.replace('{count}', String(shownStock))}
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
                  const sold = option.stock === 0;
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

          {/* No basket, no checkout. See the note at the top of this file. */}
          <div className="flex items-start gap-2 rounded-lg border border-border-default bg-surface-muted p-3 text-sm text-text-secondary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{t.trademaster.noPaymentYet}</p>
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

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
            {t.trademaster.views.replace('{count}', String(product.views))}
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
    </div>
  );
}
