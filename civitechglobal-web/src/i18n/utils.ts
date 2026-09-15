import type fa from './fa';
import { LOCALE_TAGS, type Locale } from './locales';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Resolves a "section.key" dotted path (as produced by zod error messages, e.g.
 * "auth.invalidEmail") against the active dictionary. Falls back to the raw key.
 */
export function resolveI18nKey(dictionary: typeof fa, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const [section, key] = path.split('.') as [keyof typeof fa, string];
  const sectionDict = dictionary[section] as Record<string, string> | undefined;
  return sectionDict?.[key] ?? path;
}

/** Convert any Latin digits found in a string/number to Persian (Farsi) numerals. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/**
 * A date in the reader's language.
 *
 * Intl does the whole job from the BCP 47 tag: fa-IR already yields the Persian
 * calendar and Persian digits, de-DE puts the day first, and en keeps the month
 * first — so there is nothing locale-specific to branch on here, and adding a
 * seventh language adds no code.
 */
export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
