import type { Paged } from './marketplace';

/**
 * The TradeMaster module, on the wire.
 *
 * Money arrives as a decimal string, not a number: an Iranian amount in toman
 * outgrows what JSON carries without silently losing its low digits, so the
 * server serialises BigInt as a string and the UI formats it without ever
 * turning it into one.
 */

export type { Paged };

export type ModerationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type ListingState = 'OPEN' | 'AWARDED' | 'CLOSED' | 'EXPIRED';

export interface OwnerProfile {
  id: string;
  displayName: string | null;
  username: string | null;
  headline: string | null;
  verified?: boolean;
}

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

export interface ShopPayload {
  name: string;
  summary: string;
  description?: string;
  industry?: string;
  province?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
}

export interface PublicShopSummary {
  id: string;
  code: string;
  slug: string;
  name: string;
  summary: string;
  industry: string | null;
  province: string | null;
  city: string | null;
  featured: boolean;
  publishedAt: string | null;
  logoUrl: string | null;
  productCount: number;
  ownerProfile: OwnerProfile | null;
}

export interface PublicShopDetail extends Omit<PublicShopSummary, 'productCount'> {
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  createdAt: string;
}

export interface OwnShop {
  id: string;
  code: string;
  slug: string;
  name: string;
  summary: string;
  industry: string | null;
  province: string | null;
  city: string | null;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  logoUrl: string | null;
  productCount: number;
}

export interface ShopQueueRow {
  id: string;
  code: string;
  name: string;
  summary: string;
  industry: string | null;
  province: string | null;
  city: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  logoUrl: string | null;
  owner: { id: string; email: string; firstName: string | null; lastName: string | null };
}

export interface ShopReviewDetail extends Omit<ShopQueueRow, 'owner'> {
  slug: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  state: ListingState;
  reviewNote: string | null;
  internalNote: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  productCount: number;
  owner: { id: string; email: string; firstName: string | null; lastName: string | null };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductPayload {
  title: string;
  summary: string;
  description?: string;
  categoryId?: string;
  /** Digit string. See the note at the top of this file. */
  price: string;
  stock?: number;
  negotiable?: boolean;
}

export interface ProductVariant {
  id: string;
  label: string;
  sku: string | null;
  /** Null means "same as the product", which is the common case. */
  price: string | null;
  stock: number;
  position?: number;
}

export interface VariantPayload {
  label: string;
  sku?: string;
  price?: string;
  stock?: number;
}

export interface ProductImage {
  id: string;
  caption: string | null;
  position?: number;
  url: string;
}

export interface PublicProductSummary {
  id: string;
  code: string;
  slug: string;
  title: string;
  summary: string;
  price: string;
  currency: string;
  stock: number;
  negotiable: boolean;
  featured: boolean;
  publishedAt: string | null;
  coverUrl: string | null;
  variantCount: number;
  business: { slug: string; name: string; province: string | null; city: string | null };
}

export interface PublicProductDetail {
  id: string;
  code: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  price: string;
  currency: string;
  stock: number;
  negotiable: boolean;
  views: number;
  publishedAt: string | null;
  category: { id: string; slug: string; name: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  shop: {
    id: string;
    slug: string;
    name: string;
    summary: string;
    province: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
}

export interface OwnProduct {
  id: string;
  code: string;
  slug: string;
  title: string;
  summary: string;
  price: string;
  currency: string;
  stock: number;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  featured: boolean;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  coverUrl: string | null;
  /** The whole set: this is where the seller manages them. */
  images: ProductImage[];
  variants: ProductVariant[];
  imageCount: number;
  variantCount: number;
}

export interface ProductQueueRow {
  id: string;
  code: string;
  title: string;
  summary: string;
  price: string;
  currency: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  coverUrl: string | null;
  /** For the staff image endpoint, which takes an id rather than a URL. */
  coverImageId: string | null;
  business: { id: string; name: string; slug: string };
}

export interface ProductReviewDetail {
  id: string;
  code: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  price: string;
  currency: string;
  stock: number;
  negotiable: boolean;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  internalNote: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  business: {
    id: string;
    name: string;
    slug: string;
    moderationStatus: ModerationStatus;
    owner: { id: string; email: string; firstName: string | null; lastName: string | null };
  };
}

export interface ProductCategoryNode {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  productCount: number;
}

// ---------------------------------------------------------------------------
// Queries and decisions
// ---------------------------------------------------------------------------

export type ShopSort = 'newest' | 'name';
export type ProductSort = 'newest' | 'priceAsc' | 'priceDesc';

export interface ShopBoardQuery extends Record<string, string | number | boolean | null | undefined> {
  search?: string;
  province?: string;
  industry?: string;
  sort?: ShopSort;
  page: number;
  pageSize: number;
}

export interface ProductBoardQuery extends Record<string, string | number | boolean | null | undefined> {
  search?: string;
  categoryId?: string;
  shopSlug?: string;
  province?: string;
  priceMin?: string;
  priceMax?: string;
  inStock?: boolean;
  sort?: ProductSort;
  page: number;
  pageSize: number;
}

export interface ReviewQueueQuery extends Record<string, string | number | boolean | null | undefined> {
  status?: ModerationStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ReviewDecisionPayload {
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  reviewNote?: string;
  internalNote?: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

/** Which moves a client may ask for. PAID is absent: only the gateway causes it. */
export type OrderMove =
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

/** A basket line as it travels. No price: the server reads that from the database. */
export interface BasketLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

/**
 * A basket line as the browser holds it.
 *
 * Carries enough to draw the cart without a round trip per item — and a price
 * that is display-only. The order's real prices come from the server at
 * checkout, so a stale cart shows an old figure and then charges the right one.
 */
export interface CartLine extends BasketLine {
  title: string;
  variantLabel?: string;
  unitPrice: string;
  currency: string;
  coverUrl: string | null;
  shopSlug: string;
  shopName: string;
}

export interface DeliveryInput {
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  address: string;
  postalCode?: string;
  buyerNote?: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  titleAtPurchase: string;
  variantAtPurchase: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderPayment {
  id: string;
  driver: string;
  status: PaymentStatus;
  amount: string;
  failureReason: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  subtotal: string;
  shipping: string;
  total: string;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string | null;
  buyerNote: string | null;
  cancelReason: string | null;
  trackingCarrier: string | null;
  trackingCode: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: OrderItem[];
  business?: { id?: string; slug: string; name: string; phone?: string | null; email?: string | null };
  buyer?: { id: string; firstName: string | null; lastName: string | null; email: string };
  payments?: OrderPayment[];
}

export interface OrderListQuery extends Record<string, string | number | boolean | null | undefined> {
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

export interface CheckoutResult {
  id: string;
  code: string;
  total: string;
  shopName: string;
}
