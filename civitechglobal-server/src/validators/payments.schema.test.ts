import { describe, expect, it } from 'vitest';
import {
  paymentRequestCodeSchema,
  paymentRequestCreateSchema,
} from './payments.schema.js';

/**
 * The wire format for staff-issued payment requests.
 *
 * The cases worth defending: money arrives as a digit string (Persian digits
 * accepted, separators tolerated) and leaves as BigInt; the Sheba is
 * normalised to its canonical form; and a bill cannot point at both a
 * consultation and an award at once.
 */

describe('paymentRequestCreateSchema', () => {
  it('parses a full bill, normalising money and Sheba', () => {
    const parsed = paymentRequestCreateSchema.parse({
      title: 'جلسه مشاوره با دکتر احمدی',
      amount: '۵۰۰,۰۰۰',
      beneficiaryIban: 'ir06 1200 0000 0000 0000 0000 01',
      beneficiaryName: 'دکتر احمدی',
    });
    expect(parsed.amount).toBe(500000n);
    expect(parsed.beneficiaryIban).toBe('IR061200000000000000000001');
    expect(parsed.currency).toBe('IRT');
  });

  it('refuses a non-positive amount', () => {
    expect(() => paymentRequestCreateSchema.parse({ title: 'x'.repeat(5), amount: '0' })).toThrow();
    expect(() => paymentRequestCreateSchema.parse({ title: 'x'.repeat(5), amount: 'abc' })).toThrow();
  });

  it('refuses a malformed Sheba', () => {
    expect(() =>
      paymentRequestCreateSchema.parse({ title: 'x'.repeat(5), amount: '1000', beneficiaryIban: 'IR0612' }),
    ).toThrow();
  });

  it('refuses a bill that points at both a consultation and an award', () => {
    expect(() =>
      paymentRequestCreateSchema.parse({
        title: 'x'.repeat(5),
        amount: '1000',
        consultationRequestId: 'c1',
        awardId: 'a1',
      }),
    ).toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() =>
      paymentRequestCreateSchema.parse({ title: 'x'.repeat(5), amount: '1000', paidAt: new Date() }),
    ).toThrow();
  });
});

describe('paymentRequestCodeSchema', () => {
  it('accepts a code and uppercases nothing (codes are case-insensitive on the wire)', () => {
    expect(paymentRequestCodeSchema.parse('ABC-1234')).toBe('ABC-1234');
  });

  it('refuses junk', () => {
    expect(() => paymentRequestCodeSchema.parse('<script>')).toThrow();
    expect(() => paymentRequestCodeSchema.parse('ab')).toThrow();
  });
});
