import { z } from 'zod';

/**
 * Wire format for a resume submission.
 *
 * Same multipart shape as the project brief: the structured part travels as one
 * JSON field so it keeps its types, and the CV travels as a file.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const required = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);

const CURRENT_YEAR = new Date().getFullYear();

export const resumeSubmissionSchema = z.object({
  fullName: required(2, 120, 'نام و نام خانوادگی الزامی است'),
  // Both required, and both load-bearing: together they are the identity, and
  // separately they are the two ways we reach someone about a job.
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  phone: z.string().trim().min(8, 'شمارهٔ تماس الزامی است').max(20),

  city: trimmed(80).optional(),
  province: trimmed(80).optional(),
  // A year, not a birthday: nothing here needs the day, and asking for less of
  // somebody's identity is the better default.
  birthYear: z
    .number()
    .int()
    .min(1300, 'سال تولد معتبر نیست')
    .max(CURRENT_YEAR - 14, 'سال تولد معتبر نیست')
    .optional(),

  coverNote: trimmed(3000).optional(),

  // ---- Programme ----------------------------------------------------------
  //
  // Absent for a job CV. The volunteer and internship form sends the track and
  // the questions a placement turns on; refine() below makes the ones that
  // matter required for those two tracks only.
  track: z.enum(['JOB', 'VOLUNTEER', 'INTERNSHIP']).default('JOB'),
  discipline: z
    .enum(['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA', 'QA', 'UI_UX', 'OTHER'])
    .optional(),
  // A week has 168 hours; anything claiming more than a full-time week is a typo.
  hoursPerWeek: z.number().int().min(1, 'ساعت در هفته معتبر نیست').max(60, 'ساعت در هفته معتبر نیست').optional(),
  availableFrom: z.coerce.date().optional(),
  durationMonths: z.number().int().min(1).max(24).optional(),
  arrangement: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
  university: trimmed(160).optional(),
  fieldOfStudy: trimmed(160).optional(),
  skills: z.array(trimmed(40).min(1)).max(30).optional(),
  githubUrl: z.string().trim().url('نشانی معتبر نیست').max(300).optional(),
  portfolioUrl: z.string().trim().url('نشانی معتبر نیست').max(300).optional(),
  linkedinUrl: z.string().trim().url('نشانی معتبر نیست').max(300).optional(),
}).superRefine((value, ctx) => {
  if (value.track === 'JOB') return;
  // The two answers a placement cannot be planned without. Everything else is
  // helpful, and asking for it as mandatory would lose applicants who have not
  // decided yet how many months they can give.
  if (!value.discipline) {
    ctx.addIssue({ code: 'custom', path: ['discipline'], message: 'زمینهٔ فعالیت را انتخاب کنید' });
  }
  if (!value.hoursPerWeek) {
    ctx.addIssue({ code: 'custom', path: ['hoursPerWeek'], message: 'تعداد ساعت در هفته را وارد کنید' });
  }
});

export type ResumeSubmissionPayload = z.infer<typeof resumeSubmissionSchema>;

export const resumeAllowanceSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // The allowance is per track, so the question has to name one.
  track: z.enum(['JOB', 'VOLUNTEER', 'INTERNSHIP']).default('JOB'),
});

export const updateResumeStatusSchema = z.object({
  status: z.enum([
    'RECEIVED',
    'IN_REVIEW',
    'SHORTLISTED',
    'MATCHED',
    'ON_HOLD',
    'DECLINED',
    'WITHDRAWN',
  ]),
  matchedRole: trimmed(160).optional(),
  internalNotes: trimmed(5000).optional(),
  /**
   * Who is dealing with this. Null hands it back to the pile.
   *
   * `undefined` means "leave it alone", which is what an update that only
   * changes the status sends — so the two cannot be confused.
   */
  assignedToId: z.string().trim().min(1).nullable().optional(),
});

export const resumeTrackSchema = z.enum(['JOB', 'VOLUNTEER', 'INTERNSHIP']);
