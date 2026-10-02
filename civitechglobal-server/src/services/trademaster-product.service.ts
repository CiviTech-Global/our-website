import type { ListingKind, ModerationStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { isValidPoint, type Point } from '../utils/geo.js';
import { generateTrackingCode } from './insurance-request.service.js';
import { PUBLIC_LISTING_WHERE, assertReviewable, reviewPatch, type ReviewDecision } from './moderation.js';
import { notifySafely } from './notifications.service.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import {
  MAX_RADIUS_CANDIDATES,
  MAX_RADIUS_KM,
  PUBLIC_PRODUCT_WHERE,
  categoryScope,
  isUniqueViolation,
  nearestShopKm,
  roundKm,
  shopsWithinRadius,
  slugify,
} from './trademaster-common.js';
import { logoUrl } from './trademaster-shop.service.js';

/**
 * Products and services, in the TradeMaster module.
 *
 * One model for both, told apart by `kind`: a coat and a haircut are listed,
 * priced, pictured and filed the same way, and differ in one fact — a service
 * has no stock to run out of. Two models would duplicate every query here for
 * the sake of that one column.
 *
 * A listing hangs off a shop and is only ever reachable through one, which is
 * the fact most of this file turns on: it is visible when it is approved and
 * open AND its shop is, so the public queries filter on both.
 *
 * WHO DECIDES WHAT IS PUBLISHED. The shop goes through the review desk; what a
 * reviewed shop lists does not. Once an owner is verified and their shop is
 * approved and open, they publish, edit and delete their own listings directly,
 * and edits to a live listing stay live. Making a seller wait for a reviewer to
 * change a stock count or correct a price is how a catalogue ends up showing
 * goods that sold out last week. The desk keeps the last word: it can still
 * ask for changes on a live listing or refuse it, and a listing it has sent
 * back goes through the desk again rather than straight back on sale.
 *
 * Nothing here sells anything. Stock is a number the seller maintains and a
 * buyer reads. The order service holds stock at checkout behind its own
 * feature flag, which is off: the module is a catalogue for now.
 */

/** Pictures per listing. Twelve, as for showcase projects. */
const MAX_IMAGES = 12;

/** Variants per listing. A seller with more than this wants a catalogue, not a listing. */
const MAX_VARIANTS = 40;

/** The highest price anyone may type. Past this it is a typo, not a price. */
const MAX_PRICE = 100_000_000_000n;

/** The radius used when a location arrives without one. */
const DEFAULT_RADIUS_KM = 10;

/**
 * Where a seller may still change a listing.
 *
 * DRAFT and CHANGES_REQUESTED as everywhere else on the site, and APPROVED too:
 * see the note at the top of this file. Not PENDING_REVIEW, which is a reviewer
 * looking at it right now, and not REJECTED, which the desk has closed — the
 * seller may still delete one.
 */
const SELLER_EDITABLE: ModerationStatus[] = ['DRAFT', 'CHANGES_REQUESTED', 'APPROVED'];

function assertSellerEditable(status: ModerationStatus): void {
  if (SELLER_EDITABLE.includes(status)) return;
  throw new AppError(
    status === 'REJECTED'
      ? 'این مورد از سوی بررسی‌کننده رد شده است و قابل ویرایش نیست.'
      : 'این مورد در حال بررسی است. برای ویرایش، ابتدا آن را از صف بررسی بازگردانید.',
    409
  );
}

export interface ProductInput {
  kind: ListingKind;
  title: string;
  summary: string;
  /** Absent leaves it alone on an edit; null clears it. */
  description?: string | null;
  /** Absent leaves it alone on an edit; null files it under no category. */
  categoryId?: string | null;
  price: bigint;
  stock?: number;
  negotiable?: boolean;
}

export interface ProductQuery {
  search?: string;
  kind?: ListingKind;
  categoryId?: string;
  shopSlug?: string;
  province?: string;
  priceMin?: bigint;
  priceMax?: bigint;
  inStock?: boolean;
  sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'nearest';
  /** Listings from shops within radiusKm of this point. Both or neither. */
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page: number;
  pageSize: number;
}

/** Blank and whitespace-only become null; see the note on `text` in the shop service. */
function text(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = value.trim();
  return next ? next : null;
}

