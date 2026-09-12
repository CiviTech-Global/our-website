import { z } from 'zod';
import { normalizeIranMobile, normalizePersianText } from '../../utils/persian.js';

/**
 * Contact-time values match the website's `preferredContactTime` option values
 * (see `insurance/catalog/fields.ts`), so a request reads the same in the admin
 * panel whichever channel it arrived through. The Persian labels live in the
 * keyboard; only these codes are stored.
 */
export const PREFERRED_CONTACT_TIMES = ['morning', 'noon', 'evening', 'any'] as const;
export type PreferredContactTime = (typeof PREFERRED_CONTACT_TIMES)[number];

export const fullNameSchema = z
  .string()
  .transform((value) => normalizePersianText(value))
  .pipe(
    z
      .string()
      .min(3, 'نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.')
      .max(100, 'نام و نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد.'),
  );

export const phoneNumberSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeIranMobile(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد.',
    });
    return z.NEVER;
  }
  return normalized;
});

export const citySchema = z
  .string()
  .transform((value) => normalizePersianText(value))
  .pipe(z.string().min(2, 'نام شهر باید حداقل ۲ کاراکتر باشد.').max(100, 'نام شهر نباید بیشتر از ۱۰۰ کاراکتر باشد.'));

export const preferredContactTimeSchema = z.enum(PREFERRED_CONTACT_TIMES, {
  errorMap: () => ({ message: 'زمان تماس نامعتبر است.' }),
});

export const notesSchema = z
  .string()
  .transform((value) => normalizePersianText(value))
  .pipe(z.string().max(500, 'توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد.'));

export function parseFullName(value: string): string {
  return fullNameSchema.parse(value);
}

export function parsePhoneNumber(value: string): string {
  return phoneNumberSchema.parse(value);
}

export function parseCity(value: string): string {
  return citySchema.parse(value);
}

export function parsePreferredContactTime(value: string): PreferredContactTime {
  return preferredContactTimeSchema.parse(value);
}

export function parseNotes(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  return notesSchema.parse(trimmed);
}
