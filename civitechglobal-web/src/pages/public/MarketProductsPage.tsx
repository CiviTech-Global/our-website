import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ImageOff, MapPin } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { useShopFacets, usePublicProducts, useProductCategories } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { useListControls } from '@/lib/useListControls';
import { useMarketLocation } from '@/lib/useMarketLocation';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListPager } from '@/components/ui/ListPager';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  CategorySelect,
  KindToggle,
  LocationBar,
  MarketplaceNav,
  NothingNearby,
} from '@/components/trademaster/MarketplaceUi';
import { PRODUCT_GRID, categoryForKind, formatKm, type KindFilter } from '@/lib/marketFormat';
import type { ProductSort, PublicProductSummary } from '@/types/trademaster';

/** Divisible by the grid's 2, 3 and 5 columns. */
const PAGE_SIZE = 30;
/** What the reader may switch to; the server stops at 60. */
const PAGE_SIZES = [15, 30, 45, 60];

/**
 * Products and services, in one catalogue with a switch between them.
 *
 * Cards only. A listing is chosen on the strength of its picture, and a table
 * of prices without pictures is a spreadsheet — for narrowing down, the filters
 * do that job better than a different layout would.
 *
 * The product/service switch comes first because it is the first question:
 * somebody after a coat and somebody after a haircut want different lists, and
 * the categories offered follow the switch so neither sees the other's.
 *
 * A listing appears only while both it and its shop are published, which the
 * server enforces; nothing here needs to know that.
 */

/**
 * A price box's contents as the digits the server takes.
 *
 * Persian digits are read as digits and separators are dropped. The old
 * version dropped every non-ASCII character, so a price typed on a Persian
 * keyboard filtered by nothing at all.
 */
function priceDigits(value: string): string {
  return toLatinDigits(value).replace(/[^0-9]/g, '');
}

