import { z } from 'zod';
import { isValidNationalId, normalizePersianDigits } from '../utils/persian.js';
import { JOB_BENEFITS } from '../catalog/job-taxonomy.js';
import { COUNTRY_CODES, CURRENCIES, SALARY_PERIODS } from '../catalog/geo.js';

/** An ISO country code, whatever case it arrives in. */
const country = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(COUNTRY_CODES, { message: 'کشور نامعتبر است' }),
);
const currency = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(CURRENCIES, { message: 'واحد پول نامعتبر است' }),
);

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

/**
 * An Iranian keyboard types ۲۵۰۰۰۰۰۰, and that is the same number as 25000000.
 * Converted before the format is checked, so the person typing in their own
 * digits is not told their salary "must be a whole number".
 */
const latinDigits = (value: unknown) => (typeof value === 'string' ? normalizePersianDigits(value) : value);

const money = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')
    .transform((value) => BigInt(value)),
);

const optionalMoney = money.optional();

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'تاریخ نامعتبر است')
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), 'تاریخ نامعتبر است');

const skills = z.array(z.string().trim().min(1).max(40)).max(20).default([]);

/** A query-string switch: only the literal "true" turns it on. */
const flagParam = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((value) => (value === 'true' ? true : undefined));

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
/**
 * The public profile fields. All optional — clearing a field is setting it to
 * an empty string, which the service normalises back to null.
 */
export const profileSchema = z.object({
  headline: trimmed(120).optional(),
  bio: trimmed(1000).optional(),
  website: z.union([z.literal(''), z.string().trim().url('نشانی معتبر نیست')]).optional(),
  /** What the person can do, as tags — matched against a job's skills. Each once. */
  skills: z
    .array(z.string().trim().min(1).max(40))
    .max(30)
    .transform((list) => [...new Map(list.map((skill) => [skill.toLowerCase(), skill])).values()])
    .optional(),
});

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

/**
 * Blank means "remove it", on an edit.
 *
 * An absent key leaves a field as it is; '' or null clears it. Without the
 * distinction, somebody who emptied the city box on an edit kept the old city,
 * because the form could only say "no change".
 */
const blankToNull = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '') ? null : value;
const clearable = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToNull, schema.nullable()).optional();

/** How many people the role hires. Accepting that many closes it. */
const openings = z.number().int().min(1, 'تعداد نفرات باید دست‌کم یک باشد').max(100);

const seniority = z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE']);
const educationLevel = z.enum(['DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE']);
const years = z.number().int().min(0).max(40);
const age = z.number().int().min(15, 'سن نامعتبر است').max(80, 'سن نامعتبر است');
/** Each benefit once, and only ones the board knows how to show. */
const benefits = z
  .array(z.enum(JOB_BENEFITS))
  .max(JOB_BENEFITS.length)
  .transform((list) => [...new Set(list)]);

const jobFields = {
  title: required(5, 160, 'عنوان آگهی الزامی است'),
  description: required(50, 10_000, 'شرح آگهی باید کامل‌تر باشد'),
  /// Free-text taxonomy tag, the same convention as project.category.
  category: trimmed(80).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  workArrangement: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
  country: country.default('IR'),
  province: trimmed(80).optional(),
  city: trimmed(80).optional(),
  remoteWorldwide: z.boolean().default(false),
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
  currency: currency.default('IRT'),
  salaryPeriod: z.enum(SALARY_PERIODS).default('MONTH'),
  salaryUndisclosed: z.boolean().default(false),
  skills,
  closesAt: isoDate.optional(),
  openings: openings.default(1),

  // The second-generation fields. Accepted whatever the flag says: a column
  // nobody sends is harmless, and the old form simply never sends them.
  jobCategoryId: z.string().trim().min(1).max(40).optional(),
  seniority: seniority.optional(),
  minExperienceYears: years.optional(),
  educationLevel: educationLevel.optional(),
  fieldOfStudy: trimmed(120).optional(),
  benefits: benefits.default([]),
  workingHours: trimmed(160).optional(),
  urgent: z.boolean().default(false),
  genderRequirement: z.enum(['ANY', 'MALE', 'FEMALE']).default('ANY'),
  ageMin: age.optional(),
  ageMax: age.optional(),
  militaryService: z.enum(['ANY', 'COMPLETED_OR_EXEMPT']).default('ANY'),
  amriehEligible: z.boolean().default(false),
  disabilityFriendly: z.boolean().default(false),
};

