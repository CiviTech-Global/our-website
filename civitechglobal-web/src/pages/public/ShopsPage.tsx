import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { MapPin, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import {
  useBusinessCategories,
  useProductCategories,
  useShopFacets,
  usePublicShops,
} from '@/api/trademaster';
import { ShopResultCard } from '@/components/trademaster/ShopCards';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { useMarketLocation } from '@/lib/useMarketLocation';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
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
  OfferBadges,
} from '@/components/trademaster/MarketplaceUi';
import { categoryForKind, formatCount, formatKm, type KindFilter } from '@/lib/marketFormat';
import type { PublicShopSummary, ShopSort } from '@/types/trademaster';

// Lazy: around 45 KB gzipped, and it is only drawn once somebody asks where
// the shops are.
const ShopMap = lazy(() => import('@/components/trademaster/ShopMap'));

const PAGE_SIZE = 24;

/**
 * The public shop directory.
 *
 * Cards by default, because a shop is recognised by its logo and its trade
 * before its name is read. The row view is for the other way of looking —
 * scanning a column of places by town, which a grid makes awkward.
 *
 * With a search point set, the list is every shop within the chosen radius,
 * nearest first, and the map shows the circle being searched. An empty circle
 * says how far the nearest shop is and offers to widen it — "near me" used to
 * answer a reader 140 km from the nearest shop with an empty page and no map,
 * which read as a broken button.
 */
export default function ShopsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.trademaster.shops, { description: t.trademaster.metaDescription });

  const controls = useListControls({
    defaultView: 'cards',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    filters: { province: '', businessCategoryId: '', kind: '', categoryId: '' },
  });

  const location = useMarketLocation();
  const { data: facets } = useShopFacets();
  const { data: categories } = useProductCategories();
  const { data: businessCategories } = useBusinessCategories();

  const kind = controls.filters.kind as KindFilter;
  const categoryId = categoryForKind(categories, controls.filters.categoryId, kind);

  // See MarketplaceHomePage: a category of the other kind is ignored at once
  // and dropped from the address bar a tick later.
  const { setFilter, setPage } = controls;
  useEffect(() => {
    if (controls.filters.categoryId && !categoryId && categories) setFilter('categoryId', '');
  }, [controls.filters.categoryId, categoryId, categories, setFilter]);

  // A new search point or radius is a new list: page 4 of the old one means
  // nothing in the new one.
  const { latitude, longitude, radiusKm } = location.query as {
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  };
  const searchPoint = [latitude, longitude, radiusKm].join(',');
  const lastSearchPoint = useRef(searchPoint);
  useEffect(() => {
    // Only on a change: on first load the page number in the address bar is
    // what the reader asked for, from a link or the back button.
    if (lastSearchPoint.current === searchPoint) return;
    lastSearchPoint.current = searchPoint;
    setPage(1);
  }, [searchPoint, setPage]);

  const near = Boolean(location.location);

  const { data, isLoading } = usePublicShops({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    province: controls.filters.province || undefined,
    businessCategoryId: controls.filters.businessCategoryId || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
    ...location.query,
    // Distance is the order of a radius search, whatever the menu said.
    sort: near ? 'nearest' : (controls.sort as ShopSort),
  });

  // Every shop in the answer that has a location. A shop that only ships has
  // none, and is in the list without being on the map.
  const pins = (data?.items ?? [])
    .filter((shop) => shop.latitude != null && shop.longitude != null)
    .map((shop) => ({
      id: shop.id,
      latitude: shop.latitude as number,
      longitude: shop.longitude as number,
      label: shop.name,
      detail: shop.summary,
      href: `/marketplace/shops/${shop.slug}`,
    }));

  const circle = location.location ? { ...location.location, radiusKm: location.radiusKm } : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{t.trademaster.shops}</h1>
        <p className="mt-2 text-text-secondary">{t.trademaster.subtitle}</p>
      </header>

      <MarketplaceNav className="mb-6" />

      <LocationBar location={location} className="mb-4" />

      {circle && (
        <Suspense fallback={<div className="mb-6 h-72 animate-pulse rounded-xl bg-surface-muted" />}>
          <ShopMap pins={pins} circle={circle} onPick={location.pick} className="mb-6" height={288} />
        </Suspense>
      )}

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={t.trademaster.searchShops}
        searchLabel={t.trademaster.searchShops}
        total={data?.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          <>
            <KindToggle value={kind} onChange={(next) => controls.setFilter('kind', next)} />

            <CategorySelect
              className="w-52"
              categories={categories}
              kind={kind}
              value={categoryId}
              onChange={(value) => controls.setFilter('categoryId', value)}
              emptyLabel={t.trademaster.allCategories}
            />

            {/* Built from the provinces and trades shops have actually
                written, so no option here can come back empty. Hidden
                entirely when there is only one of a kind to choose. */}
            {(facets?.provinces.length ?? 0) > 1 && (
              <Select
                className="w-44"
                value={controls.filters.province}
                aria-label={t.trademaster.filterProvince}
                onChange={(e) => controls.setFilter('province', e.target.value)}
              >
                <option value="">{t.trademaster.filterAllProvinces}</option>
                {facets?.provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </Select>
            )}

            {/* The guild list, rather than the free-text trades shops used
                to type: twelve spellings of one trade made that filter miss
                most of the shops it was meant to find. */}
            <BusinessCategorySelect
              className="w-56"
              categories={businessCategories}
              value={controls.filters.businessCategoryId}
              onChange={(value) => controls.setFilter('businessCategoryId', value)}
              emptyLabel={t.trademaster.hub.allBusinessCategories}
            />

            {/* Not offered during a radius search, which is ordered by
                distance; a menu that changes nothing is worse than none. */}
            {!near && (
              <Select
                className="w-48"
                value={controls.sort}
                aria-label={t.list.sortLabel}
                onChange={(e) => controls.setSort(e.target.value)}
              >
                <option value="newest">{t.trademaster.sortNewest}</option>
                <option value="name">{t.trademaster.sortName}</option>
              </Select>
            )}
          </>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && near && data?.total === 0 && (
        <NothingNearby
          radiusKm={location.radiusKm}
          nearestKm={data.nearestKm}
          onWiden={location.setRadius}
        />
      )}

      {!isLoading && !near && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.trademaster.noShops}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {!isLoading && controls.view === 'cards' && (data?.items.length ?? 0) > 0 && (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((shop) => (
            <ShopResultCard key={shop.id} shop={shop} kindParam={kind || undefined} />
          ))}
        </ul>
      )}

      {!isLoading && controls.view === 'table' && (data?.items.length ?? 0) > 0 && (
        <ul className="flex flex-col divide-y divide-border-default overflow-hidden rounded-xl border border-border-default">
          {data?.items.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            page={controls.page}
            totalPages={data.totalPages}
            onPageChange={controls.setPage}
          />
        </div>
      )}

      {/* The way in for a shop that is not here yet. */}
      <p className="mt-10 text-center text-sm text-text-secondary">
        {t.trademaster.hub.joinPrompt}{' '}
        <Link to="/marketplace/join" className="font-medium text-text-primary underline">
          {t.trademaster.hub.navJoin}
        </Link>
      </p>

      {/* Kept out of the list's own markup so the count reads naturally once. */}
      <span className="sr-only" role="status">
        {data ? t.trademaster.hub.shopCount.replace('{count}', formatCount(data.total, locale)) : ''}
      </span>
    </div>
  );
}

