import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { AdminDashboardStats } from '@/types/leads';
import type { AdminRole, AdminUserListItem } from '@/types/admin';
import type { PaginatedResponse } from '@/types/leads';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<AdminDashboardStats>('/admin/dashboard');
      return res.data;
    },
  });
}

/**
 * NOTE: `/api/admin/users` is not part of the backend agent's confirmed scope yet.
 * This hook is built defensively: a 404/501 is treated as "endpoint not available"
 * rather than a hard error, so the page can render a clean empty state.
 */
export function useAdminUsers(page: number, limit: number) {
  return useQuery({
    queryKey: ['admin', 'users', { page, limit }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AdminUserListItem>>('/admin/users', {
        params: { page, limit },
      });
      return res.data;
    },
    retry: false,
  });
}

/** NOTE: `/api/admin/roles` is assumed — see RolesPage for the backend follow-up note. */
export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const res = await api.get<AdminRole[]>('/admin/roles');
      return res.data;
    },
    retry: false,
  });
}
