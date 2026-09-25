import { withFallback } from './merge';
import { DEFAULT_LOCALE, type Locale, type Translations } from './locales';

/**
 * One language per chunk, fetched on demand.
 *
 * The six dictionaries together are about 155 KB gzipped. Importing them
 * statically put all six in the main bundle, so every visitor downloaded five
 * languages they cannot read — roughly 60% of the main chunk, wasted.
 *
 * A dynamic `import()` is what makes Rollup emit a separate chunk per
 * language. The literal path matters: Rollup has to see the string to build
 * the chunk, so this is a lookup table of thunks rather than a computed
 * `import(`./${locale}`)`.
 *
 * Persian and English are complete dictionaries and cost one chunk. The other
 * four are partial and fall back to English, so they cost two — still far less
 * than six.
 */
const LOADERS: Record<Locale, () => Promise<{ default: unknown }>> = {
  fa: () => import('./fa'),
  en: () => import('./en'),
  tr: () => import('./tr'),
  de: () => import('./de'),
  fr: () => import('./fr'),
  es: () => import('./es'),
};

/** Languages that are whole in themselves and need nothing merged in. */
const COMPLETE: ReadonlySet<Locale> = new Set<Locale>(['fa', 'en']);

const cache = new Map<Locale, Translations>();
const inFlight = new Map<Locale, Promise<Translations>>();

/**
 * The dictionary for a language, if it has already been fetched.
 *
 * Synchronous on purpose. The provider is not allowed to be async — the
 * language is decided by the URL before React mounts, and a provider that
 * resolves later would render one frame of the wrong language, or of nothing,
 * on every single page load.
 */
export function loadedDictionary(locale: Locale): Translations | undefined {
  return cache.get(locale);
}

/**
 * Fetch a language and everything it depends on.
 *
 * Call this before mounting. Concurrent calls for the same language share one
 * promise rather than racing two fetches of the same chunk.
 */
export function preloadLocale(locale: Locale): Promise<Translations> {
  const cached = cache.get(locale);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(locale);
  if (pending) return pending;

  const promise = (async () => {
    if (COMPLETE.has(locale)) {
      const mod = await LOADERS[locale]();
      const dictionary = mod.default as Translations;
      cache.set(locale, dictionary);
      return dictionary;
    }

    // A partial dictionary is meaningless without the language it falls back
    // to, so the two chunks are fetched together rather than in sequence.
    const [mod, base] = await Promise.all([LOADERS[locale](), preloadLocale('en')]);
    const dictionary = withFallback(mod.default as Parameters<typeof withFallback>[0], base);
    cache.set(locale, dictionary);
    return dictionary;
  })();

  inFlight.set(locale, promise);
  try {
    return promise;
  } finally {
    void promise.finally(() => inFlight.delete(locale));
  }
}

/**
 * Warm a language in the background, ignoring failures.
 *
 * Used by the language picker on hover: by the time the click lands the chunk
 * is usually already there, and if the network refused it the click still
 * works because switching language is a full navigation.
 */
export function warmLocale(locale: Locale): void {
  void preloadLocale(locale).catch(() => {});
}

/**
 * The language to fall back to when a requested one somehow is not loaded.
 *
 * Should not happen — `main.tsx` preloads before mounting — but a provider
 * that throws here would be a blank page, and English is understood by more of
 * this audience than a stack trace.
 */
export function fallbackDictionary(): Translations | undefined {
  return cache.get('en') ?? cache.get(DEFAULT_LOCALE) ?? cache.values().next().value;
}
