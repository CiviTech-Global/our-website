import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import type {
  NearbyPage,
  OwnProduct,
  OwnShop,
  OwnShopDetail,
  ModerationStatus,
  ShopMapQuery,
  ShopMapResult,
  Paged,
  ProductBoardQuery,
  ProductCategoryNode,
  ShopFacets,
  AdminProductCategory,
  CategoryPayload,
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
  BasketLine,
  CheckoutResult,
  DeliveryInput,
  Order,
  OrderListQuery,
  OrderMove,
  PaymentStatus,
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
  map: ['trademaster', 'map'] as const,
  products: ['trademaster', 'products'] as const,
  categories: ['trademaster', 'categories'] as const,
  facets: ['trademaster', 'facets'] as const,
  ownShops: ['trademaster', 'me', 'shops'] as const,
  ownProducts: ['trademaster', 'me', 'products'] as const,
  shopQueue: ['trademaster', 'admin', 'shops'] as const,
  productQueue: ['trademaster', 'admin', 'products'] as const,
  categoryDesk: ['trademaster', 'admin', 'categories'] as const,
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

/**
 * What the boards' filters may offer.
 *
 * Its own query rather than part of the board's: it changes when a new town
 * joins the marketplace, not when somebody turns a page, so refetching it with
 * every filter change would be work for nothing.
 */
export function useShopFacets() {
  return useQuery({
    queryKey: keys.facets,
    queryFn: async () => {
      const res = await api.get<ShopFacets>('/trademaster/facets');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicShops(query: ShopBoardQuery) {
  return useQuery({
    queryKey: [...keys.shops, query],
    queryFn: async () => {
      const res = await api.get<NearbyPage<PublicShopSummary>>('/trademaster/shops', {
        params: query,
      });
      return res.data;
    },
    // The previous page stays on screen while the next loads, so changing a
    // filter does not flash an empty list and a spinner between two answers.
    placeholderData: (previous) => previous,
  });
}

/** Every matching shop with a location, for the map. */
export function useShopMap(query: ShopMapQuery) {
  return useQuery({
    queryKey: [...keys.map, query],
    queryFn: async () => {
      const res = await api.get<ShopMapResult>('/trademaster/map', { params: query });
      return res.data;
    },
    placeholderData: (previous) => previous,
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
      const res = await api.get<NearbyPage<PublicProductSummary>>('/trademaster/products', {
        params: query,
      });
      return res.data;
    },
    placeholderData: (previous) => previous,
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

export function useOwnShops(enabled = true) {
  return useQuery({
    queryKey: keys.ownShops,
    queryFn: async () => {
      const res = await api.get<OwnShop[]>('/trademaster/me/shops');
      return res.data;
    },
    enabled,
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

export function useWithdrawShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/shops/${id}/withdraw`);
    },
    // The products become unreachable while the shop is a draft, so their
    // list is stale too even though none of them changed.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ownShops });
      void qc.invalidateQueries({ queryKey: keys.ownProducts });
    },
  });
}

export function useCloseShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/shops/${id}/close`);
    },
    // The products keep their own state, but what the public can see of them
    // changed, and so did the shop, so both lists are stale.
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

/** One of the caller's own shops, whole, for the edit form. */
export function useOwnShop(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.ownShops, 'detail', id],
    queryFn: async () => {
      const res = await api.get<OwnShopDetail>(`/trademaster/me/shops/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
    // Always fresh: this fills a form somebody is about to save, and an old
    // copy would quietly write back values they changed elsewhere.
    staleTime: 0,
  });
}

/**
 * After a seller changes a listing, the public pages showing it are stale too:
 * edits to a live listing are live, so the catalogue has to be refetched as
 * well as the seller's own list.
 */
function invalidateCatalogue(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: keys.ownProducts });
  void qc.invalidateQueries({ queryKey: keys.products });
  void qc.invalidateQueries({ queryKey: keys.shops });
  void qc.invalidateQueries({ queryKey: keys.map });
  void qc.invalidateQueries({ queryKey: keys.categories });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/trademaster/me/products/${id}`);
    },
    onSuccess: () => invalidateCatalogue(qc),
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
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Partial<ProductPayload> }) => {
      const res = await api.patch<OwnProduct>(`/trademaster/me/products/${input.id}`, input.payload);
      return res.data;
    },
    onSuccess: () => invalidateCatalogue(qc),
  });
}

/**
 * Publish a listing.
 *
 * Returns where it went: APPROVED when it went straight onto the site, or
 * PENDING_REVIEW when the desk had asked for changes and wants to see them —
 * so the screen can say which, rather than one message for two outcomes.
 */
export function useSubmitProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ moderationStatus: ModerationStatus }>(
        `/trademaster/me/products/${id}/submit`
      );
      return res.data;
    },
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useReopenShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/shops/${id}/reopen`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ownShops });
      void qc.invalidateQueries({ queryKey: keys.ownProducts });
    },
  });
}

export function useWithdrawProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/products/${id}/withdraw`);
    },
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useCloseProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/products/${id}/close`);
    },
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useReopenProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/trademaster/me/products/${id}/reopen`);
    },
    onSuccess: () => invalidateCatalogue(qc),
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
    onSuccess: () => invalidateCatalogue(qc),
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
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useRemoveProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      await api.delete(`/trademaster/me/products/images/${imageId}`);
    },
    onSuccess: () => invalidateCatalogue(qc),
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
    onSuccess: () => invalidateCatalogue(qc),
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
    onSuccess: () => invalidateCatalogue(qc),
  });
}

