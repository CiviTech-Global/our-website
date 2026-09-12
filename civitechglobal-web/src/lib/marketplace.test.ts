import { describe, expect, it } from 'vitest';
import fa from '@/i18n/fa';
import en from '@/i18n/en';
import { formatMoney, formatRange } from './marketplace';

describe('formatMoney', () => {
  /**
   * The reason these are strings rather than numbers: 92,233,720,368,547,758
   * is past 2^53, so Number() would round it — and the digits it drops are
   * somebody's money.
   */
  it('groups a value too large for a JS number without losing a digit', () => {
    const huge = '92233720368547758';
    expect(formatMoney(huge, 'en')).toBe('92,233,720,368,547,758');
    expect(formatMoney(huge, 'en')?.replace(/,/g, '')).toBe(huge);
  });

  it('groups from the right', () => {
    expect(formatMoney('1', 'en')).toBe('1');
    expect(formatMoney('1000', 'en')).toBe('1,000');
    expect(formatMoney('50000000', 'en')).toBe('50,000,000');
  });

  it('uses Persian digits and separator in Persian', () => {
    expect(formatMoney('50000000', 'fa')).toBe('۵۰٬۰۰۰٬۰۰۰');
  });

  it('treats nothing as nothing rather than as zero', () => {
    expect(formatMoney(null, 'en')).toBeNull();
    expect(formatMoney(undefined, 'en')).toBeNull();
    expect(formatMoney('', 'en')).toBeNull();
    expect(formatMoney('abc', 'en')).toBeNull();
  });
});

describe('formatRange', () => {
  it('reads as a range when both ends are known', () => {
    expect(formatRange('50000000', '90000000', 'en', en)).toBe('50,000,000 to 90,000,000 IRT');
  });

  /**
   * A client who knows their floor but not their ceiling should not have to
   * invent one, and the board should not render the gap as a dangling dash.
   */
  it('reads as an open end when only one is known', () => {
    expect(formatRange('50000000', null, 'en', en)).toBe('from 50,000,000 IRT');
    expect(formatRange(null, '90000000', 'en', en)).toBe('to 90,000,000 IRT');
  });

  it('is nothing when neither end is known, so the caller can say so itself', () => {
    expect(formatRange(null, null, 'en', en)).toBeNull();
  });

  it('works in Persian too', () => {
    expect(formatRange('50000000', null, 'fa', fa)).toContain('۵۰٬۰۰۰٬۰۰۰');
  });
});
