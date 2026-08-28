import type fa from './fa';

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

/** Format a date according to locale, converting digits to Persian when needed. */
export function formatDate(value: string | Date, locale: 'fa' | 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const formatted = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
  return formatted;
}
