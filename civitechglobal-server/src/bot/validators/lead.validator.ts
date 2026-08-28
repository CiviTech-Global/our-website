import { z } from 'zod';
import { normalizePersianDigits } from '../utils/persian-digits.js';

export const PREFERRED_CONTACT_TIMES = ['صبح', 'ظهر', 'عصر'] as const;
export type PreferredContactTime = (typeof PREFERRED_CONTACT_TIMES)[number];

export const fullNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(3, 'نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.')
      .max(100, 'نام و نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد.'),
  );

export const phoneNumberSchema = z
  .string()
  .transform((value) => normalizePersianDigits(value.trim()))
  .pipe(z.string().regex(/^09\d{9}$/, 'شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد.'));

export const citySchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(2, 'نام شهر باید حداقل ۲ کاراکتر باشد.').max(100, 'نام شهر نباید بیشتر از ۱۰۰ کاراکتر باشد.'));

export const preferredContactTimeSchema = z.enum(PREFERRED_CONTACT_TIMES, {
  errorMap: () => ({ message: 'زمان تماس نامعتبر است.' }),
});

export const notesSchema = z
  .string()
  .transform((value) => value.trim())
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
