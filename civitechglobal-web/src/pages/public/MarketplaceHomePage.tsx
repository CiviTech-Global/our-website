import { lazy, Suspense, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { useProductCategories, useShopFacets, useShopMap } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { useMarketLocation } from '@/lib/useMarketLocation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  CategorySelect,
  KindToggle,
  LocationBar,
  MarketplaceNav,
  NothingNearby,
  OfferBadges,
} from '@/components/trademaster/MarketplaceUi';
import { categoryForKind, formatCount, formatKm, type KindFilter } from '@/lib/marketFormat';
import type { ListingKind, PublicShopSummary } from '@/types/trademaster';

// Lazy: Leaflet is around 45 KB gzipped, and nobody else on the site needs it.
const ShopMap = lazy(() => import('@/components/trademaster/ShopMap'));

/**
 * The marketplace's front door: a map of the shops, with every way of
 * narrowing it down beside it.
 *
 * The map and the list are the same answer drawn twice — every shop in the
 * list with a location is a pin, and every pin is in the list — so a reader can
 * work from whichever they think in. Clicking the map chooses the point to
 * search around, which is how "near me" works for somebody whose browser will
 * not say where they are.
 *
 * Filters live in the address bar (useListControls), so a search can be shared
 * or bookmarked; the search point is kept for the session instead, because a
 * shared link should not carry the sender's whereabouts.
 */
export default function MarketplaceHomePage() {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  useDocumentTitle(hub.exploreTitle, { description: hub.exploreSubtitle });

  const controls = useListControls({
    filters: { kind: '', categoryId: '', province: '', industry: '' },
  });
  const location = useMarketLocation();
  const { data: categories } = useProductCategories();
  const { data: facets } = useShopFacets();

  const kind = controls.filters.kind as KindFilter;
  const categoryId = categoryForKind(categories, controls.filters.categoryId, kind);

  // A category belongs to one kind. Switching to Products with "Barbershop"
  // still chosen would filter down to nothing with no visible cause, so the
  // stale choice is ignored at once (above) and dropped from the address bar
  // here, a tick later — two address-bar writes in one event overwrite each
  // other.
  const { setFilter } = controls;
  useEffect(() => {
    if (controls.filters.categoryId && !categoryId && categories) setFilter('categoryId', '');
  }, [controls.filters.categoryId, categoryId, categories, setFilter]);

  const { data, isLoading, isFetching } = useShopMap({
    search: controls.search || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
    province: controls.filters.province || undefined,
    industry: controls.filters.industry || undefined,
    ...location.query,
  });

  const shops = data?.items ?? [];
  const pins = shops
    .filter((shop) => shop.latitude != null && shop.longitude != null)
    .map((shop) => ({
      id: shop.id,
      latitude: shop.latitude as number,
      longitude: shop.longitude as number,
      label: shop.name,
      detail: shop.summary,
      href: `/marketplace/shops/${shop.slug}`,
    }));

  const circle = location.location
    ? { ...location.location, radiusKm: location.radiusKm }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{hub.exploreTitle}</h1>
        <p className="mt-2 max-w-3xl text-text-secondary">{hub.exploreSubtitle}</p>
      </header>

      <MarketplaceNav className="mb-6" />

      <section aria-label={hub.filtersLabel} className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">{hub.searchPlaceholder}</span>
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={controls.searchInput}
              onChange={(event) => controls.setSearch(event.target.value)}
              placeholder={hub.searchPlaceholder}
              className="ps-9"
              maxLength={120}
            />
          </label>
          <KindToggle value={kind} onChange={(next) => controls.setFilter('kind', next)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CategorySelect
            className="w-56"
            categories={categories}
            kind={kind}
            value={categoryId}
            onChange={(value) => controls.setFilter('categoryId', value)}
            emptyLabel={t.trademaster.allCategories}
          />

          {(facets?.provinces.length ?? 0) > 1 && (
            <Select
              className="w-44"
              value={controls.filters.province}
              aria-label={t.trademaster.filterProvince}
              onChange={(event) => controls.setFilter('province', event.target.value)}
            >
              <option value="">{t.trademaster.filterAllProvinces}</option>
              {facets?.provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </Select>
          )}

          {(facets?.industries.length ?? 0) > 1 && (
            <Select
              className="w-48"
              value={controls.filters.industry}
              aria-label={t.trademaster.filterIndustry}
              onChange={(event) => controls.setFilter('industry', event.target.value)}
            >
              <option value="">{t.trademaster.filterAllIndustries}</option>
              {facets?.industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </Select>
          )}

          {controls.activeCount > 0 && (
            <button
              type="button"
              onClick={controls.clear}
              className="text-sm text-text-secondary underline hover:text-text-primary"
            >
              {hub.clearFilters}
            </button>
          )}
        </div>

        <LocationBar location={location} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Suspense fallback={<div className="h-[520px] animate-pulse rounded-xl bg-surface-muted" />}>
            <ShopMap pins={pins} circle={circle} onPick={location.pick} height={520} />
          </Suspense>
          <p className="mt-2 text-sm text-text-tertiary">{hub.mapHint}</p>
          {data?.truncated && (
            <p className="mt-1 text-sm text-text-secondary" role="status">
              {hub.truncated.replace('{count}', formatCount(shops.length, locale))}
            </p>
          )}
        </div>

        <section aria-label={hub.resultsLabel} aria-busy={isFetching} className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary" role="status">
            {isLoading
              ? t.common.loading
              : hub.shopCount.replace('{count}', formatCount(data?.total ?? 0, locale))}
          </p>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner label={t.common.loading} />
            </div>
          )}

          {!isLoading && circle && data?.total === 0 && (
            <NothingNearby
              radiusKm={location.radiusKm}
              nearestKm={data.nearestKm}
              onWiden={location.setRadius}
            />
          )}

          {!isLoading && !circle && shops.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-default p-6 text-center text-sm text-text-secondary">
              {controls.activeCount > 0 ? t.list.noResultsBody : hub.noLocated}
            </div>
          )}

          <ul className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pe-1">
            {shops.map((shop) => (
              <ShopResult key={shop.id} shop={shop} kind={kind} />
            ))}
          </ul>

          <Link
            to="/marketplace/shops"
            className="text-sm font-medium text-text-primary underline hover:no-underline"
          >
            {hub.seeAllShops}
          </Link>
        </section>
      </div>
    </div>
  );
}

function ShopResult({ shop, kind }: { shop: PublicShopSummary; kind: KindFilter }) {
  const { t, locale } = useLocale();
  const where = [shop.city, shop.province].filter(Boolean).join('، ');
  // When browsing services, a shop's link opens its services; likewise products.
  const target = kind ? `/marketplace/shops/${shop.slug}?kind=${kind}` : `/marketplace/shops/${shop.slug}`;

  return (
    <li>
      <Link
        to={target}
        className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-default p-3 transition hover:border-border-strong"
      >
        {shop.logoUrl ? (
          <img
            src={apiAssetSrc(shop.logoUrl)}
            alt={shop.name}
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
            loading="lazy"
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
          <p className="truncate font-medium text-text-primary">{shop.name}</p>
          {shop.industry && <p className="truncate text-xs text-text-tertiary">{shop.industry}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <OfferBadges kinds={shop.kinds as ListingKind[]} />
            {shop.distanceKm !== undefined && (
              <span>{t.trademaster.distanceAway.replace('{km}', formatKm(shop.distanceKm, locale))}</span>
            )}
            {where && shop.distanceKm === undefined && <span>{where}</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}
