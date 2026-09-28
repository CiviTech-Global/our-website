import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * Demo data, from the admin panel.
 *
 * Every endpoint here answers 404 in production, so the screen that uses these
 * is only ever reachable in development. The queries are written to treat that
 * as an ordinary empty answer rather than an error, because a super admin
 * opening this page on a production build should see "not available here", not
 * a red box.
 */

const keys = { demo: ['admin', 'demo'] as const };

export interface DemoBatch {
  batch: string;
  models: Record<string, number>;
  total: number;
}

export interface SeedResult {
  batch: string;
  tradeMaster: { categories: number; shops: number; products: number };
  site: Record<string, number>;
}

export interface TeardownResult {
  batches: number;
  deleted: number;
  missing: number;
}

export function useDemoStatus() {
  return useQuery({
    queryKey: keys.demo,
    queryFn: async () => {
      const res = await api.get<DemoBatch[]>('/admin/demo');
      return res.data;
    },
    // Not retried: a 404 here means the feature is absent in this environment,
    // and retrying it three times just delays showing that.
    retry: false,
  });
}

export function useSeedDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<SeedResult>('/admin/demo/seed');
      return res.data;
    },
    // Everything on the site just changed, so nothing cached is still true.
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useClearDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<TeardownResult>('/admin/demo');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
