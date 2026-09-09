/**
 * Talent intake types, mirroring the server's Prisma models and zod schema.
 *
 * Deliberately thin: the CV itself carries the experience, the skills and the
 * links, so asking for them again on the form was duplicated effort for the
 * applicant and a second, staler copy for us.
 */

export type ResumeStatus =
  | 'RECEIVED'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'MATCHED'
  | 'ON_HOLD'
  | 'DECLINED'
  | 'WITHDRAWN';

export interface ResumePayload {
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  province?: string;
  birthYear?: number;
  coverNote?: string;
}

export interface ResumeResult {
  id: string;
  trackingCode: string;
}

/**
 * What the form can learn before anything is typed: whether this email has
 * already spent its two days.
 */
export interface ResumeAllowance {
  known: boolean;
  daysUsed: number;
  daysAllowed: number | null;
  blocked?: boolean;
}

export interface AdminResumeSummary {
  id: string;
  trackingCode: string;
  fullName: string;
  city: string | null;
  status: ResumeStatus;
  matchedRole: string | null;
  createdAt: string;
}
