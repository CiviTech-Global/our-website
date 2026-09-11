import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { ClientIdentitySummary, IdentityStanding } from '@/types/resume';

/**
 * Standing for a client identity — the (email, phone) pair shared by the
 * project and CV intakes.
 *
 * `trusted` skips every rate limit and `blocked` refuses every submission, and
 * until this existed neither could be set from anywhere: both flags gated real
 * behaviour in three services and were displayed on the project page, with no
 * way to change them.
 */
export function useSetIdentityStanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; standing: IdentityStanding }) => {
      const res = await api.patch<ClientIdentitySummary>(`/admin/identities/${input.id}`, {
        standing: input.standing,
      });
      return res.data;
    },
    // Standing changes what an intake will accept, so anything showing it is
    // now stale — including the queues, where a blocked client should read as
    // blocked without a reload.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['resumes'] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
