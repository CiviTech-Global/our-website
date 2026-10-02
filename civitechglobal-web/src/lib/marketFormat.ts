import { LOCALE_TAGS, type Locale } from '@/i18n/locales';
import type { ListingKind, ProductCategoryNode } from '@/types/trademaster';

/**
 * Plain helpers the marketplace pages share.
 *
 * In a module of their own rather than beside the components: a file that
 * exports both components and functions loses fast refresh in development, so
 * every edit to a marketplace page reloaded the whole app.
 */

/** No kind chosen ('' = all), or products, or services. */
export type KindFilter = '' | ListingKind;

/** Kilometres in the reader's own numerals and unit name: "۲٫۴ کیلومتر", "2.4 km". */
export function formatKm(km: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km);
}

/** A count in the reader's own numerals. */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);
}

/**
 * The chosen category, if it still applies to the kind being browsed.
 *
 * A category of the other kind — or one that has since been switched off — is
 * dropped rather than sent: it could only ever return nothing, and the reader
 * would see an empty page with no idea which filter caused it. While the list
 * is still loading the choice is kept, since nothing is known to be wrong yet.
 */
export function categoryForKind(
  categories: ProductCategoryNode[] | undefined,
  id: string,
  kind: KindFilter
): string {
  if (!id) return '';
  if (!categories) return id;
  const chosen = categories.find((category) => category.id === id);
  if (!chosen) return '';
  return !kind || chosen.kind === kind ? id : '';
}
