import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * The "تیم ما" page, its sections, and the super admin's control over both.
 *
 * Photographs travel as multipart with the structured half in one `payload`
 * JSON field, the same shape every other upload here uses.
 */

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  sectionId: string | null;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  displayOrder: number;
  /** An API path, not a storage key — served by the server, may be null. */
  photoUrl: string | null;
}

export interface TeamSection {
  id: string;
  name: string;
  description: string | null;
}

/** The public page, already arranged by the server. */
export interface TeamPage {
  sections: Array<TeamSection & { members: TeamMember[] }>;
  unsectioned: TeamMember[];
}

export interface AdminTeamSection extends TeamSection {
  displayOrder: number;
  _count: { members: number };
}

export interface AdminTeam {
  sections: AdminTeamSection[];
  members: AdminTeamMember[];
}

export interface TeamSectionPayload {
  name: string;
  description?: string;
}

export interface AdminTeamMember extends TeamMember {
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberPayload {
  name: string;
  title: string;
  bio?: string;
  /** Null takes a member out of their section. */
  sectionId?: string | null;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  published?: boolean;
}

const keys = {
  public: ['team', 'public'] as const,
  admin: ['team', 'admin'] as const,
};

function multipart(payload: unknown, photo?: File | null): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (photo) form.append('photo', photo);
  return form;
}

/**
 * The absolute URL for a portrait.
 *
 * photoUrl comes back as an API path so the server owns the route. This puts
 * the API base in front of it, which matters because the base is configurable
 * and an <img src> cannot go through the fetch client.
 */
export function photoSrc(photoUrl: string | null): string | undefined {
  if (!photoUrl) return undefined;
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}${photoUrl}`;
}

export function useTeam() {
  return useQuery({
    queryKey: keys.public,
    queryFn: async () => {
      const res = await api.get<TeamPage>('/team');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTeam() {
  return useQuery({
    queryKey: keys.admin,
    queryFn: async () => {
      const res = await api.get<AdminTeam>('/team/admin');
      return res.data;
    },
  });
}

/** Every write invalidates both lists: the public page reflects them all. */
function useTeamMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useCreateMember() {
  return useTeamMutation(async (input: {
    payload: TeamMemberPayload;
    photo?: File | null;
    /** Progress for the portrait, when the caller wants a bar. */
    onProgress?: (percent: number) => void;
  }) => {
    await api.upload('POST', '/team/admin', multipart(input.payload, input.photo), {
      onProgress: input.onProgress,
    });
  });
}

export function useUpdateMember() {
  return useTeamMutation(
    async (input: {
      id: string;
      payload: Partial<TeamMemberPayload>;
      photo?: File | null;
      onProgress?: (percent: number) => void;
    }) => {
      await api.upload('PATCH', `/team/admin/${input.id}`, multipart(input.payload, input.photo), {
        onProgress: input.onProgress,
      });
    },
  );
}

export function useDeleteMember() {
  return useTeamMutation(async (id: string) => {
    await api.delete(`/team/admin/${id}`);
  });
}

/**
 * Reordering sends the whole list in the order it should be.
 *
 * Not "move this one to position 3": the server would then have to work out
 * what everything else shifts to, and two people reordering at once would
 * interleave into an order neither of them chose.
 */
export function useReorderTeam() {
  return useTeamMutation(async (ids: string[]) => {
    await api.post('/team/admin/reorder', { ids });
  });
}

// --- Sections ----------------------------------------------------------------

export function useCreateSection() {
  return useTeamMutation(async (payload: TeamSectionPayload) => {
    await api.post('/team/admin/sections', payload);
  });
}

export function useUpdateSection() {
  return useTeamMutation(async (input: { id: string; payload: Partial<TeamSectionPayload> }) => {
    await api.patch(`/team/admin/sections/${input.id}`, input.payload);
  });
}

/** Members of a deleted section are kept; the server moves them out of it. */
export function useDeleteSection() {
  return useTeamMutation(async (id: string) => {
    await api.delete(`/team/admin/sections/${id}`);
  });
}

export function useReorderSections() {
  return useTeamMutation(async (ids: string[]) => {
    await api.post('/team/admin/sections/reorder', { ids });
  });
}

/** The staff route for a portrait, which serves unpublished members too. */
export function adminPhotoPath(photoUrl: string | null): string | null {
  return photoUrl ? photoUrl.replace('/team/photo/', '/team/admin/photo/') : null;
}
