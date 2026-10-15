import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { fallbackDictionary, loadedDictionary } from './dictionaries';
import { navigateToLocale } from './localePath';
import { rememberLanguageChoice } from './languageChoice';
import { DEFAULT_LOCALE, DIRECTIONS, LOCALE_TAGS, type Locale, type Translations } from './locales';

// Types only: a value re-export here would make this a mixed module and cost
// fast refresh for every screen the provider wraps.
export type { Locale, Translations };

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

/**
 * The language is whatever the URL says.
 *
 * `locale` is not state here, and that is the point: with one address per
 * language, the address already holds the answer, and a second copy in a
 * useState is a chance for the two to disagree — a page reading German while
 * its canonical link, its hreflang set and the URL in the address bar all say
 * French.
 *
 * Nothing here redirects by language any more. A first-time visitor is asked,
 * by LanguageChoiceDialog, and the server's guess only marks the option to
 * suggest. The automatic redirect this replaced also misfired on every Persian
 * page, sending Googlebot (an English browser in the US) to /en/.
 */
export function LocaleProvider({
  children,
  locale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  /** Normally the language the URL declares; defaults to the site's own. */
  locale?: Locale;
}) {
  useEffect(() => {
    document.documentElement.dir = DIRECTIONS[locale];
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      // Remembered even when it is the language already showing: choosing it
      // is what stops the first-visit dialog from asking again.
      rememberLanguageChoice(next);
      if (next !== locale) navigateToLocale(next);
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: DIRECTIONS[locale],
      // Preloaded by main.tsx before mount, and by the vitest setup file in
      // tests, so this is a cache hit. The fallback is for the case that
      // should not happen: rendering a language nobody fetched. English text
      // is a better failure than a thrown provider, which is a blank page.
      t: (loadedDictionary(locale) ?? fallbackDictionary()) as Translations,
      setLocale,
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
