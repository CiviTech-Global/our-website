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
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';
import { authorProfileSummaries, authorProfileSummary } from './profile.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * Shops, in the TradeMaster module.
 *
 * A shop is a seller's storefront: a name, a description, somewhere to find
 * them, and a logo. Products hang off it; nothing here sells anything, because
 * there is no payment yet and a shop that pretends to take money it cannot
 * take is worse than one that is plainly a catalogue.
 *
 * It reuses the machinery the rest of the site already has rather than the one
 * TradeMaster shipped with. The owner is a `User` from this schema, the review
 * journey is the same `ModerationStatus` one that job posts and book listings
 * take, and `PUBLIC_LISTING_WHERE` decides visibility — so "published" cannot
 * come to mean something subtly different on the shop pages than it does on
 * the jobs board.
 *
 * Verification is required of everyone, including staff. The book market
 * exempts staff because a company listing is attributed to the company and
 * there is no individual for a buyer to want assurance about; a shop is the
 * opposite — it *is* a trading identity, and a buyer is entitled to know
 * somebody stood behind it.
 */

/** How many shops one account may run. */
const MAX_SHOPS_PER_OWNER = 5;

export interface ShopInput {
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

export interface ShopQuery {
  search?: string;
  province?: string;
  industry?: string;
  sort?: 'newest' | 'name';
  page: number;
  pageSize: number;
}

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

/**
 * The part of the address bar a seller hands out.
 *
 * Latin-ised only as far as stripping what a URL cannot carry: Persian shop
 * names are the common case here, and transliterating them would produce a
 * slug the owner does not recognise as their own. A name with nothing
 * URL-safe left in it falls back to the code, which is ugly but never empty.
 */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    // Keep letters and digits in any script, drop punctuation.
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  return base.slice(0, 60);
}

/**
 * A slug nobody else holds.
 *
 * Collisions are resolved with a numeric suffix rather than by refusing the
 * name: two unrelated shops may legitimately both be called "کتاب‌فروشی مرکزی",
 * and telling the second one their name is taken is a strange thing for a
 * marketplace to do.
 */
async function uniqueSlug(name: string, fallback: string): Promise<string> {
  const base = slugify(name) || fallback.toLowerCase();

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  // 25 shops with the same name is not a naming problem any more.
  return `${base}-${fallback.toLowerCase()}`;
}

/** Rejects a coordinate that is not on Earth, before it reaches the column. */
function assertSaneCoordinates(latitude?: number, longitude?: number): void {
  if (latitude === undefined && longitude === undefined) return;
  if (latitude === undefined || longitude === undefined) {
    // Half a coordinate puts a pin in the Gulf of Guinea, which is where
    // (0, 0) is and where every half-filled location ends up.
    throw new AppError('برای ثبت موقعیت، هر دو مقدار طول و عرض جغرافیایی لازم است.', 400);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError('موقعیت واردشده معتبر نیست.', 400);
  }
}

function normalize(input: Partial<ShopInput>): Partial<ShopInput> {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    ...(input.description !== undefined ? { description: trimmed(input.description) } : {}),
    ...(input.industry !== undefined ? { industry: trimmed(input.industry) } : {}),
    ...(input.province !== undefined ? { province: trimmed(input.province) } : {}),
    ...(input.city !== undefined ? { city: trimmed(input.city) } : {}),
    ...(input.address !== undefined ? { address: trimmed(input.address) } : {}),
    ...(input.phone !== undefined ? { phone: trimmed(input.phone) } : {}),
    ...(input.email !== undefined ? { email: trimmed(input.email)?.toLowerCase() } : {}),
    ...(input.website !== undefined ? { website: trimmed(input.website) } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
  };
}

