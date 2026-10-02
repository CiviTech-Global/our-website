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

/** A thing for sale, or a piece of work offered. Services have no stock. */
export type ListingKind = 'PRODUCT' | 'SERVICE';

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

/**
 * A shop as the form sends it.
 *
 * On an edit, null removes a value and an absent key leaves it alone; the form
 * sends every field so an emptied one is actually removed.
 */
export interface ShopPayload {
  name: string;
  summary: string;
  description?: string | null;
  industry?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
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
  /** What it offers publicly: products, services, or both. */
  kinds: ListingKind[];
  ownerProfile: OwnerProfile | null;
  /// Present on every shop that has one; a shop that only ships has none.
  latitude?: number | null;
  longitude?: number | null;
  /// Only on a proximity search, rounded to 100 m.
  distanceKm?: number;
}

export interface PublicShopDetail extends PublicShopSummary {
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

/** One of the owner's own shops, whole, for the edit form. */
export interface OwnShopDetail {
  id: string;
  code: string;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  industry: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  moderationStatus: ModerationStatus;
  state: ListingState;
  reviewNote: string | null;
  logoUrl: string | null;
}

/** A page of shops near a point: how wide the circle was, and how far the nearest is when it held none. */
export interface NearbyPage<T> extends Paged<T> {
  radiusKm?: number;
  nearestKm?: number | null;
}

/** Every matching shop with a location, for the map. */
export interface ShopMapResult {
  items: PublicShopSummary[];
  total: number;
  /** True when more matched than the map draws. */
  truncated: boolean;
  radiusKm: number | null;
  nearestKm: number | null;
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
  kind: ListingKind;
  title: string;
  summary: string;
  /** null removes it on an edit. */
  description?: string | null;
  /** null files it under no category. */
  categoryId?: string | null;
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
  sku?: string | null;
  /**
   * Absent leaves an existing override alone; null removes it, so the option
   * costs whatever the product costs. The edit form sends null rather than
   * omitting the field, because a seller who empties the price box means
   * "no special price", not "forget I said anything".
   */
  price?: string | null;
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
  kind: ListingKind;
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
  /** Whether a buyer can have it today — always, for a service. Decided by the server. */
  available: boolean;
  category: { id: string; name: string } | null;
  /** Kilometres to the shop, on a search near a point. */
  distanceKm?: number;
  business: { slug: string; name: string; province: string | null; city: string | null };
}

export interface PublicProductDetail {
  id: string;
  code: string;
  slug: string;
  kind: ListingKind;
  available: boolean;
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
  kind: ListingKind;
  title: string;
  summary: string;
  description: string | null;
  categoryId: string | null;
  negotiable: boolean;
  available: boolean;
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
  kind?: ListingKind;
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

/** The values the public boards' filters may offer, as really used by shops. */
export interface ShopFacets {
  provinces: string[];
  industries: string[];
}

export interface ProductCategoryNode {
  id: string;
  slug: string;
  name: string;
  kind: ListingKind;
  parentId: string | null;
  /** Including its children, for a parent. */
  productCount: number;
}

/**
 * A category as the desk sees it, which is more than the public does.
 *
 * `productCount` here counts every product including drafts, unlike the public
 * node above — the desk is deciding whether deactivating this hides work in
 * progress, and a count of only the published ones would understate that.
 */
export interface AdminProductCategory {
  id: string;
  slug: string;
  name: string;
  kind: ListingKind;
  parentId: string | null;
  position: number;
  active: boolean;
  createdAt: string;
  productCount: number;
  childCount: number;
}

export interface CategoryPayload {
  name: string;
  /** Top-level only; a child takes its parent's. */
  kind?: ListingKind;
  slug?: string;
  parentId?: string | null;
  position?: number;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Queries and decisions
// ---------------------------------------------------------------------------

export type ShopSort = 'newest' | 'name' | 'nearest';
export type ProductSort = 'newest' | 'priceAsc' | 'priceDesc' | 'nearest';

export interface ShopBoardQuery extends Record<string, string | number | boolean | null | undefined> {
  search?: string;
  province?: string;
  industry?: string;
  kind?: ListingKind;
  categoryId?: string;
  sort?: ShopSort;
  latitude?: number;
  longitude?: number;
  /** Kilometres. */
  radiusKm?: number;
  page: number;
  pageSize: number;
}

/** The map takes the board's filters, without paging or a sort. */
export type ShopMapQuery = Omit<ShopBoardQuery, 'page' | 'pageSize' | 'sort'>;

export interface ProductBoardQuery extends Record<string, string | number | boolean | null | undefined> {
  search?: string;
  kind?: ListingKind;
  categoryId?: string;
  shopSlug?: string;
  province?: string;
  priceMin?: string;
  priceMax?: string;
  inStock?: boolean;
  sort?: ProductSort;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
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
