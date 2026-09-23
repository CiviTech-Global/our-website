import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeAlternates, localeHref } from '@/i18n/localePath';
import { DEFAULT_LOCALE, LOCALE_TAGS, OG_LOCALES } from '@/i18n/locales';
import type { Locale } from '@/i18n/locales';

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
// `||`, not `??`: the Docker build declares the variable, so what arrives when
// nobody sets it is an empty string rather than undefined — which a nullish
// check accepts, leaving the origin empty and every canonical, hreflang and
// og:url tag silently unwritten. scripts/build-sitemap.mjs learned this the
// same way and says so in the same words.
export const CANONICAL_ORIGIN: string =
  import.meta.env.VITE_CANONICAL_ORIGIN ||
  (typeof window === 'undefined' ? '' : window.location.origin);

/**
 * Marks the tags this module owns.
 *
 * Every one is removed and rewritten on each route change. Editing them in
 * place instead means a tag the previous page added and this one does not —
 * a description, an hreflang set, a piece of structured data — survives into a
 * page it does not describe, which is how a search engine ends up with the
 * wrong summary for half a site.
 */
const OWNED = 'data-head';

/**
 * The fallback image for a shared link. A link previewed anywhere shows this
 * branded 1200x630 card rather than the 32px favicon, which reads as a broken
 * image in a chat bubble and costs the click. Pages with a more specific
 * image (a product, a project, an article) pass their own and override it.
 */
const DEFAULT_OG_IMAGE = '/og/default.png';
const FAVICON_IMAGE = '/favicon.png';

/**
 * Routes that must never be indexed, matched by prefix.
 *
 * Derived from the path rather than declared page by page, because the list of
 * private screens runs to dozens and the cost of one of them forgetting is a
 * signed-in view, or somebody's tracking code, sitting in a search result. A
 * new admin page is covered the moment it is routed.
 *
 * This mirrors robots.txt, plus the credential screens. The two do different
 * jobs and both are needed: robots.txt asks a crawler not to fetch the page,
 * and a noindex tag is what keeps it out of the index when somebody links to
 * it anyway.
 */