/** An age range that runs backwards, like a salary one, is a typo. */
function ageInOrder(value: { ageMin?: number | null; ageMax?: number | null }, ctx: z.RefinementCtx): void {
  if (value.ageMin != null && value.ageMax != null && value.ageMin > value.ageMax) {
    ctx.addIssue({ code: 'custom', path: ['ageMax'], message: 'حداکثر سن نباید کمتر از حداقل آن باشد' });
  }
}

/** A range that runs backwards is a typo, and the board would show it as written. */
function salaryInOrder(
  value: { salaryMin?: bigint | null; salaryMax?: bigint | null },
  ctx: z.RefinementCtx,
): void {
  if (value.salaryMin != null && value.salaryMax != null && value.salaryMin > value.salaryMax) {
    ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'حداکثر حقوق نباید کمتر از حداقل آن باشد' });
  }
}

export const jobSchema = z.object(jobFields).superRefine((value, ctx) => {
  salaryInOrder(value, ctx);
  ageInOrder(value, ctx);
  // A new posting that has already closed would never be seen by anybody.
  if (value.closesAt && value.closesAt.getTime() <= Date.now()) {
    ctx.addIssue({ code: 'custom', path: ['closesAt'], message: 'مهلت آگهی باید در آینده باشد' });
  }
});

export const jobUpdateSchema = z
  .object({
    ...jobFields,
    category: clearable(trimmed(80)),
    province: clearable(trimmed(80)),
    city: clearable(trimmed(80)),
    salaryMin: clearable(money),
    salaryMax: clearable(money),
    closesAt: clearable(isoDate),
    salaryUndisclosed: z.boolean(),
    skills: z.array(z.string().trim().min(1).max(40)).max(20),
    openings,
    country,
    currency,
    salaryPeriod: z.enum(SALARY_PERIODS),
    remoteWorldwide: z.boolean(),
    jobCategoryId: clearable(z.string().trim().min(1).max(40)),
    seniority: clearable(seniority),
    minExperienceYears: z.preprocess(blankToNull, years.nullable()).optional(),
    educationLevel: clearable(educationLevel),
    fieldOfStudy: clearable(trimmed(120)),
    benefits,
    workingHours: clearable(trimmed(160)),
    urgent: z.boolean(),
    genderRequirement: z.enum(['ANY', 'MALE', 'FEMALE']),
    ageMin: z.preprocess(blankToNull, age.nullable()).optional(),
    ageMax: z.preprocess(blankToNull, age.nullable()).optional(),
    militaryService: z.enum(['ANY', 'COMPLETED_OR_EXEMPT']),
    amriehEligible: z.boolean(),
    disabilityFriendly: z.boolean(),
  })
  .partial()
  .superRefine((value, ctx) => {
    salaryInOrder(value, ctx);
    ageInOrder(value, ctx);
  });

export const applicationSchema = z.object({
  coverLetter: trimmed(5000).optional(),
  expectedSalary: optionalMoney,
});

