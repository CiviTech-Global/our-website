import type fa from './fa';

/**
 * The languages this site speaks.
 *
 * One list, so adding a seventh means touching this file and shipping a
 * dictionary — not hunting for the places a locale was spelled out. Everything
 * else (the picker, direction, detection, hreflang, the sitemap) reads from
 * here.
 */

export const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

/** The shape every dictionary satisfies. Persian is the reference. */
export type Translations = typeof fa;

export const DEFAULT_LOCALE: Locale = 'fa';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Text direction. Persian is the only right-to-left language here, but this is
 * a lookup rather than `locale === 'fa'` so that adding Arabic or Hebrew is a
 * row in a table instead of a condition somebody has to find.
 */
export const DIRECTIONS: Record<Locale, 'rtl' | 'ltr'> = {
  fa: 'rtl',
  en: 'ltr',
  tr: 'ltr',
  de: 'ltr',
  fr: 'ltr',
  es: 'ltr',
};

/**
 * What each language calls itself.
 *
 * Endonyms, not English names: somebody looking for their own language scans
 * for "Deutsch", not "German" — and if they could read the English label they
 * would not need the picker.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  fa: 'فارسی',
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

/** The BCP 47 tag for `<html lang>`, hreflang, and Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  fa: 'fa-IR',
  en: 'en',
  tr: 'tr-TR',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

/**
 * Country to language, for the first visit.
 *
 * Deliberately short. A guess that is wrong is worse than no guess when it is
 * hard to undo, so this only covers countries where one language is
 * overwhelmingly the working language of business, and everything else falls
 * through to the browser's own Accept-Language — which is a statement the user
 * actually made, rather than an inference from where they happen to be.
 */
export const COUNTRY_LOCALE: Record<string, Locale> = {
  IR: 'fa',
  AF: 'fa',
  TJ: 'fa',
  TR: 'tr',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
};
