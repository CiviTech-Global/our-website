import { z } from 'zod';
import { normalizeIranMobile } from '../utils/persian.js';

/**
 * Normalises to the canonical 09xxxxxxxxx form at the edge.
 *
 * This matters more than it looks: the OTP record is keyed by a hash of the
 * number, so «+989121234567» on send and «09121234567» on verify would be two
 * different keys and the code would never match. Normalising in the schema
 * means both endpoints see the same string without either remembering to.
 */
const iranMobile = z
  .string()
  .min(1, 'شماره تماس الزامی است')
  .transform((value, ctx) => {
    const normalized = normalizeIranMobile(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد' });
      return z.NEVER;
    }
    return normalized;
  });

export const otpSendSchema = z.object({
  phone: iranMobile,
});

export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  phone: iranMobile,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'کد تأیید باید ۶ رقم باشد'),
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const submitRequestSchema = z.object({
  productSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'شناسه محصول نامعتبر است'),
  phoneToken: z.string().min(1, 'تأیید شماره تماس الزامی است'),
  // Answers are shaped per product, so they cannot be typed here. The real
  // validation happens in validateAnswers() against the product's field list;
  // this only bounds the payload so a malformed body fails cheaply.
  answers: z.record(z.unknown()),
  email: z.string().email('ایمیل نامعتبر است').max(200).optional().nullable(),
});

export type SubmitRequestBody = z.infer<typeof submitRequestSchema>;

export const productSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
});

export const trackingCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,16}$/, 'کد پیگیری نامعتبر است')
    .transform((value) => value.toUpperCase()),
});
