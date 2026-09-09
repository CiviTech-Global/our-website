/**
 * Talent intake types, mirroring the server's Prisma models and zod schema.
 *
 * Money crosses the wire as a decimal string, for the same reason it does
 * everywhere else here: an Iranian salary in toman outgrows the range a JSON
 * number can carry without losing its low digits.
 */

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'VOLUNTEER';

export type WorkArrangement = 'ONSITE' | 'HYBRID' | 'REMOTE' | 'ANY';

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

  headline?: string;
  yearsOfExperience?: number;
  skills: string[];
  desiredRole?: string;
  employmentType?: EmploymentType;
  workArrangement?: WorkArrangement;
  expectedSalary?: string;
  availableFrom?: string;

  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
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
  headline: string | null;
  desiredRole: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  city: string | null;
  status: ResumeStatus;
  matchedRole: string | null;
  createdAt: string;
}
