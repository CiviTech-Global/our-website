import type { Paged } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  InsuranceRequest,
  LeadStatus,
  RequestDetail,
  RequestSource,
  RequestStats,
} from '@/types/requests';

export function useRequestStats() {
  return useQuery({
    queryKey: ['requests', 'stats'],
    queryFn: async () => {
      const res = await api.get<RequestStats>('/requests/stats');
      return res.data;
    },
  });
}

export interface UseRequestsParams {
  page: number;
  limit: number;
  status?: LeadStatus | 'ALL';
  source?: RequestSource | 'ALL';
  productSlug?: string;
}

export function useRequests({ page, limit, status, source, productSlug }: UseRequestsParams) {
  return useQuery({
    queryKey: ['requests', { page, limit, status, source, productSlug }],
    queryFn: async () => {
      const res = await api.get<Paged<InsuranceRequest>>('/requests', {
        params: {
          page,
          limit,
          status: status && status !== 'ALL' ? status : undefined,
          source: source && source !== 'ALL' ? source : undefined,
          productSlug: productSlug || undefined,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: async () => {
      const res = await api.get<RequestDetail>(`/requests/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateRequestStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: LeadStatus) => {
      const res = await api.put<InsuranceRequest>(`/requests/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      // The detail endpoint returns a RequestDetail wrapper, not a bare request,
      // so the mutation's payload cannot be written into that cache entry
      // directly — invalidate and let it refetch the right shape.
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export function useAssignRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignedToId: string | null) => {
      const res = await api.patch<InsuranceRequest>(`/requests/${id}/assign`, { assignedToId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export function useScheduleCallback(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduledAt: string | null) => {
      const res = await api.patch<InsuranceRequest>(`/requests/${id}/callback`, { scheduledAt });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}