/**
 * Rejects a price nobody could mean, before it reaches the column.
 *
 * Zero is refused along with negatives. A listing at zero toman reads as free,
 * which is never what a seller meant — they meant "ask me", and that is what
 * the negotiable flag is for.
 */
function assertSanePrice(price: bigint | null | undefined): void {
  // undefined is "not sent"; null is "no override" on a variant.
  if (price === undefined || price === null) return;
  if (price <= 0n) throw new AppError('قیمت باید بیشتر از صفر باشد.', 400);
  if (price > MAX_PRICE) throw new AppError('قیمت واردشده معتبر نیست.', 400);
}

/**
 * Whether a buyer can have it today.
 *
 * A service always can. A product with options can if any option has stock —
 * its own stock is ignored while options exist, because each option carries its
 * own. A product without options can if it has stock.
 */
export function isAvailable(kind: ListingKind, stock: number, variants: Array<{ stock: number }>): boolean {
  if (kind === 'SERVICE') return true;
  if (variants.length > 0) return variants.some((variant) => variant.stock > 0);
  return stock > 0;
}

/** The same rule as isAvailable, as a where clause. */
const AVAILABLE_WHERE: Prisma.ProductWhereInput = {
  OR: [
    { kind: 'SERVICE' },
    { variants: { none: {} }, stock: { gt: 0 } },
    { variants: { some: { stock: { gt: 0 } } } },
  ],
};

export function imageUrl(id: string): string {
  // Relative to the API root. See the note on logoUrl in the shop service.
  return `/trademaster/products/images/${id}`;
}

/**
 * The shop this listing belongs to, if the caller owns it.
 *
 * Ownership of a listing is ownership of its shop — there is no separate grant
 * — so checking the shop once is both simpler and harder to forget than
 * checking the listing and then its shop.
 */
async function ownedShop(userId: string, shopId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: { id: true, moderationStatus: true, state: true },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);
  return shop;
}

async function ownedProduct(userId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, business: { ownerId: userId } },
    select: {
      id: true,
      code: true,
      kind: true,
      categoryId: true,
      businessId: true,
      moderationStatus: true,
      state: true,
      publishedAt: true,
      reviewNote: true,
      business: { select: { moderationStatus: true, state: true } },
      _count: { select: { images: true, variants: true } },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);
  return product;
}

/**
 * A category a listing of this kind may be filed under.
 *
 * Active, and of the same kind: "Barbershop" is a services category, and a
 * coat filed under it would appear under the wrong tab of the catalogue and
 * nowhere a buyer would look for it.
 */
async function assertCategoryFits(categoryId: string, kind: ListingKind): Promise<void> {
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, active: true },
    select: { kind: true },
  });
  if (!category) throw new AppError('دسته‌بندی انتخاب‌شده معتبر نیست.', 400);
  if (category.kind !== kind) {
    throw new AppError(
      kind === 'SERVICE'
        ? 'این دسته‌بندی برای کالاست؛ برای خدمت، یک دستهٔ خدمات انتخاب کنید.'
        : 'این دسته‌بندی برای خدمات است؛ برای کالا، یک دستهٔ کالا انتخاب کنید.',
      400
    );
  }
}

/**
 * Unique within the shop, not globally.
 *
 * Two different shops may both sell a "blue-ceramic-mug" and neither should
 * have to invent a worse name for it.
 */
