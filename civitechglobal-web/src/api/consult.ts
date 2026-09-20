import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * The club of experts, and the consultations they give.
 *
 * Reads are public and cached by the server; the editorial half and the queue
 * are staff-only. Asking for a consultation needs no account, so the mutation
 * carries no auth and the answer is a tracking code — which is the only thread
 * back to the request in a deployment that sends no messages.
 */

export type ConsultationTopic = 'CAREER' | 'TECHNICAL' | 'STARTING_OUT' | 'HIRING' | 'OTHER';
export type ConsultationMode = 'ONLINE' | 'PHONE' | 'IN_PERSON';
export type DayPart = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type ConsultationStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'NO_ANSWER'
  | 'CANCELLED';

export interface Expert {
  id: string;
  slug: string;
  fullName: string;
  headline: string;
  bio: string | null;
  specialities: string[];
  languages: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  acceptsConsultations: boolean;
  featured: boolean;
  photoUrl: string | null;
}

export interface AdminExpert extends Expert {
  published: boolean;
  displayOrder: number;
  _count: { requests: number };
}

export interface ExpertPayload {
  fullName: string;
  headline: string;
  slug?: string;
  bio?: string;
  specialities?: string[];
  languages?: string[];
  yearsExperience?: number | null;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  acceptsConsultations?: boolean;
  featured?: boolean;
  published?: boolean;
}

export interface AvailabilityWindow {
  /** yyyy-mm-dd */
  day: string;
  part: DayPart;
}

export interface ConsultationPayload {
  fullName: string;
  phone: string;
  email?: string;
  topic: ConsultationTopic;
  preferredMode?: ConsultationMode;
  goal?: string;
  background?: string;
  expertSlug?: string;
  availability: AvailabilityWindow[];
}

export interface ConsultationReceipt {
  trackingCode: string;
  createdAt: string;
}

/** What the person holding the code sees — never our notes about them. */
export interface TrackedConsultation {
  kind: 'consultation';
  trackingCode: string;
  fullName: string;
  topic: ConsultationTopic;
  preferredMode: ConsultationMode;
  status: ConsultationStatus;
  scheduledAt: string | null;
  createdAt: string;
  expert: { fullName: string; slug: string; headline: string } | null;
  availability: AvailabilityWindow[];
}

/** A row in the staff queue, with everything needed to ring somebody. */
export interface ConsultationRow {
  id: string;
  trackingCode: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  topic: ConsultationTopic;
  preferredMode: ConsultationMode;
  goal: string | null;
  background: string | null;
  status: ConsultationStatus;
  staffNote: string | null;
  scheduledAt: string | null;
  contactedAt: string | null;
  createdAt: string;
  expert: { id: string; fullName: string; slug: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  availability: AvailabilityWindow[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const keys = {
  experts: ['consult', 'experts'] as const,
  adminExperts: ['consult', 'admin', 'experts'] as const,
  queue: ['consult', 'admin', 'requests'] as const,
};

function multipart(payload: unknown, file?: File | null, field = 'photo'): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (file) form.append(field, file);
  return form;
}

// --- Public ----------------------------------------------------------------

export function usePublicExperts() {
  return useQuery({
    queryKey: keys.experts,
    queryFn: async () => {
      const res = await api.get<Expert[]>('/consult/experts');
      return res.data;
    },
  });
}

export function usePublicExpert(slug: string | undefined) {
  return useQuery({
    queryKey: [...keys.experts, slug],
    queryFn: async () => {
      const res = await api.get<Expert>(`/consult/experts/${slug!}`);
      return res.data;
    },
    enabled: Boolean(slug),
  });
}

export function useRequestConsultation() {
  return useMutation({
    mutationFn: async (payload: ConsultationPayload) => {
      const res = await api.post<ConsultationReceipt>('/consult/requests', payload);
      return res.data;
    },
  });
}

export function useTrackedConsultation(code: string | undefined) {
  return useQuery({
    queryKey: ['consult', 'track', code],
    queryFn: async () => {
      const res = await api.get<TrackedConsultation>(`/consult/requests/${code!}`);
      return res.data;
    },
    enabled: Boolean(code),
  });
}

export function useCancelConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.post(`/consult/requests/${code}/cancel`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consult', 'track'] }),
  });
}

// --- Staff: the directory --------------------------------------------------

export function useAdminExperts(enabled = true) {
  return useQuery({
    queryKey: keys.adminExperts,
    queryFn: async () => {
      const res = await api.get<AdminExpert[]>('/consult/admin/experts');
      return res.data;
    },
    enabled,
  });
}

export function useSaveExpert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      payload: ExpertPayload | Partial<ExpertPayload>;
      photo?: File | null;
      onProgress?: (percent: number) => void;
    }) => {
      const body = multipart(input.payload, input.photo);
      if (input.id) {
        await api.upload('PATCH', `/consult/admin/experts/${input.id}`, body, {
          onProgress: input.onProgress,
        });
      } else {
        await api.upload('POST', '/consult/admin/experts', body, { onProgress: input.onProgress });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.adminExperts });
      void qc.invalidateQueries({ queryKey: keys.experts });
    },
  });
}

export function useDeleteExpert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/consult/admin/experts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminExperts }),
  });
}

export function useReorderExperts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/consult/admin/experts/reorder', { ids });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminExperts }),
  });
}

// --- Staff: the queue ------------------------------------------------------

export function useConsultationQueue(
  query: { status?: string; expertId?: string; page: number; pageSize: number },
  enabled = true
) {
  return useQuery({
    queryKey: [...keys.queue, query],
    queryFn: async () => {
      const res = await api.get<Paged<ConsultationRow>>('/consult/admin/requests', { params: query });
      return res.data;
    },
    enabled,
  });
}

export function useUpdateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: ConsultationStatus;
      staffNote?: string | null;
      scheduledAt?: string | null;
      assignedToId?: string | null;
    }) => {
      const { id, ...body } = input;
      await api.patch(`/consult/admin/requests/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

/** The staff route for an unpublished expert's photo. See StaffImage. */
export function adminPhotoPath(expertId: string, photoUrl: string | null): string | null {
  return photoUrl ? `/consult/admin/experts/${expertId}/photo` : null;
}

/** The public photo URL, with the API base put back on. */
export { apiAssetSrc as expertPhotoSrc } from '@/lib/apiAsset';
