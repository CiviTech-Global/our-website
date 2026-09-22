import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  AppNotification,
  ApplicationPayload,
  ApplicationQueueRow,
  AuditEntry,
  AuthorBid,
  AwardView,
  BidPayload,
  BidQueueRow,
  BoardStats,
  BookPayload,
  BookQueueRow,
  ConversationSummary,
  EmployerApplication,
  FeaturedResponse,
  JobPayload,
  JobQueueRow,
  JobReviewDetail,
  MarketplaceAnalytics,
  OwnApplication,
  OwnBid,
  OwnBook,
  OwnJob,
  OwnMarketplaceStats,
  OwnProject,
  OwnVerification,
  Paged,
  ProfilePayload,
  ProjectPayload,
  ProjectQueueRow,
  PublicBookDetail,
  PublicBookSummary,
  PublicJobDetail,
  PublicJobSummary,
  PublicProfile,
  PublicProjectDetail,
  PublicProjectSummary,
  ReviewDecision,
  ThreadView,
  VerificationDetail,
  VerificationDocumentKind,
  VerificationPayload,
  VerificationQueueRow,
} from '@/types/marketplace';

/**
 * The marketplace client.
 *
 * Three groups, mirroring the server's: the public boards, `/me` for an
 * account acting for itself, and `/admin` for the moderation queues.
 *
 * Everything that carries a file goes out as multipart with the structured
 * half in one `payload` JSON field — the same shape the CV and project
 * intakes already use, so the server parses all of them the same way.
 */

const keys = {
  jobs: ['market', 'jobs'] as const,
  projects: ['market', 'projects'] as const,
  verification: ['market', 'me', 'verification'] as const,
  ownJobs: ['market', 'me', 'jobs'] as const,
  ownApplications: ['market', 'me', 'applications'] as const,
  ownProjects: ['market', 'me', 'projects'] as const,
  ownBids: ['market', 'me', 'bids'] as const,
  books: ['market', 'books'] as const,
  ownBooks: ['market', 'me', 'books'] as const,
  queue: ['market', 'admin'] as const,
};

function multipart(payload: unknown, files: Array<[string, File]> = []): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  for (const [field, file] of files) form.append(field, file);
  return form;
}

// --- Public boards ---------------------------------------------------------

export type JobBoardSort = 'newest' | 'salaryAsc' | 'salaryDesc' | 'closingSoon';

export interface JobBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  employmentType?: string;
  workArrangement?: string;
  province?: string;
  category?: string;
  skills?: string[];
  salaryMin?: string;
  salaryMax?: string;
  sort?: JobBoardSort;
}

export function usePublicJobs(query: JobBoardQuery) {
  return useQuery({
    queryKey: [...keys.jobs, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicJobSummary>>('/market/jobs', {
        // The server reads skills as one comma-separated param, not repeated
        // keys — a plain object spread would serialize the array in a shape
        // the zod schema refuses.
        params: { ...query, skills: query.skills?.length ? query.skills.join(',') : undefined },
      });
      return res.data;
    },
  });
}

export function usePublicJob(code: string | undefined) {
  return useQuery({
    queryKey: [...keys.jobs, 'detail', code],
    queryFn: async () => {
      const res = await api.get<PublicJobDetail>(`/market/jobs/${code!}`);
      return res.data;
    },
    enabled: Boolean(code),
  });
}

export type ProjectBoardSort = 'newest' | 'budgetAsc' | 'budgetDesc';

export interface ProjectBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  skills?: string[];
  budgetMin?: string;
  budgetMax?: string;
  sort?: ProjectBoardSort;
}

export function usePublicProjects(query: ProjectBoardQuery) {
  return useQuery({
    queryKey: [...keys.projects, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicProjectSummary>>('/market/projects', {
        params: { ...query, skills: query.skills?.length ? query.skills.join(',') : undefined },
      });
      return res.data;
    },
  });
}

// --- Landing page showcase ---------------------------------------------------

