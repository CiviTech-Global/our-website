import { describe, expect, it } from 'vitest';
import fa from './fa';
import en from './en';

function keys(o: unknown, p = ''): string[] {
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]
  );
}

describe('i18n', () => {
  it('has the same keys in both locales', () => {
    const F = keys(fa);
    const E = keys(en);
    expect([...F].filter((k) => !E.includes(k))).toEqual([]);
    expect([...E].filter((k) => !F.includes(k))).toEqual([]);
  });
});
