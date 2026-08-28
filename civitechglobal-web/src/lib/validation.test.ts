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
  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('accepts valid credentials shape', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  const base = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'Str0ng!Passw0rd',
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
});