/** Headline numbers for the home page band. Five-minute cache server-side. */
export function useBoardStats() {
  return useQuery({
    queryKey: ['market', 'stats'],
    queryFn: async () => {
      const res = await api.get<BoardStats>('/market/stats');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Featured listings, newest filling un-curated slots. */
export function useFeatured() {
  return useQuery({
    queryKey: [...keys.jobs, 'featured'],
    queryFn: async () => {
      const res = await api.get<FeaturedResponse>('/market/featured');
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function usePublicProject(code: string | undefined) {
  return useQuery({
    queryKey: [...keys.projects, 'detail', code],
    queryFn: async () => {
      const res = await api.get<PublicProjectDetail>(`/market/projects/${code!}`);
      return res.data;
    },
    enabled: Boolean(code),
  });
}

// --- Verification ----------------------------------------------------------

export function useOwnVerification(enabled = true) {
  return useQuery({
    queryKey: keys.verification,
    queryFn: async () => {
      const res = await api.get<OwnVerification>('/market/me/verification');
      return res.data;
    },
    enabled,
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payload: VerificationPayload;
      documents: Array<{ kind: VerificationDocumentKind; file: File }>;
      /** Drives the progress bar while the body goes out. */
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      form.append('payload', JSON.stringify(input.payload));
      // Kinds travel as their own JSON array rather than one per file, because
      // multipart preserves field order but not the pairing between two
      // repeated fields — and the server has to know which document is which.
      form.append('kinds', JSON.stringify(input.documents.map((d) => d.kind)));
      for (const doc of input.documents) form.append('documents', doc.file);

      const res = await api.upload<{ status: string }>('POST', '/market/me/verification', form, {
        onProgress: input.onProgress,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.verification }),
  });
}

// --- My job postings -------------------------------------------------------

export function useOwnJobs() {
  return useQuery({
    queryKey: keys.ownJobs,
    queryFn: async () => {
      const res = await api.get<OwnJob[]>('/market/me/jobs');
      return res.data;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: JobPayload) => {
      const res = await api.post<OwnJob>('/market/me/jobs', payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownJobs }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<JobPayload> }) => {
      await api.patch(`/market/me/jobs/${input.id}`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownJobs }),
  });
}

/** Hands a draft to the queue. From here the author cannot edit it. */
export function useSubmitJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/jobs/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownJobs }),
  });
}

export function useCloseJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/jobs/${id}/close`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownJobs }),
  });
}

/** The employer's inbox for one posting — approved applications only. */
export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownJobs, jobId, 'applications'],
    queryFn: async () => {
      const res = await api.get<EmployerApplication[]>(`/market/me/jobs/${jobId!}/applications`);
      return res.data;
    },
    enabled: Boolean(jobId),
  });
}

export function useSetApplicationOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; outcome: 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED' }) => {
      await api.patch(`/market/me/applications/${input.id}/outcome`, { outcome: input.outcome });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownJobs }),
  });
}

// --- Applying --------------------------------------------------------------

export function useOwnApplications() {
  return useQuery({
    queryKey: keys.ownApplications,
    queryFn: async () => {
      const res = await api.get<OwnApplication[]>('/market/me/applications');
      return res.data;
    },
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      payload: ApplicationPayload;
      cv?: File | null;
      /** Progress for the file this carries, when the caller wants a bar. */
      onProgress?: (percent: number) => void;
    }) => {
      const form = multipart(input.payload, input.cv ? [['cv', input.cv]] : []);
      const res = await api.upload<{ id: string }>('POST', `/market/me/jobs/${input.jobId}/apply`, form, {
        onProgress: input.onProgress,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownApplications }),
  });
}

/** Answering a reviewer who asked for changes. Sends it back to the queue. */
export function useReviseApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      payload: ApplicationPayload;
      cv?: File | null;
      /** Progress for the file this carries, when the caller wants a bar. */
      onProgress?: (percent: number) => void;
    }) => {
      const form = multipart(input.payload, input.cv ? [['cv', input.cv]] : []);
      await api.upload('PATCH', `/market/me/applications/${input.id}`, form, {
        onProgress: input.onProgress,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownApplications }),
  });
}

// --- My projects -----------------------------------------------------------

export function useOwnProjects() {
  return useQuery({
    queryKey: keys.ownProjects,
    queryFn: async () => {
      const res = await api.get<OwnProject[]>('/market/me/projects');
      return res.data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payload: ProjectPayload;
      attachments?: File[];
      /** Drives the progress bar while the body goes out. */
      onProgress?: (percent: number) => void;
    }) => {
      const form = multipart(
        input.payload,
        (input.attachments ?? []).map((file) => ['attachments', file] as [string, File])
      );
      const res = await api.upload<OwnProject>('POST', '/market/me/projects', form, {
        onProgress: input.onProgress,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<ProjectPayload> }) => {
      await api.patch(`/market/me/projects/${input.id}`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

export function useSubmitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/projects/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

/** Approved bids on one of my projects, the company's offer flagged. */
export function useProjectBids(projectId: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownProjects, projectId, 'bids'],
    queryFn: async () => {
      const res = await api.get<AuthorBid[]>(`/market/me/projects/${projectId!}/bids`);
      return res.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bidId: string) => {
      await api.post(`/market/me/bids/${bidId}/accept`);
    },
    // The project leaves the board and every other bid is declined, so the
    // boards and the bidders' own lists are both stale now.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

// --- Bidding ---------------------------------------------------------------

export function useOwnBids() {
  return useQuery({
    queryKey: keys.ownBids,
    queryFn: async () => {
      const res = await api.get<OwnBid[]>('/market/me/bids');
      return res.data;
    },
  });
}

export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; payload: BidPayload; attachment?: File | null }) => {
      const form = multipart(
        input.payload,
        input.attachment ? [['attachment', input.attachment]] : [],
      );
      const res = await api.post<{ id: string }>(`/market/me/projects/${input.projectId}/bid`, form);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBids }),
  });
}

export function useReviseBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: BidPayload }) => {
      await api.patch(`/market/me/bids/${input.id}`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBids }),
  });
}

// --- Engagement: awards and milestones --------------------------------------

export function useMyAwards() {
  return useQuery({
    queryKey: ['market', 'me', 'awards'],
    queryFn: async () => {
      const res = await api.get<AwardView[]>('/market/me/awards');
      return res.data;
    },
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { awardId: string; title: string; description?: string; dueDate?: string }) => {
      const res = await api.post(`/market/me/awards/${input.awardId}/milestones`, {
        title: input.title,
        description: input.description || undefined,
        dueDate: input.dueDate || undefined,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] }),
  });
}

export function useDeliverMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      milestoneId: string;
      deliveryNote: string;
      attachment?: File | null;
      /** Drives the progress bar while the body goes out. */
      onProgress?: (percent: number) => void;
    }) => {
      const form = multipart({ deliveryNote: input.deliveryNote });
      if (input.attachment) form.append('attachment', input.attachment);
      const res = await api.upload(`POST`, `/market/me/milestones/${input.milestoneId}/deliver`, form, {
        onProgress: input.onProgress,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] }),
  });
}

export function useApproveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await api.post(`/market/me/milestones/${milestoneId}/approve`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] }),
  });
}

export function useCompleteAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (awardId: string) => {
      const res = await api.post(`/market/me/awards/${awardId}/complete`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] }),
  });
}

export function useReviewAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { awardId: string; rating: number; text?: string }) => {
      const res = await api.post(`/market/me/awards/${input.awardId}/review`, {
        rating: input.rating,
        text: input.text || undefined,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export function useOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { awardId: string; reason: string }) => {
      const res = await api.post(`/market/me/awards/${input.awardId}/dispute`, { reason: input.reason });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] }),
  });
}

// --- The account's own dashboard numbers ------------------------------------

export function useOwnMarketplaceStats(enabled: boolean) {
  return useQuery({
    queryKey: ['market', 'me', 'stats'],
    queryFn: async () => {
      const res = await api.get<OwnMarketplaceStats>('/market/me/stats');
      return res.data;
    },
    enabled,
  });
}

// --- Staff: analytics, audit, operations -------------------------------------

export function useMarketplaceAnalytics(enabled: boolean) {
  return useQuery({
    queryKey: ['market', 'admin', 'analytics'],
    queryFn: async () => {
      const res = await api.get<MarketplaceAnalytics>('/market/admin/analytics');
      return res.data;
    },
    enabled,
  });
}

export function useFeatureListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'job' | 'project'; id: string; featured: boolean }) => {
      const res = await api.post(`/market/admin/${input.kind === 'job' ? 'jobs' : 'projects'}/${input.id}/${input.featured ? 'feature' : 'unfeature'}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export function useExtendDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'job' | 'project'; id: string; closesAt: string }) => {
      const res = await api.post(`/market/admin/${input.kind === 'job' ? 'jobs' : 'projects'}/${input.id}/extend`, {
        closesAt: input.closesAt,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export function usePauseUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; paused: boolean; reason?: string }) => {
      const res = await api.post(`/market/admin/users/${input.userId}/pause`, {
        paused: input.paused,
        reason: input.reason,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export interface OpenDisputeRow {
  awardId: string;
  listing: { code: string; title: string };
  kind: 'job' | 'project';
  disputeReason: string | null;
  disputeOpenedAt: string | null;
  agreedAmount: string | null;
  currency: string;
}

export function useOpenDisputes(enabled: boolean) {
  return useQuery({
    queryKey: ['market', 'admin', 'disputes'],
    queryFn: async () => {
      const res = await api.get<OpenDisputeRow[]>('/market/admin/disputes');
      return res.data;
    },
    enabled,
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { awardId: string; note: string }) => {
      const res = await api.post(`/market/admin/awards/${input.awardId}/resolve-dispute`, { note: input.note });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export interface AuditQuery {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
  search?: string;
}

export function useAuditLog(query: AuditQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['market', 'admin', 'audit', query],
    queryFn: async () => {
      const res = await api.get<Paged<AuditEntry>>('/market/admin/audit', { params: { ...query } });
      return res.data;
    },
    enabled,
  });
}

// --- Messaging and notifications ---------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: ['market', 'me', 'conversations'],
    queryFn: async () => {
      const res = await api.get<ConversationSummary[]>('/market/me/conversations');
      return res.data;
    },
  });
}

export type ThreadKind = 'a' | 'b';

export function useThread(kind: ThreadKind | undefined, threadId: string | undefined) {
  return useQuery({
    queryKey: ['market', 'me', 'thread', kind, threadId],
    queryFn: async () => {
      const res = await api.get<ThreadView>(`/market/me/${kind === 'a' ? 'applications' : 'bids'}/${threadId}/messages`);
      return res.data;
    },
    enabled: Boolean(kind && threadId),
    refetchInterval: 15_000,
  });
}

export function useSendMessage(kind: ThreadKind | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { threadId: string; body: string }) => {
      const res = await api.post(`/market/me/${kind === 'a' ? 'applications' : 'bids'}/${input.threadId}/messages`, {
        body: input.body,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'me', 'thread'] });
      qc.invalidateQueries({ queryKey: ['market', 'me', 'conversations'] });
    },
  });
}

