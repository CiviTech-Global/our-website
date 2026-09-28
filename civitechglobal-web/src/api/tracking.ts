import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { TrackedRequest } from '@/types/insurance';
import type { ProjectTrackResult } from '@/types/project';
import type { ResumeStatus } from '@/types/resume';
import type { TrackedConsultation } from '@/api/consult';

/**
 * One lookup for any tracking code.
 *
 * There are four intakes now and they draw codes from the same alphabet, so a
 * code is indistinguishable by eye — and the person holding one has no reason
 * to know which system issued it. The server resolves it across all four on a
 * single connection, which replaced parallel browser requests of which all but
 * one were always 404s.
 *
 * Every kind the server can answer with has to appear in the union below. A
 * consultation code was missing from it for a while, and because the query
 * still succeeded the page showed no result, no error and no spinner — a
 * blank answer to a code that was perfectly valid.
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

export type TrackedAnything =
  | TrackedInsurance
  | TrackedProject
  | TrackedResume
  | TrackedConsultation;

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
    consultation: pick(result, 'consultation'),
  };
}
