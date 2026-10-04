import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { Paged } from '@/types/api';
import type {
  AlertQuery,
  CompanyListItem,
  CompanyPayload,
  JobAlert,
  JobCategory,
  JobMatch,
  OwnCompany,
  PipelineCounts,
  PublicCompany,
  RecommendedJobs,
  SavedJobEntry,
} from '@/types/jobs';

/**
 * The job board's second generation: everything under /jobs on the API.
 *
 * Postings and applications themselves are still fetched from api/marketplace;
 * these are the new things around them. Every hook here is only ever called
 * while features.jobsV2 is on — the routes answer 404 otherwise.
 */

const keys = {
  categories: ['jobs', 'categories'] as const,
  companies: ['jobs', 'companies'] as const,
  ownCompany: ['jobs', 'me', 'company'] as const,
  saved: ['jobs', 'me', 'saved'] as const,
  savedIds: ['jobs', 'me', 'saved', 'ids'] as const,
  alerts: ['jobs', 'me', 'alerts'] as const,
  recommended: ['jobs', 'me', 'recommended'] as const,
  pipeline: ['jobs', 'me', 'pipeline'] as const,
};

/** The category list changes when staff edit it; minutes-stale is fine. */
export function useJobCategories(enabled = true) {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => (await api.get<JobCategory[]>('/jobs/categories')).data,
    staleTime: 10 * 60_000,
    enabled,
  });
}

// --- Companies ---------------------------------------------------------------

export interface CompanyListQuery extends Record<string, string | number | undefined> {
  page: number;
  pageSize: number;
  search?: string;
  industry?: string;
  province?: string;
}

export function useCompanies(query: CompanyListQuery) {
  return useQuery({
    queryKey: [...keys.companies, query],
    queryFn: async () => (await api.get<Paged<CompanyListItem>>('/jobs/companies', { params: query })).data,
  });
}

export function useCompany(slug: string | undefined) {
  return useQuery({
    queryKey: [...keys.companies, 'detail', slug],
    queryFn: async () => (await api.get<PublicCompany>(`/jobs/companies/${encodeURIComponent(slug!)}`)).data,
    enabled: Boolean(slug),
    retry: false,
  });
}

export function useOwnCompany(enabled = true) {
  return useQuery({
    queryKey: keys.ownCompany,
    queryFn: async () => (await api.get<OwnCompany | null>('/jobs/me/company')).data,
    enabled,
  });
}

export function useSaveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payload: CompanyPayload;
      logo?: File | null;
      cover?: File | null;
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      form.append('payload', JSON.stringify(input.payload));
      if (input.logo) form.append('logo', input.logo);
      if (input.cover) form.append('cover', input.cover);
      const res = await api.upload<{ id: string; slug: string }>('PUT', '/jobs/me/company', form, {
        onProgress: input.onProgress,
      });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ownCompany });
      void qc.invalidateQueries({ queryKey: keys.companies });
    },
  });
}

// --- Saved jobs ----------------------------------------------------------------

export function useSavedJobs() {
  return useQuery({
    queryKey: keys.saved,
    queryFn: async () => (await api.get<SavedJobEntry[]>('/jobs/me/saved')).data,
  });
}

/** Just the ids, so every row on the board can draw its bookmark from one request. */
export function useSavedJobIds(enabled = true) {
  return useQuery({
    queryKey: keys.savedIds,
    queryFn: async () => new Set((await api.get<string[]>('/jobs/me/saved/ids')).data),
    enabled,
  });
}

/**
 * Save or unsave, with the bookmark flipping before the server answers.
 *
 * Optimistic: a bookmark that lags a second behind the tap reads as broken.
 * A refusal puts it back.
 */
export function useToggleSavedJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { jobId: string; save: boolean }) => {
      if (input.save) await api.put(`/jobs/me/saved/${input.jobId}`);
      else await api.delete(`/jobs/me/saved/${input.jobId}`);
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.savedIds });
      const previous = qc.getQueryData<Set<string>>(keys.savedIds);
      const next = new Set(previous ?? []);
      if (input.save) next.add(input.jobId);
      else next.delete(input.jobId);
      qc.setQueryData(keys.savedIds, next);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) qc.setQueryData(keys.savedIds, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.saved });
    },
  });
}

// --- Alerts --------------------------------------------------------------------

export function useJobAlerts() {
  return useQuery({
    queryKey: keys.alerts,
    queryFn: async () => (await api.get<JobAlert[]>('/jobs/me/alerts')).data,
  });
}

export function useCreateJobAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; query: AlertQuery }) =>
      (await api.post<JobAlert>('/jobs/me/alerts', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useUpdateJobAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; active?: boolean }) => {
      const { id, ...body } = input;
      await api.patch(`/jobs/me/alerts/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useDeleteJobAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/jobs/me/alerts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

// --- Matching --------------------------------------------------------------------

export function useRecommendedJobs(enabled = true) {
  return useQuery({
    queryKey: keys.recommended,
    queryFn: async () => (await api.get<RecommendedJobs>('/jobs/me/recommended')).data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useJobMatch(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'me', 'match', jobId],
    queryFn: async () => (await api.get<JobMatch>(`/jobs/me/match/${jobId!}`)).data,
    enabled: enabled && Boolean(jobId),
  });
}

// --- The pipeline ------------------------------------------------------------------

export function usePipelineCounts(enabled = true) {
  return useQuery({
    queryKey: keys.pipeline,
    queryFn: async () => (await api.get<PipelineCounts>('/jobs/me/pipeline')).data,
    enabled,
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/jobs/me/applications/${id}/withdraw`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'applications'] }),
  });
}

export function useEmployerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      await api.patch(`/jobs/me/applications/${input.id}/note`, { note: input.note });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'jobs'] }),
  });
}