export default function MarketProductsPage() {
  const { t } = useLocale();
  const hub = t.trademaster.hub;
  useDocumentTitle(hub.listingsTitle, { description: t.trademaster.metaDescription });

  const controls = useListControls({
    defaultView: 'cards',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    filters: { kind: '', categoryId: '', inStock: '', province: '', priceMin: '', priceMax: '' },
    // Typed boxes: written to the address bar after a pause, not per keystroke.
    typedFilters: ['priceMin', 'priceMax'],
  });

  const location = useMarketLocation();
  const { data: categories } = useProductCategories();
  const { data: facets } = useShopFacets();

  const kind = controls.filters.kind as KindFilter;
  const categoryId = categoryForKind(categories, controls.filters.categoryId, kind);

  const { setFilter, setPage } = controls;
  useEffect(() => {
    if (controls.filters.categoryId && !categoryId && categories) setFilter('categoryId', '');
  }, [controls.filters.categoryId, categoryId, categories, setFilter]);

  const near = Boolean(location.location);
  const searchPoint = [location.location?.latitude, location.location?.longitude, location.radiusKm].join(',');
  const lastSearchPoint = useRef(searchPoint);
  useEffect(() => {
    if (lastSearchPoint.current === searchPoint) return;
    lastSearchPoint.current = searchPoint;
    setPage(1);
  }, [searchPoint, setPage]);

  // "In stock" means nothing for services, which never run out; the filter is
  // neither shown nor sent while browsing them.
  const stockApplies = kind !== 'SERVICE';
  const sort = controls.sort as ProductSort;

  const { data, isLoading } = usePublicProducts({
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
    inStock: stockApplies && controls.filters.inStock === 'true' ? true : undefined,
    province: controls.filters.province || undefined,
    priceMin: priceDigits(controls.filters.priceMin) || undefined,
    priceMax: priceDigits(controls.filters.priceMax) || undefined,
    ...location.query,
    // "Nearest" only exists with a search point; without one it would be
    // refused, so it falls back to the newest first.
    sort: sort === 'nearest' && !near ? 'newest' : sort,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{hub.listingsTitle}</h1>
        <p className="mt-2 text-text-secondary">{hub.listingsSubtitle}</p>
      </header>

      <MarketplaceNav className="mb-6" />

      <KindToggle
        className="mb-4"
        value={kind}
        onChange={(next) => controls.setFilter('kind', next)}
      />

      <LocationBar location={location} className="mb-4" />

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={hub.searchListings}
        searchLabel={hub.searchListings}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <>
            <CategorySelect
              className="w-52"
              categories={categories}
              kind={kind}
              value={categoryId}
              onChange={(value) => controls.setFilter('categoryId', value)}
              emptyLabel={t.trademaster.allCategories}
            />

            {stockApplies && (
              <Select
                className="w-40"
                value={controls.filters.inStock}
                aria-label={t.trademaster.inStockOnly}
                onChange={(e) => controls.setFilter('inStock', e.target.value)}
              >
                <option value="">{t.list.allOption}</option>
                <option value="true">{t.trademaster.inStockOnly}</option>
              </Select>
            )}

            {/* From the provinces shops have really written, so no option
                here can come back empty. A single province is not a choice,
                so it is not offered as one. */}
            {(facets?.provinces.length ?? 0) > 1 && (
              <Select
                className="w-40"
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

            <Input
              className="w-32"
              inputMode="numeric"
              dir="ltr"
              placeholder={t.trademaster.priceFrom}
              aria-label={t.trademaster.priceFrom}
              value={controls.filterInput('priceMin')}
              onChange={(e) => controls.setFilter('priceMin', e.target.value)}
              maxLength={20}
            />

            <Input
              className="w-32"
              inputMode="numeric"
              dir="ltr"
              placeholder={t.trademaster.priceTo}
              aria-label={t.trademaster.priceTo}
              value={controls.filterInput('priceMax')}
              onChange={(e) => controls.setFilter('priceMax', e.target.value)}
              maxLength={20}
            />

            <Select
              className="w-44"
              value={sort === 'nearest' && !near ? 'newest' : sort}
              aria-label={t.list.sortLabel}
              onChange={(e) => controls.setSort(e.target.value)}
            >
              {near && <option value="nearest">{hub.sortNearest}</option>}
              <option value="newest">{t.trademaster.sortNewest}</option>
              <option value="priceAsc">{t.trademaster.sortPriceAsc}</option>
              <option value="priceDesc">{t.trademaster.sortPriceDesc}</option>
            </Select>
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
          title={controls.activeCount > 0 ? t.list.noResults : t.trademaster.noProducts}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {!isLoading && (data?.items.length ?? 0) > 0 && (
        <ul className={PRODUCT_GRID}>
          {data?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}

      {data && (
        <ListPager
          className="mt-8"
          page={controls.page}
          pageSize={controls.pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
          pageSizeOptions={controls.pageSizeOptions}
          onPageSizeChange={controls.setPageSize}
        />
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: PublicProductSummary }) {
  const { t, locale } = useLocale();
  const price = formatMoney(product.price, locale);
  const where = [product.business.city, product.business.province].filter(Boolean).join('، ');

  return (
    <li className="overflow-hidden rounded-lg border border-border-default bg-surface-default transition hover:border-border-strong hover:shadow-sm">
      <Link
        to={`/marketplace/products/${product.business.slug}/${product.slug}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-square overflow-hidden bg-surface-muted">
          {product.coverUrl ? (
            <img
              src={apiAssetSrc(product.coverUrl)}
              // The listing's name, not "product image": a screen reader
              // reading "product image" down a grid of twenty-four has said
              // nothing.
              alt={product.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-text-tertiary"
              aria-hidden="true"
            >
              <ImageOff className="h-7 w-7" />
            </div>
          )}

          {/* Only a service is labelled. Most listings are products, and a
              "product" tag on every card is noise the eye learns to skip —
              which is how it would come to skip the one that matters. */}
          {product.kind === 'SERVICE' && (
            <span className="absolute start-1.5 top-1.5 rounded-md bg-surface-default/90 px-1.5 py-0.5 text-[11px] font-medium text-text-primary shadow-sm">
              {t.trademaster.hub.kindService}
            </span>
          )}

          {/* Decided by the server, which counts options too: a coat with
              every size sold out used to show as in stock because its own
              count was not zero. A service is never out of stock. */}
          {!product.available && (
            <span className="absolute inset-x-0 bottom-0 bg-surface-inverse/80 py-1 text-center text-xs text-text-inverse">
              {t.trademaster.outOfStock}
            </span>
          )}
        </div>

        {/* Three lines, each a different weight so they read as different
            things at a glance: what it is, what it costs, who sells it where. */}
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h2 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-text-primary">
            {product.title}
          </h2>

          {price && (
            <p className="text-sm font-bold text-text-primary">
              {price} <span className="text-[11px] font-normal text-text-tertiary">{t.market.currency}</span>
              {product.negotiable && (
                <span className="ms-1.5 text-[11px] font-normal text-text-secondary">
                  · {t.trademaster.negotiable}
                </span>
              )}
            </p>
          )}

          <p className="mt-auto flex items-center gap-1 truncate text-[11px] text-text-tertiary">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[
                product.business.name,
                product.distanceKm !== undefined
                  ? t.trademaster.distanceAway.replace('{km}', formatKm(product.distanceKm, locale))
                  : where,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}
