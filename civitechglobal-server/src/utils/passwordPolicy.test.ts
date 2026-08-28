import { describe, it, expect } from 'vitest';
import { isPasswordStrong, assertPasswordStrong, generateSecurePassword, PASSWORD_MIN_LENGTH } from './passwordPolicy.js';

describe('isPasswordStrong', () => {
  it('accepts a password with all required character classes and sufficient length', () => {
    expect(isPasswordStrong('Correct-Horse9!')).toBe(true);
  });

  it('rejects a password shorter than the minimum length', () => {
    expect(isPasswordStrong('Ab1!')).toBe(false);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(isPasswordStrong('lowercase1!lowercase')).toBe(false);
  });

  it('rejects a password missing a digit', () => {
    expect(isPasswordStrong('NoDigitsHere!!')).toBe(false);
  });

  it('rejects a password missing a special character', () => {
    expect(isPasswordStrong('NoSpecialChar123')).toBe(false);
  });

  it('rejects a password longer than the maximum length', () => {
    expect(isPasswordStrong('Aa1!'.repeat(40))).toBe(false);
  });
});

describe('assertPasswordStrong', () => {
  it('does not throw for a strong password', () => {
    expect(() => assertPasswordStrong('Correct-Horse9!')).not.toThrow();
  });

  it('throws for a weak password', () => {
    expect(() => assertPasswordStrong('weak')).toThrow();
  });
});

describe('generateSecurePassword', () => {
  it('generates a password that satisfies the policy by construction', () => {
    for (let i = 0; i < 20; i++) {
      const password = generateSecurePassword();
      expect(isPasswordStrong(password)).toBe(true);
    }
  });

  it('respects a custom length', () => {
    const password = generateSecurePassword(30);
    expect(password).toHaveLength(30);
  });

  it('rejects a length below the policy minimum', () => {
    expect(() => generateSecurePassword(PASSWORD_MIN_LENGTH - 1)).toThrow();
  });
});
