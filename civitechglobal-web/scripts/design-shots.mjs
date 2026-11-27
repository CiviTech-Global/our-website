/**
 * Design-verification screenshots: serves dist/ and captures the home page
 * and a core page in both themes at desktop and mobile widths, so design
 * changes can be reviewed with eyes instead of imagined. Dev-only tool;
 * nothing here ships.
 */
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '..', 'dist');
const OUT = resolve(HERE, '..', '.design-shots');
const PORT = 4188;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = join(DIST, path);
  try {
    const body = readFileSync(file);
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    // SPA fallback: the shell mounts the router for any unknown path.
    try {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(readFileSync(join(DIST, 'index.html')));
    } catch {
      res.writeHead(404).end('not found');
    }
  }
});

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
});

const SHOTS = [
  { path: '/#light-desktop', url: '/', width: 1440, height: 900, dark: false, fullPage: true },
  { path: '/#dark-desktop', url: '/', width: 1440, height: 900, dark: true, fullPage: true },
  { path: '/#light-mobile', url: '/', width: 390, height: 844, dark: false, fullPage: true },
  { path: '/#nav-mobile', url: '/', width: 390, height: 844, dark: false, fullPage: false },
  { path: '/services#light-desktop', url: '/services', width: 1440, height: 900, dark: false, fullPage: true },
];

await new Promise((done) => server.listen(PORT, done));
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
});
mkdirSync(OUT, { recursive: true });

try {
  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: shot.width, height: shot.height });
    // Seed the provider's storage key so ThemeProvider boots into the theme
    // under test (it re-applies its own class on mount, overriding any
    // class we could set here).
    await page.evaluateOnNewDocument((dark) => {
      window.localStorage.setItem('civitech-theme', dark ? 'dark' : 'light');
    }, shot.dark);
    await page.goto(`http://localhost:${PORT}${shot.url}`, { waitUntil: 'networkidle0', timeout: 60000 });
    // Walk to the bottom so every IntersectionObserver reveal fires, then
    // return to the top and let the kinetic headline and staggered cards
    // settle before capturing.
    await page.evaluate(async () => {
      // html has scroll-behavior: smooth for users; a screenshot walk needs
      // instant jumps or the waits outrun the scrolling.
      document.documentElement.style.scrollBehavior = 'auto';
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1500));
    const name = `${shot.path.replace(/[#/]/g, '_')}-${shot.dark ? 'dark' : 'light'}-${shot.width}px.png`;
    await page.screenshot({ path: join(OUT, name), fullPage: shot.fullPage });
    console.log('✓', name);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
