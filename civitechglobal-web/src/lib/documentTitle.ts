import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * The registered name, per locale.
 *
 * English carries the trading name alongside it; Persian is the registered name
 * alone, which is what people here recognise.
 */
/**
 * The name in the tab.
 *
 * Only Persian differs: the company's own name is written in Persian script for
 * Persian readers, and every other language gets the romanised form plus the
 * international brand. A German or Turkish title carrying Persian script would
 * be unreadable to the person it is for, so those fall to English rather than
 * to the local dictionary.
 */
export const SITE_NAME = {
  fa: 'رایان تمدن جهان گستر',
  en: 'Rayan Tamaddon Jahan Gostar | CiviTech Global',
} as const;

/**
 * The origin a search engine should treat as this site's real address.
 *
 * Read from the build rather than hard-coded, so a preview deployment does not
 * declare itself canonical for production. It falls back to the current origin,
 * which is right for local development.
 */
const CANONICAL_ORIGIN: string =
  import.meta.env.VITE_CANONICAL_ORIGIN ?? (typeof window === 'undefined' ? '' : window.location.origin);

/**
 * Points the canonical and og:url tags at the current route.
 *
 * This has to happen per route rather than in index.html, and that is the
 * whole reason it lives here. The HTML shell is byte-identical for every page
 * of a single-page app, so one static <link rel="canonical"> would have every
 * route declaring itself a duplicate of the home page — and a search engine
 * that believes it drops /services, /about and the rest from its index
 * entirely. A wrong canonical is considerably worse than none.
 *
 * The query string is deliberately dropped: ?ref= and friends are the same
 * page, and listing each variant as its own URL splits a page's ranking across
 * copies of itself.
 */
function setCanonical(pathname: string): void {
  if (!CANONICAL_ORIGIN) return;
  const href = `${CANONICAL_ORIGIN}${pathname}`;

  const link =
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
  link.href = href;

  let og = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!og) {
    og = document.createElement('meta');
    // setAttribute, not a property assignment: `property` is an Open Graph
    // attribute and not a member of HTMLMetaElement, so assigning it sets a
    // stray JS field that never reaches the markup.
    og.setAttribute('property', 'og:url');
    document.head.appendChild(og);
  }
  og.content = href;
}

/**
 * Names the tab after the page you are on, and tells search engines which URL
 * that page really lives at.
 *
 * A single-page app changes route without touching `document.title`, so every
 * page shared, bookmarked or sitting in a browser's history list was previously
 * indistinguishable from the home page.
 */
export function useDocumentTitle(title?: string) {
  const { locale } = useLocale();
  const { pathname } = useLocation();

  useEffect(() => {
    const site = locale === 'fa' ? SITE_NAME.fa : SITE_NAME.en;
    document.title = title ? `${title} — ${site}` : site;
    setCanonical(pathname);
    // Deliberately not restored on unmount: the next page sets its own title,
    // and putting the old one back first makes the tab flicker.
  }, [title, locale, pathname]);
}
