import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { ProjectRequestPayload, ProjectTrackResult, SubmitProjectResult } from '@/types/project';

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
