import { Router } from 'express';
import { prisma } from '../config/database.js';
import { CATALOG } from '../insurance/catalog/index.js';

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
