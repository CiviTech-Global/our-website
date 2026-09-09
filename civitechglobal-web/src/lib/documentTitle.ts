import { useEffect } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * The registered name, per locale.
 *
 * English carries the trading name alongside it; Persian is the registered name
 * alone, which is what people here recognise.
 */
export const SITE_NAME = {
  fa: 'رایان تمدن جهان گستر',
  en: 'Rayan Tamaddon Jahan Gostar | CiviTech Global',
} as const;

/**
 * Names the tab after the page you are on.
 *
 * A single-page app changes route without touching `document.title`, so every
 * page shared, bookmarked or sitting in a browser's history list was previously
 * indistinguishable from the home page.
 */
export function useDocumentTitle(title?: string) {
  const { locale } = useLocale();

  useEffect(() => {
    const site = SITE_NAME[locale];
    document.title = title ? `${title} — ${site}` : site;
    // Deliberately not restored on unmount: the next page sets its own title,
    // and putting the old one back first makes the tab flicker.
  }, [title, locale]);
}
