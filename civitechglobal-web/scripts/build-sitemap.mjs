#!/usr/bin/env node
/**
 * Writes public/sitemap.xml and public/robots.txt.
 *
 * Generated rather than hand-kept because going multilingual multiplied the
 * work: ten-odd public pages in six languages is dozens of URLs, each needing
 * the full set of seven hreflang links naming its siblings — hundreds of lines
 * that have to stay in step with each other and with the route table. Hand-editing
 * that survives exactly one round of changes.
 *
 * Only the pages that exist at a fixed address are listed. Job openings and
 * freelance projects come and go with the boards, so they are reachable from
 * /jobs and /projects, which are listed; a sitemap naming a posting that
 * closed last week is worse than one that does not mention it.
 *
 * Run from `prebuild`, so a deployment cannot ship a sitemap describing an
 * older route table than the bundle beside it.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '..', 'public');

/**
 * Must match the deployment. A sitemap listing another host is ignored
 * outright, so this is read from the same variable the canonical tags use.
 */
// `||`, not `??`: the Docker build declares the variable with an empty default,
// so a nullish check would accept '' and emit a sitemap of relative URLs, which
// is not a sitemap at all.
const ORIGIN = (process.env.VITE_CANONICAL_ORIGIN || 'https://rayantamaddonjahangostar.ir').replace(
  /\/+$/,
  ''
);

/** Mirrors src/i18n/locales.ts. Persian is the default and owns the root. */
const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'];
const DEFAULT_LOCALE = 'fa';
const LOCALE_TAGS = { fa: 'fa-IR', en: 'en', tr: 'tr-TR', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

/** Mirrors the public routes in src/App.tsx, and robots.txt below. */
const PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/services', changefreq: 'monthly', priority: '0.9' },
  { path: '/start-project', changefreq: 'monthly', priority: '0.9' },
  { path: '/jobs', changefreq: 'daily', priority: '0.9' },
  // The freelance board's route is /projects; this said /freelance, which
  // 404s, so six sitemap entries pointed at a missing page.
  { path: '/projects', changefreq: 'daily', priority: '0.9' },
  { path: '/books', changefreq: 'daily', priority: '0.8' },
  { path: '/consult', changefreq: 'monthly', priority: '0.9' },
  { path: '/experts', changefreq: 'weekly', priority: '0.8' },
  { path: '/portfolio', changefreq: 'weekly', priority: '0.8' },
  { path: '/customers', changefreq: 'monthly', priority: '0.7' },
  { path: '/partners', changefreq: 'monthly', priority: '0.6' },
  { path: '/volunteer', changefreq: 'monthly', priority: '0.7' },
  { path: '/join', changefreq: 'monthly', priority: '0.8' },
  { path: '/about', changefreq: 'yearly', priority: '0.7' },
  { path: '/team', changefreq: 'monthly', priority: '0.7' },
  { path: '/insurance', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'yearly', priority: '0.6' },
  // The blog index is a fixed address and exists in every locale, so it goes
  // through the same per-language expansion as the pages above.
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
];

/**
 * Blog articles. Read from the Markdown files in src/content/blog so the
 * sitemap can never drift from what actually ships: adding a post adds its
 * URL here on the next build. Articles are Persian-first — their URLs exist
 * only in the default locale — so unlike PAGES they do not get the six-way
 * hreflang expansion, just a self-reference and x-default.
 */
function blogPosts() {
  const dir = resolve(HERE, '..', 'src', 'content', 'blog');
  try {
    // Grouped by slug, because one article is several files — one per language
    // it was written in. Mirrors localeFromFilename in src/content/blog.ts: an
    // unsuffixed name is Persian, `.de.md` is German.
    const bySlug = new Map();

    for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
      const raw = readFileSync(resolve(dir, name), 'utf8');
      const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(raw)?.[1]?.trim() ?? '';
      const slug = field('slug');
      if (!slug) continue;

      const suffix = /\.([a-z]{2})\.md$/.exec(name);
      const locale = suffix ? suffix[1] : DEFAULT_LOCALE;
      if (!LOCALES.includes(locale)) continue;

      const post = bySlug.get(slug) ?? { slug, locales: [], lastmod: '' };
      post.locales.push(locale);
      // The newest edition's date speaks for the article: a translation added
      // this week is a change to the page a crawler already has.
      const lastmod = field('updated') || field('date');
      if (lastmod > post.lastmod) post.lastmod = lastmod;
      bySlug.set(slug, post);
    }

    return [...bySlug.values()].map((post) => ({
      ...post,
      locales: LOCALES.filter((locale) => post.locales.includes(locale)),
    }));
  } catch {
    return [];
  }
}

