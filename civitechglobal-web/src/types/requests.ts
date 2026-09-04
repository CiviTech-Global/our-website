import type { Audience, IntakeMode } from './insurance';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** Which channel the enquiry arrived through. */
export type RequestSource = 'WEB' | 'TELEGRAM';

export interface RequestProduct {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  icon: string | null;
  intakeMode: IntakeMode;
  audience: Audience;
  category: {
    id: string;
    slug: string;
    title: string;
    titleEn: string;
    emoji: string | null;
  };
}

/**
 * An insurance enquiry as the admin panel sees it.
 *
 * `product` is null on rows collected before the catalog existed, and the
 * legacy `category`/`subcategory` are null on website rows — so a row names
 * what it is about through one pair or the other, never both. The admin UI
 * falls back between them rather than assuming either.
 */
export interface InsuranceRequest {
  id: string;
  trackingCode: string;
  source: RequestSource;

  telegramUserId?: string | null;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;

  product?: RequestProduct | null;
  category?: { id: string; title: string; emoji: string | null } | null;
  subcategory?: { id: string; title: string } | null;

  answers?: Record<string, unknown> | null;
  catalogVersion?: number | null;

  fullName: string;
  phoneNumber: string;
  phoneVerified: boolean;
  email?: string | null;
  organizationName?: string | null;
  province?: string | null;
  city: string;
  preferredContactTime?: string | null;
  notes?: string | null;

  callbackScheduledAt?: string | null;
  status: LeadStatus;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One stored answer with the label of the question that produced it. */
export interface DescribedAnswer {
  name: string;
  label: string;
  labelEn: string;
  display: string;
  displayEn: string;
  /** The field no longer exists in the catalog; shown with its raw key. */
  orphaned?: boolean;
}

export interface RequestDetail {
  request: InsuranceRequest;
  answers: DescribedAnswer[];
  /** The form changed after this was filled, so a label may not be the question asked. */
  formChangedSinceSubmission: boolean;
}

export interface RequestStats {
  total: number;
  newLeads: number;
  contacted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  recentLeads: InsuranceRequest[];
}