async function uniqueProductSlug(shopId: string, title: string, fallback: string): Promise<string> {
  const base = slugify(title) || fallback.toLowerCase();

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.product.findFirst({
      where: { businessId: shopId, slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `${base}-${fallback.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// The seller's side
// ---------------------------------------------------------------------------

export async function createProduct(userId: string, shopId: string, input: ProductInput) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);
  const shop = await ownedShop(userId, shopId);
  assertSanePrice(input.price);

  // A listing cannot be added to a shop that has not been through review.
  // Allowing it would let somebody build a whole catalogue behind a shop that
  // is later refused, and have it appear the moment the shop slips through.
  if (shop.moderationStatus !== 'APPROVED') {
    throw new AppError('ابتدا باید فروشگاه تأیید شود.', 409);
  }
  if (shop.state !== 'OPEN') {
    throw new AppError('این فروشگاه بسته است.', 409);
  }

  const categoryId = text(input.categoryId) ?? null;
  if (categoryId) await assertCategoryFits(categoryId, input.kind);

  for (let attempt = 0; ; attempt += 1) {
    const code = generateTrackingCode();
    try {
      return await prisma.product.create({
        data: {
          kind: input.kind,
          title: input.title.trim(),
          summary: input.summary.trim(),
          description: text(input.description) ?? null,
          categoryId,
          price: input.price,
          // A service has no stock; storing whatever the form sent would leave
          // a number nobody maintains, waiting to be read by something.
          stock: input.kind === 'SERVICE' ? 0 : (input.stock ?? 0),
          negotiable: input.negotiable ?? false,
          code,
          slug: await uniqueProductSlug(shopId, input.title, code),
          businessId: shopId,
          moderationStatus: 'DRAFT',
        },
        select: { id: true, code: true, slug: true, moderationStatus: true },
      });
    } catch (error) {
      // Two listings with the same title saved in the same instant can both
      // pick the same free slug; the loser takes the next one.
      if (attempt < 2 && isUniqueViolation(error)) continue;
      throw error;
    }
  }
}

export async function updateProduct(userId: string, productId: string, input: Partial<ProductInput>) {
  await assertMarketplaceAllowed(userId);
  const product = await ownedProduct(userId, productId);
  assertSellerEditable(product.moderationStatus);
  assertSanePrice(input.price);

  const kind = input.kind ?? product.kind;
  const categoryId =
    input.categoryId !== undefined ? (text(input.categoryId) ?? null) : product.categoryId;

  // Checked whenever either half of the pair moved: a new category must fit
  // the kind, and a kind change must still fit the category already chosen.
  if (categoryId && (input.categoryId !== undefined || input.kind !== undefined)) {
    await assertCategoryFits(categoryId, kind);
  }

  const becameService = input.kind === 'SERVICE' && product.kind !== 'SERVICE';

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
      ...(input.description !== undefined ? { description: text(input.description) } : {}),
      ...(input.categoryId !== undefined ? { categoryId } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.negotiable !== undefined ? { negotiable: input.negotiable } : {}),
      // Ignored for a service, and zeroed when something becomes one, so a
      // stale count cannot resurface if it is ever turned back into a product.
      ...(kind === 'SERVICE'
        ? becameService
          ? { stock: 0 }
          : {}
        : input.stock !== undefined
          ? { stock: input.stock }
          : {}),
    },
    select: { id: true, code: true, slug: true, moderationStatus: true },
  });

  if (becameService) {
    await prisma.productVariant.updateMany({ where: { productId: product.id }, data: { stock: 0 } });
  }

  return updated;
}

/**
 * Put a listing in the catalogue.
 *
 * Straight onto the site for a verified owner of an approved, open shop — see
 * the note at the top of this file. The exception is a listing the desk sent
 * back: that goes to the desk again, because the reviewer asked to see the
 * correction, and publishing it directly would make "changes requested" a
 * suggestion.
 */
export async function submitProduct(userId: string, productId: string) {
  const product = await ownedProduct(userId, productId);

  if (product.moderationStatus !== 'DRAFT' && product.moderationStatus !== 'CHANGES_REQUESTED') {
    throw new AppError('این مورد پیش‌تر منتشر یا ارسال شده است.', 409);
  }

  // A listing with no picture is a line of text asking a stranger to imagine
  // the thing. Enforced here rather than at creation, so a draft can be started
  // on a phone and finished at a desk.
  if (product._count.images === 0) {
    throw new AppError('برای انتشار، دست‌کم یک تصویر لازم است.', 400);
  }

  if (product.business.moderationStatus !== 'APPROVED' || product.business.state !== 'OPEN') {
    throw new AppError('فروشگاه این کالا فعال نیست.', 409);
  }

  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);

  if (product.moderationStatus === 'CHANGES_REQUESTED') {
    return prisma.product.update({
      where: { id: product.id },
      // The reviewer's note stays until they approve: it is what they asked
      // for, and withdrawProduct reads it to know this came back from the desk.
      data: { moderationStatus: 'PENDING_REVIEW' },
      select: { id: true, code: true, moderationStatus: true },
    });
  }

  return prisma.product.update({
    where: { id: product.id },
    data: {
      moderationStatus: 'APPROVED',
      reviewNote: null,
      // The first publication only. Republishing after a withdrawal must not
      // move it to the top of a list ordered by publication date.
      ...(product.publishedAt ? {} : { publishedAt: new Date() }),
    },
    select: { id: true, code: true, moderationStatus: true },
  });
}

/**
 * Take a listing off the site, or back out of the queue.
 *
 * A live listing returns to a draft, which the owner can publish again. One
 * waiting for the desk because the desk asked for changes goes back to
 * CHANGES_REQUESTED, note and all, rather than to a draft: from a draft the
 * owner can publish directly, so withdrawing a resubmission would otherwise be
 * a way round the reviewer.
 */
export async function withdrawProduct(userId: string, productId: string) {
  const product = await ownedProduct(userId, productId);

  if (product.moderationStatus !== 'APPROVED' && product.moderationStatus !== 'PENDING_REVIEW') {
    throw new AppError('این مورد قابل بازگردانی به پیش‌نویس نیست.', 409);
  }

  const sentBackByDesk = product.moderationStatus === 'PENDING_REVIEW' && Boolean(product.reviewNote);

  return prisma.product.update({
    where: { id: product.id },
    // Back to a draft, the note goes with it: it was about the version being
    // replaced, and leaving it would have the seller answering old feedback.
    data: sentBackByDesk
      ? { moderationStatus: 'CHANGES_REQUESTED' }
      : { moderationStatus: 'DRAFT', reviewNote: null },
    select: { id: true, code: true, moderationStatus: true },
  });
}

export async function closeProduct(userId: string, productId: string) {
  const product = await ownedProduct(userId, productId);

  return prisma.product.update({
    where: { id: product.id },
    data: { state: 'CLOSED' },
    select: { id: true, code: true, state: true },
  });
}

/**
 * And puts it back on display.
 *
 * Refused unless it is actually closed, so that a stray second click cannot
 * quietly turn EXPIRED into OPEN. This touches the state and not the moderation
 * status, so it can only restore what was already published.
 */
export async function reopenProduct(userId: string, productId: string) {
  const product = await ownedProduct(userId, productId);

  if (product.state !== 'CLOSED') {
    throw new AppError('این کالا بسته نیست.', 409);
  }

  return prisma.product.update({
    where: { id: product.id },
    data: { state: 'OPEN' },
    select: { id: true, code: true, state: true },
  });
}

/**
 * Remove a listing for good.
 *
 * Allowed in any state, including one the desk refused: the owner may always
 * take their own thing down. The pictures go from storage after the row, so a
 * delete that fails leaves the files a row still points at.
 */
export async function deleteProduct(userId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, business: { ownerId: userId } },
    select: { id: true, images: { select: { storedName: true } } },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);

  await prisma.product.delete({ where: { id: product.id } });
  for (const image of product.images) await removeFile(image.storedName);

  return { removed: true };
}

export async function listShopProducts(userId: string, shopId: string) {
  await ownedShop(userId, shopId);

  const rows = await prisma.product.findMany({
    where: { businessId: shopId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      slug: true,
      kind: true,
      title: true,
      summary: true,
      // Everything the edit form shows. It used to be filled from a row that
      // lacked these, so editing a product opened with an empty description
      // and no category — and switched "negotiable" off on every save.
      description: true,
      categoryId: true,
      negotiable: true,
      price: true,
      currency: true,
      stock: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      featured: true,
      views: true,
      publishedAt: true,
      createdAt: true,
      /**
       * The whole set, not just a cover.
       *
       * The seller's own list is where pictures and options are managed, and a
       * screen that can add but not remove them is half a feature. Bounded by
       * MAX_IMAGES and MAX_VARIANTS, and this is one seller's own shop rather
       * than a public board, so the extra rows are cheap.
       */
      images: { orderBy: { position: 'asc' }, select: { id: true, caption: true, position: true } },
      variants: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, sku: true, price: true, stock: true, position: true },
      },
    },
  });

  return rows.map(({ images, ...row }) => ({
    ...row,
    coverUrl: images[0] ? imageUrl(images[0].id) : null,
    images: images.map((image) => ({ ...image, url: imageUrl(image.id) })),
    imageCount: images.length,
    variantCount: row.variants.length,
    available: isAvailable(row.kind, row.stock, row.variants),
  }));
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export async function addImages(
  userId: string,
  productId: string,
  files: IncomingFile[],
  captions: Array<string | null> = []
) {
  await assertMarketplaceAllowed(userId);
  const product = await ownedProduct(userId, productId);
  assertSellerEditable(product.moderationStatus);

  if (files.length === 0) throw new AppError('تصویری انتخاب نشده است.', 400);
  if (product._count.images + files.length > MAX_IMAGES) {
    throw new AppError(`حداکثر ${MAX_IMAGES} تصویر برای هر کالا می‌توانید اضافه کنید.`, 400);
  }

  const stored = await storeFiles(files, IMAGE_EXTENSIONS);
  const last = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  try {
    await prisma.productImage.createMany({
      data: stored.map((file, index) => ({
        productId,
        storedName: file.storedName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        caption: captions[index]?.trim() || null,
        position: (last?.position ?? 0) + index + 1,
      })),
    });
  } catch (error) {
    // Nothing references the files yet; an orphan in storage is invisible and
    // never collected.
    for (const file of stored) await removeFile(file.storedName);
    throw error;
  }

  return { added: stored.length };
}

export async function removeImage(userId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, product: { business: { ownerId: userId } } },
    select: {
      id: true,
      storedName: true,
      product: { select: { moderationStatus: true, _count: { select: { images: true } } } },
    },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  assertSellerEditable(image.product.moderationStatus);

  // Publishing needs a picture, so a published listing must keep one. Without
  // this a live listing could be emptied down to a grey square, which is the
  // state publishing exists to prevent.
  if (image.product.moderationStatus === 'APPROVED' && image.product._count.images <= 1) {
    throw new AppError('مورد منتشرشده باید دست‌کم یک تصویر داشته باشد. ابتدا تصویر دیگری اضافه کنید.', 409);
  }

  await prisma.productImage.delete({ where: { id: image.id } });
  // Only after the row is gone: a delete that fails must not leave a row
  // pointing at a file that no longer exists.
  await removeFile(image.storedName);

  return { removed: true };
}

export async function updateImageCaption(userId: string, imageId: string, caption?: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, product: { business: { ownerId: userId } } },
    select: { id: true, product: { select: { moderationStatus: true } } },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  assertSellerEditable(image.product.moderationStatus);

  return prisma.productImage.update({
    where: { id: image.id },
    data: { caption: caption?.trim() || null },
    select: { id: true, caption: true },
  });
}

/**
 * A picture on the owner's own listing, published or not.
 *
 * Same reason as getOwnLogo: the screen where a seller manages pictures is the
 * screen where the listing is still a draft, so the public route answers 404
 * for every one of them.
 */
export async function getOwnImage(userId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, product: { business: { ownerId: userId } } },
    select: { storedName: true, originalName: true, mimeType: true },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  return image;
}

/**
 * The image bytes.
 *
 * Visible when the listing and its shop are both public. `includeUnpublished`
 * is for the review desk, which has to see a picture before it is approved.
 */
export async function getImage(imageId: string, includeUnpublished = false) {
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      ...(includeUnpublished ? {} : { product: PUBLIC_PRODUCT_WHERE }),
    },
    select: { storedName: true, originalName: true, mimeType: true },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  return image;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export interface VariantInput {
  label: string;
  sku?: string | null;
  /** Absent leaves it alone on an edit; null clears the override. */
  price?: bigint | null;
  stock?: number;
}

export async function addVariant(userId: string, productId: string, input: VariantInput) {
  await assertMarketplaceAllowed(userId);
  const product = await ownedProduct(userId, productId);
  assertSellerEditable(product.moderationStatus);
  assertSanePrice(input.price);

  if (product._count.variants >= MAX_VARIANTS) {
    throw new AppError(`حداکثر ${MAX_VARIANTS} تنوع برای هر کالا می‌توانید تعریف کنید.`, 400);
  }

  const last = await prisma.productVariant.findFirst({
    where: { productId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  try {
    return await prisma.productVariant.create({
      data: {
        productId,
        label: input.label.trim(),
        sku: text(input.sku) ?? null,
        price: input.price ?? null,
        // An option of a service has no stock any more than the service does.
        stock: product.kind === 'SERVICE' ? 0 : (input.stock ?? 0),
        position: (last?.position ?? 0) + 1,
      },
      select: { id: true, label: true, sku: true, price: true, stock: true, position: true },
    });
  } catch (error) {
    // The unique constraint on (productId, label) is the one that fires here,
    // and "Large already exists" is a better answer than a 500.
    if (isUniqueViolation(error)) {
      throw new AppError('تنوعی با این عنوان از قبل وجود دارد.', 409);
    }
    throw error;
  }
}

export async function updateVariant(userId: string, variantId: string, input: Partial<VariantInput>) {
  await assertMarketplaceAllowed(userId);
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { business: { ownerId: userId } } },
    select: { id: true, product: { select: { moderationStatus: true, kind: true } } },
  });
  if (!variant) throw new AppError('این تنوع پیدا نشد.', 404);
  assertSellerEditable(variant.product.moderationStatus);
  assertSanePrice(input.price);

  try {
    return await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.sku !== undefined ? { sku: text(input.sku) ?? null } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.stock !== undefined && variant.product.kind !== 'SERVICE'
          ? { stock: input.stock }
          : {}),
      },
      select: { id: true, label: true, sku: true, price: true, stock: true, position: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('تنوعی با این عنوان از قبل وجود دارد.', 409);
    }
    throw error;
  }
}

export async function removeVariant(userId: string, variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { business: { ownerId: userId } } },
    select: { id: true, product: { select: { moderationStatus: true } } },
  });
  if (!variant) throw new AppError('این تنوع پیدا نشد.', 404);
  assertSellerEditable(variant.product.moderationStatus);

  await prisma.productVariant.delete({ where: { id: variant.id } });
  return { removed: true };
}

// ---------------------------------------------------------------------------
// The public side
// ---------------------------------------------------------------------------

function productSort(query: ProductQuery): Prisma.ProductOrderByWithRelationInput[] {
  const featuredFirst = { featured: 'desc' } as const;
  if (query.sort === 'priceAsc') return [featuredFirst, { price: 'asc' }, { id: 'asc' }];
  if (query.sort === 'priceDesc') return [featuredFirst, { price: 'desc' }, { id: 'asc' }];
  return [featuredFirst, { publishedAt: 'desc' }, { id: 'asc' }];
}

const PUBLIC_LIST_SELECT = {
  id: true,
  code: true,
  slug: true,
  kind: true,
  title: true,
  summary: true,
  price: true,
  currency: true,
  stock: true,
  negotiable: true,
  featured: true,
  publishedAt: true,
  businessId: true,
  images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
  variants: { select: { stock: true } },
  category: { select: { id: true, name: true } },
  business: { select: { slug: true, name: true, province: true, city: true } },
} satisfies Prisma.ProductSelect;

type PublicListRow = Prisma.ProductGetPayload<{ select: typeof PUBLIC_LIST_SELECT }>;

function presentListRow(row: PublicListRow, distances?: Map<string, number>) {
  const { images, variants, businessId, ...rest } = row;
  return {
    ...rest,
    coverUrl: images[0] ? imageUrl(images[0].id) : null,
    variantCount: variants.length,
    available: isAvailable(row.kind, row.stock, variants),
    ...(distances?.has(businessId) ? { distanceKm: roundKm(distances.get(businessId) as number) } : {}),
  };
}

export async function listPublicProducts(query: ProductQuery) {
  const search = query.search?.trim();

  // One `business` filter, built whole. Two spreads that both wrote a
  // `business` key used to collide, and the shop filter silently lost to the
  // province one whenever both were given.
  const businessFilter: Prisma.BusinessWhereInput = {
    ...(query.shopSlug ? { slug: query.shopSlug.trim().toLowerCase() } : {}),
    ...(query.province ? { province: query.province } : {}),
  };

  const filters: Prisma.ProductWhereInput[] = [
    PUBLIC_PRODUCT_WHERE,
    query.kind ? { kind: query.kind } : {},
    query.categoryId ? { categoryId: { in: await categoryScope(query.categoryId) } } : {},
    Object.keys(businessFilter).length > 0 ? { business: businessFilter } : {},
    query.priceMin !== undefined || query.priceMax !== undefined
      ? {
          price: {
            ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
            ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
          },
        }
      : {},
    query.inStock ? AVAILABLE_WHERE : {},
    search ? { title: { contains: search, mode: 'insensitive' } } : {},
  ];

  const centre = centreOf(query);
  if (!centre) {
    const where: Prisma.ProductWhereInput = { AND: filters };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: productSort(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: PUBLIC_LIST_SELECT,
      }),
      prisma.product.count({ where }),
    ]);

    return toPage(rows.map((row) => presentListRow(row)), total, query.page, query.pageSize);
  }

  // Near a point: listings from shops within the radius. The shops are ranked
  // first, because distance belongs to the shop rather than to the listing.
  const radiusKm = Math.min(query.radiusKm ?? DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
  const ranked = await shopsWithinRadius(
    { AND: [PUBLIC_LISTING_WHERE, businessFilter] },
    centre,
    radiusKm
  );
  const distances = new Map(ranked.map((row) => [row.id, row.distanceKm]));
  const where: Prisma.ProductWhereInput = {
    AND: [...filters, { businessId: { in: ranked.map((row) => row.id) } }],
  };

  // When nothing is in range, say how far the nearest match is rather than
  // leave an empty page that looks like a broken feature.
  const nearestKm = async (total: number) =>
    total > 0
      ? null
      : nearestShopKm(
          { AND: [PUBLIC_LISTING_WHERE, businessFilter, { products: { some: { AND: filters } } }] },
          centre
        );

  if (query.sort && query.sort !== 'nearest') {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: productSort(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: PUBLIC_LIST_SELECT,
      }),
      prisma.product.count({ where }),
    ]);
    return {
      ...toPage(rows.map((row) => presentListRow(row, distances)), total, query.page, query.pageSize),
      radiusKm,
      nearestKm: await nearestKm(total),
    };
  }

  // Nearest first, which the database cannot order by because it does not
  // know the distances: rank the matching ids here, then fetch one page.
  const candidates = await prisma.product.findMany({
    where,
    take: MAX_RADIUS_CANDIDATES,
    select: { id: true, businessId: true, publishedAt: true },
  });
  candidates.sort((a, b) => {
    const byDistance = (distances.get(a.businessId) ?? 0) - (distances.get(b.businessId) ?? 0);
    if (byDistance !== 0) return byDistance;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });

  const start = (query.page - 1) * query.pageSize;
  const pageIds = candidates.slice(start, start + query.pageSize).map((row) => row.id);
  const rows = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    select: PUBLIC_LIST_SELECT,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    ...toPage(
      pageIds
        .map((id) => byId.get(id))
        .filter((row): row is PublicListRow => Boolean(row))
        .map((row) => presentListRow(row, distances)),
      candidates.length,
      query.page,
      query.pageSize
    ),
    radiusKm,
    nearestKm: await nearestKm(candidates.length),
  };
}

/** A location from a query, checked. Half a pair is refused rather than ignored. */
function centreOf(query: { latitude?: number; longitude?: number }): Point | null {
  const hasLatitude = query.latitude !== undefined;
  if (hasLatitude !== (query.longitude !== undefined)) {
    throw new AppError('برای جست‌وجوی نزدیکی، هر دو مقدار طول و عرض جغرافیایی لازم است.', 400);
  }
  if (!hasLatitude) return null;

  const centre = { latitude: query.latitude as number, longitude: query.longitude as number };
  if (!isValidPoint(centre)) throw new AppError('موقعیت واردشده معتبر نیست.', 400);
  return centre;
}

export async function getPublicProduct(shopSlug: string, productSlug: string) {
  const where = {
    slug: productSlug.trim().toLowerCase(),
    business: { slug: shopSlug.trim().toLowerCase(), ...PUBLIC_LISTING_WHERE },
    ...PUBLIC_LISTING_WHERE,
  };

  try {
    await prisma.product.updateMany({ where, data: { views: { increment: 1 } } });
  } catch {
    // Reading beats counting.
  }

  const product = await prisma.product.findFirst({
    where,
    select: {
      id: true,
      code: true,
      slug: true,
      kind: true,
      title: true,
      summary: true,
      description: true,
      price: true,
      currency: true,
      stock: true,
      negotiable: true,
      views: true,
      publishedAt: true,
      category: { select: { id: true, slug: true, name: true } },
      images: {
        orderBy: { position: 'asc' },
        select: { id: true, caption: true, position: true },
      },
      variants: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, sku: true, price: true, stock: true },
      },
      business: {
        select: {
          id: true,
          slug: true,
          name: true,
          summary: true,
          province: true,
          city: true,
          address: true,
          phone: true,
          email: true,
          logoStoredName: true,
        },
      },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);

  const { images, business, ...rest } = product;
  const { logoStoredName, ...shop } = business;

  return {
    ...rest,
    available: isAvailable(product.kind, product.stock, product.variants),
    images: images.map((image) => ({ ...image, url: imageUrl(image.id) })),
    shop: { ...shop, logoUrl: logoUrl(business.id, logoStoredName) },
  };
}

/**
 * The public category tree, with how much is in each branch.
 *
 * A parent's count includes its children's, because choosing the parent finds
 * them (see categoryScope). Counting only its own products would show
 * "Clothing (0)" above "Coats (12)", and nobody would click it.
 */
export async function listCategories() {
  const rows = await prisma.productCategory.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      parentId: true,
      _count: { select: { products: { where: PUBLIC_PRODUCT_WHERE } } },
    },
  });

  const own = new Map(rows.map((row) => [row.id, row._count.products]));
  const childTotals = new Map<string, number>();
  for (const row of rows) {
    if (row.parentId) {
      childTotals.set(row.parentId, (childTotals.get(row.parentId) ?? 0) + (own.get(row.id) ?? 0));
    }
  }

  return rows.map(({ _count, ...row }) => ({
    ...row,
    productCount: _count.products + (childTotals.get(row.id) ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// The reviewer's side
// ---------------------------------------------------------------------------

export async function listProductsForReview(query: {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const search = query.search?.trim();

  const where: Prisma.ProductWhereInput = {
    ...(query.status
      ? { moderationStatus: query.status as Prisma.EnumModerationStatusFilter['equals'] }
      : { moderationStatus: { in: ['PENDING_REVIEW', 'CHANGES_REQUESTED'] } }),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { business: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        kind: true,
        title: true,
        summary: true,
        price: true,
        currency: true,
        moderationStatus: true,
        createdAt: true,
        images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
        business: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rows.map(({ images, ...row }) => ({
    ...row,
    coverUrl: images[0] ? imageUrl(images[0].id) : null,
    /**
     * The id as well as the URL.
     *
     * The staff image endpoint takes an image id, and the reviewer UI would
     * otherwise have to pull it back out of coverUrl with a string split —
     * which breaks silently the first time the public route changes shape.
     */
    coverImageId: images[0]?.id ?? null,
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getProductForReview(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      slug: true,
      kind: true,
      title: true,
      summary: true,
      description: true,
      price: true,
      currency: true,
      stock: true,
      negotiable: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      internalNote: true,
      reviewedAt: true,
      publishedAt: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
      images: { orderBy: { position: 'asc' }, select: { id: true, caption: true } },
      variants: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, sku: true, price: true, stock: true },
      },
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          moderationStatus: true,
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);

  const { images, ...rest } = product;
  return { ...rest, images: images.map((image) => ({ ...image, url: imageUrl(image.id) })) };
}

export async function reviewProduct(
  reviewerId: string,
  productId: string,
  decision: ReviewDecision,
  notes: { reviewNote?: string; internalNote?: string }
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      code: true,
      title: true,
      businessId: true,
      moderationStatus: true,
      publishedAt: true,
      business: { select: { ownerId: true, moderationStatus: true, state: true } },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);

  assertReviewable(product.moderationStatus);

  // Approving a listing into a shop that is not itself public would publish
  // nothing — the public query requires both — and would leave a reviewer
  // believing they had put it on display.
  if (
    decision === 'APPROVED' &&
    (product.business.moderationStatus !== 'APPROVED' || product.business.state !== 'OPEN')
  ) {
    throw new AppError('فروشگاه این کالا هنوز تأیید نشده یا بسته است.', 409);
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: reviewPatch(decision, { userId: reviewerId }, notes, product.publishedAt),
    select: { id: true, code: true, moderationStatus: true, publishedAt: true },
  });

  notifySafely(product.business.ownerId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'کالای شما تأیید شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'کالای شما نیاز به اصلاح دارد'
          : 'کالای شما تأیید نشد',
    body: notes.reviewNote?.trim() || product.title,
    // The screen where this listing is managed. It used to point at
    // /trademaster/products/:id, which never existed.
    link: `/dashboard/shops/${product.businessId}/products`,
  });

  return updated;
}
