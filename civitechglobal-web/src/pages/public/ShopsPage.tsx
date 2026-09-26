import { Link } from 'react-router';
import { MapPin, Package, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicShops } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import type { PublicShopSummary, ShopSort } from '@/types/trademaster';

const PAGE_SIZE = 24;

/**
 * The public shop directory.
 *
 * Cards by default, because a shop is recognised by its logo and its trade
 * before its name is read. The row view is for the other way of looking —
 * scanning a column of places by town, which a grid makes awkward.
 *
 * Everything here has been through moderation, and a shop only appears while
 * both it and its listing state say so.
 */
export default function ShopsPage() {
  const { t } = useLocale();
  useDocumentTitle(t.trademaster.shops, { description: t.trademaster.metaDescription });

  const controls = useListControls({
    defaultView: 'cards',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    filters: { province: '', industry: '' },
  });

  const { data, isLoading } = usePublicShops({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    province: controls.filters.province || undefined,
    industry: controls.filters.industry || undefined,
    sort: controls.sort as ShopSort,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.trademaster.shops}</h1>
        <p className="mt-2 text-text-secondary">{t.trademaster.subtitle}</p>
      </header>

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={t.trademaster.searchShops}
        searchLabel={t.trademaster.searchShops}
        total={data?.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          <Select
            className="w-48"
            value={controls.sort}
            aria-label={t.list.sortLabel}
            onChange={(e) => controls.setSort(e.target.value)}
          >
            <option value="newest">{t.trademaster.sortNewest}</option>
            <option value="name">{t.trademaster.sortName}</option>
          </Select>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.trademaster.noShops}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {!isLoading && controls.view === 'cards' && (data?.items.length ?? 0) > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
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
  const where = [shop.city, shop.province].filter(Boolean).join('، ');
  if (!where) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
      {where}
    </span>
  );
}

function ShopCard({ shop }: { shop: PublicShopSummary }) {
  const { t } = useLocale();

  return (
    <li className="rounded-xl border border-border-default bg-surface-default transition hover:border-border-strong">
      <Link to={`/marketplace/shops/${shop.slug}`} className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShopLogo shop={shop} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-text-primary">{shop.name}</h2>
            {shop.industry && <p className="truncate text-sm text-text-tertiary">{shop.industry}</p>}
          </div>
          {shop.featured && <Badge variant="info">{t.showcase.featured}</Badge>}
        </div>

        <p className="line-clamp-2 flex-1 text-sm text-text-secondary">{shop.summary}</p>

        <div className="flex items-center justify-between gap-2">
          <Where shop={shop} />
          <span className="inline-flex items-center gap-1 text-sm text-text-tertiary">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            {t.trademaster.productCount.replace('{count}', String(shop.productCount))}
          </span>
        </div>
      </Link>
    </li>
  );
}

function ShopRow({ shop }: { shop: PublicShopSummary }) {
  const { t } = useLocale();

  return (
    <li className="bg-surface-default transition hover:bg-surface-muted">
      <Link to={`/marketplace/shops/${shop.slug}`} className="flex items-center gap-3 p-4">
        <ShopLogo shop={shop} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium text-text-primary">{shop.name}</h2>
          <p className="truncate text-sm text-text-secondary">{shop.summary}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <Where shop={shop} />
          <span className="text-sm text-text-tertiary">
            {t.trademaster.productCount.replace('{count}', String(shop.productCount))}
          </span>
        </div>
      </Link>
    </li>
  );
}
