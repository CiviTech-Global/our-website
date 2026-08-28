export type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InsuranceSubcategory {
  id: string;
  title: string;
}

export interface InsuranceCategory {
  id: string;
  title: string;
  emoji: string;
  subcategories: InsuranceSubcategory[];
}

export interface Lead {
  id: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  fullName: string;
  phoneNumber: string;
  city: string;
  preferredContactTime?: string | null;
  notes?: string | null;
  status: LeadStatus;
  category: { id: string; title: string; emoji: string };
  subcategory: { id: string; title: string };
  createdAt: string;
}

export interface LeadStats {
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
}
