import { afterEach, describe, expect, it, vi } from 'vitest';
import { beneficiarySplit, partnerCommissionPercent } from './partner-split.js';

/**
 * The partner split, shared by every flow that pays a share to someone else —
 * marketplace sellers, consultation experts, freelance partners.
 *
 * The properties worth defending: the platform keeps the commission and the
 * partner gets the rest, settled at the gateway; a missing or invalid Sheba
 * degrades to a plain payment instead of blocking the payer; and the split
 * always sums exactly, whatever truncation the percent math does.
 */

const SHEBA = 'IR061200000000000000000001';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('beneficiarySplit', () => {
  it('keeps the commission with us and sends the rest to the partner', () => {
    expect(beneficiarySplit(100000n, 10, SHEBA)).toEqual([{ iban: SHEBA, amount: 90000n }]);
  });

  it('normalises the Sheba before it reaches the gateway', () => {
    expect(beneficiarySplit(100000n, 10, 'ir06 1200 0000 0000 0000 0000 01')).toEqual([
      { iban: SHEBA, amount: 90000n },
    ]);
  });

  it('is absent when the commission is off — a regular payment', () => {
    expect(beneficiarySplit(100000n, 0, SHEBA)).toBeUndefined();
    expect(beneficiarySplit(100000n, 0, null)).toBeUndefined();
  });

  it('is absent without a valid Sheba, so a missing account never blocks payment', () => {
    expect(beneficiarySplit(100000n, 10, null)).toBeUndefined();
    expect(beneficiarySplit(100000n, 10, '')).toBeUndefined();
    expect(beneficiarySplit(100000n, 10, 'IR0612')).toBeUndefined();
  });

  it('truncates a fractional commission, so the split always sums exactly', () => {
    expect(beneficiarySplit(100n, 7, SHEBA)).toEqual([{ iban: SHEBA, amount: 93n }]);
    expect(beneficiarySplit(99999n, 10, SHEBA)).toEqual([{ iban: SHEBA, amount: 90000n }]);
  });
});

describe('partnerCommissionPercent', () => {
  it('reads the configured percent', () => {
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '12');
    expect(partnerCommissionPercent()).toBe(12);
  });

  it('treats unset, blank and garbage as zero', () => {
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '');
    expect(partnerCommissionPercent()).toBe(0);
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '   ');
    expect(partnerCommissionPercent()).toBe(0);
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', 'abc');
    expect(partnerCommissionPercent()).toBe(0);
  });

  it('refuses out-of-range values rather than guessing', () => {
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '-5');
    expect(partnerCommissionPercent()).toBe(0);
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '100');
    expect(partnerCommissionPercent()).toBe(0);
    vi.stubEnv('PAYMENT_PARTNER_COMMISSION_PERCENT', '12.9');
    expect(partnerCommissionPercent()).toBe(12);
  });
});
