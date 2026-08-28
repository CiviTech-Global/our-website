const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ENGLISH_DIGITS = '0123456789';

/** Normalizes Persian and Arabic-Indic digits to ASCII so phone numbers/etc. parse consistently. */
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
