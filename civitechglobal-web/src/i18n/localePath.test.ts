import { describe, expect, it } from 'vitest';
import { localeAlternates, localeHref, localePrefix, splitLocalePath } from './localePath';
import { LOCALES } from './locales';

describe('locale paths', () => {
  it('leaves Persian at the root and prefixes the rest', () => {
    expect(localePrefix('fa')).toBe('');
    expect(localePrefix('en')).toBe('/en');
    expect(localePrefix('de')).toBe('/de');
  });

  it('reads the language off the front of a path', () => {
    expect(splitLocalePath('/de/services')).toEqual({ locale: 'de', path: '/services' });
    expect(splitLocalePath('/tr')).toEqual({ locale: 'tr', path: '/' });
  });

  it('treats an unprefixed path as the default language', () => {
    expect(splitLocalePath('/services')).toEqual({ locale: 'fa', path: '/services' });
    expect(splitLocalePath('/')).toEqual({ locale: 'fa', path: '/' });
  });

  it('does not mistake a route for a language', () => {
    // "es" is Spanish, but "estimates" is not — matching a prefix rather than a
    // whole segment would silently swallow the first word of a URL.
    expect(splitLocalePath('/estimates')).toEqual({ locale: 'fa', path: '/estimates' });
    expect(splitLocalePath('/deals/12')).toEqual({ locale: 'fa', path: '/deals/12' });
  });

  it('does not accept /fa as a second address for the root', () => {
    // Persian owns the unprefixed URL. If /fa/services also rendered, the same
    // page would sit at two addresses, splitting its ranking between them.
    expect(splitLocalePath('/fa/services')).toEqual({ locale: 'fa', path: '/fa/services' });
  });

  it('builds an address for a route in any language', () => {
    expect(localeHref('fa', '/services')).toBe('/services');
    expect(localeHref('en', '/services')).toBe('/en/services');
    expect(localeHref('fa', '/')).toBe('/');
    expect(localeHref('en', '/')).toBe('/en');
  });

  it('round-trips every language through split and rebuild', () => {
    for (const locale of LOCALES) {
      const href = localeHref(locale, '/jobs/42');
      expect(splitLocalePath(href)).toEqual({ locale, path: '/jobs/42' });
    }
  });

  it('names every language in the alternate set, partial ones included', () => {
    const alternates = localeAlternates('/about');

    // Leaving a partly translated language out would tell search engines to
    // send those readers to Persian instead of to the page meant for them.
    expect(alternates).toHaveLength(LOCALES.length);
    expect(alternates.map((a) => a.href)).toEqual([
      '/about',
      '/en/about',
      '/tr/about',
      '/de/about',
      '/fr/about',
      '/es/about',
    ]);
  });
});
