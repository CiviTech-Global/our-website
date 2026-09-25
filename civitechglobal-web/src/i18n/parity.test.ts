import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import fa from './fa';
import en from './en';
import tr from './tr';
import de from './de';
import fr from './fr';
import es from './es';

function keys(o: unknown, p = ''): string[] {
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]
  );
}

/**
 * Duplicates cannot be seen in the parsed object — the second literal simply
 * wins and the first disappears — so this reads the source instead. It caught a
 * real one: a `province` added to the verification block collided with the
 * `province` already in the posting block, and the verification label silently
 * became the other section's.
 */
function duplicateKeysIn(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const duplicates: string[] = [];

  // Object literals here are indented by section, so a key's indentation
  // identifies which section it belongs to. Good enough to catch a collision
  // inside one block, which is the mistake that actually happens.
  const byIndent = new Map<string, Set<string>>();
  for (const line of source.split('\n')) {
    const match = /^(\s+)([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
    if (!match) continue;
    const [, indent, key] = match;
    // A new section resets the ones nested inside it.
    if (line.trimEnd().endsWith('{')) {
      for (const [other] of byIndent) if (other.length > indent.length) byIndent.delete(other);
    }
    const seen = byIndent.get(indent) ?? new Set<string>();
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
    byIndent.set(indent, seen);
  }

  return duplicates;
}

describe('i18n', () => {
  it('has the same keys in both locales', () => {
    const F = keys(fa);
    const E = keys(en);
    expect([...F].filter((k) => !E.includes(k))).toEqual([]);
    expect([...E].filter((k) => !F.includes(k))).toEqual([]);
  });

  it.each(['./fa.ts', './en.ts', './tr.ts', './de.ts', './fr.ts', './es.ts'])(
    '%s defines each key once',
    (file) => {
      expect(duplicateKeysIn(file)).toEqual([]);
    }
  );

  /**
   * The other dictionaries are typed as partial, so a missing key is not a
   * type error — it just falls back to English at runtime, which nobody
   * notices until a German speaker reads an English sentence.
   *
   * `landing.*` is the exception and is meant to be: the insurance product
   * pages are Persian-only by decision, so they are not translated and not
   * counted here.
   */
  it.each([
    ['tr', tr],
    ['de', de],
    ['fr', fr],
    ['es', es],
  ])('%s translates every key outside the Persian-only insurance pages', (_locale, dict) => {
    const translated = new Set(keys(dict));
    const untranslated = keys(en)
      .filter((k) => !k.startsWith('landing.'))
      .filter((k) => !translated.has(k));

    expect(untranslated).toEqual([]);
  });
});
