import { Router } from 'express';
import { prisma } from '../config/database.js';
import { CATALOG } from '../insurance/catalog/index.js';
import { features } from '../config/features.js';
import { IRAN_PROVINCES } from '../catalog/iran-provinces.js';
import { PUBLIC_COMPANY_WHERE } from '../services/company.service.js';
import { PUBLIC_LISTING_WHERE } from '../services/moderation.js';
import { PUBLIC_PRODUCT_WHERE } from '../services/trademaster-common.js';

/**
 * The dynamic half of the sitemap.
 *
 * The static sitemap (public/sitemap.xml) lists the fixed pages and is
 * generated at build time. The URLs here point at records that live in the
 * database or the insurance catalog — products, open jobs, open freelance
 * projects and open book listings — so they cannot be known until runtime.
 * nginx serves this at /sitemap-extras.xml alongside the static file, and
 * robots.txt names both.
 *
 * Everything listed here is public, indexable content: an OPEN listing that
 * has actually been published. When a listing closes it disappears from the
 * next response, which is how a sitemap should behave for content that comes
 * and goes.
 *
 * Persian-first, mirroring the blog: every URL names only itself and
 * x-default, not five locale variants that would 404.
 */

const router = Router();

const ORIGIN = (process.env.SITEMAP_ORIGIN ?? 'https://rayantamaddonjahangostar.ir').replace(
  /\/+$/,
  ''
);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lastmod(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface SitemapUrl {
  path: string;
  modified: Date;
  priority: string;
}

function urlEntry({ path, modified, priority }: SitemapUrl): string {
  const url = `${ORIGIN}${escapeXml(path)}`;
  return [
    '  <url>',
    `    <loc>${url}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="fa-IR" href="${url}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url}"/>`,
    `    <lastmod>${lastmod(modified)}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

async function collectUrls(): Promise<SitemapUrl[]> {
  // Products come from the file-based catalog; only the ones actually seeded
  // and active in the database are listed.
  const [products, jobs, projects, books] = await Promise.all([
    prisma.insuranceProduct.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.jobPost.findMany({
            // The same predicate the public pages use. 'OPEN with a published date'
      // is not quite it: a listing pulled after publication keeps both and
      // would be advertised here while its page answers 404.
      where: { moderationStatus: 'APPROVED', state: 'OPEN', publishedAt: { not: null } },
      select: { code: true, updatedAt: true },
    }),
    prisma.freelanceProject.findMany({
            // The same predicate the public pages use. 'OPEN with a published date'
      // is not quite it: a listing pulled after publication keeps both and
      // would be advertised here while its page answers 404.
      where: { moderationStatus: 'APPROVED', state: 'OPEN', publishedAt: { not: null } },
      select: { code: true, updatedAt: true },
    }),
    prisma.bookListing.findMany({
            // The same predicate the public pages use. 'OPEN with a published date'
      // is not quite it: a listing pulled after publication keeps both and
      // would be advertised here while its page answers 404.
      where: { moderationStatus: 'APPROVED', state: 'OPEN', publishedAt: { not: null } },
      select: { code: true, updatedAt: true },
    }),
  ]);

  const catalogSlugs = new Set(CATALOG.map((product) => product.slug));

  const urls: SitemapUrl[] = [];
  for (const product of products) {
    // A database row without a catalog definition has no page to point at.
    if (!catalogSlugs.has(product.slug)) continue;
    urls.push({ path: `/insurance/${product.slug}`, modified: product.updatedAt, priority: '0.7' });
  }

  for (const job of jobs) urls.push({ path: `/jobs/${job.code}`, modified: job.updatedAt, priority: '0.6' });
  for (const project of projects)
    urls.push({ path: `/projects/${project.code}`, modified: project.updatedAt, priority: '0.6' });
  for (const book of books)
    urls.push({ path: `/books/${book.code}`, modified: book.updatedAt, priority: '0.5' });

  return [...urls, ...(await collectMarketplaceUrls()), ...(await collectJobBoardUrls())];
}

/**
 * The job board's own landing pages: one per province and per category that
 * has open roles right now, and every public company page.
 *
 * Only what has something on it — a landing page that says "no roles here" is
 * the thin page search engines penalise a whole site for. Only while the new
 * board is on, since the pages exist only then.
 */
async function collectJobBoardUrls(): Promise<SitemapUrl[]> {
  if (!features.jobsV2) return [];

  const open = {
    moderationStatus: 'APPROVED' as const,
    state: 'OPEN' as const,
    OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
  };
  const [byProvince, byCategory, companies] = await Promise.all([
    prisma.jobPost.groupBy({ by: ['province'], where: open, _max: { updatedAt: true } }),
    prisma.jobPost.groupBy({ by: ['jobCategoryId'], where: open, _max: { updatedAt: true } }),
    prisma.company.findMany({ where: PUBLIC_COMPANY_WHERE, select: { slug: true, updatedAt: true } }),
  ]);

  const urls: SitemapUrl[] = [{ path: '/companies', modified: new Date(), priority: '0.5' }];
  for (const row of byProvince) {
    const province = IRAN_PROVINCES.find((entry) => entry.fa === row.province);
    if (province) {
      urls.push({ path: `/jobs/in/${province.slug}`, modified: row._max.updatedAt ?? new Date(), priority: '0.6' });
    }
  }

  // A role filed under a child counts for its parent's page too.
  const ids = byCategory.map((row) => row.jobCategoryId).filter((id): id is string => Boolean(id));
  const categories = await prisma.jobCategory.findMany({
    where: { id: { in: ids }, active: true },
    select: { slug: true, parent: { select: { slug: true, active: true } } },
  });
  const slugs = new Set<string>();
  for (const category of categories) {
    slugs.add(category.slug);
    if (category.parent?.active) slugs.add(category.parent.slug);
  }
  for (const slug of slugs) urls.push({ path: `/jobs/category/${slug}`, modified: new Date(), priority: '0.6' });

  for (const company of companies) {
    urls.push({ path: `/companies/${encodeURIComponent(company.slug)}`, modified: company.updatedAt, priority: '0.5' });
  }
  return urls;
}

/**
 * The catalogue's pages: the module's own pages, every public shop, and every
 * public listing.
 *
 * Only while the module is switched on. In production it is off, and a sitemap
 * that advertised its pages would send crawlers to a run of 404s.
 *
 * Slugs are percent-encoded: they are usually Persian, and a sitemap URL must
 * be ASCII. The visibility predicates are the public pages' own, so nothing is
 * listed here that its page would refuse.
 */
async function collectMarketplaceUrls(): Promise<SitemapUrl[]> {
  if (!features.tradeMaster) return [];

  const [shops, listings] = await Promise.all([
    prisma.business.findMany({
      where: PUBLIC_LISTING_WHERE,
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: PUBLIC_PRODUCT_WHERE,
      select: { slug: true, updatedAt: true, business: { select: { slug: true } } },
    }),
  ]);

  const now = new Date();
  const urls: SitemapUrl[] = [
    { path: '/marketplace', modified: now, priority: '0.6' },
    { path: '/marketplace/shops', modified: now, priority: '0.6' },
    { path: '/marketplace/products', modified: now, priority: '0.6' },
    { path: '/marketplace/join', modified: now, priority: '0.4' },
  ];

  for (const shop of shops) {
    urls.push({
      path: `/marketplace/shops/${encodeURIComponent(shop.slug)}`,
      modified: shop.updatedAt,
      priority: '0.5',
    });
  }
  for (const listing of listings) {
    urls.push({
      path: `/marketplace/products/${encodeURIComponent(listing.business.slug)}/${encodeURIComponent(listing.slug)}`,
      modified: listing.updatedAt,
      priority: '0.4',
    });
  }

  return urls;
}

router.get('/extras.xml', async (_req, res, next) => {
  try {
    const urls = await collectUrls();
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls.map(urlEntry),
      '</urlset>',
      '',
    ].join('\n');

    res
      .status(200)
      .set('Content-Type', 'application/xml; charset=utf-8')
      .set('Cache-Control', 'public, max-age=3600')
      .send(body);
  } catch (error) {
    next(error);
  }
});

export default router;
