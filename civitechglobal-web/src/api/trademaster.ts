import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  OwnProduct,
  OwnShop,
  Paged,
  ProductBoardQuery,
  ProductCategoryNode,
  ProductPayload,
  ProductQueueRow,
  ProductReviewDetail,
  ProductVariant,
  PublicProductDetail,
  PublicProductSummary,
  PublicShopDetail,
  PublicShopSummary,
  ReviewDecisionPayload,
  ReviewQueueQuery,
  ShopBoardQuery,
  ShopPayload,
  ShopQueueRow,
  ShopReviewDetail,
  VariantPayload,
} from '@/types/trademaster';

/**
 * The TradeMaster module's client.
 *
 * Separate from `api/marketplace.ts` rather than folded into it, for the same
 * reason the routes are separate: a buyer looking for a mug and an employer
 * looking for a developer share an account and nothing else. Keeping them
 * apart means the marketplace file does not grow a second vocabulary.
 *
 * Every endpoint here answers 404 in production until FEATURE_TRADEMASTER is
 * on. The UI never has to know that — it is simply unreachable, because the
 * routes are not registered either.
 */

const keys = {
  shops: ['trademaster', 'shops'] as const,
  products: ['trademaster', 'products'] as const,
  categories: ['trademaster', 'categories'] as const,
  ownShops: ['trademaster', 'me', 'shops'] as const,
  ownProducts: ['trademaster', 'me', 'products'] as const,
  shopQueue: ['trademaster', 'admin', 'shops'] as const,
  productQueue: ['trademaster', 'admin', 'products'] as const,
};

/** The structured half as one JSON field, as everywhere else that carries a file. */
function multipart(payload: unknown, files: Array<[string, File]> = []): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  for (const [field, file] of files) form.append(field, file);
  return form;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export function usePublicShops(query: ShopBoardQuery) {
  return useQuery({
    queryKey: [...keys.shops, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicShopSummary>>('/trademaster/shops', { params: query });
      return res.data;
    },
  });
}

export function usePublicShop(slug: string | undefined) {
  return useQuery({
    queryKey: [...keys.shops, 'detail', slug],
    queryFn: async () => {
      const res = await api.get<PublicShopDetail>(`/trademaster/shops/${slug!}`);
      return res.data;
    },
    enabled: Boolean(slug),
  });
}

export function usePublicProducts(query: ProductBoardQuery) {
  return useQuery({
    queryKey: [...keys.products, query],
    queryFn: async () => {
      const res = await api.get<Paged<PublicProductSummary>>('/trademaster/products', {
        params: query,
      });
      return res.data;
    },
  });
}

export function usePublicProduct(shopSlug: string | undefined, productSlug: string | undefined) {
  return useQuery({
    queryKey: [...keys.products, 'detail', shopSlug, productSlug],
    queryFn: async () => {
      const res = await api.get<PublicProductDetail>(
        `/trademaster/products/${shopSlug!}/${productSlug!}`
      );
      return res.data;
    },
    enabled: Boolean(shopSlug && productSlug),
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => {
      const res = await api.get<ProductCategoryNode[]>('/trademaster/categories');
      return res.data;
    },
    // The catalogue tree changes a few times a year and is identical for every
    // visitor; refetching it per screen is pure waste.
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// The seller's shops
// ---------------------------------------------------------------------------

export function useOwnShops() {
  return useQuery({
    queryKey: keys.ownShops,
    queryFn: async () => {
      const res = await api.get<OwnShop[]>('/trademaster/me/shops');
      return res.data;
    },
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    // api.upload rather than api.post: a logo is the one request here big
    // enough that somebody watches it, and fetch cannot report progress.
    mutationFn: async (input: {
      payload: ShopPayload;
      logo?: File;
      onProgress?: (percent: number) => void;
    }) => {
      const res = await api.upload<OwnShop>(
        'POST',
        '/trademaster/me/shops',
        multipart(input.payload, input.logo ? [['logo', input.logo]] : []),
        { onProgress: input.onProgress }
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownShops }),
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      payload: Partial<ShopPayload>;
      logo?: File;
      onProgress?: (percent: number) => void;
    }) => {
      const res = await api.upload<OwnShop>(
        'PATCH',
        `/trademaster/me/shops/${input.id}`,
        multipart(input.payload, input.logo ? [['logo', input.logo]] : []),
        { onProgress: input.onProgress }
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownShops }),
  });
}

export function useSubmitShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/shops/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownShops }),
  });
}

