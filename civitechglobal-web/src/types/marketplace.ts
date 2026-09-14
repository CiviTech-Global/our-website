/**
 * The job board and the freelance board.
 *
 * Money crosses the wire as a decimal string, not a number. The unit is Toman
 * (IRT), as everywhere else in this codebase, and a large figure passes 2^53
 * sooner than you would think — parsing one would round somebody's pay.
 */

export type AccountKind = 'INDIVIDUAL' | 'COMPANY';

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
  | 'PASSPORT'
  | 'COMPANY_REGISTRATION'
  | 'AUTHORITY_LETTER'
  | 'OTHER';

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Board showcase ----------------------------------------------------------

/**
 * The public face of an author, when they have chosen a username. Real names
 * and contact details are never part of this shape — see the server's
 * profile.service for the privacy rules. Null on listings whose author has
 * not opted into a public profile; the board stays anonymous for them.
 */
export interface AuthorProfile {
  username: string;
  headline: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
}

export interface BoardStats {
  openJobs: number;
  openProjects: number;
  awardsGiven: number;
  verifiedUsers: number;
}

export type FeaturedJob = Omit<PublicJobSummary, 'publishedAt'>;

export type FeaturedProject = Omit<PublicProjectSummary, 'publishedAt'>;

export interface FeaturedResponse {
  jobs: FeaturedJob[];
  projects: FeaturedProject[];
}

// --- The account's own dashboard numbers ------------------------------------

export interface OwnMarketplaceStats {
  listings: { total: number; views: number };
  applications: { total: number; byOutcome: Record<string, number> };
  bids: { total: number; byOutcome: Record<string, number> };
  awards: { won: number };
  unread: { notifications: number; messages: number };
}

// --- Staff: analytics, audit, operations -------------------------------------

export interface MarketplaceAnalytics {
  queues: Record<string, Record<string, number>>;
  awards: {
    total: number;
    byStatus: Record<string, number>;
    completed: number;
    openDisputes: number;
    completionRate: number | null;
  };
  featured: { jobs: number; projects: number };
  reviewSpeedHours: Record<string, number | null>;
  weeklyTrend: Array<{ week: string; jobs: number; projects: number }>;
  topCategories: Array<{ value: string; total: number }>;
  topSkills: Array<{ value: string; total: number }>;
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: unknown;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}

// --- Messaging and notifications ---------------------------------------------

export interface ConversationSummary {
  threadId: string;
  kind: 'application' | 'bid';
  listingTitle: string;
  listingCode: string;
  path: string;
  counterpart: AuthorProfile | null;
  counterpartName: string | null;
  lastMessage: { body: string; createdAt: string; mine: boolean } | null;
  unreadCount: number;
}

