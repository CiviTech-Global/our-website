import { describe, expect, it } from 'vitest';
import { documentKindsSchema, verificationSchema } from './marketplace.schema.js';

const valid = {
  kind: 'INDIVIDUAL' as const,
  legalFirstName: 'Ali',
  legalLastName: 'Rezaei',
  // Satisfies the Iranian national-id check digit.
  nationalId: '0084575948',
  phone: '09121234567',
};

describe('documentKindsSchema', () => {
  /**
   * These arrive as a JSON string in a form field, so they never pass through
   * validate(). The route used to assert them into the enum with `as never`,
   * which meant a value the enum does not have travelled to Prisma and came
   * back as a 500 — telling the caller we broke when in fact they sent
   * something we do not recognise.
   */
  it('refuses a kind the enum does not have', () => {
    const result = documentKindsSchema.safeParse(['NATIONAL_ID_CARD', 'BIRTH_CERTIFICATE']);

    expect(result.success).toBe(false);
    if (!result.success) {
      // The index, so the caller can tell which of the files was wrong.
      expect(result.error.errors[0].path).toEqual([1]);
    }
  });

  it('accepts every kind the schema actually declares', () => {
    const all = ['NATIONAL_ID_CARD', 'PASSPORT', 'COMPANY_REGISTRATION', 'AUTHORITY_LETTER', 'OTHER'];

    expect(documentKindsSchema.safeParse(all).success).toBe(true);
  });
});

describe('verificationSchema', () => {
  /**
   * Strict on purpose. zod strips unknown keys by default, so a client sending
   * `address` where this expects `addressLine` had the field quietly discarded
   * and a reviewer saw a blank where somebody had typed their home address.
   * Losing identity details in silence is worse than refusing the request.
   */
  it('refuses a key it does not recognise rather than discarding it', () => {
    const result = verificationSchema.safeParse({ ...valid, address: 'somewhere' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('address');
    }
  });

  it('accepts the address under the name it actually uses', () => {
    const result = verificationSchema.safeParse({
      ...valid,
      addressLine: 'somewhere',
      province: 'Tehran',
      city: 'Tehran',
    });

    expect(result.success).toBe(true);
  });

  /** AccountKind has two values. A third was offered in the UI for a while. */
  it('refuses an account kind that does not exist', () => {
    expect(verificationSchema.safeParse({ ...valid, kind: 'COMPANY_REPRESENTATIVE' }).success).toBe(
      false
    );
  });

  it('makes a company say which company it is', () => {
    const nameless = verificationSchema.safeParse({ ...valid, kind: 'COMPANY' });
    expect(nameless.success).toBe(false);

    const named = verificationSchema.safeParse({
      ...valid,
      kind: 'COMPANY',
      companyName: 'Rayan Tamaddon',
      companyRegistrationNo: '12345',
    });
    expect(named.success).toBe(true);
  });
});
