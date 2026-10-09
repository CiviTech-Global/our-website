import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { Globe, Mail, MapPin, Phone, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicProducts, usePublicShop } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ListPager } from '@/components/ui/ListPager';
import { useListControls } from '@/lib/useListControls';
import { KindToggle, MarketplaceNav, OfferBadges } from '@/components/trademaster/MarketplaceUi';
import { PRODUCT_GRID, type KindFilter } from '@/lib/marketFormat';
import { ProductCard } from './MarketProductsPage';

// Lazy, always: Leaflet is around 45 KB gzipped and most visitors to a shop
// page never scroll to the map.
const ShopMap = lazy(() => import('@/components/trademaster/ShopMap'));

/** Divisible by the grid's 2, 3 and 5 columns. */
const PAGE_SIZE = 30;
/** What the reader may switch to; the server stops at 60. */
const PAGE_SIZES = [15, 30, 45, 60];

/**
 * One shop, and what it offers: products, services, or both.
 *
 * The products are fetched through the ordinary board endpoint filtered by
 * shop rather than embedded in the shop response: it gives paging for free and
 * means a shop with four hundred products does not serialise all of them into
 * one document nobody reads past the first screen.
 */
export default function ShopDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLocale();

  const { data: shop, isLoading, isError } = usePublicShop(slug);

  // `kind` arrives in the address when the reader came from browsing
  // services (or products), so the shop opens on what they were looking for.
  const controls = useListControls({
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    filters: { kind: '' },
  });
  const kind = controls.filters.kind as KindFilter;
  const { data: products, isLoading: loadingProducts } = usePublicProducts({
    page: controls.page,
    pageSize: controls.pageSize,
    shopSlug: slug,
    kind: kind || undefined,
  });

  useDocumentTitle(shop?.name ?? t.trademaster.shops, {
    description: shop?.summary,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className="page-frame page-frame-reading">
        <EmptyState title={t.errors.notFoundTitle} description={t.errors.notFoundBody} />
      </div>
    );
  }

  const where = [shop.address, shop.city, shop.province].filter(Boolean).join('، ');
  // The switch only when there is something to switch between.
  const offersBoth = shop.kinds.length > 1;
  const heading =
    shop.kinds.length === 1 && shop.kinds[0] === 'SERVICE'
      ? t.trademaster.hub.kindServices
      : offersBoth
        ? t.trademaster.hub.navListings
        : t.trademaster.products;

  return (
    <div className="page-frame">
      <MarketplaceNav className="mb-8" />

      {/* The shop's own photograph across the top, when it has uploaded one.
          A stand-in (a product picture or the logo) would only repeat what
          the page already shows below. */}
      {shop.hasCover && shop.coverUrl && (
        <img
          src={apiAssetSrc(shop.coverUrl)}
          alt=""
          className="mb-8 h-56 w-full rounded-2xl object-cover sm:h-72"
        />
      )}

      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start">
        {shop.logoUrl ? (
          <img
            src={apiAssetSrc(shop.logoUrl)}
            alt={shop.name}
            className="h-24 w-24 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text-tertiary"
            aria-hidden="true"
          >
            <Store className="h-10 w-10" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-text-primary">{shop.name}</h1>
          {(shop.businessCategory?.name ?? shop.industry) && (
            <p className="mt-1 text-text-tertiary">{shop.businessCategory?.name ?? shop.industry}</p>
          )}
          <div className="mt-2">
            <OfferBadges kinds={shop.kinds} />
          </div>
          <p className="mt-3 text-text-secondary">{shop.summary}</p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {where && (
              <div className="inline-flex items-center gap-1.5 text-text-secondary">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">{t.trademaster.address}</dt>
                <dd>{where}</dd>
              </div>
            )}
            {shop.phone && (
              <div className="inline-flex items-center gap-1.5 text-text-secondary">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">{t.trademaster.phone}</dt>
                <dd>
                  <a href={`tel:${shop.phone}`} className="hover:underline" dir="ltr">
                    {shop.phone}
                  </a>
                </dd>
              </div>
            )}
            {shop.email && (
              <div className="inline-flex items-center gap-1.5 text-text-secondary">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">{t.trademaster.email}</dt>
                <dd>
                  <a href={`mailto:${shop.email}`} className="hover:underline" dir="ltr">
                    {shop.email}
                  </a>
                </dd>
              </div>
            )}
            {shop.website && (
              <div className="inline-flex items-center gap-1.5 text-text-secondary">
                <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                <dt className="sr-only">{t.trademaster.website}</dt>
                <dd>
                  {/* noopener on a seller-supplied link: without it the opened
                      page gets a handle on this one through window.opener. */}
                  <a
                    href={shop.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:underline"
                    dir="ltr"
                  >
                    {t.trademaster.visitWebsite}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {shop.description && (
        <section className="mb-10 max-w-3xl">
          <p className="whitespace-pre-line text-text-secondary">{shop.description}</p>
        </section>
      )}

      {shop.latitude !== null && shop.longitude !== null && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold text-text-primary">{t.trademaster.location}</h2>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-surface-muted" />}>
            <ShopMap
              pins={[
                {
                  id: shop.id,
                  latitude: shop.latitude,
                  longitude: shop.longitude,
                  label: shop.name,
                  detail: shop.summary,
                },
              ]}
            />
          </Suspense>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-text-primary">{heading}</h2>
          {offersBoth && (
            <KindToggle value={kind} onChange={(next) => controls.setFilter('kind', next)} />
          )}
        </div>

        {loadingProducts && (
          <div className="flex justify-center py-12">
            <Spinner label={t.common.loading} />
          </div>
        )}

        {!loadingProducts && products?.items.length === 0 && (
          <EmptyState title={t.trademaster.noProducts} />
        )}

        {!loadingProducts && (products?.items.length ?? 0) > 0 && (
          <ul className={PRODUCT_GRID}>
            {products?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}

        {products && (
          <ListPager
            className="mt-8"
            page={controls.page}
            pageSize={controls.pageSize}
            total={products.total}
            totalPages={products.totalPages}
            onPageChange={controls.setPage}
            pageSizeOptions={controls.pageSizeOptions}
            onPageSizeChange={controls.setPageSize}
          />
        )}
      </section>
    </div>
  );
}
