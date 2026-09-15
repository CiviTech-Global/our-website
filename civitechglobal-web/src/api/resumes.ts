import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paged } from '@/types/api';
import { api } from '@/config/api';
import type {
  AdminResumeDetail,
  AdminResumeSummary,
  ResumeAllowance,
  ResumePayload,
  ResumeResult,
  ResumeStatus,
} from '@/types/resume';

/**
 * The CV and the form travel together as multipart: the structured part as one
 * JSON field so it keeps its types, the file as a file.
 */
export function useSubmitResume() {
  return useMutation({
    mutationFn: async (input: { payload: ResumePayload; resume: File }) => {
      const form = new FormData();
      form.append('payload', JSON.stringify(input.payload));
      form.append('resume', input.resume);

      const res = await api.post<ResumeResult>('/resumes', form);
      return res.data;
    },
  });
}

/**
 * Checked when the email field loses focus, so somebody who has already used
 * their two days finds out then — not after writing a page and attaching a file.
 */
export async function checkResumeAllowance(email: string): Promise<ResumeAllowance> {
  const res = await api.post<ResumeAllowance>('/resumes/allowance', { email });
  return res.data;
}

// --- Admin ----------------------------------------------------------------

export function useAdminResumes(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: ['resumes', 'admin', params],
    queryFn: async () => {
      const res = await api.get<Paged<AdminResumeSummary>>('/resumes/admin', {
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

export function useAdminResume(id: string | undefined) {
  return useQuery({
    queryKey: ['resumes', 'admin', 'detail', id],
    queryFn: async () => {
      const res = await api.get<AdminResumeDetail>(`/resumes/admin/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateResumeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: ResumeStatus;
      matchedRole?: string;
      internalNotes?: string;
      // `undefined` leaves the assignee alone; explicit null hands it back to
      // the pile. The two must not collapse into each other.
      assignedToId?: string | null;
    }) => {
      const { id, ...body } = input;
      await api.patch(`/resumes/admin/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes', 'admin'] }),
  });
}

/** Where a CV is served from. Staff-only, so FilePreview fetches it. */
/**
 * Where a CV is served from.
 *
 * A path rather than a download helper. This route is staff-only, so a plain
 * <a href> would send no Authorization header and get a 401 — FilePreview
 * fetches it, shows it, and offers the same bytes as a download from there.
 */
export const resumeFileUrl = (id: string) => `/resumes/admin/${id}/file`;
