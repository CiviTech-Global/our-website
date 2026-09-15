import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from './locales';

/**
 * Language lives in the URL.
 *
 * This is the part of going multilingual that search engines actually need. A
 * site that keeps one URL per page and switches language from a header, a
 * cookie or localStorage has, as far as a crawler is concerned, exactly one
 * version of each page — whichever one it happened to be served. The other five
 * languages are not indexed, cannot be linked to, and cannot be named in an
 * hreflang set, because there is no address to name.
 *
 * So each language gets its own address: `/services`, `/en/services`,
 * `/de/services`. Persian is unprefixed because it is the default and the
 * domain is Iranian — putting it at `/fa/` would leave the root either empty or
 * a duplicate, and would rewrite every existing indexed URL.
 *
 * The prefix is carried by the router's basename rather than by the route
 * table, so every `<Link to="/services">` in the app resolves against it
 * automatically. Two hundred link targets did not need to learn about
 * language, and a new page cannot forget to.
 */

/** The path prefix for a locale. Empty for the default, which owns the root. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Splits an incoming pathname into the language it declares and the route
 * underneath. An unknown or absent prefix means the default language and the
 * whole path — `/design` is a route, not a broken locale.
 */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const [, head, ...rest] = pathname.split('/');

  // The default locale never appears as a prefix, so `/fa/...` would be a
  // second address for pages that already live at the root. Treated as an
  // ordinary path, it 404s, which is the honest answer.
  if (isLocale(head) && head !== DEFAULT_LOCALE) {
    return { locale: head, path: `/${rest.join('/')}` };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** The address of `path` in `locale`. `path` is the route without any prefix. */
export function localeHref(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${localePrefix(locale)}${clean}` || '/';
}

/**
 * Moves the whole document to another language's address, keeping the route.
 *
 * A full navigation rather than a client-side one: the language prefix is the
 * router's basename, fixed when the app mounted, so it cannot be changed from
 * inside the running router. It happens on an explicit pick, or once on a first
 * visit, so the cost is a page load nobody makes twice.
 *
 * It lives here rather than in the provider because a jsdom window will not let
 * location.assign be replaced, and a redirect nothing can observe is a redirect
 * nothing can test.
 */
export function navigateToLocale(next: Locale): void {
  const { path } = splitLocalePath(window.location.pathname);
  window.location.assign(localeHref(next, path) + window.location.search + window.location.hash);
}

/**
 * Every language's address for one route, for hreflang and the sitemap.
 *
 * Returned for all six even where the translation is partial: a page that
 * renders half in German is still the German page, and omitting it from the
 * set tells search engines that German readers should be sent to Persian.
 */
export function localeAlternates(path: string): Array<{ locale: Locale; href: string }> {
  return LOCALES.map((locale) => ({ locale, href: localeHref(locale, path) }));
}
