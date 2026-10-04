import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { ModerationStatus, OfferOutcome, VerificationStatus } from '@/types/marketplace';

/**
 * The member home's data, the account's kept tracking codes, and the
 * password change — the three things the dashboard gained in one round.
 */

export interface Workspace {
  verification: VerificationStatus | 'UNVERIFIED';
  hiring: {
    postings: number;
    open: number;
    byStatus: Partial<Record<ModerationStatus, number>>;
    applicants: number;
    unseen: number;
    byOutcome: Partial<Record<OfferOutcome, number>>;
    recent: Array<{
      id: string;
      outcome: OfferOutcome;
      createdAt: string;
      employerSeenAt: string | null;
      applicant: { firstName: string; lastName: string };
      job: { id: string; code: string; title: string };
    }>;
    company: { slug: string; name: string; hidden: boolean } | null;
  };
  jobSearch: {
    applications: number;
    byOutcome: Partial<Record<OfferOutcome, number>>;
    recent: Array<{
      id: string;
      outcome: OfferOutcome;
      moderationStatus: ModerationStatus;
      employerSeenAt: string | null;
      updatedAt: string;
      job: { code: string; title: string; companyName: string | null };
    }>;
    savedJobs: number;
    activeAlerts: number;
  };
  client: {
    projects: number;
    open: number;
    byStatus: Partial<Record<ModerationStatus, number>>;
    bidsAwaiting: number;
  };
  freelance: { bids: number; byOutcome: Partial<Record<OfferOutcome, number>> };
  selling: { books: number; booksByStatus: Partial<Record<ModerationStatus, number>> };
  collaborations: { active: number; completed: number };
  unread: { notifications: number; messages: number };
  recentNotifications: Array<{
    id: string;
    title: string;
    body: string;
    link: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
  trackedRequests: number;
}

export function useWorkspace(enabled = true) {
  return useQuery({
    queryKey: ['market', 'me', 'workspace'],
    queryFn: async () => (await api.get<Workspace>('/market/me/workspace')).data,
    enabled,
  });
}

// --- Tracking codes kept on the account ----------------------------------------

export interface TrackedRequest {
  code: string;
  label: string | null;
  createdAt: string;
  /** The request's state now; null when it can no longer be found. */
  state: ({ kind: 'insurance' | 'project' | 'resume' | 'consultation' } & Record<string, unknown>) | null;
}

const trackedKey = ['market', 'me', 'tracked-requests'] as const;

export function useTrackedRequests() {
  return useQuery({
    queryKey: trackedKey,
    queryFn: async () => (await api.get<TrackedRequest[]>('/market/me/tracked-requests')).data,
  });
}

export function useTrackRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; label?: string }) => {
      await api.post('/market/me/tracked-requests', input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: trackedKey });
      void qc.invalidateQueries({ queryKey: ['market', 'me', 'workspace'] });
    },
  });
}

export function useUntrackRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.delete(`/market/me/tracked-requests/${encodeURIComponent(code)}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: trackedKey }),
  });
}

// --- Password --------------------------------------------------------------------

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', input);
    },
  });
}
