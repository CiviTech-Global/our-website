import { lazy, Suspense, useState } from 'react';
import { NavLink } from 'react-router';
import { Compass, LocateFixed, MapPin, Package, Store, Wrench, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatCount, formatKm, type KindFilter } from '@/lib/marketFormat';
import { cn } from '@/lib/utils';
import {
  RADIUS_OPTIONS_KM,
  type MarketLocationControls,
} from '@/lib/useMarketLocation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { BusinessCategoryNode, ListingKind, ProductCategoryNode } from '@/types/trademaster';

const LocationPicker = lazy(() =>
  import('@/components/trademaster/ShopMap').then((m) => ({ default: m.LocationPicker }))
);

/**
 * The pieces every page of the marketplace shares: its own navigation, the
 * product/service switch, the category picker, and the "where am I searching
 * from" bar. One file so the four pages cannot drift into four slightly
 * different versions of each.
 */

// ---------------------------------------------------------------------------
// The module's own navigation
// ---------------------------------------------------------------------------

export function MarketplaceNav({ className }: { className?: string }) {
  const { t } = useLocale();
  const links = [
    { to: '/marketplace', label: t.trademaster.hub.navExplore, icon: Compass, end: true },
    { to: '/marketplace/shops', label: t.trademaster.hub.navShops, icon: Store, end: false },
    { to: '/marketplace/products', label: t.trademaster.hub.navListings, icon: Package, end: false },
  ];

  return (
    <nav
      aria-label={t.trademaster.hub.navLabel}
      className={cn('flex flex-wrap items-center gap-2 border-b border-border-default pb-3', className)}
    >
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
              isActive
                ? 'bg-surface-muted font-semibold text-text-primary'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
            )
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}

      <NavLink
        to="/marketplace/join"
        className={({ isActive }) =>
          cn(
            'ms-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
            isActive
              ? 'border-border-strong bg-surface-muted text-text-primary'
              : 'border-border-default text-text-primary hover:border-border-strong'
          )
        }
      >
        <Store className="h-4 w-4" aria-hidden="true" />
        {t.trademaster.hub.navJoin}
      </NavLink>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Products or services
// ---------------------------------------------------------------------------


/**
 * All / Products / Services.
 *
 * Buttons that say whether they are pressed, rather than a dropdown: it is the
 * first question a buyer answers, and the answer should be visible without
 * opening anything.
 */
