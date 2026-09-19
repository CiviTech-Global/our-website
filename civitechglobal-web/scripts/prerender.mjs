#!/usr/bin/env node
/**
 * Prerenders the public routes of the built SPA into static HTML files.
 *
 * Why: the app shell in dist/index.html is byte-identical for every route —
 * titles, descriptions, canonical and hreflang links are all written at
 * runtime by useDocumentTitle. Google executes the scripts and sees them;
 * every crawler and link preview that does not (Telegram, WhatsApp, most
 * non-Google bots) sees one generic page. This script renders each route in
 * a real browser after `vite build` and writes the rendered HTML next to the
 * shell, so nginx's `try_files $uri $uri/ /index.html` serves the
 * route-specific HTML to anything that asks for it.
 *
 * Usage:  npm run build && npm run prerender
 *
 * Mirrors scripts/build-sitemap.mjs: same pages, same locales, same href
 * rules. When a public route is added or removed, update both.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '..', 'dist');
const PORT = 4173;

/** Mirrors src/i18n/locales.ts and build-sitemap.mjs. */
const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'];
const DEFAULT_LOCALE = 'fa';

/** Mirrors the PAGES array in scripts/build-sitemap.mjs. */
const PAGES = [
  '/',
  '/services',
  '/start-project',
  '/jobs',
  '/projects',
  '/books',
  '/portfolio',
  '/customers',
  '/partners',
  '/volunteer',
  '/join',
  '/about',
  '/team',
  '/insurance',
  '/contact',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.gz': 'application/gzip',
  '.br': 'application/octet-stream',
  '.json': 'application/json',
};

function routes() {
  return PAGES.flatMap((path) =>
    LOCALES.map((locale) => ({
      // The URL the browser visits.
      url: locale === DEFAULT_LOCALE ? path : `/${locale}${path === '/' ? '' : path}`,
      // Where the rendered HTML lands inside dist. nginx serves
      // `try_files $uri $uri/ /index.html`, so $uri/ resolves these.
      out: locale === DEFAULT_LOCALE ? join(DIST, path, 'index.html') : join(DIST, locale, path, 'index.html'),
    }))
  );
}

/** A tiny static server for dist/ — `vite preview` would do, minus the API. */
function serveDist() {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = join(DIST, urlPath);
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = join(DIST, 'index.html');
    }
    try {
      const body = readFileSync(file);
      const ext = file.slice(file.lastIndexOf('.'));
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolvePromise) => server.listen(PORT, () => resolvePromise(server)));
}

/** Chrome/Edge on this machine — no Chromium download (puppeteer-core). */
function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('No Chrome or Edge found. Set CHROME_PATH to a browser executable.');
  }
  return found;
}

async function main() {
  const server = await serveDist();
  console.log(`serving dist/ on :${PORT}, launching ${findBrowser()}`);

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      `--user-data-dir=${join(DIST, '..', '.prerender-profile')}`,
    ],
  });
  console.log('browser up');

  const failures = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    for (const route of routes()) {
      try {
        // 'load' rather than 'networkidle0': pages hit /api/, which this
        // static server does not have, and a query client retrying against a
        // dead endpoint can keep the network busy past any idle window.
        await page.goto(`http://localhost:${PORT}${route.url}`, {
          waitUntil: 'load',
          timeout: 30_000,
        });
        // useDocumentTitle writes the head tags in a useEffect after the
        // first paint; give the effect (and fonts) a beat to settle.
        await new Promise((wait) => setTimeout(wait, 1200));
        const html = await page.content();

        mkdirSync(dirname(route.out), { recursive: true });
        writeFileSync(route.out, html);

        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '(no title)';
        console.log(`✓ ${route.url.padEnd(20)} → ${route.out.replace(DIST, 'dist')}  | ${title}`);
      } catch (error) {
        failures.push(route.url);
        console.error(`✗ ${route.url}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} route(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log(`\nPrerendered ${PAGES.length * LOCALES.length} pages.`);
}

main();
