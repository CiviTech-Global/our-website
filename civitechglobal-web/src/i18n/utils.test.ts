import { describe, expect, it } from 'vitest';
import { toPersianDigits, resolveI18nKey } from './utils';
import fa from './fa';

describe('toPersianDigits', () => {
  it('converts Latin digits to Persian numerals', () => {
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
  });

  it('leaves non-digit characters untouched', () => {
    expect(toPersianDigits('Page 2 of 10')).toBe('Page ۲ of ۱۰');
  });
});

describe('resolveI18nKey', () => {
  it('resolves a dotted "section.key" path to its dictionary string', () => {
    expect(resolveI18nKey(fa, 'auth.required')).toBe(fa.auth.required);
  });

  it('falls back to the raw path when unresolved', () => {
    expect(resolveI18nKey(fa, undefined)).toBeUndefined();
  });
});
