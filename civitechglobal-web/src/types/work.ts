import type { AuthorProfile, ListingState, ModerationStatus, OfferOutcome } from './marketplace';

/**
 * The freelance side's second generation, as the API returns it.
 *
 * Money is a decimal string everywhere, as in the rest of the marketplace.
 */

export const EXPERIENCE_LEVELS = ['ENTRY', 'INTERMEDIATE', 'EXPERT'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const PROJECT_DURATIONS = [
  'LESS_THAN_WEEK',
  'ONE_TO_FOUR_WEEKS',
  'ONE_TO_THREE_MONTHS',
  'THREE_TO_SIX_MONTHS',
  'MORE_THAN_SIX_MONTHS',
] as const;
export type ProjectDuration = (typeof PROJECT_DURATIONS)[number];

export const WEEKLY_HOURS = ['LESS_THAN_10', 'TEN_TO_THIRTY', 'MORE_THAN_THIRTY'] as const;
export type WeeklyHours = (typeof WEEKLY_HOURS)[number];

export const WORK_LANGUAGES = [
  'fa', 'en', 'ar', 'tr', 'de', 'fr', 'es', 'ru', 'zh', 'it', 'ku', 'az', 'ur', 'hi', 'pt', 'ja', 'ko', 'nl',
] as const;
export type WorkLanguage = (typeof WORK_LANGUAGES)[number];

export type ProjectPricing = 'FIXED' | 'HOURLY';
export type ProjectVisibility = 'PUBLIC' | 'SIGNED_IN' | 'INVITE_ONLY';
export type ProposalRange = 'LT5' | '5_10' | '10_15' | '15_20' | '20_50' | '50_PLUS';
export const FREELANCER_LEVELS = ['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED'] as const;
export type FreelancerLevel = (typeof FREELANCER_LEVELS)[number];
export const AVAILABILITY = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const;
export type Availability = (typeof AVAILABILITY)[number];
export const PACKAGE_TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];
/** A package's revisions when it promises no limit. */
export const UNLIMITED_REVISIONS = -1;

export interface WorkCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  parentId: string | null;
  position: number;
  projectCount: number;
  serviceCount: number;
}

export interface WorkCategorySummary {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  parentId?: string | null;
}

export interface ClientStats {
  verified: boolean;
  companyName: string | null;
  country: string;
  province: string | null;
  city: string | null;
  memberSince: string;
  lastActiveAt: string | null;
  projectsPosted: number;
  openProjects: number;
  hires: number;
  hireRate: number | null;
  committed: Array<{ currency: string; amount: string }>;
  ratingAvg: number;
  ratingCount: number;
  username: string | null;
}

export interface ProjectActivity {
  bidCount: number;
  proposalRange: ProposalRange;
  interviewing: number;
  hired: number;
  invitesSent: number;
  unansweredInvites: number;
  lastViewedByClient: string | null;
  averageBid: string | null;
}

export interface FreelancerStats {
  completed: number;
  active: number;
  jobSuccess: number | null;
  onTime: number | null;
  ratingAvg: number;
  ratingCount: number;
  level: FreelancerLevel;
  memberSince: string;
  lastActiveAt: string | null;
  lastDeliveryAt: string | null;
  country: string;
  languages: string[];
  hourlyRate: string | null;
  hourlyCurrency: string;
  availability: Availability;
  verified: boolean;
  skills: string[];
}

/** A project as every list shows it. */
export interface ProjectCard {
  id: string;
  code: string;
  title: string;
  excerpt?: string | null;
  companyName: string | null;
  category: string | null;
  workCategoryId?: string | null;
  workCategory?: WorkCategorySummary | null;
  skills: string[];
  featured: boolean;
  urgent?: boolean;
  nda?: boolean;
  sealed?: boolean;
  visibility?: ProjectVisibility;
  pricingType?: ProjectPricing;
  experienceLevel?: ExperienceLevel | null;
  duration?: ProjectDuration | null;
  weeklyHours?: WeeklyHours | null;
  budgetMin: string | null;
  budgetMax: string | null;
  budgetUnknown: boolean;
  currency: string;
  deliverBy?: string | null;
  publishedAt: string | null;
  closesAt?: string | null;
  state?: ListingState;
  onsite?: boolean;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  languages?: string[];
  preferredCountries?: string[];
  contractToHire?: boolean;
  freelancersNeeded?: number;
  _count: { bids: number };
  authorProfile: AuthorProfile | null;
  client?: ClientStats | null;
  activity?: ProjectActivity | null;
  /** On recommendations: how many of the project's skills the reader has. */
  match?: { matched: number; total: number };
}

