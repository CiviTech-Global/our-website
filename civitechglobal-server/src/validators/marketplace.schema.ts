import { z } from 'zod';
import { isValidNationalId } from '../utils/persian.js';

/** Matches the upload cap in attachment.service, which is what actually binds. */
const MAX_DOCUMENTS = 8;

/**
 * Wire formats for the marketplace.
 *
 * Money is a digit string on the wire and BigInt in the database, for the same
 * reason it is everywhere else here: an Iranian amount in toman outgrows what a
 * JSON number carries without silently losing its low digits.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const required = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);

const money = z
  .string()
  .trim()
  .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')
  .transform((value) => BigInt(value));

const optionalMoney = money.optional();

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'تاریخ نامعتبر است')
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), 'تاریخ نامعتبر است');

const skills = z.array(z.string().trim().min(1).max(40)).max(20).default([]);

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export const verificationSchema = z
  .object({
    kind: z.enum(['INDIVIDUAL', 'COMPANY']),

    legalFirstName: required(2, 80, 'نام الزامی است'),
    legalLastName: required(2, 80, 'نام خانوادگی الزامی است'),
    /** Rejected here as well as in the service — a reviewer's queue is not the
     *  place to discover a typo the check digit already catches. */
    nationalId: z
      .string()
      .trim()
      .refine(isValidNationalId, 'کد ملی معتبر نیست'),
    phone: required(8, 20, 'شمارهٔ تماس الزامی است'),
    birthDate: isoDate.optional(),
    province: trimmed(80).optional(),
    city: trimmed(80).optional(),
    addressLine: trimmed(300).optional(),

    companyName: trimmed(160).optional(),
    companyRegistrationNo: trimmed(40).optional(),
    companyEconomicCode: trimmed(40).optional(),
    companyRole: trimmed(80).optional(),
    companyWebsite: z.union([z.literal(''), z.string().trim().url('نشانی معتبر نیست')]).optional(),
  })
  // Strict, unlike the rest: zod strips unknown keys by default, so a client
  // sending `address` where this expects `addressLine` had the field quietly
  // discarded and the reviewer saw a blank where somebody had typed their
  // home address. For identity documents, losing a field in silence is worse
  // than refusing the request and saying which key was not recognised.
  .strict()
  // A company that has not said which company it is cannot be checked against
  // anything, so the requirement belongs here rather than in a reviewer's head.
  .refine((data) => data.kind !== 'COMPANY' || Boolean(data.companyName?.trim()), {
    message: 'نام شرکت الزامی است',
    path: ['companyName'],
  })
  .refine((data) => data.kind !== 'COMPANY' || Boolean(data.companyRegistrationNo?.trim()), {
    message: 'شمارهٔ ثبت شرکت الزامی است',
    path: ['companyRegistrationNo'],
  });

/**
 * The kind of each uploaded document, in the same order as the files.
 *
 * Parsed rather than cast. This arrives as a JSON string in a form field, so
 * it never passes through validate(), and the previous code asserted it into
 * the enum with `as never` — which meant a value the enum does not have
 * travelled all the way to Prisma and came back as a 500. A caller sending a
 * kind we do not recognise has made a mistake, and should be told which field
 * it was in.
 */
export const documentKindsSchema = z
  .array(z.enum(['NATIONAL_ID_CARD', 'PASSPORT', 'COMPANY_REGISTRATION', 'AUTHORITY_LETTER', 'OTHER']))
  .max(MAX_DOCUMENTS, 'تعداد مدارک بیش از حد مجاز است');

export const verificationReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: trimmed(2000).optional(),
  internalNote: trimmed(2000).optional(),
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const jobSchema = z.object({
  title: required(5, 160, 'عنوان آگهی الزامی است'),
  description: required(50, 10_000, 'شرح آگهی باید کامل‌تر باشد'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  workArrangement: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
  province: trimmed(80).optional(),
  city: trimmed(80).optional(),
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
  salaryUndisclosed: z.boolean().default(false),
  skills,
  closesAt: isoDate.optional(),
});

export const jobUpdateSchema = jobSchema.partial();

export const applicationSchema = z.object({
  coverLetter: trimmed(5000).optional(),
  expectedSalary: optionalMoney,
});

export const applicationOutcomeSchema = z.object({
  outcome: z.enum(['SHORTLISTED', 'ACCEPTED', 'DECLINED']),
});

// ---------------------------------------------------------------------------
// Freelance
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  title: required(5, 160, 'عنوان پروژه الزامی است'),
  description: required(50, 10_000, 'شرح پروژه باید کامل‌تر باشد'),
  category: trimmed(80).optional(),
  skills,
  budgetMin: optionalMoney,
  budgetMax: optionalMoney,
  budgetUnknown: z.boolean().default(false),
  deliverBy: isoDate.optional(),
  /** Asked at posting time: somebody looking for an individual should not be
   *  pitched by the platform operator without having agreed to it. */
  openToCompanyOffer: z.boolean().default(true),
  closesAt: isoDate.optional(),
});

export const projectUpdateSchema = projectSchema.partial();

export const bidSchema = z.object({
  amount: money,
  deliveryDays: z.number().int().min(1).max(3650).optional(),
  message: required(20, 5000, 'توضیح پیشنهاد الزامی است'),
});

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
  reviewNote: trimmed(2000).optional(),
  internalNote: trimmed(2000).optional(),
});

/** A bid review carries one extra field: what the work looks worth. */
export const bidReviewSchema = reviewSchema.extend({
  suggestedAmount: optionalMoney,
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: trimmed(120).optional(),
  status: trimmed(40).optional(),
  category: trimmed(80).optional(),
  employmentType: trimmed(40).optional(),
  workArrangement: trimmed(40).optional(),
  province: trimmed(80).optional(),
});
