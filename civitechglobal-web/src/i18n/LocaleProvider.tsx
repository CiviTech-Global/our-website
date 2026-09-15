import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import fa from './fa';
import en from './en';
import tr from './tr';
import de from './de';
import fr from './fr';
import es from './es';
import { withFallback } from './merge';
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => storedLocale() ?? DEFAULT_LOCALE);

  /** True once somebody has picked, which stops the detector overriding them. */
  const [chosen, setChosen] = useState(() => storedLocale() !== null);

  /**
   * Ask the server where this visitor is, once, on a first visit only.
   *
   * Only the server can see the IP, and only the server sees Accept-Language —
   * the browser hands neither to JavaScript, and navigator.languages is not a
   * substitute: it would answer before the server does and then be corrected,
   * which is a visible flash into a third language on every first visit.
   *
   * It is skipped entirely once a choice exists, because a site that keeps
   * overriding what you picked is worse than one that guessed wrong once.
   */
  useEffect(() => {
    if (chosen) return;

    const controller = new AbortController();
    const base = import.meta.env.VITE_API_URL ?? '/api';

    (async () => {
      try {
        const response = await fetch(`${base}/v1/i18n/detect`, { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { data?: { locale?: string } };
        if (isLocale(body.data?.locale)) setLocaleState(body.data.locale);
      } catch {
        // Offline, blocked, or aborted. The browser's own guess already
        // applied, so there is nothing to recover from.
      }
    })();

    return () => controller.abort();
  }, [chosen]);

  useEffect(() => {
    document.documentElement.dir = DIRECTIONS[locale];
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setChosen(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session.
    }
  }, []);

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
