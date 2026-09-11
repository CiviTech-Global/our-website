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
