import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { AdminDashboardStats } from '@/types/requests';
import type { AdminRole, AdminUserListItem, CreateAdminInput, Permission, Workload } from '@/types/admin';
import type { Paged } from '@/types/api';

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
 * What is waiting for the signed-in member of staff.
 *
 * Feeds the sidebar's count chips and the overview, so it refreshes on its own
 * every minute and when the tab regains focus: a queue count that only updates
 * on a full reload is a count nobody trusts.
 */
export function useWorkload(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'workload'],
    queryFn: async () => {
      const res = await api.get<Workload>('/admin/dashboard/workload');
      return res.data;
    },
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useAdminUsers(page: number, limit: number) {
  return useQuery({
    queryKey: ['admin', 'users', { page, limit }],
    queryFn: async () => {
      const res = await api.get<Paged<AdminUserListItem>>('/admin/users', {
        params: { page, limit },
      });
      return res.data;
    },
    retry: false,
  });
}

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

/**
 * The module catalogue, from the server.
 *
 * Fetched rather than hard-coded so the access screen renders whatever the
 * server actually enforces. A copy in the front end drifts, and the failure is
 * silent: a checkbox for a module nothing checks, or a module nobody can grant.
 */
export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const res = await api.get<{ permissions: Permission[] }>('/admin/permissions');
      return res.data.permissions;
    },
    // It changes when the code changes, not while somebody is looking at it.
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminInput) => {
      const res = await api.post<AdminUserListItem>('/admin/users', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; permissions: Permission[] }) => {
      const res = await api.patch<AdminUserListItem>(`/admin/users/${input.id}/permissions`, {
        permissions: input.permissions,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/admin/users/${id}/deactivate`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
