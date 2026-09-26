import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';
import {
  PUBLIC_LISTING_WHERE,
  assertAuthorEditable,
  assertReviewable,
  assertSubmittable,
  reviewPatch,
  type ReviewDecision,
} from './moderation.js';
import { notifySafely } from './notifications.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { slugify } from './trademaster-shop.service.js';

/**
 * Products, in the TradeMaster module.
 *
 * A product hangs off a shop and is only ever reachable through one, which is
 * the fact most of this file turns on: a product is visible when the product
 * is approved and open AND its shop is, so the public queries filter on both.
 * Filtering on the product alone would publish the catalogue of a storefront
 * nobody is allowed to see — and that is not a hypothetical, it is what
 * happens the first time a shop is closed.
 *
 * Nothing here sells anything. Stock is a number the seller maintains and a
 * buyer can read; no order decrements it, because there are no orders yet.
 * When there are, the decrement belongs in a transaction with the order, not
 * here.
 */

/** Pictures per product. Twelve, as for showcase projects. */
const MAX_IMAGES = 12;

/** Variants per product. A seller with more than this wants a catalogue, not a listing. */
const MAX_VARIANTS = 40;

export interface ProductInput {
  title: string;
  summary: string;
  description?: string;
  categoryId?: string;
  price: bigint;
  stock?: number;
  negotiable?: boolean;
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  shopSlug?: string;
  province?: string;
  priceMin?: bigint;
  priceMax?: bigint;
  inStock?: boolean;
  sort?: 'newest' | 'priceAsc' | 'priceDesc';
  page: number;
  pageSize: number;
}

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

/** Rejects a price that no currency can express, before it reaches the column. */
function assertSanePrice(price: bigint | undefined): void {
  if (price === undefined) return;
  if (price < 0n) throw new AppError('قیمت نمی‌تواند منفی باشد.', 400);
  if (price > 100_000_000_000n) throw new AppError('قیمت واردشده معتبر نیست.', 400);
}

function normalize(input: Partial<ProductInput>): Partial<ProductInput> {
  return {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    ...(input.description !== undefined ? { description: trimmed(input.description) } : {}),
    ...(input.categoryId !== undefined ? { categoryId: trimmed(input.categoryId) } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.negotiable !== undefined ? { negotiable: input.negotiable } : {}),
  };
}

export function imageUrl(id: string): string {
  return `/api/v1/trademaster/products/images/${id}`;
}

/**
 * The shop this product belongs to, if the caller owns it.
 *
 * Every seller-side call goes through here. Ownership of a product is
 * ownership of its shop — there is no separate grant — so checking the shop
 * once is both simpler and harder to forget than checking the product and
 * then its shop.
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
      businessId: true,
      moderationStatus: true,
      publishedAt: true,
      business: { select: { moderationStatus: true, state: true } },
      _count: { select: { images: true, variants: true } },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);
  return product;
}

// ---------------------------------------------------------------------------
// The seller's side
// ---------------------------------------------------------------------------

export async function createProduct(userId: string, shopId: string, input: ProductInput) {
  const shop = await ownedShop(userId, shopId);
  assertSanePrice(input.price);

  // A product cannot be added to a shop that has not been through review.
  // Allowing it would let somebody build a whole catalogue behind a shop that
  // is later refused, and then have it appear the moment a different shop of
  // theirs is approved.
  if (shop.moderationStatus !== 'APPROVED') {
    throw new AppError('ابتدا باید فروشگاه تأیید شود.', 409);
  }
  if (shop.state !== 'OPEN') {
    throw new AppError('این فروشگاه بسته است.', 409);
  }

  if (input.categoryId) await assertCategoryExists(input.categoryId);

  const code = generateTrackingCode();

  return prisma.product.create({
    data: {
      // Caller fields first, service-decided fields after. Spread last, a body
      // carrying `featured` or `moderationStatus` would grant itself both.
      ...(normalize(input) as ProductInput),
      code,
      slug: await uniqueProductSlug(shopId, input.title, code),
      businessId: shopId,
      moderationStatus: 'DRAFT',
    },
    select: { id: true, code: true, slug: true, moderationStatus: true },
  });
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, active: true },
    select: { id: true },
  });
  if (!category) throw new AppError('دسته‌بندی انتخاب‌شده معتبر نیست.', 400);
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

export async function updateProduct(userId: string, productId: string, input: Partial<ProductInput>) {
  const product = await ownedProduct(userId, productId);
  assertAuthorEditable(product.moderationStatus);
  assertSanePrice(input.price);

  if (input.categoryId) await assertCategoryExists(input.categoryId);

  return prisma.product.update({
    where: { id: product.id },
    data: normalize(input),
    select: { id: true, code: true, slug: true, moderationStatus: true },
  });
}

export async function submitProduct(userId: string, productId: string) {
  const product = await ownedProduct(userId, productId);
  assertSubmittable(product.moderationStatus);

  // A product with no picture is a line of text asking a stranger to imagine
  // the thing. Enforced at submission rather than at creation, so a draft can
  // be started on a phone and finished at a desk.
  if (product._count.images === 0) {
    throw new AppError('برای ارسال کالا، دست‌کم یک تصویر لازم است.', 400);
  }

  if (product.business.moderationStatus !== 'APPROVED' || product.business.state !== 'OPEN') {
    throw new AppError('فروشگاه این کالا فعال نیست.', 409);
  }

  return prisma.product.update({
    where: { id: product.id },
    data: { moderationStatus: 'PENDING_REVIEW' },
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

export async function listShopProducts(userId: string, shopId: string) {
  await ownedShop(userId, shopId);

  const rows = await prisma.product.findMany({
    where: { businessId: shopId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      slug: true,
      title: true,
      summary: true,
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
  const product = await ownedProduct(userId, productId);
  assertAuthorEditable(product.moderationStatus);

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
    select: { id: true, storedName: true, product: { select: { moderationStatus: true } } },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  assertAuthorEditable(image.product.moderationStatus);

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
  assertAuthorEditable(image.product.moderationStatus);

  return prisma.productImage.update({
    where: { id: image.id },
    data: { caption: caption?.trim() || null },
    select: { id: true, caption: true },
  });
}

/**
 * The image bytes.
 *
 * Visible when the product and its shop are both public, or to the owner and
 * the review desk. `includeUnpublished` is the second case: a reviewer has to
 * see the picture before anybody has approved it.
 */
