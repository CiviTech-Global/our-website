/**
 * The job board and the freelance board.
 *
 * Money crosses the wire as a decimal string, not a number. The unit is Toman
 * (IRT), as everywhere else in this codebase, and a large figure passes 2^53
 * sooner than you would think — parsing one would round somebody's pay.
 */

export type AccountKind = 'INDIVIDUAL' | 'COMPANY' | 'COMPANY_REPRESENTATIVE';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ModerationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type ListingState = 'OPEN' | 'CLOSED' | 'AWARDED';

export type JobEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';

export type JobWorkArrangement = 'ONSITE' | 'HYBRID' | 'REMOTE';

export type OfferOutcome = 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED';

export type VerificationDocumentKind =
  | 'NATIONAL_ID_CARD'
  | 'BIRTH_CERTIFICATE'
  | 'COMPANY_REGISTRATION'
  | 'OFFICIAL_GAZETTE'
  | 'AUTHORISATION_LETTER'
  | 'OTHER';

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Verification ----------------------------------------------------------

export interface VerificationPayload {
  kind: AccountKind;
  legalFirstName: string;
  legalLastName: string;
  nationalId: string;
  phone: string;
  birthDate?: string;
  address?: string;
  companyName?: string;
  companyRegistrationNumber?: string;
  companyNationalId?: string;
  positionTitle?: string;
}

export interface OwnVerification {
  status: VerificationStatus;
  kind?: AccountKind;
  legalFirstName?: string;
  legalLastName?: string;
  companyName?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  /** Written to the applicant. The internal note is never sent here. */
  reviewNote?: string | null;
  documents?: Array<{ id: string; kind: VerificationDocumentKind; originalName: string }>;
}

// --- Jobs ------------------------------------------------------------------

export interface PublicJobSummary {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  employmentType: JobEmploymentType;
  workArrangement: JobWorkArrangement;
  province: string | null;
  city: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryUndisclosed: boolean;
  currency: string;
  publishedAt: string | null;
}

export interface PublicJobDetail extends PublicJobSummary {
  description: string;
  skills: string[];
  closesAt: string | null;
}

export interface JobPayload {
  title: string;
  description: string;
  employmentType: JobEmploymentType;
  workArrangement: JobWorkArrangement;
  province?: string;
  city?: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryUndisclosed?: boolean;
  skills?: string[];
  closesAt?: string;
}

export interface OwnJob {
  id: string;
  code: string;
  title: string;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  _count: { applications: number };
}

export interface ApplicationPayload {
  coverLetter?: string;
  expectedSalary?: string;
}

/** What the applicant sees of their own application. */
export interface OwnApplication {
  id: string;
  coverLetter: string | null;
  expectedSalary: string | null;
  cvOriginalName: string | null;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  outcome: OfferOutcome;
  createdAt: string;
  job: { code: string; title: string; companyName: string | null; state: ListingState };
}

/** What the employer sees — approved applications only. */
export interface EmployerApplication {
  id: string;
  coverLetter: string | null;
  expectedSalary: string | null;
  cvOriginalName: string | null;
  outcome: OfferOutcome;
  createdAt: string;
  applicant: { id: string; firstName: string; lastName: string; email: string };
}

// --- Freelance projects ----------------------------------------------------

export interface PublicProjectSummary {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  category: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  budgetUnknown: boolean;
  currency: string;
  publishedAt: string | null;
  /** How many have bid. Never who, never how much — the bids are sealed. */
  _count: { bids: number };
}

export interface PublicProjectDetail extends PublicProjectSummary {
  description: string;
  skills: string[];
  deliverBy: string | null;
  openToCompanyOffer: boolean;
  attachments: Array<{ id: string; originalName: string; sizeBytes: number }>;
}

export interface ProjectPayload {
  title: string;
  description: string;
  category?: string;
  budgetMin?: string;
  budgetMax?: string;
  budgetUnknown?: boolean;
  skills?: string[];
  deliverBy?: string;
  openToCompanyOffer?: boolean;
}

export interface OwnProject {
  id: string;
  code: string;
  title: string;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  _count: { bids: number };
}

export interface BidPayload {
  amount: string;
  deliveryDays?: number;
  message: string;
}

/** What a bidder sees of their own bid, including the fairness note. */
export interface OwnBid {
  id: string;
  amount: string;
  currency: string;
  deliveryDays: number | null;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  /** What a reviewer thinks the work is worth. Advice, never applied for you. */
  suggestedAmount: string | null;
  outcome: OfferOutcome;
  createdAt: string;
  project: { code: string; title: string; state: ListingState };
}

/** What the project author sees — approved bids only. */
export interface AuthorBid {
  id: string;
  amount: string;
  currency: string;
  deliveryDays: number | null;
  message: string;
  isCompanyOffer: boolean;
  outcome: OfferOutcome;
  createdAt: string;
  bidder: { id: string; firstName: string; lastName: string } | null;
}

// --- The queues ------------------------------------------------------------

export interface VerificationQueueRow {
  id: string;
  kind: AccountKind;
  status: VerificationStatus;
  legalFirstName: string;
  legalLastName: string;
  companyName: string | null;
  submittedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
}

export interface VerificationDetail extends VerificationQueueRow {
  nationalId: string;
  phone: string;
  birthDate: string | null;
  address: string | null;
  companyRegistrationNumber: string | null;
  companyNationalId: string | null;
  positionTitle: string | null;
  reviewNote: string | null;
  internalNote: string | null;
  reviewedAt: string | null;
  documents: Array<{
    id: string;
    kind: VerificationDocumentKind;
    originalName: string;
    storedName: string;
  }>;
}

export interface JobQueueRow {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  moderationStatus: ModerationStatus;
  submittedAt: string | null;
  author: { id: string; email: string; firstName: string; lastName: string };
}

/** One posting opened for review: everything the row has, plus the text. */
export interface JobReviewDetail extends JobQueueRow {
  description: string;
  employmentType: JobEmploymentType;
  workArrangement: JobWorkArrangement;
  province: string | null;
  city: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryUndisclosed: boolean;
  currency: string;
  skills: string[];
  closesAt: string | null;
  state: ListingState;
  reviewNote: string | null;
  internalNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  _count: { applications: number };
}

export interface ApplicationQueueRow {
  id: string;
  coverLetter: string | null;
  expectedSalary: string | null;
  cvOriginalName: string | null;
  cvStoredName: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  applicant: { id: string; firstName: string; lastName: string; email: string };
  job: { id: string; code: string; title: string; companyName: string | null; description: string };
}

export interface ProjectQueueRow {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  moderationStatus: ModerationStatus;
  submittedAt: string | null;
  author: { id: string; email: string; firstName: string; lastName: string };
}

/**
 * A bid awaiting review, with the project beside it.
 *
 * The scope has to be there: whether a number is fair is unanswerable without
 * knowing what the work is and what the client budgeted for it.
 */
export interface BidQueueRow {
  id: string;
  amount: string;
  currency: string;
  deliveryDays: number | null;
  message: string;
  isCompanyOffer: boolean;
  createdAt: string;
  bidder: { id: string; firstName: string; lastName: string; email: string } | null;
  project: {
    code: string;
    title: string;
    description: string;
    budgetMin: string | null;
    budgetMax: string | null;
    budgetUnknown: boolean;
    currency: string;
  };
}
