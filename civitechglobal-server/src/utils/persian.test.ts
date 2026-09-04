import { describe, it, expect } from 'vitest';
import {
  isPlausiblePlate,
  isValidNationalId,
  isValidPostalCode,
  normalizeIranMobile,
  normalizePersianDigits,
  normalizePersianText,
  stripZeroWidth,
} from './persian.js';

describe('normalizePersianDigits', () => {
  it('converts Persian digits to ASCII', () => {
    expect(normalizePersianDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });

  it('converts Arabic-Indic digits to ASCII', () => {
    expect(normalizePersianDigits('٠٩١٢')).toBe('0912');
  });

  it('leaves non-digit characters untouched', () => {
    expect(normalizePersianDigits('کد ۱۲۳')).toBe('کد 123');
  });
});

describe('normalizePersianText', () => {
  it('folds Arabic ي and ك onto their Persian forms', () => {
    // These render identically but compare unequal, so a name typed on an
    // Arabic keyboard would otherwise never match the same name typed on a
    // Persian one.
    expect(normalizePersianText('يك')).toBe('یک');
  });

  it('collapses runs of whitespace and trims', () => {
    expect(normalizePersianText('  علی   رضایی  ')).toBe('علی رضایی');
  });
});

describe('stripZeroWidth', () => {
  it('removes the zero-width non-joiner used in Persian compounds', () => {
    expect(stripZeroWidth('می‌رود')).toBe('میرود');
  });
});

describe('isValidNationalId', () => {
  // Checksum-valid codes, verified against the published algorithm.
  it.each(['0084575948', '0499370899', '0790419904', '6104038931'])('accepts %s', (id) => {
    expect(isValidNationalId(id)).toBe(true);
  });

  it('rejects a code with a wrong check digit', () => {
    expect(isValidNationalId('0084575949')).toBe(false);
  });

  it('rejects codes that are not ten digits', () => {
    expect(isValidNationalId('123456789')).toBe(false);
    expect(isValidNationalId('00845759481')).toBe(false);
  });

  it('rejects repeated-digit codes even though they satisfy the arithmetic', () => {
    // 1111111111 and friends pass the checksum but are never issued, so
    // accepting them would let the most obvious filler value straight through.
    expect(isValidNationalId('1111111111')).toBe(false);
    expect(isValidNationalId('0000000000')).toBe(false);
  });

  it('accepts a code typed with Persian digits', () => {
    expect(isValidNationalId('۰۰۸۴۵۷۵۹۴۸')).toBe(true);
  });
});

describe('normalizeIranMobile', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['9121234567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['0912 123 4567', '09121234567'],
    ['0912-123-4567', '09121234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeIranMobile(input)).toBe(expected);
  });

  it('rejects a landline', () => {
    expect(normalizeIranMobile('02112345678')).toBeNull();
  });

  it('rejects a number of the wrong length', () => {
    expect(normalizeIranMobile('0912123456')).toBeNull();
  });
});

describe('isPlausiblePlate', () => {
  it.each(['۱۲ ب ۳۴۵ ایران ۶۷', '12ب345-67', '12 B 345 IRAN 67'])('accepts %s', (plate) => {
    expect(isPlausiblePlate(plate)).toBe(true);
  });

  it('rejects something with too few digits to be a plate', () => {
    expect(isPlausiblePlate('12')).toBe(false);
  });
});

describe('isValidPostalCode', () => {
  it('accepts exactly ten digits', () => {
    expect(isValidPostalCode('1234567890')).toBe(true);
  });

  it('rejects a shorter code', () => {
    expect(isValidPostalCode('12345')).toBe(false);
  });
});
