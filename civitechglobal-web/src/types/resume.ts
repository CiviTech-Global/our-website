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

/** Standing is one value; "trusted and blocked" has no meaning. */
export type IdentityStanding = 'normal' | 'trusted' | 'blocked';

export interface ClientIdentitySummary {
  id: string;
  email: string;
  phone: string;
  standing: IdentityStanding;
  requestCount: number;
  createdAt: string;
  projectRequests: number;
  resumes: number;
}

/**
 * Everything staff need about one application.
 *
 * Notably the contact details: the list has never shown them, so until this
 * existed there was no way to reach an applicant from the admin UI at all —
 * which is the one thing the intake promises to do.
 */
export interface AdminResumeDetail {
  id: string;
  trackingCode: string;
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  province: string | null;
  birthYear: number | null;
  coverNote: string | null;
  status: ResumeStatus;
  matchedRole: string | null;
  internalNotes: string | null;
  resumeOriginalName: string;
  resumeSizeBytes: number;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  identity: {
    id: string;
    requestCount: number;
    trusted: boolean;
    blocked: boolean;
  };
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
