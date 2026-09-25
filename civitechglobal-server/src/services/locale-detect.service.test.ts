import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { detectLocale, fromAcceptLanguage } from './locale-detect.service.js';

const req = (headers: Record<string, string>) => ({ headers }) as unknown as Request;

describe('fromAcceptLanguage', () => {
  /**
   * q-values decide the order, not the order they are written in. Ignoring
   * them hands back whichever happened to come first in the string, which is
   * frequently the one the person likes least.
   */
  it('honours q-values rather than written order', () => {
    expect(fromAcceptLanguage('en;q=0.5, de;q=0.9')).toBe('de');
    expect(fromAcceptLanguage('fr;q=0.3, es;q=0.4, tr;q=0.9')).toBe('tr');
  });

  it('treats a regional tag as its base language', () => {
    expect(fromAcceptLanguage('de-AT')).toBe('de');
    expect(fromAcceptLanguage('es-MX,es;q=0.9')).toBe('es');
    expect(fromAcceptLanguage('fa-IR')).toBe('fa');
  });

  it('skips languages we do not speak and takes the next one', () => {
    expect(fromAcceptLanguage('ja, ko;q=0.9, fr;q=0.8')).toBe('fr');
  });

  it('gives nothing when it recognises none of them', () => {
    expect(fromAcceptLanguage('ja, ko, zh')).toBeNull();
    expect(fromAcceptLanguage('')).toBeNull();
    expect(fromAcceptLanguage(undefined)).toBeNull();
  });

  it('defaults a tag with no q to the highest weight', () => {
    // `de` with no q is q=1, which beats an explicit 0.9.
    expect(fromAcceptLanguage('en;q=0.9, de')).toBe('de');
  });
});

describe('detectLocale', () => {
  it('prefers the edge country header', () => {
    const result = detectLocale(req({ 'cf-ipcountry': 'TR', 'accept-language': 'en' }));

    expect(result).toEqual({ locale: 'tr', source: 'country' });
  });

  it('reads the other headers a CDN might set', () => {
    expect(detectLocale(req({ 'x-country-code': 'DE' })).locale).toBe('de');
    expect(detectLocale(req({ 'x-geo-country': 'fr' })).locale).toBe('fr');
  });

  /**
   * Cloudflare sends XX when it does not know and T1 for Tor. Neither says
   * anything about language, and treating them as countries would silently
   * pin those visitors to the default.
   */
  it('ignores the placeholder countries and falls through', () => {
    expect(detectLocale(req({ 'cf-ipcountry': 'XX', 'accept-language': 'de' }))).toEqual({
      locale: 'de',
      source: 'accept-language',
    });
    expect(detectLocale(req({ 'cf-ipcountry': 'T1', 'accept-language': 'es' })).locale).toBe('es');
  });

  /** A country we have no mapping for is not an answer; the header is. */
  it('falls through when the country maps to no language of ours', () => {
    expect(detectLocale(req({ 'cf-ipcountry': 'JP', 'accept-language': 'fr' }))).toEqual({
      locale: 'fr',
      source: 'accept-language',
    });
  });

  /**
   * Not Persian, deliberately. A visitor with no country we recognise and no
   * language we speak is the one visitor we can be fairly confident does not
   * read Persian, so the site default is the wrong answer for them.
   */
  it('falls back to English when nothing says otherwise', () => {
    expect(detectLocale(req({}))).toEqual({ locale: 'en', source: 'default' });
  });

  it('still sends the Persian-speaking countries to Persian', () => {
    expect(detectLocale(req({ 'cf-ipcountry': 'IR' }))).toEqual({
      locale: 'fa',
      source: 'country',
    });
  });

  it('still honours a browser that asks for Persian from anywhere', () => {
    expect(detectLocale(req({ 'accept-language': 'fa-IR,fa;q=0.9' }))).toEqual({
      locale: 'fa',
      source: 'accept-language',
    });
  });

  it('maps the Persian-speaking countries', () => {
    for (const country of ['IR', 'AF', 'TJ']) {
      expect(detectLocale(req({ 'cf-ipcountry': country })).locale).toBe('fa');
    }
  });

  it('maps the German-speaking countries', () => {
    for (const country of ['DE', 'AT', 'CH']) {
      expect(detectLocale(req({ 'cf-ipcountry': country })).locale).toBe('de');
    }
  });
});