function ShopLogo({ shop, size }: { shop: PublicShopSummary; size: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11';

  if (!shop.logoUrl) {
    return (
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-tertiary`}
        aria-hidden="true"
      >
        <Store className="h-1/2 w-1/2" />
      </div>
    );
  }

  return (
    <img
      src={apiAssetSrc(shop.logoUrl)}
      // The shop name, not "logo": a screen reader announcing "logo" three
      // dozen times down a directory has learned nothing about any of them.
      alt={shop.name}
      className={`${box} shrink-0 rounded-lg object-cover`}
      loading="lazy"
    />
  );
}

function Where({ shop }: { shop: PublicShopSummary }) {
  const { t, locale } = useLocale();
  const where = [shop.city, shop.province].filter(Boolean).join('، ');

  // The distance is the more useful of the two on a proximity search, so it
  // shows even for a shop that never filled in a town.
  const distance =
    shop.distanceKm === undefined
      ? null
      : t.trademaster.distanceAway.replace('{km}', formatKm(shop.distanceKm, locale));

  if (!where && !distance) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
      {[where, distance].filter(Boolean).join(' · ')}
    </span>
  );
}

function ShopRow({ shop }: { shop: PublicShopSummary }) {
  const { t, locale } = useLocale();

  return (
    <li className="bg-surface-default transition hover:bg-surface-muted">
      <Link to={`/marketplace/shops/${shop.slug}`} className="flex items-center gap-3 p-4">
        <ShopLogo shop={shop} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium text-text-primary">{shop.name}</h2>
          <p className="truncate text-sm text-text-secondary">
            {shop.businessCategory?.name ?? shop.industry ?? shop.summary}
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <Where shop={shop} />
          <OfferBadges kinds={shop.kinds} />
          <span className="text-sm text-text-tertiary">
            {t.trademaster.productCount.replace('{count}', formatCount(shop.productCount, locale))}
          </span>
        </div>
      </Link>
    </li>
  );
}
