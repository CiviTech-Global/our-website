import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * The "تیم ما" page and the super admin's control over it.
 *
 * Photographs travel as multipart with the structured half in one `payload`
 * JSON field, the same shape every other upload here uses.
 */

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  team: string | null;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  displayOrder: number;
  /** An API path, not a storage key — served by the server, may be null. */
  photoUrl: string | null;
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
  team?: string;
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
      const res = await api.get<TeamMember[]>('/team');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTeam() {
  return useQuery({
    queryKey: keys.admin,
    queryFn: async () => {
      const res = await api.get<AdminTeamMember[]>('/team/admin');
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
  return useTeamMutation(async (input: { payload: TeamMemberPayload; photo?: File | null }) => {
    await api.post('/team/admin', multipart(input.payload, input.photo));
  });
}

export function useUpdateMember() {
  return useTeamMutation(
    async (input: { id: string; payload: Partial<TeamMemberPayload>; photo?: File | null }) => {
      await api.patch(`/team/admin/${input.id}`, multipart(input.payload, input.photo));
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
