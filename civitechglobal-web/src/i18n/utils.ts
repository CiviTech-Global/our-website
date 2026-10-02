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

/**
 * Persian and Arabic-Indic digits as ASCII.
 *
 * The reverse of toPersianDigits, for what people type: an Iranian keyboard
 * enters ۱۲۰۰۰۰ in a price box and ۰۹۱۲ in a phone field, and both mean exactly
 * what their ASCII spelling means. Stripping every non-ASCII digit instead —
 * which the price boxes used to do — turned a typed price into nothing at all.
 */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
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
