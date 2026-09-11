import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import fa from './fa';
import en from './en';

export type Locale = 'fa' | 'en';

type Dictionary = typeof fa;

/** The shape every locale satisfies, for code that takes `t` as a parameter. */
export type Translations = Dictionary;

const DICTIONARIES: Record<Locale, Dictionary> = { fa, en };
const DIRECTIONS: Record<Locale, 'rtl' | 'ltr'> = { fa: 'rtl', en: 'ltr' };
const STORAGE_KEY = 'civitech-locale';

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fa';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'fa' || stored === 'en') return stored;
  return 'fa';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.dir = DIRECTIONS[locale];
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === 'fa' ? 'en' : 'fa'));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: DIRECTIONS[locale],
      t: DICTIONARIES[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
