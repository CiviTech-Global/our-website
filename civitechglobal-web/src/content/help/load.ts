import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n/locales';
import type { HelpArticleText, HelpCollectionId, HelpCollectionText, HelpLibraryText } from './types';

/**
 * The guides, one chunk per language, fetched when first needed.
 *
 * The same reasoning as the interface dictionaries: dozens of guides in six
 * languages are far too much to put in the bundle every visitor downloads
 * before the first paint. Unlike the dictionaries they are not awaited before
 * mounting: a guide sits below the page or behind a button, so the page can
 * paint first and the guide arrive a moment later. The prerender pass waits
 * long enough after load for it to be in the HTML it saves.
 *
 * Literal paths, as in i18n/dictionaries.ts: Rollup has to see the string to
 * emit the chunk.
 */
const LOADERS: Record<Locale, () => Promise<{ default: HelpLibraryText }>> = {
  fa: () => import('./text/fa'),
  en: () => import('./text/en'),
  tr: () => import('./text/tr'),
  de: () => import('./text/de'),
  fr: () => import('./text/fr'),
  es: () => import('./text/es'),
};

const cache = new Map<Locale, HelpLibraryText>();
const inFlight = new Map<Locale, Promise<HelpLibraryText>>();

function load(locale: Locale): Promise<HelpLibraryText> {
  const cached = cache.get(locale);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(locale);
  if (pending) return pending;

  const promise = LOADERS[locale]()
    .then((mod) => {
      cache.set(locale, mod.default);
      return mod.default;
    })
    .finally(() => inFlight.delete(locale));
  inFlight.set(locale, promise);
  return promise;
}

export interface HelpArticle {
  text: HelpArticleText;
  /** True when the guide is shown in English because this language does not have it yet. */
  fallback: boolean;
}

export interface HelpLibrary {
  article(id: string): HelpArticle | undefined;
  collection(id: HelpCollectionId): HelpCollectionText | undefined;
}

function library(own: HelpLibraryText, english: HelpLibraryText | undefined, isEnglish: boolean): HelpLibrary {
  return {
    article(id) {
      const text = own.articles[id];
      if (text) return { text, fallback: false };
      const backup = english?.articles[id];
      return backup ? { text: backup, fallback: !isEnglish } : undefined;
    },
    collection(id) {
      return own.collections[id] ?? english?.collections[id];
    },
  };
}

/**
 * The guides in the visitor's language, or undefined while they load.
 *
 * Persian and English are complete. The other four carry the public guides,
 * which are the ones a live audience reads, and borrow English for the rest:
 * the member and staff guides are written for people who work in Persian or
 * English, and an English guide is more use to a German reader than none.
 */
export function useHelpLibrary(locale: Locale): HelpLibrary | undefined {
  const complete = locale === 'fa' || locale === 'en';
  const ready = (): HelpLibrary | undefined => {
    const own = cache.get(locale);
    if (!own) return undefined;
    if (complete) return library(own, locale === 'en' ? undefined : cache.get('en'), locale === 'en');
    const english = cache.get('en');
    return english ? library(own, english, false) : undefined;
  };

  const [value, setValue] = useState<HelpLibrary | undefined>(ready);

  useEffect(() => {
    let live = true;
    const wanted: Locale[] = complete ? [locale] : [locale, 'en'];
    Promise.all(wanted.map(load))
      .then(() => {
        if (live) setValue(ready());
      })
      .catch(() => {
        // A guide that failed to load is a missing guide, not a broken page.
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return value;
}
