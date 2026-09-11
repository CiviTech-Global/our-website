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
});

export type ResumeSubmissionPayload = z.infer<typeof resumeSubmissionSchema>;

export const resumeAllowanceSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
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
