import { LOCALE_TAGS } from '@/i18n/locales';
import type { Locale } from '@/i18n/locales';

/**
 * A file size somebody can read.
 *
 * Bytes below a kilobyte, then KB, then MB — one decimal place only where it
 * carries information, because "1.0 MB" reads as false precision and
 * "1048576 bytes" reads as a machine talking to itself.
 *
 * Intl supplies the locale's own digits and decimal mark, so a Persian page
 * shows ۱٫۴ مگابایت rather than 1.4 MB in Latin digits beside Persian text.
 */
export function formatBytes(bytes: number, locale: Locale): string {
  const tag = LOCALE_TAGS[locale];
  const unit = (value: number, digits: number, suffix: string) =>
    `${new Intl.NumberFormat(tag, { maximumFractionDigits: digits }).format(value)} ${suffix}`;

  if (bytes < 1024) return unit(bytes, 0, UNITS[locale].b);
  if (bytes < 1024 * 1024) return unit(bytes / 1024, 0, UNITS[locale].kb);
  return unit(bytes / (1024 * 1024), 1, UNITS[locale].mb);
}

/**
 * Units are words, so they are translated — but only these three, which is far
 * too little to justify a section in the dictionaries.
 */
const UNITS: Record<Locale, { b: string; kb: string; mb: string }> = {
  fa: { b: 'بایت', kb: 'کیلوبایت', mb: 'مگابایت' },
  en: { b: 'bytes', kb: 'KB', mb: 'MB' },
  tr: { b: 'bayt', kb: 'KB', mb: 'MB' },
  de: { b: 'Bytes', kb: 'KB', mb: 'MB' },
  fr: { b: 'octets', kb: 'Ko', mb: 'Mo' },
  es: { b: 'bytes', kb: 'KB', mb: 'MB' },
};
