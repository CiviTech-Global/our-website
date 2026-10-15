import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { List, Map as MapIcon, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { ListPager } from '@/components/ui/ListPager';
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

/** Results beside the map, per page. Divisible by the list's 1 and 2 columns. */
const PAGE_SIZE = 18;
/** What the reader may switch to; the server stops at 60. */
const PAGE_SIZES = [10, 18, 36, 60];

/**
 * The local market's front door: search and filters, then the shops and the
 * map side by side.
 *
 * The map and the list answer the same question — the same filters, the same
 * search point — drawn two ways, so on a wide screen they sit together: the
 * list scrolls, the map stays in view beside it, and pointing at a shop in the
 * list lights its pin. A pin opens the shop's card docked inside the map. On a
 * phone there is room for one at a time, so a switch chooses which.
 *
 * Filters live in the address bar (useListControls), so a search can be shared
 * or bookmarked; the search point is kept for the session instead, because a
 * shared link should not carry the sender's whereabouts.
 */
export default function MarketplaceHomePage() {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  const explore = t.trademaster.explore;
  useDocumentTitle(hub.exploreTitle, { description: hub.exploreSubtitle });

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    defaultSort: 'newest',
    filters: { kind: '', categoryId: '', businessCategoryId: '', province: '' },
  });
  const location = useMarketLocation();
  const { data: categories } = useProductCategories();
  const { data: businessCategories } = useBusinessCategories();
  const { data: facets } = useShopFacets();

  // Phone only: which of the two the reader is looking at.
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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
    pageSize: controls.pageSize,
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
  const mappable = new Set(pins.map((pin) => pin.id));

  const circle = location.location ? { ...location.location, radiusKm: location.radiusKm } : null;
  const total = results.data?.total ?? 0;

  const viewTab = (value: 'list' | 'map', label: string, Icon: typeof List) => (
    <button
      type="button"
      role="tab"
      aria-selected={mobileView === value}
      onClick={() => setMobileView(value)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors duration-(--dur-feedback)',
        mobileView === value ? 'bg-surface-50 text-text-primary shadow-soft' : 'text-text-secondary hover:text-text-primary'
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="page-frame">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-text-primary">{hub.exploreTitle}</h1>
        <p className="mt-2 max-w-3xl text-text-secondary">{hub.exploreSubtitle}</p>
        <hr className="neon-line mt-4 w-32 [mask-image:none]" aria-hidden="true" />
      </header>

      <MarketplaceNav className="mb-5" />

      {/* Search and filters */}
      <section
        aria-label={hub.filtersLabel}
        className="mb-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-default bg-surface-50 p-4 shadow-soft"
      >
        <label className="relative">
          <span className="sr-only">{hub.searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={controls.searchInput}
            onChange={(event) => controls.setSearch(event.target.value)}
            placeholder={hub.searchPlaceholder}
            className="ps-10"
            maxLength={120}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <KindToggle value={kind} onChange={(next) => controls.setFilter('kind', next)} />

          <BusinessCategorySelect
            className="w-full sm:w-60"
            categories={businessCategories}
            value={controls.filters.businessCategoryId}
            onChange={(value) => controls.setFilter('businessCategoryId', value)}
            emptyLabel={hub.allBusinessCategories}
          />

          <CategorySelect
            className="w-full sm:w-60"
            categories={categories}
            kind={kind}
            value={categoryId}
            onChange={(value) => controls.setFilter('categoryId', value)}
            emptyLabel={hub.allListingCategories}
          />

          {(facets?.provinces.length ?? 0) > 1 && (
            <Select
              className="w-full sm:w-44"
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
              className="text-sm font-semibold text-brand-green-700 underline-offset-4 hover:underline dark:text-brand-green-300"
            >
              {hub.clearFilters}
            </button>
          )}
        </div>

        <LocationBar location={location} className="border-t border-border-subtle pt-3" />
      </section>

      {/* A phone has room for one view at a time. */}
      <div role="tablist" aria-label={hub.resultsLabel} className="mb-4 flex gap-1 rounded-xl bg-surface-200 p-1 lg:hidden">
        {viewTab('list', explore.showList, List)}
        {viewTab('map', explore.showMap, MapIcon)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* The shops */}
        <section
          id="market-results"
          aria-label={hub.resultsLabel}
          aria-busy={results.isFetching}
          className={cn('scroll-mt-24', mobileView === 'map' && 'hidden lg:block')}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-text-primary" role="status">
              {results.isLoading ? t.common.loading : hub.shopCount.replace('{count}', formatCount(total, locale))}
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
            <NothingNearby radiusKm={location.radiusKm} nearestKm={results.data?.nearestKm} onWiden={location.setRadius} />
          )}

          {!results.isLoading && !near && total === 0 && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong p-8 text-center text-sm text-text-secondary">
              {controls.activeCount > 0 ? t.list.noResultsBody : t.trademaster.noShops}
            </div>
          )}

          {total > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {results.data?.items.map((shop) => (
                // Pointing at a shop lights its pin; the list stays the way in.
                <ShopResultCard
                  key={shop.id}
                  shop={shop}
                  kindParam={kind || undefined}
                  onPoint={mappable.has(shop.id) ? (pointing) => setHighlightId(pointing ? shop.id : null) : undefined}
                />
              ))}
            </ul>
          )}

          {results.data && (
            <ListPager
              className="mt-8"
              page={controls.page}
              pageSize={controls.pageSize}
              total={results.data.total}
              totalPages={results.data.totalPages}
              onPageChange={(next) => {
                controls.setPage(next);
                document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              pageSizeOptions={controls.pageSizeOptions}
              onPageSizeChange={controls.setPageSize}
            />
          )}
        </section>

        {/* The map: beside the list and in view while it scrolls; on a phone,
            the other tab. */}
        <section
          aria-label={t.trademaster.shops}
          className={cn(
            'lg:sticky lg:top-24 lg:self-start',
            mobileView === 'list' && 'hidden lg:block'
          )}
        >
          <Suspense fallback={<div className="h-[60dvh] animate-pulse rounded-[var(--radius-card)] bg-surface-muted lg:h-[calc(100dvh-8rem)]" />}>
            <ShopMap
              pins={pins}
              circle={circle}
              onPick={location.pick}
              selectedId={selectedId}
              onSelect={setSelectedId}
              highlightId={highlightId}
              height="clamp(380px, 62dvh, 760px)"
              className="lg:!h-[calc(100dvh-8rem)]"
            />
          </Suspense>
          <p className="mt-2 text-sm text-text-tertiary">{hub.mapHint}</p>
          {map.data?.truncated && (
            <p className="mt-1 text-sm text-text-secondary" role="status">
              {hub.truncated.replace('{count}', formatCount(map.data.items.length, locale))}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
