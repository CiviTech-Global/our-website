import type { Request } from 'express';

/**
 * Guessing which language a first-time visitor reads.
 *
 * Two signals, in this order, and the order is the whole design.
 *
 * A country header from the edge is the "IP location" signal. It is only
 * trusted when it arrives from a proxy we put there — an untrusted caller can
 * set any header they like, and while picking a language is not a security
 * decision, a signal that anyone can forge is not a signal.
 *
 * Accept-Language comes second but is usually better: it is a preference the
 * person actually expressed in their browser, where the country is an
 * inference from where they happen to be sitting. Somebody German-speaking on
 * holiday in Spain wants German.
 *
 * Whatever this returns is a SUGGESTION. The client stores an explicit choice
 * and stops asking, because a site that keeps overriding what you picked is
 * worse than one that guessed wrong once.
 */

export const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

const DEFAULT_LOCALE: Locale = 'fa';

/** Country to language. Only where one language is clearly the working one. */
const COUNTRY_LOCALE: Record<string, Locale> = {
  IR: 'fa', AF: 'fa', TJ: 'fa',
  TR: 'tr',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', BE: 'fr', MC: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
};

/**
 * Headers an edge sets to say which country a request came from.
 *
 * Cloudflare, ArvanCloud and most Iranian CDNs use one of these. Read in
 * order, first non-empty wins.
 */
const COUNTRY_HEADERS = ['cf-ipcountry', 'x-country-code', 'x-geo-country', 'x-client-geo-country'];

function fromCountryHeader(req: Request): Locale | null {
  for (const header of COUNTRY_HEADERS) {
    const raw = req.headers[header];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase();
    // XX is Cloudflare's "unknown", T1 is Tor. Neither says anything.
    if (!value || value.length !== 2 || value === 'XX' || value === 'T1') continue;
    const locale = COUNTRY_LOCALE[value];
    if (locale) return locale;
  }
  return null;
}

/**
 * The browser's own preference list, honoured in its stated order.
 *
 * q-values matter: `de;q=0.9, en;q=0.8` means German first, and ignoring the
 * weights would hand back whichever happened to be written first.
 */
export function fromAcceptLanguage(header: string | undefined): Locale | null {
  if (!header) return null;

  const entries = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => /^q=([0-9.]+)$/.exec(p.trim())?.[1])
        .find(Boolean);
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    // The primary subtag only: de-AT and de are the same dictionary here.
    const base = tag.split('-')[0];
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }

  return null;
}

export interface DetectedLocale {
  locale: Locale;
  /** Which signal decided it, so the client can say why and tests can assert. */
  source: 'country' | 'accept-language' | 'default';
}

export function detectLocale(req: Request): DetectedLocale {
  const byCountry = fromCountryHeader(req);
  if (byCountry) return { locale: byCountry, source: 'country' };

  const byHeader = fromAcceptLanguage(
    typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : undefined,
  );
  if (byHeader) return { locale: byHeader, source: 'accept-language' };

  return { locale: DEFAULT_LOCALE, source: 'default' };
}
