import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { Paged } from '@/types/api';
import type { ProjectBoardQuery } from '@/api/marketplace';
import type {
  BidPayloadV2,
  ClientPipeline,
  FreelancerCard,
  FreelancerProfile,
  InboxBid,
  MyProposal,
  OrderPayload,
  OwnProjectV2,
  OwnService,
  PriceGuide,
  ProjectAlert,
  ProjectAlertQuery,
  ProjectCard,
  ProjectDetail,
  ProjectPayloadV2,
  ReceivedInvite,
  SentInvite,
  ServiceCard,
  ServiceDetail,
  ServiceOrder,
  ServicePayload,
  ServiceQueueRow,
  TalentRow,
  WorkCategory,
} from '@/types/work';

/**
 * The freelance side's second generation: everything under /work on the API,
 * plus the board and project calls on /market that now carry the new fields.
 *
 * Every hook here is only ever called while features.projectsV2 is on — the
 * /work routes answer 404 otherwise.
 */

const keys = {
  categories: ['work', 'categories'] as const,
  board: ['market', 'projects'] as const,
  ownProjects: ['market', 'me', 'projects'] as const,
  me: ['work', 'me'] as const,
  saved: ['work', 'me', 'saved'] as const,
  savedIds: ['work', 'me', 'saved', 'ids'] as const,
  alerts: ['work', 'me', 'alerts'] as const,
  invites: ['work', 'me', 'invites'] as const,
  proposals: ['work', 'me', 'proposals'] as const,
  pipeline: ['work', 'me', 'pipeline'] as const,
  services: ['work', 'services'] as const,
  ownServices: ['work', 'me', 'services'] as const,
  orders: ['work', 'me', 'orders'] as const,
  talent: ['work', 'talent'] as const,
  awards: ['market', 'me', 'awards'] as const,
};

function multipart(payload: unknown, files: Array<[string, File]> = []): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  for (const [field, file] of files) form.append(field, file);
  return form;
}

/** Switches cross only when on; "false" is the same as not asking. */
const on = (value: boolean | undefined) => (value ? 'true' : undefined);

export function useWorkCategories(enabled = true) {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => (await api.get<WorkCategory[]>('/work/categories')).data,
    staleTime: 10 * 60_000,
    enabled,
  });
}

// --- The board -------------------------------------------------------------------

export function useProjectBoard(query: ProjectBoardQuery, enabled = true) {
  return useQuery({
    enabled,
    queryKey: [...keys.board, 'v2', query],
    queryFn: async () =>
      (
        await api.get<Paged<ProjectCard>>('/market/projects', {
          params: {
            ...query,
            skills: query.skills?.length ? query.skills.join(',') : undefined,
            clientHired: on(query.clientHired),
            clientVerified: on(query.clientVerified),
            urgent: on(query.urgent),
            featured: on(query.featured),
            nda: on(query.nda),
            onsite: on(query.onsite),
            contractToHire: on(query.contractToHire),
          },
        })
      ).data,
  });
}

/** The public read: anyone, cached, no viewer. */
export function useProjectPublic(code: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...keys.board, 'detail', code],
    queryFn: async () => (await api.get<ProjectDetail>(`/market/projects/${code!}`)).data,
    enabled: Boolean(code) && enabled,
    retry: false,
  });
}

/** The signed-in read: members-only and invite-only briefs, the NDA, the reader's own bid. */
export function useProjectView(code: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...keys.me, 'project', code],
    queryFn: async () => (await api.get<ProjectDetail>(`/work/me/projects/${code!}/view`)).data,
    enabled: Boolean(code) && enabled,
    retry: false,
  });
}

export function useSignNda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; signedName: string }) =>
      (await api.post(`/work/me/projects/${input.projectId}/nda`, { signedName: input.signedName, accept: true })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...keys.me, 'project'] }),
  });
}