export const applicationOutcomeSchema = z.object({
  // INTERVIEW only means something on the new board; the service refuses it
  // while that is off.
  outcome: z.enum(['SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'DECLINED']),
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

// ---------------------------------------------------------------------------
// Engagement: milestones, reviews, disputes
// ---------------------------------------------------------------------------

export const milestoneSchema = z.object({
  title: required(2, 160, 'عنوان مرحله الزامی است'),
  description: trimmed(2000).optional(),
  dueDate: isoDate.optional(),
});

export const milestoneDeliverSchema = z.object({
  deliveryNote: required(1, 2000, 'توضیح تحویل الزامی است'),
});

export const awardReviewSchema = z.object({
  rating: z.number().int().min(1, 'امتیاز باید بین ۱ تا ۵ باشد').max(5, 'امتیاز باید بین ۱ تا ۵ باشد'),
  text: trimmed(1000).optional(),
});

export const disputeSchema = z.object({
  reason: required(10, 2000, 'شرح اختلاف را بنویسید (حداقل ۱۰ نویسه)'),
});

export const disputeResolveSchema = z.object({
  note: required(2, 2000, 'نتیجهٔ بررسی را بنویسید'),
});

export const extendDeadlineSchema = z.object({
  closesAt: isoDate,
});

export const pauseSchema = z.object({
  paused: z.boolean(),
  reason: trimmed(500).optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: trimmed(80).optional(),
  targetType: z.enum(['job', 'project', 'user', 'award']).optional(),
  search: trimmed(120).optional(),
});

export const messageSchema = z.object({
  body: required(1, 2000, 'متن پیام الزامی است'),
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

/**
 * The public job board query. Money arrives as digit strings and becomes
 * BigInt here, like every other money field — query params are strings on the
 * wire regardless, so the wire format is identical to the body's.
 */
export const jobBoardSchema = listQuerySchema.extend({
  skills: z
    .string()
    .trim()
    .max(200)
    .transform((value) => {
      const parts = value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
      // Duplicates add nothing to a hasSome filter but burn query-plan
      // cache for no reason; cap after deduping so a repeat cannot push a
      // distinct skill off the end.
      return [...new Set(parts)].slice(0, 10);
    })
    .optional(),
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
  sort: z.enum(['newest', 'salaryAsc', 'salaryDesc', 'closingSoon']).default('newest'),
  jobCategoryId: trimmed(40).optional(),
  seniority: seniority.optional(),
  /** "Up to N years asked for" — the reader's own experience. */
  maxExperience: z.coerce.number().int().min(0).max(40).optional(),
  /** Comma-separated benefit keys; a posting must offer every one. */
  benefits: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : undefined))
    .pipe(z.array(z.enum(JOB_BENEFITS)).max(JOB_BENEFITS.length).optional()),
  urgent: flagParam,
  amriehEligible: flagParam,
  disabilityFriendly: flagParam,
  postedWithinDays: z.coerce.number().int().refine((n) => [1, 3, 7, 14, 30].includes(n)).optional(),
  companySlug: trimmed(80).optional(),
  country: country.optional(),
  /** Remote roles open to people anywhere. */
  remoteWorldwide: flagParam,
  /** The currency a pay floor is in; ranges in other currencies cannot be compared to it. */
  currency: currency.optional(),
});

export const projectBoardSchema = listQuerySchema.extend({
  skills: z
    .string()
    .trim()
    .max(200)
    .transform((value) => {
      const parts = value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
      // Duplicates add nothing to a hasSome filter but burn query-plan
      // cache for no reason; cap after deduping so a repeat cannot push a
      // distinct skill off the end.
      return [...new Set(parts)].slice(0, 10);
    })
    .optional(),
  budgetMin: optionalMoney,
  budgetMax: optionalMoney,
  sort: z.enum(['newest', 'budgetAsc', 'budgetDesc']).default('newest'),
});

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

/**
 * A book listing.
 *
 * The description floor is lower than a job advert's: "First edition, spine
 * creased, no markings" is a complete and honest description of a used book,
 * and demanding fifty characters would only teach people to pad it.
 */
export const bookSchema = z.object({
  title: required(2, 200, 'عنوان کتاب الزامی است'),
  bookAuthor: required(2, 160, 'نام نویسنده الزامی است'),
  description: required(10, 4000, 'توضیح کتاب الزامی است'),
  condition: z.enum(['NEW', 'USED']),
  price: money,
  publisher: trimmed(160).optional(),
  /** Hyphens and spaces are how an ISBN is written; the service stores digits. */
  isbn: z
    .union([z.literal(''), z.string().trim().regex(/^[\d\s-]{10,20}$/, 'شابک معتبر نیست')])
    .optional(),
  publishYear: z.coerce
    .number()
    .int()
    .min(1200, 'سال انتشار معتبر نیست')
    // Gregorian or Jalali, whichever the seller typed: both are bounded well
    // below this, and guessing which calendar somebody meant would be worse
    // than accepting the range that contains both.
    .max(2200, 'سال انتشار معتبر نیست')
    .optional(),
  language: trimmed(40).optional(),
  pageCount: z.coerce.number().int().min(1).max(20_000).optional(),
  category: trimmed(80).optional(),
  negotiable: z.coerce.boolean().default(false),
  province: trimmed(80).optional(),
  city: trimmed(80).optional(),
});

export const bookUpdateSchema = bookSchema.partial();

/** The public market query. Search is by title or author — see the service. */
export const bookBoardSchema = listQuerySchema.extend({
  condition: z.enum(['NEW', 'USED']).optional(),
  priceMin: optionalMoney,
  priceMax: optionalMoney,
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'title']).default('newest'),
});