export function KindToggle({
  value,
  onChange,
  className,
}: {
  value: KindFilter;
  onChange: (value: KindFilter) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const options: Array<{ value: KindFilter; label: string; icon?: typeof Package }> = [
    { value: '', label: t.trademaster.hub.kindAll },
    { value: 'PRODUCT', label: t.trademaster.hub.kindProducts, icon: Package },
    { value: 'SERVICE', label: t.trademaster.hub.kindServices, icon: Wrench },
  ];

  return (
    <div
      role="group"
      aria-label={t.trademaster.hub.kindLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-default p-1',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              active
                ? 'bg-surface-inverse font-medium text-text-inverse'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A small "Product" or "Service" marker for a card. */
export function KindBadge({ kind }: { kind: ListingKind }) {
  const { t } = useLocale();
  return kind === 'SERVICE' ? (
    <Badge variant="info">{t.trademaster.hub.kindService}</Badge>
  ) : (
    <Badge variant="default">{t.trademaster.hub.kindProduct}</Badge>
  );
}

/** What a shop offers: products, services, or both. */
export function OfferBadges({ kinds }: { kinds: ListingKind[] }) {
  const { t } = useLocale();
  if (kinds.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {kinds.includes('PRODUCT') && <Badge variant="default">{t.trademaster.hub.offersProducts}</Badge>}
      {kinds.includes('SERVICE') && <Badge variant="info">{t.trademaster.hub.offersServices}</Badge>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Categories as a two-level list, filtered to the kind being browsed.
 *
 * Children are indented under their parent and the parent stays choosable: it
 * finds everything filed under its children too. With a kind chosen, only that
 * kind's branches are offered — "Barbershop" under Products would be a choice
 * that can only ever come back empty.
 */
/**
 * The guild list as a two-level select: sectors, with their trades indented.
 *
 * A sector stays choosable and finds every trade under it. Counts are shown
 * where there is something to count, so a reader can see before choosing
 * which trades have any shops yet.
 */
export function BusinessCategorySelect({
  categories,
  value,
  onChange,
  emptyLabel,
  id,
  className,
  showCounts = true,
  invalid,
}: {
  categories: BusinessCategoryNode[] | undefined;
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  id?: string;
  className?: string;
  showCounts?: boolean;
  invalid?: boolean;
}) {
  const { t, locale } = useLocale();
  const all = categories ?? [];
  const sectors = all.filter((category) => !category.parentId);
  const tradesOf = (sectorId: string) => all.filter((category) => category.parentId === sectorId);
  const label = (category: BusinessCategoryNode) =>
    showCounts && category.shopCount > 0
      ? `${category.name} (${formatCount(category.shopCount, locale)})`
      : category.name;

  return (
    <Select
      id={id}
      className={className}
      value={value}
      invalid={invalid}
      aria-label={id ? undefined : t.trademaster.hub.businessCategory}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {sectors.map((sector) => [
        <option key={sector.id} value={sector.id}>
          {label(sector)}
        </option>,
        ...tradesOf(sector.id).map((trade) => (
          <option key={trade.id} value={trade.id}>
            {`\u00a0\u00a0— ${label(trade)}`}
          </option>
        )),
      ])}
    </Select>
  );
}

export function CategorySelect({
  categories,
  kind,
  value,
  onChange,
  emptyLabel,
  id,
  className,
  showCounts = true,
  invalid,
}: {
  categories: ProductCategoryNode[] | undefined;
  kind: KindFilter;
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  id?: string;
  className?: string;
  showCounts?: boolean;
  invalid?: boolean;
}) {
  const { t, locale } = useLocale();
  const visible = (categories ?? []).filter((category) => !kind || category.kind === kind);
  const parents = visible.filter((category) => !category.parentId);
  const childrenOf = (id: string) => visible.filter((category) => category.parentId === id);
  const label = (category: ProductCategoryNode) =>
    showCounts && category.productCount > 0
      ? `${category.name} (${formatCount(category.productCount, locale)})`
      : category.name;

  return (
    <Select
      id={id}
      className={className}
      value={value}
      invalid={invalid}
      aria-label={id ? undefined : t.trademaster.category}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {parents.map((parent) => [
        <option key={parent.id} value={parent.id}>
          {label(parent)}
        </option>,
        ...childrenOf(parent.id).map((child) => (
          <option key={child.id} value={child.id}>
            {/* Two no-break spaces and a dash: an indent a <select> keeps. */}
            {`\u00a0\u00a0— ${label(child)}`}
          </option>
        )),
      ])}
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Where the search is centred
// ---------------------------------------------------------------------------

/**
 * "Near me", the radius in kilometres, and a way to choose the point on a map.
 *
 * Every state says what is happening and what can be done next. A refusal
 * still leaves "choose on map"; an insecure page says why the browser will not
 * answer, instead of reporting a refusal the reader never made.
 */
export function LocationBar({
  location,
  className,
}: {
  location: MarketLocationControls;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<{ latitude: number; longitude: number } | null>(null);
  const hub = t.trademaster.hub;

  const statusText =
    location.status === 'locating'
      ? t.trademaster.locating
      : location.status === 'denied'
        ? hub.locationDenied
        : location.status === 'unavailable'
          ? hub.locationUnavailable
          : location.status === 'insecure'
            ? hub.locationInsecure
            : null;

  function openPicker() {
    setDraft(location.location ? { ...location.location } : null);
    setPicking(true);
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {location.location ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 text-sm text-text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {location.location.source === 'device' ? hub.nearMyLocation : hub.nearChosenPoint}
          </span>

          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            {hub.within}
            <Select
              className="w-32"
              value={String(location.radiusKm)}
              onChange={(event) => location.setRadius(Number(event.target.value))}
            >
              {RADIUS_OPTIONS_KM.map((km) => (
                <option key={km} value={km}>
                  {formatKm(km, locale)}
                </option>
              ))}
            </Select>
          </label>

          <Button type="button" variant="ghost" size="sm" onClick={openPicker}>
            {hub.change}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={location.clear}>
            <X className="h-4 w-4" aria-hidden="true" />
            {hub.clearLocation}
          </Button>
        </>
      ) : (
        <>
          {location.status !== 'denied' && location.status !== 'insecure' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={location.locate}
              disabled={location.status === 'locating'}
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              {location.status === 'locating' ? t.trademaster.locating : hub.useMyLocation}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {hub.chooseOnMap}
          </Button>
        </>
      )}

      {statusText && location.status !== 'locating' && (
        <p className="w-full text-sm text-text-tertiary" role="status">
          {statusText}
        </p>
      )}

      <Modal isOpen={picking} onClose={() => setPicking(false)} title={hub.pickTitle}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">{hub.pickHint}</p>
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-surface-muted" />}>
            <LocationPicker
              latitude={draft?.latitude}
              longitude={draft?.longitude}
              height={320}
              onPick={(latitude, longitude) => setDraft({ latitude, longitude })}
            />
          </Suspense>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPicking(false)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              disabled={!draft}
              onClick={() => {
                if (!draft) return;
                location.pick(draft.latitude, draft.longitude);
                setPicking(false);
              }}
            >
              {hub.usePoint}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * What to say when a radius search came back empty.
 *
 * "No results" alone reads as a broken feature, which is exactly what this
 * page was reported as. The server says how far the nearest match is, and the
 * button widens the circle to reach it in one press.
 */
export function NothingNearby({
  radiusKm,
  nearestKm,
  onWiden,
}: {
  radiusKm: number;
  nearestKm: number | null | undefined;
  onWiden: (km: number) => void;
}) {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  // The smallest offered radius that reaches the nearest match, if any does.
  const reach =
    nearestKm != null ? RADIUS_OPTIONS_KM.find((km) => km >= nearestKm && km > radiusKm) : undefined;

  return (
    <div className="rounded-xl border border-dashed border-border-default p-6 text-center">
      <p className="font-medium text-text-primary">
        {hub.noneWithin.replace('{radius}', formatKm(radiusKm, locale))}
      </p>
      {nearestKm != null ? (
        <p className="mt-1 text-sm text-text-secondary">
          {hub.nearestIs.replace('{km}', formatKm(nearestKm, locale))}
        </p>
      ) : (
        <p className="mt-1 text-sm text-text-secondary">{hub.noneAnywhere}</p>
      )}
      {reach && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onWiden(reach)}>
          {hub.widenTo.replace('{radius}', formatKm(reach, locale))}
        </Button>
      )}
    </div>
  );
}
