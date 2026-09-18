import type { UserRole } from './auth';

/** A module an admin can be granted. The server owns the catalogue. */
export type Permission = string;

export interface AdminUserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** Empty for a customer, and ignored for a super admin, who holds everything. */
  permissions: Permission[];
  createdAt: string;
  isActive?: boolean;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  permissions: Permission[];
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

/** A queue's size, and how much of it is waiting on staff. */
export interface QueueCount {
  open: number;
  total: number;
}

export type QueueKey =
  | 'projects'
  | 'resumes'
  | 'programme'
  | 'insurance'
  | 'messages'
  | 'verification'
  | 'jobPosts'
  | 'applications'
  | 'freelanceProjects'
  | 'bids'
  | 'books'
  | 'disputes';

export type ActivityKind = 'project' | 'resume' | 'programme' | 'insurance' | 'message';

export interface ActivityItem {
  kind: ActivityKind;
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

/**
 * What is waiting for the signed-in member of staff, limited to the modules
 * they can open. A queue they were not granted is absent, not zero.
 */
export interface Workload {
  permissions: Permission[];
  queues: Partial<Record<QueueKey, QueueCount>>;
  users?: { total: number; staff: number };
  showcase?: { customers: number; partners: number; projects: number; hidden: number };
  recent: ActivityItem[];
  trend: Array<{ day: string; count: number }>;
}
