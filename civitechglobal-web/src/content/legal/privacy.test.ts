import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { privacyPolicies } from './privacy';

/** The shape of a policy: sections, and per section its paragraphs and list lengths. */
const shape = (locale: (typeof LOCALES)[number]) =>
  privacyPolicies[locale].sections.map((s) => s.body.map((b) => (Array.isArray(b) ? b.length : 'p')));

describe('privacy policy', () => {
  it.each(LOCALES)('%s says as much as the English', (locale) => {
    // A translation that drops a section or a list item drops a promise.
    expect(shape(locale)).toEqual(shape('en'));
  });

  it.each(LOCALES)('%s has no empty text', (locale) => {
    const p = privacyPolicies[locale];
    const texts = [p.title, p.updated, p.intro, ...p.sections.flatMap((s) => [s.heading, ...s.body.flat()])];
    for (const text of texts) expect(text.trim()).not.toBe('');
  });
});
