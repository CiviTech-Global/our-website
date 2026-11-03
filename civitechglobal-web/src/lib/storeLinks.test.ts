import { describe, expect, it } from 'vitest';
import { BAZAAR_APP_URL, bazaarLink } from './storeLinks';

describe('bazaarLink', () => {
  it('keeps the Persian page for Persian readers', () => {
    expect(bazaarLink(BAZAAR_APP_URL, 'fa')).toBe(
      'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app',
    );
  });

  it('sends every other language to the English page', () => {
    for (const locale of ['en', 'tr', 'de', 'fr', 'es'] as const) {
      expect(bazaarLink(BAZAAR_APP_URL, locale)).toBe(
        'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app?l=en',
      );
    }
  });

  it('does not add the language twice', () => {
    expect(bazaarLink(`${BAZAAR_APP_URL}?l=en`, 'en')).toBe(`${BAZAAR_APP_URL}?l=en`);
  });

  it('leaves another store, or something that is not a link, alone', () => {
    expect(bazaarLink('https://myket.ir/app/x', 'en')).toBe('https://myket.ir/app/x');
    expect(bazaarLink('/downloads/app.apk', 'en')).toBe('/downloads/app.apk');
  });
});
