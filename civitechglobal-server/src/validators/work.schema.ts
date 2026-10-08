import { z } from 'zod';
import { normalizePersianDigits } from '../utils/persian.js';
import { COUNTRY_CODES, CURRENCIES } from '../catalog/geo.js';
import {
  EXPERIENCE_LEVELS,
  PACKAGE_TIERS,
  UNLIMITED_REVISIONS,
  WORK_LANGUAGES,
} from '../catalog/work-taxonomy.js';

/**
 * Wire formats for the freelance board's second generation: invitations,
 * NDAs, alerts, the client's pipeline, timesheets, the talent directory and
 * the service catalogue. The project and bid themselves are in
 * marketplace.schema, beside the first generation's.
 */

const country = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(COUNTRY_CODES, { message: 'کشور نامعتبر است' }),
);
const currency = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(CURRENCIES, { message: 'واحد پول نامعتبر است' }),
);
const trimmed = (max: number) => z.string().trim().max(max);
const required = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max);
const latinDigits = (value: unknown) => (typeof value === 'string' ? normalizePersianDigits(value) : value);
const money = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')
    .transform((value) => BigInt(value)),
);
const flagParam = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((value) => (value === 'true' ? true : undefined));
const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};
const csv = (max: number) =>
  z
    .string()
    .trim()
    .max(400)
    .transform((value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, max))
    .optional();
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'تاریخ نامعتبر است')
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), 'تاریخ نامعتبر است');

// ---- Projects -------------------------------------------------------------

export const ndaSignSchema = z.object({
  signedName: required(3, 120, 'نام کامل خود را برای امضا بنویسید'),
  accept: z.literal(true, { message: 'برای ادامه باید توافق‌نامه را بپذیرید' }),
});

export const inviteSchema = z.object({
  username: required(2, 40, 'نام کاربری فریلنسر الزامی است'),
  message: trimmed(1000).optional(),
});

export const bidStageSchema = z.object({
  outcome: z.enum(['PENDING', 'SHORTLISTED', 'INTERVIEW', 'DECLINED']),
});

export const bidNoteSchema = z.object({ note: z.string().trim().max(2000).nullable() });

export const projectAlertQuerySchema = z
  .object({
    search: trimmed(120).optional(),
    workCategoryId: trimmed(40).optional(),
    pricingType: z.enum(['FIXED', 'HOURLY']).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    budgetMin: z.preprocess(latinDigits, z.string().trim().regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')).optional(),
    country: country.optional(),
    language: z.enum(WORK_LANGUAGES).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  })
  .strict()
  .transform((query) =>
    Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== '' && value != null && !(Array.isArray(value) && value.length === 0)),
    ),
  );

export const projectAlertCreateSchema = z.object({
  name: required(1, 80, 'نام هشدار الزامی است'),
  query: projectAlertQuerySchema,
});

export const projectAlertUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(80).optional(), active: z.boolean().optional() })
  .strict();

export const timesheetSchema = z.object({
  weekStart: isoDate,
  /** Hours and minutes arrive as minutes, so the client never rounds. */
  minutes: z.number().int().min(1).max(7 * 24 * 60),
  memo: required(5, 2000, 'شرح کار انجام‌شده را بنویسید'),
});

export const timesheetReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'QUERIED']),
  note: trimmed(1000).optional(),
});

export const talentQuerySchema = z.object({
  ...page,
  search: trimmed(120).optional(),
  skills: csv(10),
  workCategoryId: trimmed(40).optional(),
  country: country.optional(),
  language: z.enum(WORK_LANGUAGES).optional(),
  availability: z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE']).optional(),
  level: z.enum(['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  verified: flagParam,
  sort: z.enum(['relevance', 'rating', 'newest']).default('relevance'),
});

/** The freelancer's half of their profile: languages, rate, availability, country. */
export const freelancerProfileSchema = z
  .object({
    languages: z
      .array(z.enum(WORK_LANGUAGES))
      .max(WORK_LANGUAGES.length)
      .transform((list) => [...new Set(list)])
      .optional(),
    hourlyRate: z.preprocess(
      (value) => (value === '' ? null : latinDigits(value)),
      z
        .string()
        .trim()
        .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')
        .transform((value) => BigInt(value))
        .nullable(),
    ).optional(),
    hourlyCurrency: currency.optional(),
    availability: z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE']).optional(),
    country: country.optional(),
  })
  .strict();

// ---- Services -------------------------------------------------------------

const packageSchema = z.object({
  tier: z.enum(PACKAGE_TIERS),
  name: required(2, 60, 'نام بسته الزامی است'),
  description: required(10, 600, 'توضیح بسته کوتاه است'),
  price: money,
  deliveryDays: z.number().int().min(1, 'زمان تحویل دست‌کم یک روز').max(365),
  revisions: z.number().int().min(UNLIMITED_REVISIONS).max(100),
  features: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
});

export const serviceSchema = z.object({
  title: required(15, 120, 'عنوان خدمت باید دست‌کم ۱۵ نویسه باشد'),
  description: required(120, 12_000, 'شرح خدمت باید کامل‌تر باشد'),
  workCategoryId: z.string().trim().min(1).max(40).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  languages: z
    .array(z.enum(WORK_LANGUAGES))
    .max(WORK_LANGUAGES.length)
    .transform((list) => [...new Set(list)])
    .default([]),
  faqs: z
    .array(z.object({ question: required(5, 200, 'پرسش کوتاه است'), answer: required(2, 1500, 'پاسخ الزامی است') }))
    .max(10)
    .default([]),
  requirements: z.array(z.string().trim().min(5, 'پرسش کوتاه است').max(300)).max(8).default([]),
  currency: currency.default('IRT'),
  packages: z.array(packageSchema).min(1, 'دست‌کم یک بسته').max(3),
  extras: z
    .array(
      z.object({
        title: required(3, 80, 'عنوان امکان اضافه الزامی است'),
        price: money,
        extraDays: z.number().int().min(0).max(60).default(0),
      }),
    )
    .max(8)
    .default([]),
  /** On an edit: images to drop. */
  removeImageIds: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

export const serviceStateSchema = z.object({ state: z.enum(['ACTIVE', 'PAUSED']) });

export const serviceCatalogSchema = z.object({
  ...page,
  search: trimmed(120).optional(),
  workCategoryId: trimmed(40).optional(),
  priceMin: money.optional(),
  priceMax: money.optional(),
  currency: currency.optional(),
  deliveryDays: z.coerce.number().int().refine((n) => [1, 3, 7, 14, 30].includes(n)).optional(),
  language: z.enum(WORK_LANGUAGES).optional(),
  sellerCountry: country.optional(),
  sellerLevel: z.enum(['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED']).optional(),
  verifiedSeller: flagParam,
  featured: flagParam,
  sellerUsername: trimmed(40).optional(),
  sort: z.enum(['recommended', 'newest', 'priceAsc', 'priceDesc', 'rating', 'bestSelling']).default('recommended'),
});

export const orderSchema = z.object({
  tier: z.enum(PACKAGE_TIERS),
  extraIds: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  requirementAnswers: z.array(z.string().trim().min(1, 'پاسخ همهٔ پرسش‌ها الزامی است').max(2000)).max(8).default([]),
  note: trimmed(2000).optional(),
});

export const orderDeclineSchema = z.object({ reason: required(5, 500, 'دلیل را کوتاه بنویسید') });

export const staffServiceListSchema = z.object({
  ...page,
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']).optional(),
  search: trimmed(120).optional(),
});

export const featuredSchema = z.object({ featured: z.boolean() });
