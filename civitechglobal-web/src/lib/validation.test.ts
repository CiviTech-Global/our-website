import { describe, expect, it } from 'vitest';
import { isPasswordValid, loginSchema, registerSchema } from './validation';

describe('isPasswordValid (backend policy: 12+, upper, lower, digit, special)', () => {
  it('accepts a strong password', () => {
    expect(isPasswordValid('Str0ng!Passw0rd')).toBe(true);
  });

  it('rejects a password shorter than 12 characters', () => {
    expect(isPasswordValid('Sh0rt!Pw')).toBe(false);
  });

  it('rejects a password missing a special character', () => {
    expect(isPasswordValid('LongEnoughPass1')).toBe(false);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(isPasswordValid('longenough1!pass')).toBe(false);
  });

  it('rejects a password missing a digit', () => {
    expect(isPasswordValid('LongEnoughPass!')).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires something to sign in with', () => {
    const result = loginSchema.safeParse({ email: '   ', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('accepts an email address', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('accepts a username, which accounts opened by staff are often given', () => {
    const result = loginSchema.safeParse({ email: 'acme.hr', password: 'anything' });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  const base = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'Str0ng!Passw0rd',
    accountKind: 'INDIVIDUAL' as const,
  };

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'Different!Pass1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
    }
  });

  it('accepts matching, policy-compliant passwords', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: base.password });
    expect(result.success).toBe(true);
  });

  it('asks a company for its name and an eleven-digit national id', () => {
    const company = { ...base, confirmPassword: base.password, accountKind: 'COMPANY' as const };

    const missing = registerSchema.safeParse(company);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      const paths = missing.error.issues.map((issue) => issue.path[0]);
      expect(paths).toEqual(expect.arrayContaining(['companyName', 'companyNationalId']));
    }

    // Persian digits are what a Persian keyboard types.
    const complete = registerSchema.safeParse({ ...company, companyName: 'Acme', companyNationalId: '۱۰۱۰۰۱۲۳۴۵۶' });
    expect(complete.success).toBe(true);
  });
});