async function storeLogo(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

export function logoUrl(id: string, storedName: string | null): string | null {
  return storedName ? `/api/v1/trademaster/shops/${id}/logo` : null;
}

// ---------------------------------------------------------------------------
// The seller's side
// ---------------------------------------------------------------------------

export async function createShop(userId: string, input: ShopInput, logo: IncomingFile | null) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);
  assertSaneCoordinates(input.latitude, input.longitude);

  const existing = await prisma.business.count({ where: { ownerId: userId } });
  if (existing >= MAX_SHOPS_PER_OWNER) {
    throw new AppError(`هر حساب حداکثر می‌تواند ${MAX_SHOPS_PER_OWNER} فروشگاه داشته باشد.`, 409);
  }

  const code = generateTrackingCode();
  const slug = await uniqueSlug(input.name, code);
  const stored = await storeLogo(logo);

  try {
    return await prisma.business.create({
      data: {
        // Caller fields first, service-decided fields after. Spread last, a
        // request body carrying `featured` or `moderationStatus` would grant
        // itself both.
        ...(normalize(input) as ShopInput),
        code,
        slug,
        ownerId: userId,
        logoStoredName: stored?.storedName,
        logoOriginalName: stored?.originalName,
        logoMimeType: stored?.mimeType,
        moderationStatus: 'DRAFT',
      },
      select: { id: true, code: true, slug: true, moderationStatus: true },
    });
  } catch (error) {
    // Nothing references the file yet, so a failed insert must not leave it
    // behind — an orphan in storage is invisible and never collected.
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

async function ownedShop(userId: string, shopId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: {
      id: true,
      code: true,
      slug: true,
      moderationStatus: true,
      publishedAt: true,
      logoStoredName: true,
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);
  return shop;
}

export async function updateShop(
  userId: string,
  shopId: string,
  input: Partial<ShopInput>,
  logo: IncomingFile | null
) {
  const shop = await ownedShop(userId, shopId);
  assertAuthorEditable(shop.moderationStatus);
  assertSaneCoordinates(input.latitude, input.longitude);

  const stored = await storeLogo(logo);
  try {
    const updated = await prisma.business.update({
      where: { id: shop.id },
      data: {
        ...normalize(input),
        ...(stored
          ? {
              logoStoredName: stored.storedName,
              logoOriginalName: stored.originalName,
              logoMimeType: stored.mimeType,
            }
          : {}),
        // The slug deliberately does not follow the name. A shop that renames
        // itself and breaks every link anyone shared is worse off than one
        // with a dated address.
      },
      select: { id: true, code: true, slug: true, moderationStatus: true },
    });

    if (stored && shop.logoStoredName) await removeFile(shop.logoStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function submitShop(userId: string, shopId: string) {
  const shop = await ownedShop(userId, shopId);
  assertSubmittable(shop.moderationStatus);

  // A shop with no logo is a grey square on the shop list. Enforced at
  // submission rather than at creation, so a draft can be started on a phone
  // and finished at a desk.
  if (!shop.logoStoredName) {
    throw new AppError('برای ارسال فروشگاه، بارگذاری نشان (لوگو) لازم است.', 400);
  }

  return prisma.business.update({
    where: { id: shop.id },
    data: { moderationStatus: 'PENDING_REVIEW' },
    select: { id: true, code: true, moderationStatus: true },
  });
}

/**
 * Close a shop, and take its products down with it.
 *
 * Not a delete: the products, and later the orders against them, are a record
 * of what happened. Closing hides the shop and everything under it from the
 * public queries without removing anything.
 */
export async function closeShop(userId: string, shopId: string) {
  const shop = await ownedShop(userId, shopId);

  return prisma.$transaction(async (tx) => {
    const closed = await tx.business.update({
      where: { id: shop.id },
      data: { state: 'CLOSED' },
      select: { id: true, code: true, state: true },
    });

    await tx.product.updateMany({
      where: { businessId: shop.id, state: 'OPEN' },
      data: { state: 'CLOSED' },
    });

    return closed;
  });
}

export async function listOwnShops(userId: string) {
  const rows = await prisma.business.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      summary: true,
      industry: true,
      province: true,
      city: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      featured: true,
      publishedAt: true,
      createdAt: true,
      logoStoredName: true,
      _count: { select: { products: true } },
    },
  });

  return rows.map(({ logoStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
    productCount: _count.products,
  }));
}

// ---------------------------------------------------------------------------
// The public side
// ---------------------------------------------------------------------------

function publicShopFields() {
  return {
    id: true,
    code: true,
    slug: true,
    name: true,
    summary: true,
    industry: true,
    province: true,
    city: true,
    featured: true,
    publishedAt: true,
    logoStoredName: true,
  } satisfies Prisma.BusinessSelect;
}

function shopSort(query: ShopQuery): Prisma.BusinessOrderByWithRelationInput[] {
  // Featured first regardless of the chosen sort: it is an editorial decision
  // about what belongs at the top, not a tie-breaker.
  const featuredFirst = { featured: 'desc' } as const;
  if (query.sort === 'name') return [featuredFirst, { name: 'asc' }];
  return [featuredFirst, { publishedAt: 'desc' }];
}

export async function listPublicShops(query: ShopQuery) {
  const search = query.search?.trim();

  const where: Prisma.BusinessWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      {
        ...(query.province ? { province: query.province } : {}),
        ...(query.industry ? { industry: query.industry } : {}),
        // By name only. A word buried in a description is a worse match than
        // one in the name, and mixing them makes the good matches impossible
        // to find — the same reasoning as the book market.
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: shopSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...publicShopFields(),
        ownerId: true,
        _count: { select: { products: { where: PUBLIC_LISTING_WHERE } } },
      },
    }),
    prisma.business.count({ where }),
  ]);

  const profiles = await authorProfileSummaries(rows.map((row) => row.ownerId));
  const items = rows.map(({ ownerId, logoStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
    productCount: _count.products,
    ownerProfile: profiles.get(ownerId) ?? null,
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getPublicShop(slug: string) {
  const shop = await prisma.business.findFirst({
    where: { slug: slug.trim().toLowerCase(), ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicShopFields(),
      description: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      email: true,
      website: true,
      createdAt: true,
      ownerId: true,
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const { ownerId, logoStoredName, ...rest } = shop;
  return {
    ...rest,
    logoUrl: logoUrl(shop.id, logoStoredName),
    ownerProfile: await authorProfileSummary(ownerId),
  };
}

/**
 * The logo bytes.
 *
 * `includeUnpublished` is for the owner's own draft and the review queue,
 * where the picture has to be visible before anybody has approved it. An
 * unpublished shop's logo is as private as the rest of the row.
 */
export async function getLogo(id: string, includeUnpublished = false) {
  const shop = await prisma.business.findFirst({
    where: { id, ...(includeUnpublished ? {} : PUBLIC_LISTING_WHERE) },
    select: { logoStoredName: true, logoOriginalName: true, logoMimeType: true },
  });
  if (!shop?.logoStoredName) throw new AppError('تصویری برای این فروشگاه ثبت نشده است.', 404);
  return {
    storedName: shop.logoStoredName,
    originalName: shop.logoOriginalName ?? 'logo',
    mimeType: shop.logoMimeType ?? 'application/octet-stream',
  };
}

// ---------------------------------------------------------------------------
// The reviewer's side
// ---------------------------------------------------------------------------

export async function listShopsForReview(query: {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const search = query.search?.trim();

  const where: Prisma.BusinessWhereInput = {
    ...(query.status
      ? { moderationStatus: query.status as Prisma.EnumModerationStatusFilter['equals'] }
      : { moderationStatus: { in: ['PENDING_REVIEW', 'CHANGES_REQUESTED'] } }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { owner: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        summary: true,
        industry: true,
        province: true,
        city: true,
        moderationStatus: true,
        createdAt: true,
        logoStoredName: true,
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.business.count({ where }),
  ]);

  const items = rows.map(({ logoStoredName, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getShopForReview(id: string) {
  const shop = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      summary: true,
      description: true,
      industry: true,
      province: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      email: true,
      website: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      internalNote: true,
      reviewedAt: true,
      publishedAt: true,
      createdAt: true,
      logoStoredName: true,
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      _count: { select: { products: true } },
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const { logoStoredName, _count, ...rest } = shop;
  return { ...rest, logoUrl: logoUrl(shop.id, logoStoredName), productCount: _count.products };
}

export async function reviewShop(
  reviewerId: string,
  shopId: string,
  decision: ReviewDecision,
  notes: { reviewNote?: string; internalNote?: string }
) {
  const shop = await prisma.business.findUnique({
    where: { id: shopId },
    select: { id: true, code: true, name: true, ownerId: true, moderationStatus: true, publishedAt: true },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  assertReviewable(shop.moderationStatus);

  const updated = await prisma.business.update({
    where: { id: shop.id },
    data: reviewPatch(decision, { userId: reviewerId }, notes, shop.publishedAt),
    select: { id: true, code: true, moderationStatus: true, publishedAt: true },
  });

  // Refusing a shop takes its products down with it: a product is only ever
  // reachable through a shop, so leaving them approved would be publishing
  // the catalogue of a storefront nobody may see.
  if (decision !== 'APPROVED') {
    await prisma.product.updateMany({
      where: { businessId: shop.id, moderationStatus: 'APPROVED' },
      data: { moderationStatus: 'PENDING_REVIEW' },
    });
  }

  notifySafely(shop.ownerId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'فروشگاه شما تأیید شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'فروشگاه شما نیاز به اصلاح دارد'
          : 'فروشگاه شما تأیید نشد',
    body: notes.reviewNote?.trim() || shop.name,
    link: `/trademaster/shops/${shop.id}`,
  });

  return updated;
}
