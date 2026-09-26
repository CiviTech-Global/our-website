import { Link } from 'react-router';
import { ImageOff, MapPin } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicProducts, useProductCategories } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { useListControls } from '@/lib/useListControls';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import type { ProductSort, PublicProductSummary } from '@/types/trademaster';

const PAGE_SIZE = 24;

/**
 * The public product catalogue.
 *
 * Cards only. A product is bought on the strength of its photograph, and a
 * table of prices without pictures is a spreadsheet — for narrowing down, the
 * filters do that job better than a different layout would.
 *
 * A product appears only while both it and its shop are published, which the
 * server enforces; nothing here needs to know that, which is the point of
 * putting it in one predicate back there.
 */
export default function MarketProductsPage() {
  const { t } = useLocale();
  useDocumentTitle(t.trademaster.products, { description: t.trademaster.metaDescription });

  const controls = useListControls({
    defaultView: 'cards',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    filters: { categoryId: '', inStock: '' },
  });

  const { data: categories } = useProductCategories();

  const { data, isLoading } = usePublicProducts({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    categoryId: controls.filters.categoryId || undefined,
    inStock: controls.filters.inStock === 'true' ? true : undefined,
    sort: controls.sort as ProductSort,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.trademaster.products}</h1>
        <p className="mt-2 text-text-secondary">{t.trademaster.subtitle}</p>
      </header>

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={t.trademaster.searchProducts}
        searchLabel={t.trademaster.searchProducts}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <>
            <Select
              className="w-48"
              value={controls.filters.categoryId}
              aria-label={t.trademaster.category}
              onChange={(e) => controls.setFilter('categoryId', e.target.value)}
            >
              <option value="">{t.trademaster.allCategories}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select
              className="w-40"
              value={controls.filters.inStock}
              aria-label={t.trademaster.inStockOnly}
              onChange={(e) => controls.setFilter('inStock', e.target.value)}
            >
              <option value="">{t.list.allOption}</option>
              <option value="true">{t.trademaster.inStockOnly}</option>
            </Select>

            <Select
              className="w-44"
              value={controls.sort}
              aria-label={t.list.sortLabel}
              onChange={(e) => controls.setSort(e.target.value)}
            >
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

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.trademaster.noProducts}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {!isLoading && (data?.items.length ?? 0) > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
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
    </div>
  );
}

export function ProductCard({ product }: { product: PublicProductSummary }) {
  const { t, locale } = useLocale();
  const price = formatMoney(product.price, locale);
  const where = [product.business.city, product.business.province].filter(Boolean).join('، ');

  return (
    <li className="overflow-hidden rounded-xl border border-border-default bg-surface-default transition hover:border-border-strong">
      <Link
        to={`/marketplace/products/${product.business.slug}/${product.slug}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-square bg-surface-muted">
          {product.coverUrl ? (
            <img
              src={apiAssetSrc(product.coverUrl)}
              // The product name, not "product image": a screen reader reading
              // "product image" down a grid of twenty-four has said nothing.
              alt={product.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-text-tertiary"
              aria-hidden="true"
            >
              <ImageOff className="h-8 w-8" />
            </div>
          )}

          {product.stock === 0 && product.variantCount === 0 && (
            <span className="absolute inset-x-0 bottom-0 bg-surface-inverse/80 py-1 text-center text-xs text-text-inverse">
              {t.trademaster.outOfStock}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h2 className="line-clamp-2 text-sm font-medium text-text-primary">{product.title}</h2>

          <div className="mt-auto flex flex-wrap items-center gap-2">
            {price && (
              <span className="text-sm font-semibold text-text-primary">
                {price} <span className="text-xs font-normal text-text-tertiary">{t.market.currency}</span>
              </span>
            )}
            {product.negotiable && <Badge variant="info">{t.trademaster.negotiable}</Badge>}
          </div>

          <p className="truncate text-xs text-text-tertiary">{product.business.name}</p>
          {where && (
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {where}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