export function useNotifications(page: number) {
  return useQuery({
    queryKey: ['market', 'me', 'notifications', page],
    queryFn: async () => {
      const res = await api.get<Paged<AppNotification> & { unreadCount: number }>('/market/me/notifications', {
        params: { page, pageSize: 20 },
      });
      return res.data;
    },
  });
}

/** The bell badge. Polls — notifications are convenience, not realtime. */
export function useUnreadCounts() {
  return useQuery({
    queryKey: ['market', 'me', 'unread'],
    queryFn: async () => {
      const [notifications, conversations] = await Promise.all([
        api.get<{ count: number }>('/market/me/notifications/unread-count'),
        api.get<ConversationSummary[]>('/market/me/conversations'),
      ]);
      return {
        notifications: notifications.data.count,
        messages: conversations.data.reduce((sum, thread) => sum + thread.unreadCount, 0),
      };
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/market/me/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'me'] }),
  });
}

// --- Profiles ----------------------------------------------------------------

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['market', 'profiles', username],
    queryFn: async () => {
      const res = await api.get<PublicProfile>(`/market/profiles/${username!}`);
      return res.data;
    },
    enabled: Boolean(username),
    retry: false,
  });
}

/** The account's own public profile fields, for the settings form defaults. */
export function useOwnProfile(enabled = true) {
  return useQuery({
    queryKey: ['market', 'me', 'profile'],
    queryFn: async () => {
      const res = await api.get<{ username: string | null; headline: string | null; bio: string | null; website: string | null }>(
        '/market/me/profile',
      );
      return res.data;
    },
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const res = await api.patch('/market/me/profile', payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

// --- The queues ------------------------------------------------------------

export interface QueueQuery {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}

export function useVerificationQueue(query: QueueQuery) {
  return useQuery({
    queryKey: [...keys.queue, 'verifications', query],
    queryFn: async () => {
      const res = await api.get<Paged<VerificationQueueRow>>('/market/admin/verifications', {
        params: { ...query },
      });
      return res.data;
    },
  });
}

export function useVerificationDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.queue, 'verifications', 'detail', id],
    queryFn: async () => {
      const res = await api.get<VerificationDetail>(`/market/admin/verifications/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export interface ReviewInput {
  id: string;
  decision: ReviewDecision;
  /** Written to the person. Required when refusing or asking for changes. */
  reviewNote?: string;
  /** Staff talking to staff. Never sent back to the person. */
  internalNote?: string;
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ReviewInput) => {
      await api.post(`/market/admin/verifications/${id}/review`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

export function useJobQueue(query: QueueQuery) {
  return useQuery({
    queryKey: [...keys.queue, 'jobs', query],
    queryFn: async () => {
      const res = await api.get<Paged<JobQueueRow>>('/market/admin/jobs', { params: { ...query } });
      return res.data;
    },
  });
}

export function useJobForReview(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.queue, 'jobs', 'detail', id],
    queryFn: async () => {
      const res = await api.get<JobReviewDetail>(`/market/admin/jobs/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useReviewJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ReviewInput) => {
      await api.post(`/market/admin/jobs/${id}/review`, body);
    },
    // Approving publishes it, so the public board is stale too.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export function useApplicationQueue(query: QueueQuery) {
  return useQuery({
    queryKey: [...keys.queue, 'applications', query],
    queryFn: async () => {
      const res = await api.get<Paged<ApplicationQueueRow>>('/market/admin/applications', {
        params: { ...query },
      });
      return res.data;
    },
  });
}

export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ReviewInput) => {
      await api.post(`/market/admin/applications/${id}/review`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

export function useProjectQueue(query: QueueQuery) {
  return useQuery({
    queryKey: [...keys.queue, 'projects', query],
    queryFn: async () => {
      const res = await api.get<Paged<ProjectQueueRow>>('/market/admin/projects', {
        params: { ...query },
      });
      return res.data;
    },
  });
}

export function useReviewProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ReviewInput) => {
      await api.post(`/market/admin/projects/${id}/review`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market'] }),
  });
}

export function useBidQueue(query: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: [...keys.queue, 'bids', query],
    queryFn: async () => {
      const res = await api.get<Paged<BidQueueRow>>('/market/admin/bids', { params: { ...query } });
      return res.data;
    },
  });
}

