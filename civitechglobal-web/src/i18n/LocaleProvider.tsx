import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import fa from './fa';
import en from './en';
import tr from './tr';
import de from './de';
import fr from './fr';
import es from './es';
import { withFallback } from './merge';
import { navigateToLocale } from './localePath';
import {
  DEFAULT_LOCALE,
  DIRECTIONS,
  LOCALE_TAGS,
  isLocale,
  type Locale,
  type Translations,
} from './locales';

// Types only: a value re-export here would make this a mixed module and cost
// fast refresh for every screen the provider wraps.
export type { Locale, Translations };

/**
 * Every language, complete.
 *
 * The four newer ones are partial dictionaries filled out from English, so a
 * key nobody has translated yet renders an English sentence rather than the
 * word "undefined" in the middle of a paragraph. Persian and English are whole
 * and need no filling.
 */
const DICTIONARIES: Record<Locale, Translations> = {
  fa,
  en,
  tr: withFallback(tr, en),
  de: withFallback(de, en),
  fr: withFallback(fr, en),
  es: withFallback(es, en),
};

const STORAGE_KEY = 'civitech-locale';

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

/** A choice already made. Null means nobody has chosen on this device yet. */
function storedLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    // A browser refusing storage is not a reason to fail to render.
    return null;
  }
}

/**
 * The language is whatever the URL says.
 *
 * `locale` is not state here, and that is the point: with one address per
 * language, the address already holds the answer, and a second copy in a
 * useState is a chance for the two to disagree — a page reading German while
 * its canonical link, its hreflang set and the URL in the address bar all say
 * French.
 */
export function LocaleProvider({
  children,
  locale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  /** Normally the language the URL declares; defaults to the site's own. */
  locale?: Locale;
}) {
  /**
   * Send a first-time visitor to their own language, once.
   *
   * Only the server sees the IP and the Accept-Language header; the browser
   * hands neither to JavaScript, and navigator.languages is not a substitute
   * because it would answer before the server does and then be corrected — a
   * visible flip into a third language on every first visit.
   *
   * It runs only at the unprefixed root, and only when nobody has chosen on
   * this device. Somewhere like `/de/services` the visitor is already at an
   * explicit address — arriving from a search result, a shared link or a
   * crawler — and second-guessing that would make a link mean different things
   * for different people.
   */
  useEffect(() => {
    if (locale !== DEFAULT_LOCALE) return;
    if (storedLocale() !== null) return;

    const controller = new AbortController();
    const base = import.meta.env.VITE_API_URL ?? '/api';

    (async () => {
      try {
        const response = await fetch(`${base}/v1/i18n/detect`, { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { data?: { locale?: string } };
        const detected = body.data?.locale;
        if (isLocale(detected) && detected !== DEFAULT_LOCALE) navigateToLocale(detected);
      } catch {
        // Offline, blocked, or aborted. The default language is already on
        // screen, so there is nothing to recover from.
      }
    })();

    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    document.documentElement.dir = DIRECTIONS[locale];
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      try {
        // Remembered so the detector does not undo the choice on the next
        // visit to the root.
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // The navigation below still applies for this visit.
      }
      navigateToLocale(next);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: DIRECTIONS[locale], t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
