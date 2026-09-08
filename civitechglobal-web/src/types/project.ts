/**
 * Project enquiry types, mirroring the server's Prisma models and zod schemas.
 *
 * Money is a decimal STRING on both sides of the wire. Not a number: an
 * Iranian project budget passes 2^53 in toman, and JSON numbers lose integer
 * precision above that — silently, in the low digits, which is exactly where a
 * price needs to be right.
 */

export type ProjectType =
  | 'NEW_BUILD'
  | 'REBUILD'
  | 'INTEGRATION'
  | 'MOBILE_APP'
  | 'WEB_APP'
  | 'DATA_PLATFORM'
  | 'AUTOMATION'
  | 'MAINTENANCE'
  | 'CONSULTING'
  | 'OTHER';

export type Platform = 'web' | 'ios' | 'android' | 'desktop' | 'api' | 'embedded';

export type ProjectUrgency = 'EXPLORING' | 'NEXT_QUARTER' | 'NEXT_MONTH' | 'URGENT';

export type EngagementModel = 'FIXED_PRICE' | 'TIME_AND_MATERIALS' | 'RETAINER' | 'NOT_SURE';

export type ProjectRequestStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'PROPOSAL_SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';

/** What the form collects. Exactly the server's `projectRequestSchema`. */
export interface ProjectRequestPayload {
  contactName: string;
  contactRole?: string;
  organizationName?: string;
  website?: string;
  email: string;
  phone: string;

  title: string;
  summary: string;
  projectType: ProjectType;
  platforms: Platform[];
  goals?: string;
  targetUsers?: string;
  existingSystems?: string;
  constraints?: string;
  outOfScope?: string;

  urgency: ProjectUrgency;
  desiredStartAt?: string;
  deadlineAt?: string;
  deadlineReason?: string;

  budgetUnknown: boolean;
  budgetMin?: string;
  budgetMax?: string;
  suggestedPrice?: string;
  engagementModel: EngagementModel;

  ndaRequired: boolean;
  clientNotes?: string;
}

export interface SubmitProjectResult {
  id: string;
  trackingCode: string;
  attachmentCount: number;
}

export interface Milestone {
  title: string;
  description?: string;
  durationDays?: number;
  price?: string;
}

/** The proposal as the client sees it. Internal notes never appear here. */
export interface PublicProposal {
  version: number;
  status: ProposalStatus;
  scopeSummary: string;
  deliverables: string[];
  assumptions: string[];
  exclusions: string[];
  milestones: Milestone[] | null;
  engagementModel: EngagementModel;
  optimisticHours: number | null;
  likelyHours: number | null;
  pessimisticHours: number | null;
  /** (O + 4M + P) / 6 — the headline figure, computed from the range. */
  pertHours: number | null;
  priceMin: string | null;
  priceLikely: string | null;
  priceMax: string | null;
  currency: string;
  hourlyRate: string | null;
  discoveryRequired: boolean;
  discoveryPrice: string | null;
  discoveryDays: number | null;
  timelineWeeksMin: number | null;
  timelineWeeksMax: number | null;
  message: string | null;
  validUntil: string | null;
  sentAt: string | null;
  expired: boolean;
}

export interface ProjectTrackResult {
  trackingCode: string;
  title: string;
  status: ProjectRequestStatus;
  submittedAt: string;
  updatedAt: string;
  proposal: PublicProposal | null;
}
