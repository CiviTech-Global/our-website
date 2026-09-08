import { z } from 'zod';

/**
 * Wire format for the project enquiry.
 *
 * The brief arrives as multipart/form-data — files plus a single `payload`
 * field holding this JSON. Splitting it that way keeps the structured part
 * strictly typed instead of degrading every field to a string, which is what
 * happens when a rich form is flattened into form fields.
 */

/**
 * Money crosses the wire as a decimal string and is parsed to BigInt here.
 *
 * Not a JSON number: IEEE-754 loses integer precision above 2^53, and Iranian
 * toman amounts reach that range in ordinary project budgets. A string is the
 * only lossless way to carry them through JSON.
 */
const money = z
  .string()
  .trim()
  .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح و بدون علامت باشد')
  .transform((value) => BigInt(value));

const optionalMoney = money.optional();

const trimmed = (max: number) => z.string().trim().max(max);
const requiredText = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .transform((value) => new Date(value))
  .refine((d) => !Number.isNaN(d.getTime()), 'تاریخ نامعتبر است');

export const PROJECT_TYPES = [
  'NEW_BUILD',
  'REBUILD',
  'INTEGRATION',
  'MOBILE_APP',
  'WEB_APP',
  'DATA_PLATFORM',
  'AUTOMATION',
  'MAINTENANCE',
  'CONSULTING',
  'OTHER',
] as const;

export const PLATFORMS = ['web', 'ios', 'android', 'desktop', 'api', 'embedded'] as const;
export const URGENCIES = ['EXPLORING', 'NEXT_QUARTER', 'NEXT_MONTH', 'URGENT'] as const;
export const ENGAGEMENT_MODELS = [
  'FIXED_PRICE',
  'TIME_AND_MATERIALS',
  'RETAINER',
  'NOT_SURE',
] as const;

export const projectRequestSchema = z
  .object({
    contactName: requiredText(2, 120, 'نام و نام خانوادگی الزامی است'),
    contactRole: trimmed(120).optional(),
    organizationName: trimmed(200).optional(),
    website: trimmed(200).url('نشانی وب‌سایت معتبر نیست').optional().or(z.literal('')),
    email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
    phone: z.string().trim().min(8, 'شمارهٔ تماس الزامی است').max(20),

    title: requiredText(4, 160, 'عنوان پروژه الزامی است'),
    // The one field that genuinely matters. A 40-character floor is not
    // bureaucracy: anything shorter cannot describe a software problem, and a
    // brief we cannot read is a call we cannot prepare for.
    summary: requiredText(40, 5000, 'لطفاً نیاز خود را دست‌کم در چند جمله شرح دهید'),
    projectType: z.enum(PROJECT_TYPES).default('OTHER'),
    platforms: z.array(z.enum(PLATFORMS)).max(6).default([]),
    goals: trimmed(2000).optional(),
    targetUsers: trimmed(1000).optional(),
    existingSystems: trimmed(2000).optional(),
    constraints: trimmed(2000).optional(),
    outOfScope: trimmed(2000).optional(),

    urgency: z.enum(URGENCIES).default('EXPLORING'),
    desiredStartAt: isoDate.optional(),
    deadlineAt: isoDate.optional(),
    deadlineReason: trimmed(500).optional(),

    budgetUnknown: z.boolean().default(false),
    budgetMin: optionalMoney,
    budgetMax: optionalMoney,
    suggestedPrice: optionalMoney,
    engagementModel: z.enum(ENGAGEMENT_MODELS).default('NOT_SURE'),

    ndaRequired: z.boolean().default(false),
    clientNotes: trimmed(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.budgetUnknown && value.budgetMin === undefined && value.budgetMax === undefined) {
      // Either give us a range or say you do not have one. Silence here is the
      // difference between "they have no budget" and "they did not scroll",
      // and those need different first replies.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMin'],
        message: 'بازهٔ بودجه را وارد کنید یا گزینهٔ «بودجه مشخص نیست» را انتخاب کنید',
      });
    }
    if (
      value.budgetMin !== undefined &&
      value.budgetMax !== undefined &&
      value.budgetMin > value.budgetMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMax'],
        message: 'حداکثر بودجه باید از حداقل آن بیشتر باشد',
      });
    }
    if (value.deadlineAt && value.desiredStartAt && value.deadlineAt < value.desiredStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deadlineAt'],
        message: 'مهلت تحویل نمی‌تواند پیش از تاریخ شروع باشد',
      });
    }
  });

export type ProjectRequestPayload = z.infer<typeof projectRequestSchema>;

export const trackProjectSchema = z.object({
  trackingCode: z.string().trim().min(6).max(20),
});

export const respondToProposalSchema = z.object({
  trackingCode: z.string().trim().min(6).max(20),
  email: z.string().trim().toLowerCase().email(),
  decision: z.enum(['ACCEPTED', 'DECLINED']),
  note: trimmed(2000).optional(),
});

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

const stringList = (max: number) => z.array(z.string().trim().min(1).max(500)).max(max);

export const proposalSchema = z
  .object({
    scopeSummary: requiredText(20, 5000, 'شرح دامنهٔ کار الزامی است'),
    deliverables: stringList(40).min(1, 'حداقل یک تحویل‌دادنی لازم است'),
    assumptions: stringList(40).default([]),
    // Required by the schema, not merely encouraged. See the note in
    // project-proposal.service.ts.
    exclusions: stringList(40).min(1, 'فهرست موارد خارج از دامنه را خالی نگذارید'),
    milestones: z
      .array(
        z.object({
          title: requiredText(2, 200, 'عنوان مرحله الزامی است'),
          description: trimmed(1000).optional(),
          durationDays: z.number().int().min(0).max(2000).optional(),
          price: optionalMoney,
        })
      )
      .max(30)
      .optional(),
    engagementModel: z.enum(ENGAGEMENT_MODELS).default('FIXED_PRICE'),

    optimisticHours: z.number().int().min(0).max(100_000).optional(),
    likelyHours: z.number().int().min(0).max(100_000).optional(),
    pessimisticHours: z.number().int().min(0).max(100_000).optional(),

    priceMin: optionalMoney,
    priceLikely: optionalMoney,
    priceMax: optionalMoney,
    currency: z.string().trim().length(3).default('IRT'),
    hourlyRate: optionalMoney,

    discoveryRequired: z.boolean().default(false),
    discoveryPrice: optionalMoney,
    discoveryDays: z.number().int().min(0).max(365).optional(),

    timelineWeeksMin: z.number().int().min(0).max(520).optional(),
    timelineWeeksMax: z.number().int().min(0).max(520).optional(),

    message: trimmed(5000).optional(),
    internalNotes: trimmed(5000).optional(),
    validUntil: isoDate.optional(),
  })
  .strict();

export const updateProjectStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_CLARIFICATION',
    'PROPOSAL_SENT',
    'ACCEPTED',
    'DECLINED',
    'WITHDRAWN',
    'EXPIRED',
  ]),
  internalNotes: trimmed(5000).optional(),
});