export async function getImage(imageId: string, includeUnpublished = false) {
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      ...(includeUnpublished
        ? {}
        : { product: { ...PUBLIC_LISTING_WHERE, business: PUBLIC_LISTING_WHERE } }),
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
  sku?: string;
  price?: bigint;
  stock?: number;
}

export async function addVariant(userId: string, productId: string, input: VariantInput) {
  const product = await ownedProduct(userId, productId);
  assertAuthorEditable(product.moderationStatus);
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
        sku: trimmed(input.sku),
        price: input.price,
        stock: input.stock ?? 0,
        position: (last?.position ?? 0) + 1,
      },
      select: { id: true, label: true, sku: true, price: true, stock: true, position: true },
    });
  } catch (error) {
    // The unique constraint on (productId, label) is the one that fires here,
    // and "Large already exists" is a better answer than a 500.
    if ((error as { code?: string }).code === 'P2002') {
      throw new AppError('تنوعی با این عنوان از قبل وجود دارد.', 409);
    }
    throw error;
  }
}

export async function updateVariant(userId: string, variantId: string, input: Partial<VariantInput>) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { business: { ownerId: userId } } },
    select: { id: true, product: { select: { moderationStatus: true } } },
  });
  if (!variant) throw new AppError('این تنوع پیدا نشد.', 404);
  assertAuthorEditable(variant.product.moderationStatus);
  assertSanePrice(input.price);

  try {
    return await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.sku !== undefined ? { sku: trimmed(input.sku) ?? null } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.stock !== undefined ? { stock: input.stock } : {}),
      },
      select: { id: true, label: true, sku: true, price: true, stock: true, position: true },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
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
  assertAuthorEditable(variant.product.moderationStatus);

  await prisma.productVariant.delete({ where: { id: variant.id } });
  return { removed: true };
}

// ---------------------------------------------------------------------------
// The public side
// ---------------------------------------------------------------------------

/**
 * Visible means the product is published AND its shop is.
 *
 * One predicate rather than a condition repeated at each call site, for the
 * same reason `PUBLIC_LISTING_WHERE` exists: the day somebody adds a third
 * public query and forgets the shop half, the catalogue of a closed
 * storefront goes back on sale.
 */
const PUBLIC_PRODUCT_WHERE = {
  ...PUBLIC_LISTING_WHERE,
  business: PUBLIC_LISTING_WHERE,
} as const;

function productSort(query: ProductQuery): Prisma.ProductOrderByWithRelationInput[] {
  const featuredFirst = { featured: 'desc' } as const;
  if (query.sort === 'priceAsc') return [featuredFirst, { price: 'asc' }];
  if (query.sort === 'priceDesc') return [featuredFirst, { price: 'desc' }];
  return [featuredFirst, { publishedAt: 'desc' }];
}

export async function listPublicProducts(query: ProductQuery) {
  const search = query.search?.trim();

  const where: Prisma.ProductWhereInput = {
    AND: [
      PUBLIC_PRODUCT_WHERE,
      {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.shopSlug ? { business: { slug: query.shopSlug.trim().toLowerCase() } } : {}),
        ...(query.province ? { business: { province: query.province } } : {}),
        ...(query.priceMin !== undefined || query.priceMax !== undefined
          ? {
              price: {
                ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
                ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
              },
            }
          : {}),
        // "In stock" has to consider variants: a product whose own stock is 0
        // but which has a variant with 3 left is in stock, and hiding it would
        // be wrong.
        ...(query.inStock
          ? { OR: [{ stock: { gt: 0 } }, { variants: { some: { stock: { gt: 0 } } } }] }
          : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: productSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        slug: true,
        title: true,
        summary: true,
        price: true,
        currency: true,
        stock: true,
        negotiable: true,
        featured: true,
        publishedAt: true,
        images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
        business: { select: { slug: true, name: true, province: true, city: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rows.map(({ images, _count, ...row }) => ({
    ...row,
    coverUrl: images[0] ? imageUrl(images[0].id) : null,
    variantCount: _count.variants,
  }));

  return toPage(items, total, query.page, query.pageSize);
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
    images: images.map((image) => ({ ...image, url: imageUrl(image.id) })),
    shop: {
      ...shop,
      logoUrl: logoStoredName ? `/api/v1/trademaster/shops/${business.id}/logo` : null,
    },
  };
}

export async function listCategories() {
  const rows = await prisma.productCategory.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      _count: { select: { products: { where: PUBLIC_PRODUCT_WHERE } } },
    },
  });

  return rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products }));
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
      moderationStatus: true,
      publishedAt: true,
      business: { select: { ownerId: true, moderationStatus: true, state: true } },
    },
  });
  if (!product) throw new AppError('این کالا پیدا نشد.', 404);

  assertReviewable(product.moderationStatus);

  // Approving a product into a shop that is not itself public would publish
  // nothing — the public query requires both — and would leave a reviewer
  // believing they had put it on sale.
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
    link: `/trademaster/products/${product.id}`,
  });

  return updated;
}
