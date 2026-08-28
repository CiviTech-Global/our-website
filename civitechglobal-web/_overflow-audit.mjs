import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const WIDTHS = [320, 340, 360, 375, 390, 412, 428, 480, 540, 600, 640, 700, 768, 820, 900, 1024, 1100, 1280, 1366, 1440, 1536, 1920];
const ROUTES = ['/', '/about', '/services', '/contact', '/login', '/register'];

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = doc.clientWidth;
    return { scrollWidth, clientWidth, overflowBy: scrollWidth - clientWidth };
  });
}

for (const route of ROUTES) {
  for (const locale of ['en', 'fa']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 900 });
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
    if (locale === 'fa') {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Toggle language');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 300));
    }
    for (const width of WIDTHS) {
      await page.setViewport({ width, height: 900 });
      await new Promise(r => setTimeout(r, 150));
      const result = await checkOverflow(page);
      if (result.overflowBy > 1) {
        console.log(JSON.stringify({ route, locale, width, ...result }));
      }
    }
    await page.close();
  }
}
await browser.close();
console.log('DONE');
