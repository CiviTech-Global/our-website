import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { Lead, LeadStats, LeadStatus, PaginatedResponse } from '@/types/leads';

export function useLeadStats() {
  return useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: async () => {
      const res = await api.get<LeadStats>('/leads/stats');
      return res.data;
    },
  });
}

export interface UseLeadsParams {
  page: number;
  limit: number;
  status?: LeadStatus | 'ALL';
}

export function useLeads({ page, limit, status }: UseLeadsParams) {
  return useQuery({
    queryKey: ['leads', { page, limit, status }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Lead>>('/leads', {
        params: { page, limit, status: status && status !== 'ALL' ? status : undefined },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const res = await api.get<Lead>(`/leads/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateLeadStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: LeadStatus) => {
      const res = await api.put<Lead>(`/leads/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['leads', id], updated);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