export interface ProjectAttachment {
  id: string;
  originalName: string;
  sizeBytes: number;
}

export interface ProposedMilestone {
  title: string;
  amount: string;
  days: number;
}

export interface ProjectViewer {
  isAuthor: boolean;
  briefOpen: boolean;
  ndaSigned: { signedAt: string; signedName: string } | null;
  saved: boolean;
  invite: { id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED'; message: string | null; createdAt: string } | null;
  myBid: {
    id: string;
    amount: string;
    currency: string;
    deliveryDays: number | null;
    message: string;
    milestones: ProposedMilestone[] | null;
    screeningAnswers: string[];
    moderationStatus: ModerationStatus;
    outcome: OfferOutcome;
    clientSeenAt: string | null;
    reviewNote: string | null;
    createdAt: string;
  } | null;
  match: { matched: string[]; missing: string[]; total: number };
  canBid: boolean;
}

/** One project page: the public read, or the signed-in one with `viewer`. */
export interface ProjectDetail extends ProjectCard {
  description: string;
  openToCompanyOffer: boolean;
  viewCount: number;
  screeningQuestions: string[];
  attachments: ProjectAttachment[];
  attachmentCount: number;
  similar?: Array<{
    code: string;
    title: string;
    category: string | null;
    pricingType: ProjectPricing;
    budgetMin: string | null;
    budgetMax: string | null;
    budgetUnknown: boolean;
    currency: string;
    publishedAt: string | null;
    _count: { bids: number };
  }>;
  viewer?: ProjectViewer;
}

/** The second-generation fields a project form sends. */
export interface ProjectPayloadV2 {
  title: string;
  description: string;
  skills: string[];
  budgetMin?: string;
  budgetMax?: string;
  budgetUnknown: boolean;
  currency: string;
  deliverBy?: string;
  closesAt?: string;
  openToCompanyOffer: boolean;
  workCategoryId?: string;
  pricingType: ProjectPricing;
  experienceLevel?: ExperienceLevel;
  duration?: ProjectDuration;
  weeklyHours?: WeeklyHours;
  urgent: boolean;
  sealed: boolean;
  nda: boolean;
  visibility: ProjectVisibility;
  preferredCountries: string[];
  languages: string[];
  screeningQuestions: string[];
  contractToHire: boolean;
  freelancersNeeded: number;
  onsite: boolean;
  country?: string;
  province?: string;
  city?: string;
}

/** The author's own project on the new board. */
export interface OwnProjectV2 extends ProjectCard {
  description?: string;
  openToCompanyOffer: boolean;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  createdAt: string;
  viewCount: number;
  screeningQuestions: string[];
  unseenBids?: number;
}

/** A bid as the client's inbox shows it. */
export interface InboxBid {
  id: string;
  amount: string;
  currency: string;
  deliveryDays: number | null;
  message: string;
  isCompanyOffer: boolean;
  attachmentOriginalName: string | null;
  outcome: OfferOutcome;
  createdAt: string;
  milestones: ProposedMilestone[] | null;
  screeningAnswers: string[];
  clientSeenAt: string | null;
  clientNote: string | null;
  outcomeChangedAt: string | null;
  invited: boolean;
  bidder: { id: string; firstName: string; lastName: string } | null;
  bidderProfile: AuthorProfile | null;
  bidderStats?: FreelancerStats | null;
}

/** A bid as its bidder's dashboard shows it. */
export interface MyProposal {
  id: string;
  amount: string;
  currency: string;
  deliveryDays: number | null;
  message: string;
  milestones: ProposedMilestone[] | null;
  screeningAnswers: string[];
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  suggestedAmount: string | null;
  outcome: OfferOutcome;
  clientSeenAt: string | null;
  outcomeChangedAt: string | null;
  invited: boolean;
  createdAt: string;
  project: ProjectCard & { screeningQuestions: string[] };
  award: { id: string; status: string } | null;
}

export interface BidPayloadV2 {
  amount: string;
  deliveryDays?: number;
  message: string;
  milestones?: ProposedMilestone[];
  screeningAnswers?: string[];
}

export interface PriceGuide {
  pricingType: ProjectPricing;
  currency: string;
  budget: { min: string | null; max: string | null } | null;
  market: { sample: number; low: string; median: string; high: string } | null;
}

export interface ProjectAlertQuery {
  search?: string;
  workCategoryId?: string;
  pricingType?: ProjectPricing;
  experienceLevel?: ExperienceLevel;
  budgetMin?: string;
  country?: string;
  language?: string;
  skills?: string[];
}

export interface ProjectAlert {
  id: string;
  name: string;
  query: ProjectAlertQuery;
  active: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface SentInvite {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  profile: AuthorProfile | null;
  stats: FreelancerStats | null;
}

export interface ReceivedInvite {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  project: ProjectCard;
}

export interface ClientPipeline {
  projects: Partial<Record<ListingState, number>>;
  bids: Partial<Record<OfferOutcome, number>>;
  unseenBids: number;
  invites: Partial<Record<'PENDING' | 'ACCEPTED' | 'DECLINED', number>>;
}

export interface TalentRow {
  username: string;
  displayName: string;
  headline: string | null;
  serviceCount: number;
  stats: FreelancerStats;
}

export interface FreelancerCard {
  stats: FreelancerStats | null;
  services: Array<{
    code: string;
    title: string;
    startingPrice: string | null;
    currency: string;
    deliveryDays: number | null;
    coverImageId: string | null;
  }>;
}

export interface FreelancerProfile {
  languages: string[];
  hourlyRate: string | null;
  hourlyCurrency: string;
  availability: Availability;
  country: string;
}

// ---- Timesheets ---------------------------------------------------------------

export type TimesheetStatus = 'SUBMITTED' | 'APPROVED' | 'QUERIED';

export interface Timesheet {
  id: string;
  weekStart: string;
  minutes: number;
  memo: string;
  status: TimesheetStatus;
  clientNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

// ---- Services -------------------------------------------------------------------

export interface ServicePackage {
  id?: string;
  tier: PackageTier;
  name: string;
  description: string;
  price: string;
  currency?: string;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

export interface ServiceExtra {
  id?: string;
  title: string;
  price: string;
  extraDays: number;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceCard {
  id: string;
  code: string;
  title: string;
  featured: boolean;
  createdAt: string;
  languages: string[];
  workCategory: WorkCategorySummary | null;
  startingPrice: string | null;
  currency: string;
  fastestDelivery: number | null;
  packageCount: number;
  coverImageId: string | null;
  ordersCompleted: number;
  rating: { avg: number; count: number };
  seller: {
    username: string | null;
    level: FreelancerLevel;
    verified: boolean;
    country: string;
    lastActiveAt: string | null;
  };
}

export interface ServiceReview {
  rating: number;
  text: string | null;
  createdAt: string;
  tier: PackageTier;
  price: string;
  currency: string;
  durationDays: number | null;
  buyerCountry: string;
}

export interface ServiceDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  workCategoryId: string | null;
  workCategory: WorkCategorySummary | null;
  skills: string[];
  languages: string[];
  faqs: ServiceFaq[];
  requirements: string[];
  state: 'ACTIVE' | 'PAUSED';
  featured: boolean;
  viewCount: number;
  createdAt: string;
  packages: Array<ServicePackage & { id: string; currency: string }>;
  extras: Array<ServiceExtra & { id: string }>;
  images: Array<{ id: string; originalName: string }>;
  rating: { avg: number; count: number };
  reviews: { breakdown: Array<{ stars: number; count: number }>; items: ServiceReview[] };
  seller: {
    profile: AuthorProfile | null;
    displayName: string | null;
    bio: string | null;
    stats: FreelancerStats | null;
    ordersInQueue: number;
  };
  moreFromSeller: Array<{ code: string; title: string; startingPrice: string | null; currency: string }>;
}

export interface OwnService extends Omit<ServiceDetail, 'rating' | 'reviews' | 'seller' | 'moreFromSeller'> {
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  orders?: Partial<Record<ServiceOrderStatus, number>>;
  rating?: { avg: number; count: number };
}

export interface ServicePayload {
  title: string;
  description: string;
  workCategoryId: string | null;
  skills: string[];
  languages: string[];
  faqs: ServiceFaq[];
  requirements: string[];
  currency: string;
  packages: ServicePackage[];
  extras: ServiceExtra[];
  removeImageIds: string[];
}

export type ServiceOrderStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface ServiceOrder {
  id: string;
  code: string;
  tier: PackageTier;
  packageName: string;
  price: string;
  currency: string;
  deliveryDays: number;
  revisions: number;
  extras: Array<{ title: string; price: string; extraDays: number }>;
  requirementAnswers: string[];
  note: string | null;
  status: ServiceOrderStatus;
  respondedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  service: { id: string; code: string; title: string; requirements: string[]; images: Array<{ id: string }> };
  award: { id: string; status: string } | null;
  counterparty: AuthorProfile | null;
}

export interface OrderPayload {
  tier: PackageTier;
  extraIds: string[];
  requirementAnswers: string[];
  note?: string;
}

export interface ServiceQueueRow extends OwnService {
  submittedAt: string | null;
  internalNote: string | null;
  owner: { id: string; email: string; firstName: string; lastName: string; username: string | null };
}
