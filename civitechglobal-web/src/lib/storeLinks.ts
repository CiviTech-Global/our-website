import type { Locale } from '@/i18n/locales';

/**
 * The app's Cafe Bazaar page, for the static hero only.
 *
 * The live address comes from the server (capabilities → mobile.downloads),
 * so a release can change it without rebuilding the site. The hero is
 * prerendered without the API, though, and a link that appears only after a
 * request would be missing from the HTML that search engines and the first
 * paint see. This is what is shown until the server answers.
 */
export const BAZAAR_APP_URL = 'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app';

/**
 * A Bazaar link in the reader's language. Bazaar's pages are Persian unless
 * asked otherwise, and it has only Persian and English, so every other
 * language is sent to its English page.
 */
export function bazaarLink(url: string, locale: Locale): string {
  if (locale === 'fa') return url;
  try {
    const link = new URL(url);
    if (!link.hostname.endsWith('cafebazaar.ir')) return url;
    link.searchParams.set('l', 'en');
    return link.toString();
  } catch {
    return url;
  }
}
