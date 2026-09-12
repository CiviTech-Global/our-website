/**
 * Persian input helpers, mirroring `civitechglobal-server/src/utils/persian.ts`.
 *
 * Duplicated rather than shared because the two packages have no common build,
 * and a published package for eighty lines would cost more than it saves. The
 * server copy is authoritative: anything accepted here is checked again there.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ENGLISH_DIGITS = '0123456789';

export function normalizePersianDigits(input: string): string {
  return input
    .split('')
    .map((char) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(char);
      if (persianIndex !== -1) return ENGLISH_DIGITS[persianIndex]!;
      const arabicIndex = ARABIC_DIGITS.indexOf(char);
      if (arabicIndex !== -1) return ENGLISH_DIGITS[arabicIndex]!;
      return char;
    })
    .join('');
}

/** Iranian national ID: ten digits with a check digit over the first nine. */
export function isValidNationalId(value: string): boolean {
  const digits = normalizePersianDigits(value).replace(/\D/g, '');
  if (digits.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false;

  const check = Number(digits[9]);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  const remainder = sum % 11;

  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** Normalises an Iranian mobile number to 09xxxxxxxxx, or null if it is not one. */
export function normalizeIranMobile(value: string): string | null {
  let digits = normalizePersianDigits(value).replace(/[\s()-]/g, '');

  if (digits.startsWith('+98')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0098')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('98') && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`;

  return /^09\d{9}$/.test(digits) ? digits : null;
}

/** Groups an integer with thousands separators for display in an input. */
export function formatThousands(value: string): string {
  const digits = normalizePersianDigits(value).replace(/\D/g, '');
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
