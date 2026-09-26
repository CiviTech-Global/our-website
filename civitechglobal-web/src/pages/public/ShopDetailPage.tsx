import { useParams } from 'react-router';
import { Globe, Mail, MapPin, Phone, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { usePublicProducts, usePublicShop } from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { useListControls } from '@/lib/useListControls';
import { ProductCard } from './MarketProductsPage';

const PAGE_SIZE = 24;

/**
 * One shop, and what it sells.
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

  const controls = useListControls({ defaultSort: 'newest', pageSize: PAGE_SIZE });
  const { data: products, isLoading: loadingProducts } = usePublicProducts({
    page: controls.page,
    pageSize: PAGE_SIZE,
    shopSlug: slug,
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
      <div className="mx-auto w-full max-w-3xl px-4 py-24">
        <EmptyState title={t.errors.notFoundTitle} description={t.errors.notFoundBody} />
      </div>
    );
  }

  const where = [shop.address, shop.city, shop.province].filter(Boolean).join('، ');

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
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
          {shop.industry && <p className="mt-1 text-text-tertiary">{shop.industry}</p>}
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

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">{t.trademaster.products}</h2>

        {loadingProducts && (
          <div className="flex justify-center py-12">
            <Spinner label={t.common.loading} />
          </div>
        )}

        {!loadingProducts && products?.items.length === 0 && (
          <EmptyState title={t.trademaster.noProducts} />
        )}

        {!loadingProducts && (products?.items.length ?? 0) > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}

        {products && products.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              page={controls.page}
              totalPages={products.totalPages}
              onPageChange={controls.setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
