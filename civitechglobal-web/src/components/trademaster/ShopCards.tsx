import { Link } from 'react-router';
import { Globe, MapPin, Navigation, Package, Phone, Store } from 'lucide-react';
import { apiAssetSrc } from '@/lib/apiAsset';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatCount, formatKm } from '@/lib/marketFormat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { OfferBadges } from '@/components/trademaster/MarketplaceUi';
import type { PublicShopSummary } from '@/types/trademaster';

/**
 * How a shop is shown in a list and on the map.
 *
 * One cover picture each, as the brief asked: the shop's own photograph when
 * it has uploaded one, otherwise its newest listing's picture, otherwise its
 * logo — the server decides, so the list, the map and the shop page agree.
 */

/** Directions from wherever the reader is, in whatever maps app their device prefers for a web link. */
function directionsUrl(shop: PublicShopSummary): string | null {
  if (shop.latitude == null || shop.longitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
}

/** The picture across the top, with the logo set into its corner. */
function CoverPicture({ shop, className }: { shop: PublicShopSummary; className?: string }) {
  return (
    <div className={cn('relative bg-surface-muted', className)}>
      {shop.coverUrl ? (
        <img
          src={apiAssetSrc(shop.coverUrl)}
          // Decorative here: the shop's name is right beneath it, and
          // announcing it twice per card says nothing new.
          alt=""
          className={cn('h-full w-full', shop.hasCover ? 'object-cover' : 'object-contain p-6')}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-tertiary" aria-hidden="true">
          <Store className="h-10 w-10" />
        </div>
      )}
      {shop.logoUrl && shop.hasCover && (
        <img
          src={apiAssetSrc(shop.logoUrl)}
          alt=""
          className="absolute -bottom-5 start-3 h-11 w-11 rounded-lg border-2 border-surface-default bg-surface-default object-cover shadow"
          loading="lazy"
        />
      )}
      {shop.featured && (
        <span className="absolute end-2 top-2">
          <Badge variant="info">★</Badge>
        </span>
      )}
    </div>
  );
}

/** The line under the name: what kind of business, and how far or where. */
function Subtitle({ shop }: { shop: PublicShopSummary }) {
  const { t, locale } = useLocale();
  const category = shop.businessCategory?.name ?? shop.industry;
  const where =
    shop.distanceKm !== undefined
      ? t.trademaster.distanceAway.replace('{km}', formatKm(shop.distanceKm, locale))
      : [shop.city, shop.province].filter(Boolean).join('، ');
  const parts = [category, where].filter(Boolean);
  return parts.length ? <p className="truncate text-sm text-text-secondary">{parts.join(' · ')}</p> : null;
}

/** A result in the list under the map, or on the shops page. */
export function ShopResultCard({ shop, kindParam }: { shop: PublicShopSummary; kindParam?: string }) {
  const { t, locale } = useLocale();
  const to = kindParam ? `/marketplace/shops/${shop.slug}?kind=${kindParam}` : `/marketplace/shops/${shop.slug}`;

  return (
    <li className="overflow-hidden rounded-xl border border-border-default bg-surface-default transition hover:border-border-strong hover:shadow-sm">
      <Link to={to} className="flex h-full flex-col">
        <CoverPicture shop={shop} className="aspect-[16/9]" />
        <div className={cn('flex flex-1 flex-col gap-1.5 p-4', shop.logoUrl && shop.hasCover && 'pt-7')}>
          <h3 className="truncate font-semibold text-text-primary">{shop.name}</h3>
          <Subtitle shop={shop} />
          <p className="line-clamp-2 text-sm text-text-tertiary">{shop.summary}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
            <OfferBadges kinds={shop.kinds} />
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              {t.trademaster.productCount.replace('{count}', formatCount(shop.productCount, locale))}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * The card a map pin opens — the place, at a glance, and what to do next.
 *
 * Modelled on how a maps app presents a place: the picture, the name and what
 * it is, how far, the address and phone, then a row of actions — directions,
 * call, website, open the shop. Each action is its own link, so nothing here
 * is a link inside a link.
 */
export function ShopPopupCard({ shop }: { shop: PublicShopSummary }) {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  const directions = directionsUrl(shop);
  const action =
    'flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-primary transition hover:bg-surface-muted';

  return (
    <div className="w-[280px] text-start" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <CoverPicture shop={shop} className="h-32" />
      <div className={cn('flex flex-col gap-1.5 px-3 pb-2', shop.logoUrl && shop.hasCover ? 'pt-7' : 'pt-3')}>
        <p className="text-base font-semibold leading-snug text-text-primary">{shop.name}</p>
        <Subtitle shop={shop} />
        <div className="flex flex-wrap items-center gap-2">
          <OfferBadges kinds={shop.kinds} />
          <span className="text-xs text-text-tertiary">
            {t.trademaster.productCount.replace('{count}', formatCount(shop.productCount, locale))}
          </span>
        </div>
        {shop.address && (
          <p className="flex items-start gap-1.5 text-xs text-text-secondary">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{shop.address}</span>
          </p>
        )}
        {shop.phone && (
          <p className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span dir="ltr">{shop.phone}</span>
          </p>
        )}
      </div>

      <div className="flex border-t border-border-default px-1 py-1">
        {directions && (
          <a href={directions} target="_blank" rel="noopener noreferrer" className={action}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            {hub.directions}
          </a>
        )}
        {shop.phone && (
          <a href={`tel:${shop.phone}`} className={action}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            {hub.call}
          </a>
        )}
        {shop.website && (
          <a href={shop.website} target="_blank" rel="noopener noreferrer nofollow" className={action}>
            <Globe className="h-4 w-4" aria-hidden="true" />
            {hub.website}
          </a>
        )}
        <Link to={`/marketplace/shops/${shop.slug}`} className={cn(action, 'font-medium')}>
          <Store className="h-4 w-4" aria-hidden="true" />
          {hub.openShop}
        </Link>
      </div>
    </div>
  );
}
