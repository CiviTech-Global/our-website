import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  ApplicationPayload,
  ApplicationQueueRow,
  AuthorBid,
  BidPayload,
  BidQueueRow,
  EmployerApplication,
  JobPayload,
  JobQueueRow,
  JobReviewDetail,
  OwnApplication,
  OwnBid,
  OwnJob,
  OwnProject,
  OwnVerification,
  Paged,
  ProjectPayload,
  ProjectQueueRow,
  PublicJobDetail,
  PublicJobSummary,
  PublicProjectDetail,
  PublicProjectSummary,
  ReviewDecision,
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
  queue: ['market', 'admin'] as const,
};

function multipart(payload: unknown, files: Array<[string, File]> = []): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  for (const [field, file] of files) form.append(field, file);
  return form;
}

// --- Public boards ---------------------------------------------------------

export interface JobBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  employmentType?: string;
  workArrangement?: string;
  province?: string;
}

export function usePublicJobs(query: JobBoardQuery) {
  return useQuery({
    queryKey: [...keys.jobs, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicJobSummary>>('/market/jobs', { params: { ...query } });
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

export interface ProjectBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}

export function usePublicProjects(query: ProjectBoardQuery) {
  return useQuery({
    queryKey: [...keys.projects, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicProjectSummary>>('/market/projects', {
        params: { ...query },
      });
      return res.data;
    },
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
    }) => {
      const form = new FormData();
      form.append('payload', JSON.stringify(input.payload));
      // Kinds travel as their own JSON array rather than one per file, because
      // multipart preserves field order but not the pairing between two
      // repeated fields — and the server has to know which document is which.
      form.append('kinds', JSON.stringify(input.documents.map((d) => d.kind)));
      for (const doc of input.documents) form.append('documents', doc.file);

      const res = await api.post<{ status: string }>('/market/me/verification', form);
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
    mutationFn: async (input: { jobId: string; payload: ApplicationPayload; cv?: File | null }) => {
      const form = multipart(input.payload, input.cv ? [['cv', input.cv]] : []);
      const res = await api.post<{ id: string }>(`/market/me/jobs/${input.jobId}/apply`, form);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownApplications }),
  });
}

/** Answering a reviewer who asked for changes. Sends it back to the queue. */
export function useReviseApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: ApplicationPayload; cv?: File | null }) => {
      const form = multipart(input.payload, input.cv ? [['cv', input.cv]] : []);
      await api.patch(`/market/me/applications/${input.id}`, form);
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
    mutationFn: async (input: { payload: ProjectPayload; attachments?: File[] }) => {
      const form = multipart(
        input.payload,
        (input.attachments ?? []).map((file) => ['attachments', file] as [string, File])
      );
      const res = await api.post<OwnProject>('/market/me/projects', form);
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

// --- The queues ------------------------------------------------------------

export interface QueueQuery {
  page: number;
  pageSize: number;
  status?: string;
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

export function useBidQueue(query: { page: number; pageSize: number }) {
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
 * An identity document is staff-only, so it cannot be a plain link — the
 * browser would send no Authorization header. Fetch it, then hand the bytes
 * to the browser, exactly as the CV pile does.
 */
export async function downloadVerificationDocument(
  storedName: string,
  filename: string
): Promise<void> {
  const res = await api.get(`/market/admin/verification-documents/${storedName}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
