import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { Paged } from '@/types/api';
import type {
  BookCard,
  BookCategory,
  BookDetail,
  BookRequestRow,
  CatalogHit,
  OfferPayload,
  OwnOffer,
  StaffCatalogRow,
  StaffOfferRow,
} from '@/types/bookshop';

/**
 * The book market's second generation: everything under /bookshop on the API.
 * Only called while features.booksV2 is on — the routes answer 404 otherwise.
 */

const keys = {
  categories: ['bookshop', 'categories'] as const,
  board: ['bookshop', 'board'] as const,
  book: ['bookshop', 'book'] as const,
  offers: ['bookshop', 'me', 'offers'] as const,
  requests: ['bookshop', 'me', 'requests'] as const,
  staff: ['bookshop', 'admin'] as const,
};

function multipart(payload: unknown, files: Array<[string, File]> = []): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  for (const [field, file] of files) form.append(field, file);
  return form;
}

const on = (value: boolean | undefined) => (value ? 'true' : undefined);

export function useBookCategories(enabled = true) {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => (await api.get<BookCategory[]>('/bookshop/categories')).data,
    staleTime: 10 * 60_000,
    enabled,
  });
}

export interface BoardQuery extends Record<string, string | number | boolean | undefined> {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  language?: string;
  binding?: string;
  trimSize?: string;
  grade?: string;
  priceMin?: string;
  priceMax?: string;
  province?: string;
  delivery?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  yearFrom?: string;
  yearTo?: string;
  discounted?: boolean;
  translated?: boolean;
  freeShipping?: boolean;
  sort?: string;
}

export function useBookBoard(query: BoardQuery, enabled = true) {
  return useQuery({
    queryKey: [...keys.board, query],
    enabled,
    queryFn: async () =>
      (
        await api.get<Paged<BookCard>>('/bookshop/board', {
          params: {
            ...query,
            discounted: on(query.discounted),
            translated: on(query.translated),
            freeShipping: on(query.freeShipping),
          },
        })
      ).data,
  });
}

export function useBook(code: string | undefined) {
  return useQuery({
    queryKey: [...keys.book, code],
    queryFn: async () => (await api.get<BookDetail>(`/bookshop/books/${code!}`)).data,
    enabled: Boolean(code),
    retry: false,
  });
}

export function useCatalogSearch(q: string) {
  return useQuery({
    queryKey: ['bookshop', 'catalog', q],
    queryFn: async () => (await api.get<CatalogHit[]>('/bookshop/me/catalog', { params: { q } })).data,
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}

// --- The seller ----------------------------------------------------------------

export function useOwnOffers() {
  return useQuery({
    queryKey: keys.offers,
    queryFn: async () => (await api.get<OwnOffer[]>('/bookshop/me/offers')).data,
  });
}

export function useSaveOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; payload: OfferPayload; photos: File[]; onProgress?: (percent: number) => void }) => {
      const form = multipart(input.payload, input.photos.map((file) => ['photos', file] as [string, File]));
      return (
        await api.upload<{ id: string; code?: string }>(
          input.id ? 'PUT' : 'POST',
          input.id ? `/bookshop/me/offers/${input.id}` : '/bookshop/me/offers',
          form,
          { onProgress: input.onProgress },
        )
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.offers }),
  });
}

export function useQuickEditOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      price?: string;
      negotiable?: boolean;
      quantity?: number;
      deliveryOptions?: string[];
      shippingCost?: string | null;
    }) => {
      const { id, ...body } = input;
      await api.patch(`/bookshop/me/offers/${id}/quick`, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.offers });
      void qc.invalidateQueries({ queryKey: keys.board });
    },
  });
}

export function useSubmitOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/bookshop/me/offers/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.offers }),
  });
}

export function useSetOfferOpen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; open: boolean }) => {
      await api.post(`/bookshop/me/offers/${input.id}/state`, { open: input.open });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.offers }),
  });
}

// --- Requests ---------------------------------------------------------------------

export function useCreateBookRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { offerId: string; quantity: number; deliveryMethod: string; offeredPrice?: string; note?: string }) => {
      const { offerId, ...body } = input;
      return (await api.post<{ id: string }>(`/bookshop/me/offers/${offerId}/requests`, body)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

export function useBookRequests(side: 'buyer' | 'seller', enabled = true) {
  return useQuery({
    queryKey: [...keys.requests, side],
    queryFn: async () => (await api.get<BookRequestRow[]>('/bookshop/me/requests', { params: { side } })).data,
    enabled,
  });
}

export function useBookRequestAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: 'accept' | 'decline' | 'cancel' | 'complete'; reason?: string }) => {
      await api.post(`/bookshop/me/requests/${input.id}/${input.action}`, input.reason ? { reason: input.reason } : undefined);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.requests });
      void qc.invalidateQueries({ queryKey: keys.offers });
      void qc.invalidateQueries({ queryKey: ['market', 'me', 'awards'] });
    },
  });
}

// --- Staff ---------------------------------------------------------------------------

export function useStaffCatalog(query: { page: number; pageSize: number; search?: string; verified?: string }) {
  return useQuery({
    queryKey: [...keys.staff, 'catalog', query],
    queryFn: async () => (await api.get<Paged<StaffCatalogRow>>('/bookshop/admin/catalog', { params: query })).data,
  });
}

export function useUpdateCatalogBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Record<string, unknown>; cover?: File | null }) => {
      if (input.cover) {
        const form = multipart(input.payload, [['cover', input.cover]]);
        await api.upload('PATCH', `/bookshop/admin/catalog/${input.id}`, form);
      } else {
        await api.patch(`/bookshop/admin/catalog/${input.id}`, input.payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.staff }),
  });
}

export function useMergeBooks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { keepId: string; dropId: string }) => {
      await api.post('/bookshop/admin/catalog/merge', input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.staff }),
  });
}

export function useStaffOffers(query: { page: number; pageSize: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: [...keys.staff, 'offers', query],
    queryFn: async () => (await api.get<Paged<StaffOfferRow>>('/bookshop/admin/offers', { params: query })).data,
  });
}

/** Where an offer photo is served from: the public page, the seller's editor, or the staff queue. */
export function offerPhotoPath(id: string, scope: 'public' | 'own' | 'staff' = 'public'): string {
  return scope === 'public' ? `/bookshop/photos/${id}` : scope === 'own' ? `/bookshop/me/photos/${id}` : `/bookshop/admin/photos/${id}`;
}