export function usePriceGuide(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...keys.me, 'price-guide', projectId],
    queryFn: async () => (await api.get<PriceGuide>(`/work/me/projects/${projectId!}/price-guide`)).data,
    enabled: Boolean(projectId) && enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePlaceBidV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; payload: BidPayloadV2; attachment?: File | null }) => {
      const form = multipart(input.payload, input.attachment ? [['attachment', input.attachment]] : []);
      return (await api.post<{ id: string }>(`/market/me/projects/${input.projectId}/bid`, form)).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: ['market', 'me', 'bids'] });
    },
  });
}

export function useReviseBidV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: BidPayloadV2 }) => {
      await api.patch(`/market/me/bids/${input.id}`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useWithdrawBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bidId: string) => {
      await api.post(`/work/me/bids/${bidId}/withdraw`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useMyProposals(enabled = true) {
  return useQuery({
    queryKey: keys.proposals,
    queryFn: async () => (await api.get<MyProposal[]>('/work/me/proposals')).data,
    enabled,
  });
}

export function useRecommendedProjects(enabled = true) {
  return useQuery({
    queryKey: [...keys.me, 'recommended'],
    queryFn: async () =>
      (
        await api.get<{ basis: 'skills' | 'activity' | 'none'; items: ProjectCard[] }>(
          '/work/me/recommended-projects',
        )
      ).data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

// --- Saved and alerts ------------------------------------------------------------

export function useSavedProjectIds(enabled = true) {
  return useQuery({
    queryKey: keys.savedIds,
    queryFn: async () => (await api.get<string[]>('/work/me/saved-projects/ids')).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useSavedProjects() {
  return useQuery({
    queryKey: keys.saved,
    queryFn: async () => (await api.get<Array<ProjectCard & { savedAt: string }>>('/work/me/saved-projects')).data,
  });
}

export function useToggleSavedProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; save: boolean }) => {
      if (input.save) await api.put(`/work/me/saved-projects/${input.projectId}`);
      else await api.delete(`/work/me/saved-projects/${input.projectId}`);
    },
    // Optimistic: the bookmark should answer the click at once.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.savedIds });
      const before = qc.getQueryData<string[]>(keys.savedIds);
      qc.setQueryData<string[]>(keys.savedIds, (ids = []) =>
        input.save ? [...new Set([...ids, input.projectId])] : ids.filter((id) => id !== input.projectId),
      );
      return { before };
    },
    onError: (_error, _input, context) => qc.setQueryData(keys.savedIds, context?.before),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.saved });
      void qc.invalidateQueries({ queryKey: keys.savedIds });
    },
  });
}

export function useProjectAlerts() {
  return useQuery({
    queryKey: keys.alerts,
    queryFn: async () => (await api.get<ProjectAlert[]>('/work/me/project-alerts')).data,
  });
}

