import { z } from 'zod';
import { normalizePersianDigits } from '../utils/persian.js';
import { COMPANY_INDUSTRIES } from '../catalog/job-taxonomy.js';
import { COUNTRY_CODES } from '../catalog/geo.js';

const country = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(COUNTRY_CODES, { message: 'کشور نامعتبر است' }),
);

/**
 * Wire formats for the job board's second generation: company pages, alerts,
 * the employer's notes. The posting itself is in marketplace.schema.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const blankToNull = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '') ? null : value;
/** Optional, and emptiable: absent leaves it, blank or null removes it. */
const clearable = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToNull, schema.nullable()).optional();
const latinDigits = (value: unknown) => (typeof value === 'string' ? normalizePersianDigits(value) : value);

const webUrl = z
  .string()
  .trim()
  .url('نشانی معتبر نیست')
  .max(300)
  .refine((value) => /^https?:\/\//i.test(value), 'نشانی باید با http یا https شروع شود');

export const companySchema = z
  .object({
    name: z.string().trim().min(2, 'نام شرکت الزامی است').max(120),
    tagline: clearable(trimmed(160)),
    about: clearable(trimmed(5000)),
    industry: clearable(z.enum(COMPANY_INDUSTRIES)),
    size: clearable(z.enum(['SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_500', 'SIZE_501_1000', 'SIZE_1000_PLUS'])),
    foundedYear: z.preprocess(
      (value) => blankToNull(latinDigits(value)),
      z.coerce
        .number()
        .int()
        // Either calendar: an Iranian company says ۱۳۸۵, a foreign one 2006.
        .min(1200, 'سال تأسیس نامعتبر است')
        .max(new Date().getFullYear(), 'سال تأسیس نامعتبر است')
        .nullable(),
    ).optional(),
    website: clearable(webUrl),
    country: country.optional(),
    province: clearable(trimmed(80)),
    city: clearable(trimmed(80)),
  })
  .strict();

/** The saved search an alert runs: the board's own filters, by name. */
export const alertQuerySchema = z
  .object({
    search: trimmed(120).optional(),
    country: country.optional(),
    province: trimmed(80).optional(),
    jobCategoryId: trimmed(40).optional(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
    workArrangement: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
    seniority: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE']).optional(),
    salaryMin: z.preprocess(latinDigits, z.string().trim().regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')).optional(),
  })
  .strict()
  // Empty strings are "not set", so the stored query only says what was chosen.
  .transform((query) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value != null)));

export const alertCreateSchema = z.object({
  name: z.string().trim().min(1, 'نام هشدار الزامی است').max(80),
  query: alertQuerySchema,
});

export const alertUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const employerNoteSchema = z.object({
  note: z.preprocess(blankToNull, trimmed(2000).nullable()),
});

export const companyListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  search: trimmed(120).optional(),
  industry: z.enum(COMPANY_INDUSTRIES).optional().or(z.literal('').transform(() => undefined)),
  country: country.optional().or(z.literal('').transform(() => undefined)),
  province: trimmed(80).optional(),
});

export const staffCompanyListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: trimmed(120).optional(),
});

export const companyHiddenSchema = z.object({ hidden: z.boolean() });
