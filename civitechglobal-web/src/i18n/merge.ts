import type { Translations } from './locales';

/**
 * A dictionary that may say only some of what the reference says.
 *
 * Recursive Partial rather than Partial: the dictionaries are nested by
 * section, and a plain Partial would demand every key inside any section a
 * translation touches at all.
 */
export type PartialTranslations = {
  [K in keyof Translations]?: Translations[K] extends Record<string, unknown>
    ? { [P in keyof Translations[K]]?: Translations[K][P] }
    : Translations[K];
};

/**
 * Fills a partial translation out from a complete one.
 *
 * This is what makes shipping a language before every string is translated
 * safe rather than reckless. Without it, a missing key renders `undefined` in
 * the middle of a sentence, and the failure appears on whichever page nobody
 * checked — so the practical choice becomes "translate all 1,059 strings or
 * ship none", and the answer to that is always none.
 *
 * With it, a new language shows its own words where they exist and English
 * where they do not, which is a page somebody can read and improve rather than
 * a page that is broken.
 *
 * Only two levels deep, because that is how deep the dictionaries go. A
 * general deep-merge would handle shapes this data does not have and lose the
 * type checking that catches a mistyped section name.
 */
export function withFallback(partial: PartialTranslations, base: Translations): Translations {
  const merged = { ...base } as Record<string, unknown>;

  for (const [section, value] of Object.entries(partial)) {
    if (value === undefined) continue;

    const baseSection = (base as Record<string, unknown>)[section];
    // A section is either an object of strings or (rarely) a plain value.
    merged[section] =
      baseSection && typeof baseSection === 'object' && typeof value === 'object'
        ? { ...(baseSection as object), ...(value as object) }
        : value;
  }

  return merged as Translations;
}

/**
 * How much of a language is actually translated, as a fraction.
 *
 * Used by the test that stops a dictionary silently rotting: a translation
 * that covered the whole navigation last month and covers half of it now,
 * because somebody added keys and only filled in English, is a regression
 * nobody would otherwise see.
 */
export function coverage(partial: PartialTranslations, base: Translations): number {
  let total = 0;
  let translated = 0;

  for (const [section, baseValue] of Object.entries(base)) {
    if (!baseValue || typeof baseValue !== 'object') continue;

    const partialSection = (partial as Record<string, unknown>)[section] as
      | Record<string, unknown>
      | undefined;

    for (const key of Object.keys(baseValue as object)) {
      total += 1;
      if (partialSection && partialSection[key] !== undefined) translated += 1;
    }
  }

  return total === 0 ? 1 : translated / total;
}
