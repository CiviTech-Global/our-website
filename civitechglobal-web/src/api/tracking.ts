import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { TrackedRequest } from '@/types/insurance';
import type { ProjectTrackResult } from '@/types/project';
import type { ResumeStatus } from '@/types/resume';

/**
 * One lookup for any tracking code.
 *
 * There are three intakes now and they draw codes from the same alphabet, so a
 * code is indistinguishable by eye — and the person holding one has no reason
 * to know which system issued it. The server resolves it across all three on a
 * single connection, which replaced three parallel browser requests of which
 * two were always 404s.
 */
// Declared as interfaces rather than `{ kind } & T` intersections: an
// intersection does not give TypeScript a discriminant it will narrow on, so
// every branch below would still see the whole union.
export interface TrackedInsurance extends TrackedRequest {
  kind: 'insurance';
}

export interface TrackedProject extends ProjectTrackResult {
  kind: 'project';
}

export interface TrackedResume {
  kind: 'resume';
  trackingCode: string;
  status: ResumeStatus;
  submittedAt: string;
  updatedAt: string;
}

export type TrackedAnything = TrackedInsurance | TrackedProject | TrackedResume;

/** Narrow a result to one intake, or `undefined` if the code belongs elsewhere. */
function pick<K extends TrackedAnything['kind']>(
  result: TrackedAnything | undefined,
  kind: K
): Extract<TrackedAnything, { kind: K }> | undefined {
  return result && result.kind === kind
    ? (result as Extract<TrackedAnything, { kind: K }>)
    : undefined;
}

export function useTracking(code: string | undefined) {
  const query = useQuery({
    queryKey: ['track', code],
    queryFn: async () => {
      const res = await api.get<TrackedAnything>(`/track/${encodeURIComponent(code!)}`);
      return res.data;
    },
    enabled: Boolean(code),
    retry: false,
  });

  // Split here rather than in the page: a narrowing ternary assigned to a
  // `const` loses the narrowed type inside a large .tsx component body, so the
  // page would see the whole union on every branch.
  const result = query.data;
  return {
    ...query,
    result,
    insurance: pick(result, 'insurance'),
    project: pick(result, 'project'),
    resume: pick(result, 'resume'),
  };
}