export function useReviewBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ReviewInput & { suggestedAmount?: string }) => {
      await api.post(`/market/admin/bids/${id}/review`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

/** The company bidding on a client's project, as a clearly marked offer. */
export function usePlaceCompanyOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; payload: BidPayload }) => {
      await api.post(`/market/admin/projects/${input.projectId}/company-offer`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

/**
 * Where each reviewable file lives.
 *
 * Paths rather than download helpers: these are staff-only routes, so a plain
 * <a href> would send no Authorization header and get a 401 — FilePreview
 * fetches them and can either show the bytes or hand them over as a download.
 * The document's own id, never its storage key: a storage key handed to a
 * client becomes part of the API and can never be changed afterwards.
 */
export const reviewFileUrls = {
  verificationDocument: (id: string) => `/market/admin/verification-documents/${id}`,
  projectAttachment: (id: string) => `/market/admin/project-attachments/${id}`,
  applicationCv: (id: string) => `/market/admin/application-cvs/${id}`,
};

// --- The book market -------------------------------------------------------

export type BookSort = 'newest' | 'price-asc' | 'price-desc' | 'title';

export interface BookBoardQuery extends Record<string, string | number | boolean | null | undefined> {
  page: number;
  pageSize: number;
  /** Matched against the title and the author, never the description. */
  search?: string;
  condition?: string;
  category?: string;
  province?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: BookSort;
}

export function usePublicBooks(query: BookBoardQuery) {
  return useQuery({
    queryKey: [...keys.books, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicBookSummary>>('/market/books', { params: query });
      return res.data;
    },
  });
}

export function usePublicBook(code: string | undefined) {
  return useQuery({
    queryKey: [...keys.books, 'detail', code],
    queryFn: async () => {
      const res = await api.get<PublicBookDetail>(`/market/books/${code!}`);
      return res.data;
    },
    enabled: Boolean(code),
  });
}

export function useOwnBooks(enabled = true) {
  return useQuery({
    queryKey: keys.ownBooks,
    queryFn: async () => {
      const res = await api.get<OwnBook[]>('/market/me/books');
      return res.data;
    },
    enabled,
  });
}

/**
 * Creating and editing both carry the cover, so both go out as multipart.
 * The picture is re-encoded by lib/prepareImage before it gets here.
 */
export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    // api.upload rather than api.post: a cover is the one request here big
    // enough that somebody watches it, and fetch cannot report progress.
    mutationFn: async (input: {
      payload: BookPayload;
      cover: File;
      onProgress?: (percent: number) => void;
    }) => {
      const res = await api.upload<OwnBook>(
        'POST',
        '/market/me/books',
        multipart(input.payload, [['cover', input.cover]]),
        { onProgress: input.onProgress },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBooks }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      payload: Partial<BookPayload>;
      cover?: File | null;
      onProgress?: (percent: number) => void;
    }) => {
      await api.upload(
        'PATCH',
        `/market/me/books/${input.id}`,
        multipart(input.payload, input.cover ? [['cover', input.cover]] : []),
        { onProgress: input.onProgress },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBooks }),
  });
}

/** Hands a draft to the queue. From here the seller cannot edit it. */
export function useSubmitBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/books/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBooks }),
  });
}

export function useCloseBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/market/me/books/${id}/close`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownBooks }),
  });
}

export function useBookQueue(
  query: { status?: string; search?: string; page: number; pageSize: number },
  enabled = true,
) {
  return useQuery({
    queryKey: [...keys.queue, 'books', query],
    queryFn: async () => {
      const res = await api.get<Paged<BookQueueRow>>('/market/admin/books', { params: query });
      return res.data;
    },
    enabled,
  });
}

export function useReviewBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: ReviewDecision;
      reviewNote?: string;
      internalNote?: string;
    }) => {
      await api.post(`/market/admin/books/${input.id}/review`, {
        decision: input.decision,
        reviewNote: input.reviewNote,
        internalNote: input.internalNote,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}
