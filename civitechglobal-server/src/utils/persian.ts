/**
 * Persian input normalisation and Iran-specific identifier checks.
 *
 * Everything an Iranian user types can arrive in three different digit sets —
 * ASCII, Persian (۰۱۲), or Arabic-Indic (٠١٢) — depending on their keyboard.
 * Normalising once at the edge means every validator downstream can assume
 * ASCII, rather than each one remembering to handle it (and one of them
 * forgetting).
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ENGLISH_DIGITS = '0123456789';

/** Normalises Persian and Arabic-Indic digits to ASCII. */
export function normalizePersianDigits(input: string): string {
  return input
    .split('')
    .map((char) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(char);
      if (persianIndex !== -1) return ENGLISH_DIGITS[persianIndex] as string;

      const arabicIndex = ARABIC_DIGITS.indexOf(char);
      if (arabicIndex !== -1) return ENGLISH_DIGITS[arabicIndex] as string;

      return char;
    })
    .join('');
}

/**
 * Arabic ي/ك arrive from some keyboards in place of Persian ی/ک and compare
 * unequal despite looking identical. Fold them so a name typed on an Arabic
 * layout matches the same name typed on a Persian one.
 */
export function normalizePersianLetters(input: string): string {
  return input.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

/** Full normalisation for free text: digits, letters, whitespace. */
export function normalizePersianText(input: string): string {
  return normalizePersianLetters(normalizePersianDigits(input)).replace(/\s+/g, ' ').trim();
}

/** Strips zero-width joiners/spaces, which break naive length checks. */
export function stripZeroWidth(input: string): string {
  return input.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

// --- Iranian identifiers --------------------------------------------------

/**
 * Validates an Iranian national ID (کد ملی).
 *
 * Ten digits where the last is a checksum over the first nine. Rejecting a
 * mistyped ID here saves a phone call later — but note that a well-formed ID is
 * not a real one, so this is a typo filter and nothing more.
 */
export function isValidNationalId(value: string): boolean {
  const digits = normalizePersianDigits(value).replace(/\D/g, '');
  if (digits.length !== 10) return false;

  // All-identical digits pass the checksum arithmetic but are never issued.
  if (/^(\d)\1{9}$/.test(digits)) return false;

  const check = Number(digits[9]);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  const remainder = sum % 11;

  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** Normalises an Iranian mobile number to the canonical 09xxxxxxxxx form. */
export function normalizeIranMobile(value: string): string | null {
  let digits = normalizePersianDigits(value).replace(/[\s()-]/g, '');

  if (digits.startsWith('+98')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0098')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('98') && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`;

  return /^09\d{9}$/.test(digits) ? digits : null;
}

/**
 * Loosely validates an Iranian vehicle plate.
 *
 * Deliberately permissive: plates are written a dozen ways («۱۲ ب ۳۴۵ ایران ۶۷»,
 * «12ب345-67», with or without the word ایران) and a human reads this field off
 * the request anyway. The check catches an empty or obviously wrong entry
 * without rejecting a legitimate format we did not anticipate.
 */
export function isPlausiblePlate(value: string): boolean {
  const normalized = normalizePersianDigits(stripZeroWidth(value));
  const digitCount = (normalized.match(/\d/g) ?? []).length;
  // Car plates carry 7 digits, motorcycle plates 8. Allow a little slack.
  return digitCount >= 5 && digitCount <= 9 && normalized.trim().length >= 6;
}

/** Iranian postal codes are exactly 10 digits. */
export function isValidPostalCode(value: string): boolean {
  return /^\d{10}$/.test(normalizePersianDigits(value).replace(/\D/g, ''));
}
