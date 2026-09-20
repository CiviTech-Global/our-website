import { apiAssetSrc } from '@/lib/apiAsset';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

/**
 * The customers club, the partners page and the projects page, and the
 * editorial control behind them.
 *
 * Images travel as multipart with the structured half in one `payload` JSON
 * field, the same shape every other upload here uses.
 */

export type OrganizationKind = 'CUSTOMER' | 'PARTNER';

export type PartnershipType =
  | 'TECHNOLOGY'
  | 'STRATEGIC'
  | 'ACADEMIC'
  | 'RESELLER'
  | 'COMMUNITY'
  | 'OTHER';

export const PARTNERSHIP_TYPES: PartnershipType[] = [
  'TECHNOLOGY',
  'STRATEGIC',
  'ACADEMIC',
  'RESELLER',
  'COMMUNITY',
  'OTHER',
];

export type ShowcaseProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'LAUNCHED' | 'MAINTAINED' | 'ARCHIVED';

export const PROJECT_STATUSES: ShowcaseProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'LAUNCHED',
  'MAINTAINED',
  'ARCHIVED',
];

export interface ShowcaseOrganization {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  featured: boolean;
  active: boolean;
  sinceYear: number | null;
  partnershipType: PartnershipType | null;
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  testimonialRole: string | null;
  /** An API path, served by the server; null when there is no logo. */
  logoUrl: string | null;
  projectCount: number;
}

export interface AdminShowcaseOrganization extends ShowcaseOrganization {
  kind: OrganizationKind;
  displayOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationPayload {
  kind: OrganizationKind;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  featured?: boolean;
  active?: boolean;
  sinceYear?: number | null;
  partnershipType?: PartnershipType | null;
  testimonialQuote?: string;
  testimonialAuthor?: string;
  testimonialRole?: string;
  published?: boolean;
}

/**
 * One picture from a project's gallery.
 *
 * `url` is the API path the server chose — the public route for a published
 * project, the staff one in the admin listing — so the caller never has to
 * know which, and the storage key never leaves the server.
 */
export interface ProjectShot {
  id: string;
  caption: string | null;
  url: string;
}

export interface ShowcaseProject {
  id: string;
  title: string;
  summary: string;
  description: string | null;
  category: string | null;
  status: ShowcaseProjectStatus;
  technologies: string[];
  projectUrl: string | null;
  repositoryUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  featured: boolean;
  coverUrl: string | null;
  screenshots: ProjectShot[];
  client: { id: string; name: string; website: string | null; logoUrl: string | null } | null;
}

export interface AdminShowcaseProject extends Omit<ShowcaseProject, 'client'> {
  clientId: string | null;
  client: { id: string; name: string; kind: OrganizationKind } | null;
  displayOrder: number;
  published: boolean;
}

export interface ProjectPayload {
  title: string;
  summary: string;
  description?: string;
  category?: string;
  status?: ShowcaseProjectStatus;
  technologies?: string[];
  projectUrl?: string;
  repositoryUrl?: string;
  /** Gregorian ISO, whatever calendar the date field displayed; '' clears it. */
  startedAt?: string;
  completedAt?: string;
  clientId?: string | null;
  featured?: boolean;
  published?: boolean;
}

export type ProjectFilter = 'all' | 'current' | 'completed';

function multipart(field: string, payload: unknown, file?: File | null): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (file) form.append(field, file);
  return form;
}

/**
 * The absolute URL for a public image path.
 *
 * Paths come back from the API so the server owns the route; this puts the
 * configurable API base in front, which an <img src> cannot get any other way.
 */
export function showcaseImageSrc(path: string | null): string | undefined {
  return apiAssetSrc(path);
}

/** The staff route for the same image, which also serves unpublished rows. */
export function adminImagePath(path: string | null): string | null {
  return path ? path.replace('/showcase/', '/showcase/admin/') : null;
}

// --- Public -----------------------------------------------------------------

