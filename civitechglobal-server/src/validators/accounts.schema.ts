import { z } from 'zod';
import { passwordSchema } from './auth.schema.js';

/**
 * A member account staff open on somebody's behalf. The password is the one
 * staff hand over; the same complexity rules as self-registration apply, so a
 * desk-made account is not the weakest one on the site.
 */
export const memberAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'نام الزامی است').max(100),
  lastName: z.string().trim().min(1, 'نام خانوادگی الزامی است').max(100),
  /** Lowercase letters, digits, dot, dash, underscore — the profile URL's rules. */
  username: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9._-]{2,29}$/, 'نام کاربری ۳ تا ۳۰ حرف لاتین، رقم، نقطه، خط تیره یا زیرخط باشد'),
    ])
    .optional(),
  phone: z
    .union([z.literal(''), z.string().trim().regex(/^09\d{9}$/, 'شمارهٔ تماس باید به فرمت ۰۹xxxxxxxxx باشد')])
    .optional(),
});

/** Staff opening a company account: the operator, the company and its national id. */
export const companyAccountSchema = z.object({
  account: memberAccountSchema,
  companyName: z.string().trim().min(2, 'نام شرکت الزامی است').max(160),
  nationalId: z.string().trim().min(11, 'شناسهٔ ملی شرکت باید ۱۱ رقم باشد').max(20),
});
