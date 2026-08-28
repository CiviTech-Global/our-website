import type { UserRole } from './auth';

/**
 * Shape assumed for the not-yet-built `/api/admin/users` endpoint.
 * See src/pages/admin/UsersPage.tsx for the backend follow-up note.
 */
export interface AdminUserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  isActive?: boolean;
}

/**
 * Shape assumed for the not-yet-built `/api/admin/roles` endpoints.
 * See src/pages/admin/RolesPage.tsx for the backend follow-up note.
 */
export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}