export function usePublicOrganizations(kind: OrganizationKind) {
  return useQuery({
    queryKey: ['showcase', 'public', kind],
    queryFn: async () => {
      const res = await api.get<ShowcaseOrganization[]>(
        kind === 'CUSTOMER' ? '/showcase/customers' : '/showcase/partners'
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicProjects(filter: ProjectFilter) {
  return useQuery({
    queryKey: ['showcase', 'public', 'projects', filter],
    queryFn: async () => {
      const res = await api.get<ShowcaseProject[]>('/showcase/projects', {
        params: filter === 'all' ? undefined : { filter },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}

// --- Staff ------------------------------------------------------------------

/** Every write invalidates everything under 'showcase': the public pages reflect them all. */
function useShowcaseMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['showcase'] }),
  });
}

export function useAdminOrganizations(kind?: OrganizationKind) {
  return useQuery({
    queryKey: ['showcase', 'admin', 'organizations', kind ?? 'all'],
    queryFn: async () => {
      const res = await api.get<AdminShowcaseOrganization[]>('/showcase/admin/organizations', {
        params: kind ? { kind } : undefined,
      });
      return res.data;
    },
  });
}

export function useSaveOrganization() {
  return useShowcaseMutation(
    async (input: {
      id?: string;
      payload: Partial<OrganizationPayload>;
      logo?: File | null;
      /** Drives the progress bar while the image goes out. */
      onProgress?: (percent: number) => void;
    }) => {
      const body = multipart('logo', input.payload, input.logo);
      if (input.id) {
        await api.upload('PATCH', `/showcase/admin/organizations/${input.id}`, body, {
          onProgress: input.onProgress,
        });
      } else {
        await api.upload('POST', '/showcase/admin/organizations', body, { onProgress: input.onProgress });
      }
    }
  );
}

export function useDeleteOrganization() {
  return useShowcaseMutation(async (id: string) => {
    await api.delete(`/showcase/admin/organizations/${id}`);
  });
}

export function useReorderOrganizations() {
  return useShowcaseMutation(async (ids: string[]) => {
    await api.post('/showcase/admin/organizations/reorder', { ids });
  });
}

export function useAdminProjects() {
  return useQuery({
    queryKey: ['showcase', 'admin', 'projects'],
    queryFn: async () => {
      const res = await api.get<AdminShowcaseProject[]>('/showcase/admin/projects');
      return res.data;
    },
  });
}

export function useSaveProject() {
  return useShowcaseMutation(
    async (input: {
      id?: string;
      payload: Partial<ProjectPayload>;
      cover?: File | null;
      /** Drives the progress bar while the image goes out. */
      onProgress?: (percent: number) => void;
    }) => {
      const body = multipart('cover', input.payload, input.cover);
      if (input.id) {
        await api.upload('PATCH', `/showcase/admin/projects/${input.id}`, body, {
          onProgress: input.onProgress,
        });
      } else {
        await api.upload('POST', '/showcase/admin/projects', body, { onProgress: input.onProgress });
      }
    }
  );
}

export function useDeleteProject() {
  return useShowcaseMutation(async (id: string) => {
    await api.delete(`/showcase/admin/projects/${id}`);
  });
}

export function useReorderProjects() {
  return useShowcaseMutation(async (ids: string[]) => {
    await api.post('/showcase/admin/projects/reorder', { ids });
  });
}

// --- Project screenshots ----------------------------------------------------

/**
 * Several pictures in one request, with their captions paired by position.
 *
 * Through api.upload rather than api.post: a gallery is the largest thing
 * anybody sends from the admin, and it is worth a bar.
 */
export function useAddScreenshots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      files: File[];
      captions?: Array<string | null>;
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      for (const file of input.files) form.append('shots', file);
      form.append('captions', JSON.stringify(input.captions ?? []));

      await api.upload('POST', `/showcase/admin/projects/${input.projectId}/shots`, form, {
        onProgress: input.onProgress,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['showcase'] });
    },
  });
}

export function useRemoveScreenshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/showcase/admin/shots/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['showcase'] });
    },
  });
}

export function useReorderScreenshots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; ids: string[] }) => {
      await api.post(`/showcase/admin/projects/${input.projectId}/shots/reorder`, { ids: input.ids });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['showcase'] });
    },
  });
}
