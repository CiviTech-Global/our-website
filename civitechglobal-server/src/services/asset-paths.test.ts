import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Asset paths are relative to the API root, never absolute.
 *
 * The browser is handed a path and puts the base back on itself — see
 * apiAssetSrc on the web side, whose base is `/api`. A path written as
 * `/api/v1/trademaster/shops/x/logo` therefore arrives as
 * `/api/api/v1/trademaster/shops/x/logo`, which 404s, and an <img> that 404s
 * shows its alt text and nothing else.
 *
 * That is exactly what happened: every picture in the TradeMaster module was
 * alt text on every public page, while books and showcase — which write
 * `/market/books/x/cover` — were fine. Nothing failed loudly, no request
 * errored on the server, and the tests all passed.
 *
 * So this reads the services and refuses the absolute form outright. It is a
 * string check rather than a request because the mistake is in what is
 * written, not in what is served: both paths serve perfectly well, which is
 * the whole reason it survived.
 */

function serviceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) serviceFiles(full, out);
    else if (full.endsWith('.ts') && !full.includes('.test.')) out.push(full);
  }
  return out;
}

describe('asset paths handed to the browser', () => {
  it('are relative to the API root', () => {
    const offenders: string[] = [];

    for (const file of serviceFiles('src/services')) {
      const source = readFileSync(file, 'utf8').split('\r\n').join('\n');

      source.split('\n').forEach((line, i) => {
        // A quoted path that starts with /api, in a template or plain string.
        if (!/['"`]\/api(\/|['"`])/.test(line)) return;
        offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });

  it('is looking at the files that actually build them', () => {
    // Guards the finder: a rename or a move must not turn this into a test
    // that passes because it examined nothing.
    const shop = readFileSync('src/services/trademaster-shop.service.ts', 'utf8');
    const books = readFileSync('src/services/books.service.ts', 'utf8');

    expect(shop).toMatch(/`\/trademaster\/shops\/\$\{id\}\/logo`/);
    expect(books).toMatch(/`\/market\/books\/\$\{id\}\/cover`/);
  });
});