const PRIVATE_PREFIXES = ['/admin', '/dashboard', '/track', '/proposal', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export interface PageMeta {
  /** The one-sentence summary a search result shows. */
  description?: string;
  /**
   * Forces a page out of the index. Private areas are already excluded by
   * their path, so this is for a public route that should not be indexed —
   * an error page, say.
   */
  noindex?: boolean;
  /** Open Graph type; `article` for a job or a project, `website` otherwise. */
  type?: 'website' | 'article';
  /** Absolute or root-relative image for a shared link. */
  image?: string;
  /** JSON-LD for this page. One object or several. */
  jsonLd?: object | object[];
  /**
   * Which languages this page exists in, when that is not all of them.
   *
   * Ordinary pages exist in every language — the interface is translated, and
   * an untranslated section falls back to English on a page that is still the
   * German page. Blog posts do not work that way: a guide to Iranian motor
   * insurance is written in Persian and has no German edition at all. Naming
   * German in its hreflang set would tell a search engine to send German
   * readers to Persian prose, so a post names only the editions it has.
   *
   * Paths, not URLs — the origin is added here, as it is for the default set.
   */
  alternates?: Array<{ locale: Locale; href: string }>;
}

function clearOwned(): void {
  document.head.querySelectorAll(`[${OWNED}]`).forEach((node) => node.remove());
}

function addMeta(attr: 'name' | 'property', key: string, content: string): void {
  const meta = document.createElement('meta');
  // setAttribute, not a property assignment: `property` is an Open Graph
  // attribute and not a member of HTMLMetaElement, so assigning it sets a
  // stray JS field that never reaches the markup.
  meta.setAttribute(attr, key);
  meta.setAttribute('content', content);
  meta.setAttribute(OWNED, '');
  document.head.appendChild(meta);
}

function addLink(rel: string, href: string, hreflang?: string): void {
  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  if (hreflang) link.setAttribute('hreflang', hreflang);
  link.setAttribute(OWNED, '');
  document.head.appendChild(link);
}

/**
 * Titles the page and writes everything a search engine and a link preview
 * read off it.
 *
 * All of it has to happen per route rather than in index.html, and that is the
 * whole reason this exists. The HTML shell is byte-identical for every page of
 * a single-page app, so one static canonical link would have every route
 * declaring itself a duplicate of the home page — and a search engine that
 * believes it drops /services, /about and the rest from its index entirely. The
 * same shell is why every page otherwise shares one description: the summary
 * under every result would describe the home page.
 *
 * `useLocation` reports the path with the language prefix already stripped,
 * because the prefix is the router's basename. So one route string addresses
 * the page in all six languages, which is exactly what the alternate set needs.
 */
export function useDocumentTitle(title?: string, meta: PageMeta = {}) {
  const { locale, t } = useLocale();
  const { pathname } = useLocation();
  const { description, type = 'website', image = DEFAULT_OG_IMAGE, jsonLd } = meta;
  const noindex = meta.noindex === true || isPrivatePath(pathname);
  // Every language by default: the interface is translated, so each address
  // is a real page even where a section still falls back to English.
  const alternates = meta.alternates ?? localeAlternates(pathname);
  // A fresh array arrives on every render; its contents are what matter.
  const alternatesKey = alternates.map((alternate) => alternate.locale).join(',');

  // The options object is rebuilt on every render by every caller, so the
  // effect keys off its fields rather than its identity.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const site = locale === DEFAULT_LOCALE ? SITE_NAME.fa : SITE_NAME.en;
    const fullTitle = title ? `${title} — ${site}` : site;
    const summary = description ?? t.home.heroSubtitle;

    document.title = fullTitle;
    clearOwned();

    addMeta('name', 'description', summary);

    if (noindex) {
      // A signed-in area or a one-time link. robots.txt asks a crawler not to
      // fetch the page; this is what keeps it out of the index when somebody
      // links to it anyway, which robots.txt alone does not.
      addMeta('name', 'robots', 'noindex, nofollow');
    }

    if (!CANONICAL_ORIGIN) return;

    // The query string is deliberately dropped: ?ref= and friends are the same
    // page, and listing each variant as its own URL splits a page's ranking
    // across copies of itself.
    const canonical = `${CANONICAL_ORIGIN}${localeHref(locale, pathname)}`;
    addLink('canonical', canonical);

    if (!noindex) {
      /**
       * Which address serves which language.
       *
       * Without this a search engine has six pages of near-identical structure
       * and no statement that they are the same page in different languages —
       * so it picks one, treats the rest as thin duplicates, and a German
       * search never surfaces the German page. x-default names where to send
       * a reader whose language is not among them.
       */
      for (const alternate of alternates) {
        addLink('alternate', `${CANONICAL_ORIGIN}${alternate.href}`, LOCALE_TAGS[alternate.locale]);
      }
      // x-default names where a reader whose language is not in the set should
      // go. For a page that exists in every language that is Persian, the
      // default; for a post written only in English it is the English one,
      // because sending them to a Persian article they cannot read is worse.
      const fallback =
        alternates.find((alternate) => alternate.locale === DEFAULT_LOCALE) ?? alternates[0];
      if (fallback) addLink('alternate', `${CANONICAL_ORIGIN}${fallback.href}`, 'x-default');
    }

    addMeta('property', 'og:url', canonical);
    addMeta('property', 'og:title', fullTitle);
    addMeta('property', 'og:description', summary);
    addMeta('property', 'og:type', type);
    addMeta('property', 'og:site_name', site);
    addMeta('property', 'og:image', image.startsWith('http') ? image : `${CANONICAL_ORIGIN}${image}`);
    addMeta('property', 'og:locale', OG_LOCALES[locale]);
    for (const alternate of alternates) {
      if (alternate.locale !== locale) {
        addMeta('property', 'og:locale:alternate', OG_LOCALES[alternate.locale]);
      }
    }

    addMeta('name', 'twitter:card', image === FAVICON_IMAGE ? 'summary' : 'summary_large_image');
    if (image !== FAVICON_IMAGE) {
      // A card image only earns its place in the large layout when its size
      // is declared — some scrapers drop an undersized image silently.
      addMeta('property', 'og:image:width', '1200');
      addMeta('property', 'og:image:height', '630');
    }
    addMeta('name', 'twitter:title', fullTitle);
    addMeta('name', 'twitter:description', summary);

    if (jsonLdKey) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = jsonLdKey;
      script.setAttribute(OWNED, '');
      document.head.appendChild(script);
    }

    // Deliberately not restored on unmount: the next page sets its own, and
    // putting the old one back first makes the tab flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, locale, pathname, description, noindex, type, image, jsonLdKey, t, alternatesKey]);
}
