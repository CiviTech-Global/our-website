import { lazy, Suspense, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import {
  useBusinessCategories,
  useProductCategories,
  usePublicShops,
  useShopFacets,
  useShopMap,
} from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { useMarketLocation } from '@/lib/useMarketLocation';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  BusinessCategorySelect,
  CategorySelect,
  KindToggle,
  LocationBar,
  MarketplaceNav,
  NothingNearby,
} from '@/components/trademaster/MarketplaceUi';
import { ShopPopupCard, ShopResultCard } from '@/components/trademaster/ShopCards';
import { categoryForKind, formatCount, type KindFilter } from '@/lib/marketFormat';
import type { ShopSort } from '@/types/trademaster';

// Lazy: Leaflet is around 45 KB gzipped, and nobody else on the site needs it.
const ShopMap = lazy(() => import('@/components/trademaster/ShopMap'));

/** Results under the map, per page. Divisible by the grid's 1, 2 and 3 columns. */
const PAGE_SIZE = 12;

/**
 * The local market's front door: search and filters, the map, and the
 * results under it.
 *
 * The map and the results answer the same question — the same filters, the
 * same search point — drawn two ways. The map shows every matching shop at
 * once, each pin opening the shop's place card; the results below are the same
 * shops a page at a time, nearest first when there is a search point.
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
    pageSize: PAGE_SIZE,
    defaultSort: 'newest',
    filters: { kind: '', categoryId: '', businessCategoryId: '', province: '' },
  });
  const location = useMarketLocation();
  const { data: categories } = useProductCategories();
  const { data: businessCategories } = useBusinessCategories();
  const { data: facets } = useShopFacets();

  const kind = controls.filters.kind as KindFilter;
  const categoryId = categoryForKind(categories, controls.filters.categoryId, kind);

  // A category belongs to one kind. Switching to Products with "Barbershop"
  // still chosen would filter down to nothing with no visible cause, so the
  // stale choice is ignored at once (above) and dropped from the address bar
  // here, a tick later — two address-bar writes in one event overwrite each
  // other.
  const { setFilter, setPage } = controls;
  useEffect(() => {
    if (controls.filters.categoryId && !categoryId && categories) setFilter('categoryId', '');
  }, [controls.filters.categoryId, categoryId, categories, setFilter]);

  // A new search point or radius is a new answer; page 3 of the old one means
  // nothing in it. Only on a change: on first load the page in the address bar
  // is what the reader asked for.
  const searchPoint = [location.location?.latitude, location.location?.longitude, location.radiusKm].join(',');
  const lastSearchPoint = useRef(searchPoint);
  useEffect(() => {
    if (lastSearchPoint.current === searchPoint) return;
    lastSearchPoint.current = searchPoint;
    setPage(1);
  }, [searchPoint, setPage]);

  const filters = {
    search: controls.search || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
    businessCategoryId: controls.filters.businessCategoryId || undefined,
    province: controls.filters.province || undefined,
    ...location.query,
  };

  const near = Boolean(location.location);
  const map = useShopMap(filters);
  const results = usePublicShops({
    ...filters,
    page: controls.page,
    pageSize: PAGE_SIZE,
    sort: near ? 'nearest' : (controls.sort as ShopSort),
  });

  const pins = (map.data?.items ?? [])
    .filter((shop) => shop.latitude != null && shop.longitude != null)
    .map((shop) => ({
      id: shop.id,
      latitude: shop.latitude as number,
      longitude: shop.longitude as number,
      label: shop.name,
      card: <ShopPopupCard shop={shop} />,
    }));

  const circle = location.location ? { ...location.location, radiusKm: location.radiusKm } : null;
  const total = results.data?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{hub.exploreTitle}</h1>
        <p className="mt-2 max-w-3xl text-text-secondary">{hub.exploreSubtitle}</p>
      </header>

      <MarketplaceNav className="mb-6" />

      {/* Search and filters */}
      <section
        aria-label={hub.filtersLabel}
        className="mb-5 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-4"
      >
        <label className="relative">
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

        <div className="flex flex-wrap items-center gap-3">
          <KindToggle value={kind} onChange={(next) => controls.setFilter('kind', next)} />

          <BusinessCategorySelect
            className="w-60"
            categories={businessCategories}
            value={controls.filters.businessCategoryId}
            onChange={(value) => controls.setFilter('businessCategoryId', value)}
            emptyLabel={hub.allBusinessCategories}
          />

          <CategorySelect
            className="w-60"
            categories={categories}
            kind={kind}
            value={categoryId}
            onChange={(value) => controls.setFilter('categoryId', value)}
            emptyLabel={hub.allListingCategories}
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

      {/* The map */}
      <Suspense fallback={<div className="h-[460px] animate-pulse rounded-2xl bg-surface-muted" />}>
        <ShopMap pins={pins} circle={circle} onPick={location.pick} height={460} />
      </Suspense>
      <p className="mt-2 text-sm text-text-tertiary">{hub.mapHint}</p>
      {map.data?.truncated && (
        <p className="mt-1 text-sm text-text-secondary" role="status">
          {hub.truncated.replace('{count}', formatCount(map.data.items.length, locale))}
        </p>
      )}

      {/* The results, under the map */}
      <section
        id="market-results"
        aria-label={hub.resultsLabel}
        aria-busy={results.isFetching}
        className="mt-8 scroll-mt-24"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-text-primary" role="status">
            {results.isLoading
              ? t.common.loading
              : hub.shopCount.replace('{count}', formatCount(total, locale))}
          </h2>
          {near ? (
            <span className="text-sm text-text-tertiary">{hub.sortedByDistance}</span>
          ) : (
            <Select
              className="w-44"
              value={controls.sort}
              aria-label={t.list.sortLabel}
              onChange={(event) => controls.setSort(event.target.value)}
            >
              <option value="newest">{t.trademaster.sortNewest}</option>
              <option value="name">{t.trademaster.sortName}</option>
            </Select>
          )}
        </div>

        {results.isLoading && (
          <div className="flex justify-center py-12">
            <Spinner label={t.common.loading} />
          </div>
        )}

        {!results.isLoading && near && total === 0 && (
          <NothingNearby
            radiusKm={location.radiusKm}
            nearestKm={results.data?.nearestKm}
            onWiden={location.setRadius}
          />
        )}

        {!results.isLoading && !near && total === 0 && (
          <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-text-secondary">
            {controls.activeCount > 0 ? t.list.noResultsBody : t.trademaster.noShops}
          </div>
        )}

        {total > 0 && (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.data?.items.map((shop) => (
              <ShopResultCard key={shop.id} shop={shop} kindParam={kind || undefined} />
            ))}
          </ul>
        )}

        {results.data && results.data.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              page={controls.page}
              totalPages={results.data.totalPages}
              onPageChange={(next) => {
                controls.setPage(next);
                // Back to the top of the results, not the top of the page:
                // the map is above them and the reader is reading the list.
                document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