/**
 * Static intent landings, Persian-first like the articles. Listed here so
 * the sitemap stays in the repo rather than in a deployment note.
 */
const LANDINGS = [{ path: '/insurance/third-party', lastmod: '2026-08-06' }];

function landingEntry(landing) {
  const url = `${ORIGIN}${landing.path}`;
  return [
    '  <url>',
    `    <loc>${url}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="fa-IR" href="${url}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url}"/>`,
    ...(landing.lastmod ? [`    <lastmod>${landing.lastmod}</lastmod>`] : []),
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.8</priority>',
    '  </url>',
  ].join('\n');
}

/**
 * One entry per language an article was actually written in.
 *
 * Not per language the site has. The insurance writing is Persian — the
 * products, the regulator and the readers are — while what the company does is
 * written for everybody. Listing a German URL for a Persian-only guide would
 * publish an address that does not exist, and naming German in its hreflang
 * set would ask search engines to send German readers to prose they cannot
 * read.
 */
function articleEntries(post) {
  const path = `/blog/${post.slug}`;
  const alternates = post.locales.map(
    (locale) =>
      `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAGS[locale]}" href="${href(locale, path)}"/>`
  );
  // x-default is the Persian edition where there is one, and otherwise the
  // first that exists: a reader whose language is missing should land on a
  // real article rather than on nothing.
  const fallback = post.locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : post.locales[0];

  return post.locales.map((locale) =>
    [
      '  <url>',
      `    <loc>${href(locale, path)}</loc>`,
      ...alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${href(fallback, path)}"/>`,
      ...(post.lastmod ? [`    <lastmod>${post.lastmod}</lastmod>`] : []),
      '    <changefreq>monthly</changefreq>',
      '    <priority>0.7</priority>',
      '  </url>',
    ].join('\n')
  );
}

/** Signed-in areas and one-time links. Mirrors PRIVATE_PREFIXES in the app. */
const PRIVATE = [
  '/admin',
  '/dashboard',
  '/track',
  '/proposal',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

function href(locale, path) {
  // Mirrors localeHref in src/i18n/localePath.ts exactly. A sitemap URL that
  // differs from the page's own canonical by so much as a trailing slash is a
  // second address for the same page.
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return ORIGIN + (`${prefix}${path === '/' ? '' : path}` || '/');
}

function urlEntry(locale, page) {
  // Every language's copy of a page names every other, itself included — the
  // rule search engines apply is that an alternate set must be reciprocal, and
  // a one-way link is ignored in both directions.
  const alternates = LOCALES.map(
    (other) =>
      `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAGS[other]}" href="${href(other, page.path)}"/>`
  ).join('\n');

  return [
    '  <url>',
    `    <loc>${href(locale, page.path)}</loc>`,
    alternates,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${href(DEFAULT_LOCALE, page.path)}"/>`,
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- Generated by scripts/build-sitemap.mjs. Edit that, not this. -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...PAGES.flatMap((page) => LOCALES.map((locale) => urlEntry(locale, page))),
  ...LANDINGS.map(landingEntry),
  ...blogPosts().flatMap(articleEntries),
  '</urlset>',
  '',
].join('\n');

const robots = [
  '# Generated by scripts/build-sitemap.mjs. Edit that, not this.',
  'User-agent: *',
  'Allow: /',
  '',
  '# Signed-in areas hold no public content, and a tracking code is a private',
  '# reference someone was given — none of it should be crawled or indexed.',
  '# Listed once per language, because each language has its own address.',
  ...PRIVATE.flatMap((path) =>
    LOCALES.map((locale) => `Disallow: ${href(locale, path).slice(ORIGIN.length)}`)
  ),
  '',
  `# The static sitemap (fixed pages) and the dynamic one (insurance products`,
  `# and open marketplace listings, generated by the API at runtime).`,
  `Sitemap: ${ORIGIN}/sitemap.xml`,
  `Sitemap: ${ORIGIN}/sitemap-extras.xml`,
  '',
].join('\n');

writeFileSync(resolve(PUBLIC, 'sitemap.xml'), sitemap);
writeFileSync(resolve(PUBLIC, 'robots.txt'), robots);

console.log(
  `sitemap: ${PAGES.length * LOCALES.length + LANDINGS.length + blogPosts().flatMap(articleEntries).length} urls, robots: ${PRIVATE.length * LOCALES.length} disallow rules (${ORIGIN})`
);
