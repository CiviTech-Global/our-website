import { z } from 'zod';
import { toLatinDigits } from '../services/trademaster-common.js';

/**
 * Wire formats for staff-issued payment requests.
 *
 * Money is a digit string (Persian digits accepted) and BigInt in the
 * service, as everywhere else on this API. The Sheba is normalised to its
 * canonical form — no separators, uppercase — before it reaches the service.
 */

const latinDigits = (value: unknown) => (typeof value === 'string' ? toLatinDigits(value) : value);

export const money = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[,،٬\s]/g, ''))
    .pipe(z.string().regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد'))
    .transform((value) => BigInt(value)),
);

const sheba = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(/^IR\d{24}$/, 'شماره شبا معتبر نیست')),
);

export const paymentRequestCreateSchema = z
  .object({
    title: z.string().trim().min(3, 'عنوان باید دست‌کم ۳ نویسه باشد').max(200),
    description: z.string().trim().max(1000).optional(),
    amount: money.refine((value) => value > 0n, 'مبلغ باید بیشتر از صفر باشد'),
    currency: z.literal('IRT').default('IRT'),
    /** The member being billed, when they have an account. */
    payerUserId: z.string().trim().min(1).max(40).optional(),
    /** What it pays for, where there is a row to point at. */
    consultationRequestId: z.string().trim().min(1).max(40).optional(),
    awardId: z.string().trim().min(1).max(40).optional(),
    /** The partner's share settles to this Sheba at the gateway. */
    beneficiaryIban: sheba.optional(),
    beneficiaryName: z.string().trim().min(2).max(120).optional(),
  })
  .strict()
  .refine((body) => !(body.consultationRequestId && body.awardId), {
    message: 'یک صورتحساب فقط برای یک مورد است',
    path: ['awardId'],
  });

export const paymentRequestListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  paid: z.enum(['true', 'false']).optional(),
});

export const paymentRequestCodeSchema = z
  .string()
  .trim()
  .min(4, 'کد پرداخت معتبر نیست')
  .max(40)
  .regex(/^[A-Z0-9-]+$/i, 'کد پرداخت معتبر نیست');

export const paymentRequestConfirmSchema = z.object({
  reference: z.string().trim().min(1).max(100),
});