export function useRemoveVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/trademaster/me/products/variants/${id}`);
    },
    onSuccess: () => invalidateCatalogue(qc),
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

// ---------------------------------------------------------------------------
// Categories — the desk
//
// Every write invalidates the public category list as well as the desk's own.
// The two are different queries over the same rows, and a rename that shows on
// one screen and not the other is the kind of thing somebody reports as "the
// save did not work".
// ---------------------------------------------------------------------------

export function useCategoryDesk() {
  return useQuery({
    queryKey: keys.categoryDesk,
    queryFn: async () => {
      const res = await api.get<AdminProductCategory[]>('/trademaster/admin/categories');
      return res.data;
    },
  });
}

function useCategoryWrite<TArgs>(write: (args: TArgs) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categoryDesk });
      void qc.invalidateQueries({ queryKey: keys.categories });
    },
  });
}

export function useCreateCategory() {
  return useCategoryWrite(async (payload: CategoryPayload) => {
    await api.post('/trademaster/admin/categories', payload);
  });
}

export function useUpdateCategory() {
  return useCategoryWrite(async (input: { id: string; payload: Partial<CategoryPayload> }) => {
    await api.patch(`/trademaster/admin/categories/${input.id}`, input.payload);
  });
}

export function useDeleteCategory() {
  return useCategoryWrite(async (id: string) => {
    await api.delete(`/trademaster/admin/categories/${id}`);
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const orderKeys = {
  mine: ['trademaster', 'me', 'orders'] as const,
  shop: ['trademaster', 'me', 'shop-orders'] as const,
};

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lines: BasketLine[]; delivery: DeliveryInput }) => {
      const res = await api.post<CheckoutResult[]>('/trademaster/checkout', {
        lines: input.lines,
        ...input.delivery,
      });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.mine });
      // Stock was taken at checkout, so every board showing it is now stale.
      void qc.invalidateQueries({ queryKey: keys.products });
    },
  });
}

export function useMyOrders(query: OrderListQuery) {
  return useQuery({
    queryKey: [...orderKeys.mine, query],
    queryFn: async () => {
      const res = await api.get<Paged<Order>>('/trademaster/me/orders', { params: query });
      return res.data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...orderKeys.mine, 'detail', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/trademaster/me/orders/${id!}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useShopOrders(shopId: string | undefined, query: OrderListQuery) {
  return useQuery({
    queryKey: [...orderKeys.shop, shopId, query],
    queryFn: async () => {
      const res = await api.get<Paged<Order>>(`/trademaster/me/shops/${shopId!}/orders`, {
        params: query,
      });
      return res.data;
    },
    enabled: Boolean(shopId),
  });
}

export function useStartPayment() {
  return useMutation({
    mutationFn: async (input: { orderId: string; returnPath?: string }) => {
      const res = await api.post<{ redirectUrl: string | null; reference: string }>(
        `/trademaster/me/orders/${input.orderId}/pay`,
        { returnPath: input.returnPath }
      );
      return res.data;
    },
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      const res = await api.post<{ status: PaymentStatus; orderId: string }>(
        '/trademaster/me/payments/confirm',
        { reference }
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.mine }),
  });
}

export function useMoveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      to: OrderMove;
      note?: string;
      shipping?: string;
      trackingCarrier?: string;
      trackingCode?: string;
    }) => {
      const { id, ...body } = input;
      const res = await api.post<Order>(`/trademaster/me/orders/${id}/move`, body);
      return res.data;
    },
    onSuccess: () => {
      // Both sides of the same order; whichever list the caller is looking at.
      void qc.invalidateQueries({ queryKey: orderKeys.mine });
      void qc.invalidateQueries({ queryKey: orderKeys.shop });
    },
  });
}