export interface ThreadView {
  anchor: { kind: 'application' | 'bid'; listingTitle: string; listingCode: string; path: string };
  messages: Array<{
    id: string;
    body: string;
    senderId: string;
    readAt: string | null;
    createdAt: string;
    mine: boolean;
  }>;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

// --- Engagement: awards, milestones, reviews, disputes ----------------------

export type AwardStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type DisputeStatus = 'NONE' | 'OPEN' | 'RESOLVED';
export type MilestoneStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED';

export interface AwardMilestone {
  id: string;
  order: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  deliveryNote: string | null;
  deliveredAt: string | null;
  deliveryOriginalName: string | null;
  approvedAt: string | null;
}

/** One collaboration the user is a party to, from /market/me/awards. */
export interface AwardView {
  award: {
    id: string;
    status: AwardStatus;
    agreedAmount: string | null;
    currency: string;
    completedAt: string | null;
    disputeStatus: DisputeStatus;
    disputeReason: string | null;
    disputeOpenedAt: string | null;
    jobApplicationId: string | null;
    projectBidId: string | null;
  };
  kind: 'job' | 'project';
  listing: { code: string; title: string };
  authorId: string;
  counterpartyId: string | null;
  myRole: 'author' | 'counterparty';
  counterpartyProfile: AuthorProfile | null;
  milestones: AwardMilestone[];
  myReview: { rating: number; text: string | null } | null;
  theirReview: { rating: number; text: string | null } | null;
}

// --- Public profiles --------------------------------------------------------

/** What an account that chose a username shows the world. */
export interface PublicProfile {
  username: string;
  headline: string | null;
  bio: string | null;
  website: string | null;
  companyName: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  joinedAt: string;
  jobs: Array<{
    code: string;
    title: string;
    employmentType: JobEmploymentType;
    state: ListingState;
    publishedAt: string | null;
  }>;
  projects: Array<{
    code: string;
    title: string;
    category: string | null;
    state: ListingState;
    publishedAt: string | null;
  }>;
  reviews: Array<{
    rating: number;
    text: string | null;
    createdAt: string;
    role: 'employer' | 'applicant' | 'client' | 'freelancer';
    listingCode: string;
    listingTitle: string;
  }>;
}

export interface ProfilePayload {
  headline?: string;
  bio?: string;
  website?: string;
}

// --- Verification ----------------------------------------------------------

/** Field for field what the server's verificationSchema accepts. */
export interface VerificationPayload {
  kind: AccountKind;
  legalFirstName: string;
  legalLastName: string;
  nationalId: string;
  phone: string;
  birthDate?: string;
  province?: string;
  city?: string;
  addressLine?: string;
  companyName?: string;
  companyRegistrationNo?: string;
  companyEconomicCode?: string;
  companyRole?: string;
  companyWebsite?: string;
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
  category: string | null;
  featured: boolean;
  employmentType: JobEmploymentType;
  workArrangement: JobWorkArrangement;
  province: string | null;
  city: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryUndisclosed: boolean;
  currency: string;
  publishedAt: string | null;
  authorProfile: AuthorProfile | null;
}

export interface PublicJobDetail extends PublicJobSummary {
  description: string;
  skills: string[];
  closesAt: string | null;
  viewCount: number;
  _count: { applications: number };
  similar: Array<{ code: string; title: string; category: string | null; employmentType: JobEmploymentType }>;
}

export interface JobPayload {
  title: string;
  description: string;
  category?: string;
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
  applicantProfile: AuthorProfile | null;
}

// --- Freelance projects ----------------------------------------------------

export interface PublicProjectSummary {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  category: string | null;
  featured: boolean;
  budgetMin: string | null;
  budgetMax: string | null;
  budgetUnknown: boolean;
  currency: string;
  publishedAt: string | null;
  /** How many have bid. Never who, never how much — the bids are sealed. */
  _count: { bids: number };
  authorProfile: AuthorProfile | null;
}

export interface PublicProjectDetail extends PublicProjectSummary {
  description: string;
  skills: string[];
  deliverBy: string | null;
  openToCompanyOffer: boolean;
  closesAt: string | null;
  viewCount: number;
  attachments: Array<{ id: string; originalName: string; sizeBytes: number }>;
  similar: Array<{ code: string; title: string; category: string | null }>;
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
  bidderProfile: AuthorProfile | null;
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
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    marketplacePaused?: boolean;
  };
}

export interface VerificationDetail extends VerificationQueueRow {
  nationalId: string;
  phone: string;
  birthDate: string | null;
  province: string | null;
  city: string | null;
  addressLine: string | null;
  companyRegistrationNo: string | null;
  companyEconomicCode: string | null;
  companyRole: string | null;
  companyWebsite: string | null;
  reviewNote: string | null;
  internalNote: string | null;
  reviewedAt: string | null;
  documents: Array<{
    id: string;
    kind: VerificationDocumentKind;
    originalName: string;
    sizeBytes: number;
  }>;
}

export interface JobQueueRow {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  featured: boolean;
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
  featured: boolean;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  _count: { applications: number };
}

export interface ApplicationQueueRow {
  id: string;
  coverLetter: string | null;
  expectedSalary: string | null;
  cvOriginalName: string | null;
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
  featured: boolean;
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
