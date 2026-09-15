import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paged } from '@/types/api';
import { api } from '@/config/api';
import type {
  AdminProjectDetail,
  AdminProjectSummary,
  ProjectRequestPayload,
  ProjectRequestStatus,
  ProjectTrackResult,
  ProposalPayload,
  SubmitProjectResult,
} from '@/types/project';

/**
 * The brief and its attachments go up as one multipart request: the structured
 * part as a single JSON field, the files as files.
 *
 * Sending the brief as JSON rather than as individual form fields is what keeps
 * booleans boolean and arrays arrays — flattening a form like this one into
 * `FormData` turns every value into a string and pushes the job of guessing
 * types back onto the server.
 */
export function useSubmitProjectRequest() {
  return useMutation({
    mutationFn: async (input: { payload: ProjectRequestPayload; files: File[] }) => {
      const form = new FormData();
      form.append('payload', JSON.stringify(input.payload));
      for (const file of input.files) form.append('files', file);

      const res = await api.post<SubmitProjectResult>('/projects/requests', form);
      return res.data;
    },
  });
}

export function useProjectTracking(trackingCode: string | null) {
  return useQuery({
    queryKey: ['projects', 'track', trackingCode],
    queryFn: async () => {
      const res = await api.get<ProjectTrackResult>(
        `/projects/requests/track/${encodeURIComponent(trackingCode!)}`
      );
      return res.data;
    },
    enabled: Boolean(trackingCode),
    retry: false,
  });
}

/**
 * The same document a client would see, addressed by proposal id.
 *
 * Staff-only, and the only way to look at a draft: the public tracking endpoint
 * refuses to hand one out, which is right — but whoever wrote it still has to
 * be able to read it as the client will before sending.
 */
export function useProposalDocument(proposalId: string | null) {
  return useQuery({
    queryKey: ['projects', 'proposal-document', proposalId],
    queryFn: async () => {
      const res = await api.get<ProjectTrackResult>(
        `/projects/admin/proposals/${encodeURIComponent(proposalId!)}/document`
      );
      return res.data;
    },
    enabled: Boolean(proposalId),
    retry: false,
  });
}

export function useRespondToProposal() {
  return useMutation({
    mutationFn: async (input: {
      trackingCode: string;
      email: string;
      decision: 'ACCEPTED' | 'DECLINED';
      note?: string;
    }) => {
      const res = await api.post('/projects/requests/respond', input);
      return res.data;
    },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function useAdminProjects(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: ['projects', 'admin', params],
    queryFn: async () => {
      const res = await api.get<Paged<AdminProjectSummary>>('/projects/admin/requests', {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          ...(params.status && params.status !== 'ALL' ? { status: params.status } : {}),
        },
      });
      return res.data;
    },
  });
}

export function useAdminProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'admin', 'detail', id],
    queryFn: async () => {
      const res = await api.get<AdminProjectDetail>(`/projects/admin/requests/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateProjectStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { status: ProjectRequestStatus; internalNotes?: string }) => {
      const res = await api.patch(`/projects/admin/requests/${id}/status`, input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', 'admin'] }),
  });
}

export function useCreateProposal(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProposalPayload) => {
      const res = await api.post(`/projects/admin/requests/${requestId}/proposals`, input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', 'admin'] }),
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proposalId: string; payload: ProposalPayload }) => {
      const res = await api.patch(`/projects/admin/proposals/${input.proposalId}`, input.payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', 'admin'] }),
  });
}

/** Sending is irreversible in the sense that the client can now see it. */
export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const res = await api.post(`/projects/admin/proposals/${proposalId}/send`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', 'admin'] }),
  });
}

/**
 * Where a project attachment is served from.
 *
 * A path rather than a download helper: this route is staff-only, so a plain
 * <a href> would send no Authorization header and get a 401. FilePreview
 * fetches it, shows it, and offers the same bytes as a download from there.
 */
export const projectAttachmentUrl = (attachmentId: string) =>
  `/projects/admin/attachments/${attachmentId}`;
