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

/** Which programme a CV was sent to. Absent on the wire means JOB. */
export type TalentTrack = 'JOB' | 'VOLUNTEER' | 'INTERNSHIP';

export type TalentDiscipline =
  | 'FRONTEND'
  | 'BACKEND'
  | 'FULLSTACK'
  | 'MOBILE'
  | 'DEVOPS'
  | 'DATA'
  | 'QA'
  | 'UI_UX'
  | 'OTHER';

export const TALENT_DISCIPLINES: TalentDiscipline[] = [
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'MOBILE',
  'DEVOPS',
  'DATA',
  'QA',
  'UI_UX',
  'OTHER',
];

export type WorkArrangement = 'ONSITE' | 'HYBRID' | 'REMOTE';

/** What the volunteer and internship form adds to a CV. Empty on a job CV. */
export interface ProgrammeFields {
  track?: TalentTrack;
  discipline?: TalentDiscipline;
  hoursPerWeek?: number;
  /** Gregorian ISO date, whatever calendar the field displayed. */
  availableFrom?: string;
  durationMonths?: number;
  arrangement?: WorkArrangement;
  university?: string;
  fieldOfStudy?: string;
  skills?: string[];
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export interface ResumePayload extends ProgrammeFields {
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
  track: TalentTrack;
  discipline: TalentDiscipline | null;
  hoursPerWeek: number | null;
  availableFrom: string | null;
  durationMonths: number | null;
  arrangement: WorkArrangement | null;
  university: string | null;
  fieldOfStudy: string | null;
  skills: string[];
  githubUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
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
  track: TalentTrack;
  discipline: TalentDiscipline | null;
  hoursPerWeek: number | null;
  trackingCode: string;
  fullName: string;
  city: string | null;
  status: ResumeStatus;
  matchedRole: string | null;
  createdAt: string;
}