export function useCloseShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/shops/${id}/close`);
    },
    // Closing a shop closes its products too, so both lists are stale.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ownShops });
      void qc.invalidateQueries({ queryKey: keys.ownProducts });
    },
  });
}

// ---------------------------------------------------------------------------
// The seller's products
// ---------------------------------------------------------------------------

export function useShopProducts(shopId: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownProducts, shopId],
    queryFn: async () => {
      const res = await api.get<OwnProduct[]>(`/trademaster/me/shops/${shopId!}/products`);
      return res.data;
    },
    enabled: Boolean(shopId),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shopId: string; payload: ProductPayload }) => {
      const res = await api.post<OwnProduct>(
        `/trademaster/me/shops/${input.shopId}/products`,
        input.payload
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<ProductPayload> }) => {
      const res = await api.patch<OwnProduct>(`/trademaster/me/products/${input.id}`, input.payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useSubmitProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/products/${id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useCloseProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/products/${id}/close`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

// ---------------------------------------------------------------------------
// Pictures and variants
// ---------------------------------------------------------------------------

export function useAddProductImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      productId: string;
      files: File[];
      captions?: Array<string | null>;
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      for (const file of input.files) form.append('images', file);
      // Positional: the caption at index 2 belongs to the third file, because
      // multipart has no way to attach a field to a particular file.
      if (input.captions) form.append('captions', JSON.stringify(input.captions));

      const res = await api.upload<{ added: number }>(
        'POST',
        `/trademaster/me/products/${input.productId}/images`,
        form,
        { onProgress: input.onProgress }
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useUpdateImageCaption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { imageId: string; caption?: string }) => {
      const res = await api.patch(`/trademaster/me/products/images/${input.imageId}`, {
        caption: input.caption,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useRemoveProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      await api.delete(`/trademaster/me/products/images/${imageId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; payload: VariantPayload }) => {
      const res = await api.post<ProductVariant>(
        `/trademaster/me/products/${input.productId}/variants`,
        input.payload
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<VariantPayload> }) => {
      const res = await api.patch<ProductVariant>(
        `/trademaster/me/products/variants/${input.id}`,
        input.payload
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

export function useRemoveVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/trademaster/me/products/variants/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ownProducts }),
  });
}

// ---------------------------------------------------------------------------
// The review desk
// ---------------------------------------------------------------------------

export function useShopQueue(query: ReviewQueueQuery) {
  return useQuery({
    queryKey: [...keys.shopQueue, query],
    queryFn: async () => {
      const res = await api.get<Paged<ShopQueueRow>>('/trademaster/admin/shops', { params: query });
      return res.data;
    },
  });
}

export function useShopReview(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.shopQueue, 'detail', id],
    queryFn: async () => {
      const res = await api.get<ShopReviewDetail>(`/trademaster/admin/shops/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useReviewShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: ReviewDecisionPayload }) => {
      await api.post(`/trademaster/admin/shops/${input.id}/review`, input.payload);
    },
    // Refusing a shop pushes its products back into review, so that queue
    // changed too.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.shopQueue });
      void qc.invalidateQueries({ queryKey: keys.productQueue });
    },
  });
}

export function useProductQueue(query: ReviewQueueQuery) {
  return useQuery({
    queryKey: [...keys.productQueue, query],
    queryFn: async () => {
      const res = await api.get<Paged<ProductQueueRow>>('/trademaster/admin/products', {
        params: query,
      });
      return res.data;
    },
  });
}

export function useProductReview(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.productQueue, 'detail', id],
    queryFn: async () => {
      const res = await api.get<ProductReviewDetail>(`/trademaster/admin/products/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useReviewProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: ReviewDecisionPayload }) => {
      await api.post(`/trademaster/admin/products/${input.id}/review`, input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.productQueue }),
  });
}
