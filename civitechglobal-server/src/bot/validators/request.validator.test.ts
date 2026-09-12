import { describe, it, expect } from 'vitest';
import { parseFullName, parsePhoneNumber, parseCity, parsePreferredContactTime, parseNotes } from './request.validator.js';

describe('parseFullName', () => {
  it('accepts a valid name and trims whitespace', () => {
    expect(parseFullName('  علی رضایی  ')).toBe('علی رضایی');
  });

  it('rejects a name shorter than 3 characters', () => {
    expect(() => parseFullName('AB')).toThrow();
  });

  it('rejects a name longer than 100 characters', () => {
    expect(() => parseFullName('A'.repeat(101))).toThrow();
  });
});

describe('parsePhoneNumber', () => {
  it('accepts a valid Iranian mobile number', () => {
    expect(parsePhoneNumber('09121234567')).toBe('09121234567');
  });

  it('normalizes Persian digits to ASCII before validating', () => {
    expect(parsePhoneNumber('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
  });

  it('normalizes Arabic-Indic digits to ASCII before validating', () => {
    expect(parsePhoneNumber('٠٩١٢١٢٣٤٥٦٧')).toBe('09121234567');
  });

  it('adds the missing leading zero rather than rejecting the number', () => {
    // People routinely type their mobile without it. The old validator refused
    // these; normalising is strictly better than making someone retype.
    expect(parsePhoneNumber('9121234567')).toBe('09121234567');
  });

  it('accepts international forms and normalises them', () => {
    expect(parsePhoneNumber('+989121234567')).toBe('09121234567');
    expect(parsePhoneNumber('00989121234567')).toBe('09121234567');
  });

  it('rejects a landline', () => {
    expect(() => parsePhoneNumber('02112345678')).toThrow();
  });

  it('rejects a number with the wrong length', () => {
    expect(() => parsePhoneNumber('091212345')).toThrow();
  });

  it('rejects non-numeric input', () => {
    expect(() => parsePhoneNumber('not-a-phone')).toThrow();
  });
});

describe('parseCity', () => {
  it('accepts a valid city name', () => {
    expect(parseCity('تهران')).toBe('تهران');
  });

  it('rejects a city name shorter than 2 characters', () => {
    expect(() => parseCity('ت')).toThrow();
  });
});

describe('parsePreferredContactTime', () => {
  it.each(['morning', 'noon', 'evening', 'any'])('accepts %s', (value) => {
    expect(parsePreferredContactTime(value)).toBe(value);
  });

  it('rejects an unknown value', () => {
    expect(() => parsePreferredContactTime('شب')).toThrow();
  });
});

describe('parseNotes', () => {
  it('returns undefined for empty input', () => {
    expect(parseNotes('   ')).toBeUndefined();
  });

  it('returns trimmed notes when present', () => {
    expect(parseNotes('  یادداشت تستی  ')).toBe('یادداشت تستی');
  });

  it('rejects notes longer than 500 characters', () => {
    expect(() => parseNotes('ن'.repeat(501))).toThrow();
  });
});