export function useCreateProjectAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; query: ProjectAlertQuery }) =>
      (await api.post<ProjectAlert>('/work/me/project-alerts', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useUpdateProjectAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; active?: boolean }) => {
      const { id, ...body } = input;
      await api.patch(`/work/me/project-alerts/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

export function useDeleteProjectAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/work/me/project-alerts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.alerts }),
  });
}

// --- The client ----------------------------------------------------------------

export function useOwnProjectsV2(enabled = true) {
  return useQuery({
    queryKey: [...keys.ownProjects, 'v2'],
    queryFn: async () => (await api.get<OwnProjectV2[]>('/market/me/projects')).data,
    enabled,
  });
}

export function useCreateProjectV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: ProjectPayloadV2; attachments: File[]; onProgress?: (percent: number) => void }) => {
      const form = multipart(
        input.payload,
        input.attachments.map((file) => ['attachments', file] as [string, File]),
      );
      return (
        await api.upload<{ id: string; code: string }>('POST', '/market/me/projects', form, { onProgress: input.onProgress })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

export function useUpdateProjectV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<ProjectPayloadV2> }) => {
      await api.patch(`/market/me/projects/${input.id}`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

export function useProjectInbox(projectId: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownProjects, projectId, 'inbox'],
    queryFn: async () => (await api.get<InboxBid[]>(`/market/me/projects/${projectId!}/bids`)).data,
    enabled: Boolean(projectId),
  });
}

export function useClientPipeline(enabled = true) {
  return useQuery({
    queryKey: keys.pipeline,
    queryFn: async () => (await api.get<ClientPipeline>('/work/me/client-pipeline')).data,
    enabled,
  });
}

export function useSetBidStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bidId: string; outcome: 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'DECLINED' }) => {
      await api.patch(`/work/me/bids/${input.bidId}/stage`, { outcome: input.outcome });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ownProjects });
      void qc.invalidateQueries({ queryKey: keys.pipeline });
    },
  });
}

export function useSetBidNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bidId: string; note: string | null }) => {
      await api.patch(`/work/me/bids/${input.bidId}/note`, { note: input.note });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProjects }),
  });
}

export function useAcceptBidV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bidId: string) => {
      await api.post(`/market/me/bids/${bidId}/accept`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['market'] });
      void qc.invalidateQueries({ queryKey: keys.pipeline });
    },
  });
}

export function useProjectInvites(projectId: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownProjects, projectId, 'invites'],
    queryFn: async () => (await api.get<SentInvite[]>(`/work/me/projects/${projectId!}/invites`)).data,
    enabled: Boolean(projectId),
  });
}

export function useInviteFreelancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; username: string; message?: string }) =>
      (await api.post(`/work/me/projects/${input.projectId}/invites`, { username: input.username, message: input.message })).data,
    onSuccess: (_data, input) => qc.invalidateQueries({ queryKey: [...keys.ownProjects, input.projectId, 'invites'] }),
  });
}

export function useNdaSignatures(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...keys.ownProjects, projectId, 'nda'],
    queryFn: async () =>
      (
        await api.get<Array<{ signedName: string; signedAt: string; user: { firstName: string; lastName: string; username: string | null } }>>(
          `/work/me/projects/${projectId!}/nda`,
        )
      ).data,
    enabled: Boolean(projectId) && enabled,
  });
}

// --- The freelancer ----------------------------------------------------------------

export function useMyInvites(enabled = true) {
  return useQuery({
    queryKey: keys.invites,
    queryFn: async () => (await api.get<ReceivedInvite[]>('/work/me/invites')).data,
    enabled,
  });
}

export function useDeclineInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.post(`/work/me/invites/${inviteId}/decline`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invites }),
  });
}

export function useFreelancerProfile() {
  return useQuery({
    queryKey: [...keys.me, 'freelancer-profile'],
    queryFn: async () => (await api.get<FreelancerProfile>('/work/me/freelancer-profile')).data,
  });
}

export function useUpdateFreelancerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Omit<FreelancerProfile, 'hourlyRate'>> & { hourlyRate?: string | null }) =>
      (await api.patch<FreelancerProfile>('/work/me/freelancer-profile', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...keys.me, 'freelancer-profile'] }),
  });
}

// --- Talent --------------------------------------------------------------------------

export interface TalentQuery extends Record<string, string | number | boolean | undefined> {
  page: number;
  pageSize: number;
  search?: string;
  skills?: string;
  workCategoryId?: string;
  country?: string;
  language?: string;
  availability?: string;
  level?: string;
  minRating?: string;
  verified?: boolean;
  sort?: string;
}

export function useTalent(query: TalentQuery) {
  return useQuery({
    queryKey: [...keys.talent, query],
    queryFn: async () =>
      (await api.get<Paged<TalentRow>>('/work/talent', { params: { ...query, verified: on(query.verified) } })).data,
  });
}

export function useFreelancerCard(username: string | undefined) {
  return useQuery({
    queryKey: [...keys.talent, 'card', username],
    queryFn: async () => (await api.get<FreelancerCard>(`/work/talent/${encodeURIComponent(username!)}`)).data,
    enabled: Boolean(username),
    retry: false,
  });
}

// --- Hourly contracts ----------------------------------------------------------------

export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { awardId: string; weekStart: string; minutes: number; memo: string }) => {
      const { awardId, ...body } = input;
      await api.post(`/work/me/awards/${awardId}/timesheets`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.awards }),
  });
}

export function useReviewTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: 'APPROVED' | 'QUERIED'; note?: string }) => {
      await api.patch(`/work/me/timesheets/${input.id}`, { decision: input.decision, note: input.note });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.awards }),
  });
}

// --- Services ----------------------------------------------------------------------

export interface ServiceCatalogQuery extends Record<string, string | number | boolean | undefined> {
  page: number;
  pageSize: number;
  search?: string;
  workCategoryId?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: string;
  deliveryDays?: string;
  language?: string;
  sellerCountry?: string;
  sellerLevel?: string;
  verifiedSeller?: boolean;
  featured?: boolean;
  sellerUsername?: string;
  sort?: string;
}

export function useServices(query: ServiceCatalogQuery, enabled = true) {
  return useQuery({
    queryKey: [...keys.services, query],
    enabled,
    queryFn: async () =>
      (
        await api.get<Paged<ServiceCard>>('/work/services', {
          params: { ...query, verifiedSeller: on(query.verifiedSeller), featured: on(query.featured) },
        })
      ).data,
  });
}

export function useService(code: string | undefined) {
  return useQuery({
    queryKey: [...keys.services, 'detail', code],
    queryFn: async () => (await api.get<ServiceDetail>(`/work/services/${code!}`)).data,
    enabled: Boolean(code),
    retry: false,
  });
}

export function useOwnServices() {
  return useQuery({
    queryKey: keys.ownServices,
    queryFn: async () => (await api.get<OwnService[]>('/work/me/services')).data,
  });
}

export function useOwnService(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownServices, id],
    queryFn: async () => (await api.get<OwnService>(`/work/me/services/${id!}`)).data,
    enabled: Boolean(id),
  });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; payload: ServicePayload; images: File[]; onProgress?: (percent: number) => void }) => {
      const form = multipart(input.payload, input.images.map((file) => ['images', file] as [string, File]));
      const res = await api.upload<{ id: string; code?: string; moderationStatus: string }>(
        input.id ? 'PUT' : 'POST',
        input.id ? `/work/me/services/${input.id}` : '/work/me/services',
        form,
        { onProgress: input.onProgress },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownServices }),
  });
}

export function useSubmitService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/work/me/services/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownServices }),
  });
}

export function useSetServiceState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; state: 'ACTIVE' | 'PAUSED' }) => {
      await api.patch(`/work/me/services/${input.id}/state`, { state: input.state });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownServices }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/work/me/services/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownServices }),
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serviceId: string; payload: OrderPayload }) =>
      (await api.post<{ id: string; code: string }>(`/work/me/services/${input.serviceId}/order`, input.payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.orders }),
  });
}

export function useOrders(side: 'buyer' | 'seller') {
  return useQuery({
    queryKey: [...keys.orders, side],
    queryFn: async () => (await api.get<ServiceOrder[]>('/work/me/orders', { params: { side } })).data,
  });
}

export function useOrderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: 'accept' | 'decline' | 'cancel'; reason?: string }) => {
      await api.post(`/work/me/orders/${input.id}/${input.action}`, input.reason ? { reason: input.reason } : undefined);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.orders });
      void qc.invalidateQueries({ queryKey: keys.awards });
    },
  });
}

// --- Staff -----------------------------------------------------------------------------

export function useServiceQueue(query: { page: number; pageSize: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['work', 'admin', 'services', query],
    queryFn: async () => (await api.get<Paged<ServiceQueueRow>>('/work/admin/services', { params: query })).data,
  });
}

export function useReviewService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
      reviewNote?: string;
      internalNote?: string;
    }) => {
      const { id, ...body } = input;
      await api.post(`/work/admin/services/${id}/review`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work', 'admin', 'services'] }),
  });
}

export function useFeatureService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; featured: boolean }) => {
      await api.patch(`/work/admin/services/${input.id}/featured`, { featured: input.featured });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work', 'admin', 'services'] }),
  });
}

/** Where a service image is served from: the catalogue, the owner's editor, or the staff queue. */
export function serviceImagePath(id: string, scope: 'public' | 'own' | 'staff' = 'public'): string {
  return scope === 'public'
    ? `/work/service-images/${id}`
    : scope === 'own'
      ? `/work/me/service-images/${id}`
      : `/work/admin/service-images/${id}`;
}
