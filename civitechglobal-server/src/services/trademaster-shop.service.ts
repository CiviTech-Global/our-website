import type { ListingKind, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';
import {
  PUBLIC_LISTING_WHERE,
  assertWithdrawable,
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
import { isValidPoint, type Point } from '../utils/geo.js';
import { assertBusinessCategoryUsable, businessCategoryScope } from './business-category.service.js';
import {
  MAX_RADIUS_KM,
  PUBLIC_PRODUCT_WHERE,
  catalogueWhere,
  isUniqueViolation,
  nearestShopKm,
  roundKm,
  shopKinds,
  shopsWithinRadius,
  slugify,
} from './trademaster-common.js';

// Kept importable from here: tests and the category service reached slugify
// through this module before it moved to the shared one.
export { slugify, MAX_RADIUS_KM };

/**
 * Shops, in the TradeMaster module.
 *
 * A shop is a seller's storefront: a name, a description, somewhere to find
 * them, and a logo. Products and services hang off it. Nothing here sells
 * anything — the module is a catalogue, and a buyer reaches the seller through
 * the phone number and address on the shop's page.
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

/**
 * The most shops one map request returns.
 *
 * A map is drawn whole rather than paged, so it needs a ceiling of its own. The
 * response says when it was reached, and the page tells the reader to narrow
 * the search instead of pretending the pins it drew were all of them.
 */
const MAP_LIMIT = 1000;

/**
 * A shop as the form sends it.
 *
 * On an update every field is optional, and the optional ones accept `null`:
 * absent means "leave it as it is", null means "remove it". Collapsing the two
 * is how a seller ends up unable to delete a phone number they no longer use —
 * which is exactly what happened before, because an emptied field was dropped
 * on the way out and the old value stayed.
 */
export interface ShopInput {
  name: string;
  summary: string;
  /** From the guild list. Optional on a draft, required to submit. */
  businessCategoryId?: string | null;
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

export interface ShopQuery {
  search?: string;
  province?: string;
  industry?: string;
  /** Shops of this business category, or of a trade under it. */
  businessCategoryId?: string;
  /** Shops offering this kind of thing — products, or services. */
  kind?: ListingKind;
  /** Shops with something public in this category or one of its children. */
  categoryId?: string;
  sort?: 'newest' | 'name' | 'nearest';
  /** Both or neither; half a coordinate is refused rather than guessed at. */
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page: number;
  pageSize: number;
}

/** The radius used when a location arrives without one. */
const DEFAULT_RADIUS_KM = 10;

/**
 * Optional text, normalised for storage.
 *
 * Blank and whitespace-only become null rather than an empty string. An empty
 * string in an optional column is a value that is not a value: `shop.phone`
 * comes out truthy-looking to some checks and falsy to others, and the page
 * renders an empty "Phone:" line or a `tel:` link to nowhere depending on which
 * one it used.
 */
function text(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = value.trim();
  return next ? next : null;
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

/**
 * The location, checked as a pair.
 *
 * Both present, both null (clear it), or both absent (leave it). One without
 * the other is refused: half a coordinate puts a pin in the Gulf of Guinea,
 * which is where (0, 0) is and where every half-filled location ends up.
 */
function locationPatch(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): { latitude?: number | null; longitude?: number | null } {
  if (latitude === undefined && longitude === undefined) return {};
  if (latitude === null && longitude === null) return { latitude: null, longitude: null };

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new AppError('برای ثبت موقعیت، هر دو مقدار طول و عرض جغرافیایی لازم است.', 400);
  }
  if (!isValidPoint({ latitude, longitude })) {
    throw new AppError('موقعیت واردشده معتبر نیست.', 400);
  }
  return { latitude, longitude };
}

/** The writable columns from a ShopInput, with blanks turned into nulls. */
function normalize(input: Partial<ShopInput>) {
  const email = text(input.email);
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    ...(input.businessCategoryId !== undefined
      ? { businessCategoryId: text(input.businessCategoryId) ?? null }
      : {}),
    ...(input.description !== undefined ? { description: text(input.description) } : {}),
    ...(input.industry !== undefined ? { industry: text(input.industry) } : {}),
    ...(input.province !== undefined ? { province: text(input.province) } : {}),
    ...(input.city !== undefined ? { city: text(input.city) } : {}),
    ...(input.address !== undefined ? { address: text(input.address) } : {}),
    ...(input.phone !== undefined ? { phone: text(input.phone) } : {}),
    ...(input.email !== undefined ? { email: email ? email.toLowerCase() : email } : {}),
    ...(input.website !== undefined ? { website: text(input.website) } : {}),
    ...locationPatch(input.latitude, input.longitude),
  };
}

async function storeImage(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

/** The two pictures a shop form may carry. Either may be absent. */
export interface ShopImages {
  logo: IncomingFile | null;
  cover: IncomingFile | null;
}

/** The shop's own cover photograph, when it has one. */
export function coverUrl(id: string, storedName: string | null): string | null {
  // Relative to the API root, as for the logo below.
  return storedName ? `/trademaster/shops/${id}/cover` : null;
}

export function logoUrl(id: string, storedName: string | null): string | null {
  // Relative to the API root, like every other asset path here — see
  // books.service and showcase.service. The browser puts the base back on
  // (apiAssetSrc). Written absolute, it came out doubled as /api/api/v1/…
  // once the base was prepended, and every TradeMaster picture on the site
  // showed its alt text instead.
  return storedName ? `/trademaster/shops/${id}/logo` : null;
}

// ---------------------------------------------------------------------------
// The seller's side
// ---------------------------------------------------------------------------

export async function createShop(userId: string, input: ShopInput, images: ShopImages) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);
  const data = normalize(input);
  if (data.businessCategoryId) await assertBusinessCategoryUsable(data.businessCategoryId);

  const existing = await prisma.business.count({ where: { ownerId: userId } });
  if (existing >= MAX_SHOPS_PER_OWNER) {
    throw new AppError(`هر حساب حداکثر می‌تواند ${MAX_SHOPS_PER_OWNER} فروشگاه داشته باشد.`, 409);
  }

  const stored = await storeImage(images.logo);
  const storedCover = await storeImage(images.cover);

  try {
    // A second try on a slug collision. uniqueSlug checks before it inserts,
    // so two shops with the same name created in the same instant can both
    // pick the same free slug; the loser gets the next one rather than a 500.
    for (let attempt = 0; ; attempt += 1) {
      const code = generateTrackingCode();
      try {
        return await prisma.business.create({
          data: {
            // Caller fields first, service-decided fields after. Spread last, a
            // request body carrying `featured` or `moderationStatus` would grant
            // itself both.
            ...data,
            name: input.name.trim(),
            summary: input.summary.trim(),
            code,
            slug: await uniqueSlug(input.name, code),
            ownerId: userId,
            logoStoredName: stored?.storedName,
            logoOriginalName: stored?.originalName,
            logoMimeType: stored?.mimeType,
            coverStoredName: storedCover?.storedName,
            coverOriginalName: storedCover?.originalName,
            coverMimeType: storedCover?.mimeType,
            moderationStatus: 'DRAFT',
          },
          select: { id: true, code: true, slug: true, moderationStatus: true },
        });
      } catch (error) {
        if (attempt < 2 && isUniqueViolation(error)) continue;
        throw error;
      }
    }
  } catch (error) {
    // Nothing references the files yet, so a failed insert must not leave
    // them behind — an orphan in storage is invisible and never collected.
    if (stored) await removeFile(stored.storedName);
    if (storedCover) await removeFile(storedCover.storedName);
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
      // Whether the owner has taken it down, which reopenShop needs and
      // nothing else here reads. Cheap enough to fetch once for every caller.
      state: true,
      publishedAt: true,
      logoStoredName: true,
      coverStoredName: true,
      businessCategoryId: true,
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);
  return shop;
}

/**
 * Everything the edit form needs, for the owner only.
 *
 * The list carries a summary of each shop, and the form used to be filled from
 * it — so the description, address, phone, email, website and location all
 * opened blank on an existing shop. The seller saw empty boxes for details they
 * had already given, and could neither check nor correct them.
 */
export async function getOwnShop(userId: string, shopId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      summary: true,
      businessCategoryId: true,
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
      logoStoredName: true,
      coverStoredName: true,
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const { logoStoredName, coverStoredName, ...rest } = shop;
  return {
    ...rest,
    logoUrl: logoUrl(shop.id, logoStoredName),
    coverUrl: coverUrl(shop.id, coverStoredName),
  };
}

export async function updateShop(
  userId: string,
  shopId: string,
  input: Partial<ShopInput>,
  images: ShopImages
) {
  const shop = await ownedShop(userId, shopId);
  assertAuthorEditable(shop.moderationStatus);
  const data = normalize(input);
  if (data.businessCategoryId) await assertBusinessCategoryUsable(data.businessCategoryId);

  const stored = await storeImage(images.logo);
  const storedCover = await storeImage(images.cover);
  try {
    const updated = await prisma.business.update({
      where: { id: shop.id },
      data: {
        ...data,
        ...(stored
          ? {
              logoStoredName: stored.storedName,
              logoOriginalName: stored.originalName,
              logoMimeType: stored.mimeType,
            }
          : {}),
        ...(storedCover
          ? {
              coverStoredName: storedCover.storedName,
              coverOriginalName: storedCover.originalName,
              coverMimeType: storedCover.mimeType,
            }
          : {}),
        // The slug deliberately does not follow the name. A shop that renames
        // itself and breaks every link anyone shared is worse off than one
        // with a dated address.
      },
      select: { id: true, code: true, slug: true, moderationStatus: true },
    });

    // The replaced files go only once the row points at the new ones.
    if (stored && shop.logoStoredName) await removeFile(shop.logoStoredName);
    if (storedCover && shop.coverStoredName) await removeFile(shop.coverStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    if (storedCover) await removeFile(storedCover.storedName);
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
  // Every shop on the board is in a category, or the category filter quietly
  // hides it from anyone who uses it.
  if (!shop.businessCategoryId) {
    throw new AppError('برای ارسال فروشگاه، انتخاب صنف لازم است.', 400);
  }

  return prisma.business.update({
    where: { id: shop.id },
    data: { moderationStatus: 'PENDING_REVIEW' },
    select: { id: true, code: true, moderationStatus: true },
  });
}

/**
 * Back to a draft, so the owner can change it.
 *
 * Editing is refused once a shop is in the queue or published — an edit there
 * would change what a reviewer approved without anybody seeing the change — so
 * this is the way back: unpublish it, edit it, submit it again.
 *
 * The products are left as they are. They become unreachable while the shop is
 * not approved, because every public query filters on the shop too, and they
 * come back exactly as they were when it is approved again.
 */
export async function withdrawShop(userId: string, shopId: string) {
  const shop = await ownedShop(userId, shopId);
  assertWithdrawable(shop.moderationStatus);

  return prisma.business.update({
    where: { id: shop.id },
    // publishedAt is left alone: it records that this shop was once public,
    // which is what reviewPatch reads to tell a republication from a first
    // approval.
    data: { moderationStatus: 'DRAFT', reviewNote: null },
    select: { id: true, code: true, moderationStatus: true },
  });
}

/**
 * The owner takes their own shop down.
 *
 * Not a delete: the products are a record of what the shop offered. Closing
 * hides the shop and everything under it from the public queries without
 * removing anything.
 *
 * The products themselves are deliberately left alone. Every public query
 * filters on the shop as well as on the product — see PUBLIC_PRODUCT_WHERE — so
 * a closed shop's catalogue is already unreachable, and closing each product
 * too would only destroy the one fact reopening needs: which of them the seller
 * had taken down by hand.
 */
export async function closeShop(userId: string, shopId: string) {
  const shop = await ownedShop(userId, shopId);

  return prisma.business.update({
    where: { id: shop.id },
    data: { state: 'CLOSED' },
    select: { id: true, code: true, state: true },
  });
}

/**
 * And puts it back.
 *
 * Only from CLOSED, and only the owner's own closing: EXPIRED is not something
 * a seller may undo by calling this. Reopening touches the state and never the
 * moderation status, so it cannot publish anything the desk has not agreed to.
 */
export async function reopenShop(userId: string, shopId: string) {
  const shop = await ownedShop(userId, shopId);

  if (shop.state !== 'CLOSED') {
    throw new AppError('این فروشگاه بسته نیست.', 409);
  }

  return prisma.business.update({
    where: { id: shop.id },
    data: { state: 'OPEN' },
    select: { id: true, code: true, state: true },
  });
}

/**
 * The values the board's filters may actually offer.
 *
 * Province and trade are free text on the shop form — there is no canonical
 * list of either, and inventing one would mean refusing a shop in a town the
 * list forgot. So the filters are built from what approved shops have really
 * written, which has the useful property that no option can return nothing.
 */
export async function listFacets() {
  const rows = await prisma.business.findMany({
    where: PUBLIC_LISTING_WHERE,
    select: { province: true, industry: true },
    distinct: ['province', 'industry'],
  });

  const unique = (values: Array<string | null>) =>
    [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort((a, b) =>
      a.localeCompare(b, 'fa')
    );

  return {
    provinces: unique(rows.map((row) => row.province)),
    industries: unique(rows.map((row) => row.industry)),
  };
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
      coverStoredName: true,
      businessCategoryId: true,
      businessCategory: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });

  return rows.map(({ logoStoredName, coverStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
    coverUrl: coverUrl(row.id, coverStoredName),
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
    latitude: true,
    longitude: true,
    // What a card and a map popup show without opening the shop: where it
    // is, and how to reach it. All of it is public on the shop page anyway.
    address: true,
    phone: true,
    website: true,
    featured: true,
    publishedAt: true,
    logoStoredName: true,
    coverStoredName: true,
    businessCategory: { select: { id: true, name: true } },
    ownerId: true,
    _count: { select: { products: { where: PUBLIC_LISTING_WHERE } } },
  } satisfies Prisma.BusinessSelect;
}

type PublicShopRow = Prisma.BusinessGetPayload<{ select: ReturnType<typeof publicShopFields> }>;

/**
 * The filters every public shop query applies, as one where clause.
 *
 * The list, the radius search and the map all answer the same question with a
 * different shape, so they must agree on what matches. Search looks at the
 * shop's name and trade, and at the titles of what it offers: somebody typing
 * "اصلاح مو" wants the barber whose shop is called "آرایشگاه نگین", and a
 * search on shop names alone would never find it.
 */
async function publicShopWhere(query: Omit<ShopQuery, 'page' | 'pageSize'>) {
  const search = query.search?.trim();
  const filtersCatalogue = Boolean(query.kind || query.categoryId);
  const catalogue = filtersCatalogue
    ? await catalogueWhere({ kind: query.kind, categoryId: query.categoryId })
    : null;

  const where: Prisma.BusinessWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      query.businessCategoryId
        ? { businessCategoryId: { in: await businessCategoryScope(query.businessCategoryId) } }
        : {},
      query.province ? { province: query.province } : {},
      query.industry ? { industry: query.industry } : {},
      catalogue ? { products: { some: catalogue } } : {},
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { industry: { contains: search, mode: 'insensitive' } },
              {
                products: {
                  some: { ...PUBLIC_PRODUCT_WHERE, title: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {},
    ],
  };
  return where;
}

/**
 * A picture for each shop that has no cover of its own: its newest public
 * listing's first picture. One query for the page, not one per shop.
 */
async function fallbackCovers(shopIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (shopIds.length === 0) return result;

  const rows = await prisma.product.findMany({
    where: { ...PUBLIC_PRODUCT_WHERE, businessId: { in: shopIds }, images: { some: {} } },
    orderBy: { publishedAt: 'desc' },
    distinct: ['businessId'],
    select: { businessId: true, images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } } },
  });
  for (const row of rows) {
    if (row.images[0]) result.set(row.businessId, `/trademaster/products/images/${row.images[0].id}`);
  }
  return result;
}

/** A shop row as the public sees it, with what it offers. */
async function presentShops(rows: PublicShopRow[], distances?: Map<string, number>) {
  const [profiles, kinds, fallbacks] = await Promise.all([
    authorProfileSummaries(rows.map((row) => row.ownerId)),
    shopKinds(rows.map((row) => row.id)),
    fallbackCovers(rows.filter((row) => !row.coverStoredName).map((row) => row.id)),
  ]);

  return rows.map(({ ownerId, logoStoredName, coverStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
    /**
     * One picture for the card: the shop's own cover, else its newest
     * listing's picture, else its logo, else nothing. Said once here so the
     * list, the map and the detail page cannot each choose differently.
     */
    coverUrl:
      coverUrl(row.id, coverStoredName) ?? fallbacks.get(row.id) ?? logoUrl(row.id, logoStoredName),
    /** Whether that picture is the shop's own cover or a stand-in. */
    hasCover: Boolean(coverStoredName),
    productCount: _count.products,
    kinds: kinds.get(row.id) ?? [],
    ownerProfile: profiles.get(ownerId) ?? null,
    ...(distances ? { distanceKm: roundKm(distances.get(row.id) ?? 0) } : {}),
  }));
}

/**
 * A location from a query, checked.
 *
 * A coordinate pair turns a query into a proximity search. Half a pair is
 * refused rather than ignored, because ignoring it would answer a different
 * question than the one asked and look like the feature is broken.
 */
function centreOf(query: { latitude?: number; longitude?: number }): Point | null {
  const hasLatitude = query.latitude !== undefined;
  const hasLongitude = query.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    throw new AppError('برای جست‌وجوی نزدیکی، هر دو مقدار طول و عرض جغرافیایی لازم است.', 400);
  }
  if (!hasLatitude) return null;

  const centre = { latitude: query.latitude as number, longitude: query.longitude as number };
  if (!isValidPoint(centre)) throw new AppError('موقعیت واردشده معتبر نیست.', 400);
  return centre;
}

function shopSort(query: ShopQuery): Prisma.BusinessOrderByWithRelationInput[] {
  // Featured first regardless of the chosen sort: it is an editorial decision
  // about what belongs at the top, not a tie-breaker. Not so for a radius
  // search, which sorts by distance alone — see shopsWithinRadius.
  const featuredFirst = { featured: 'desc' } as const;
  if (query.sort === 'name') return [featuredFirst, { name: 'asc' }];
  return [featuredFirst, { publishedAt: 'desc' }];
}

export async function listPublicShops(query: ShopQuery) {
  const centre = centreOf(query);
  const where = await publicShopWhere(query);

  if (centre) {
    const radiusKm = Math.min(query.radiusKm ?? DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
    const ranked = await shopsWithinRadius(where, centre, radiusKm);
    const start = (query.page - 1) * query.pageSize;
    const pageIds = ranked.slice(start, start + query.pageSize);

    const rows = await prisma.business.findMany({
      where: { id: { in: pageIds.map((row) => row.id) } },
      select: publicShopFields(),
    });
    // findMany does not keep the order of an `in` list, so the distance order
    // is put back by hand.
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = pageIds
      .map((row) => byId.get(row.id))
      .filter((row): row is PublicShopRow => Boolean(row));

    const items = await presentShops(
      ordered,
      new Map(ranked.map((row) => [row.id, row.distanceKm]))
    );

    return {
      ...toPage(items, ranked.length, query.page, query.pageSize),
      radiusKm,
      nearestKm: ranked.length === 0 ? await nearestShopKm(where, centre) : null,
    };
  }

  const [rows, total] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: shopSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: publicShopFields(),
    }),
    prisma.business.count({ where }),
  ]);

  return toPage(await presentShops(rows), total, query.page, query.pageSize);
}

/**
 * Every matching shop that has a location, for the map.
 *
 * Not paged: a map with page two is not a map. Capped at MAP_LIMIT instead, and
 * `truncated` says when the cap was reached so the page can ask the reader to
 * narrow things down rather than present a partial map as the whole.
 */
export async function listMapShops(query: Omit<ShopQuery, 'page' | 'pageSize' | 'sort'>) {
  const centre = centreOf(query);
  const where = await publicShopWhere(query);

  if (centre) {
    const radiusKm = Math.min(query.radiusKm ?? DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
    const ranked = await shopsWithinRadius(where, centre, radiusKm);
    const kept = ranked.slice(0, MAP_LIMIT);

    const rows = await prisma.business.findMany({
      where: { id: { in: kept.map((row) => row.id) } },
      select: publicShopFields(),
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = kept
      .map((row) => byId.get(row.id))
      .filter((row): row is PublicShopRow => Boolean(row));

    return {
      items: await presentShops(ordered, new Map(kept.map((row) => [row.id, row.distanceKm]))),
      total: ranked.length,
      truncated: ranked.length > MAP_LIMIT,
      radiusKm,
      nearestKm: ranked.length === 0 ? await nearestShopKm(where, centre) : null,
    };
  }

  const located: Prisma.BusinessWhereInput = {
    AND: [where, { latitude: { not: null } }, { longitude: { not: null } }],
  };
  const [rows, total] = await Promise.all([
    prisma.business.findMany({
      where: located,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: MAP_LIMIT,
      select: publicShopFields(),
    }),
    prisma.business.count({ where: located }),
  ]);

  return {
    items: await presentShops(rows),
    total,
    truncated: total > MAP_LIMIT,
    radiusKm: null,
    nearestKm: null,
  };
}

export async function getPublicShop(slug: string) {
  const shop = await prisma.business.findFirst({
    where: { slug: slug.trim().toLowerCase(), ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicShopFields(),
      description: true,
      email: true,
      createdAt: true,
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const [presented] = await presentShops([shop]);
  return {
    ...presented,
    description: shop.description,
    email: shop.email,
    createdAt: shop.createdAt,
    ownerProfile: await authorProfileSummary(shop.ownerId),
  };
}

/** The cover bytes: an approved shop's to anyone, or any shop's to the desk. */
export async function getCover(id: string, includeUnpublished = false) {
  const shop = await prisma.business.findFirst({
    where: { id, ...(includeUnpublished ? {} : PUBLIC_LISTING_WHERE) },
    select: { coverStoredName: true, coverOriginalName: true, coverMimeType: true },
  });
  if (!shop?.coverStoredName) throw new AppError('تصویری برای این فروشگاه ثبت نشده است.', 404);
  return {
    storedName: shop.coverStoredName,
    originalName: shop.coverOriginalName ?? 'cover',
    mimeType: shop.coverMimeType ?? 'application/octet-stream',
  };
}

/** The owner's own cover, whatever the review desk has decided — see getOwnLogo. */
export async function getOwnCover(userId: string, shopId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: { coverStoredName: true, coverOriginalName: true, coverMimeType: true },
  });
  if (!shop?.coverStoredName) throw new AppError('تصویری برای این فروشگاه ثبت نشده است.', 404);
  return {
    storedName: shop.coverStoredName,
    originalName: shop.coverOriginalName ?? 'cover',
    mimeType: shop.coverMimeType ?? 'application/octet-stream',
  };
}

/**
 * The owner's own logo, whatever the review desk has decided.
 *
 * The public route serves an approved shop's logo and nothing else, which is
 * right — but it meant a seller could not see the logo they had just uploaded
 * until somebody approved the shop. A blank where the picture should be reads
 * as "it did not save", and the obvious next move is to upload it again.
 *
 * Scoped by owner rather than reusing the staff route: a seller may see their
 * own drafts and nobody else's.
 */
export async function getOwnLogo(userId: string, shopId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: { logoStoredName: true, logoOriginalName: true, logoMimeType: true },
  });
  if (!shop?.logoStoredName) throw new AppError('تصویری برای این فروشگاه ثبت نشده است.', 404);
  return {
    storedName: shop.logoStoredName,
    originalName: shop.logoOriginalName ?? 'logo',
    mimeType: shop.logoMimeType ?? 'application/octet-stream',
  };
}

/**
 * The logo bytes.
 *
 * `includeUnpublished` is for the review queue, where the picture has to be
 * visible before anybody has approved it. An unpublished shop's logo is as
 * private as the rest of the row.
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
      coverStoredName: true,
      businessCategory: { select: { id: true, name: true } },
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      _count: { select: { products: true } },
    },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const { logoStoredName, coverStoredName, _count, ...rest } = shop;
  return {
    ...rest,
    logoUrl: logoUrl(shop.id, logoStoredName),
    coverUrl: coverUrl(shop.id, coverStoredName),
    productCount: _count.products,
  };
}

/**
 * A reviewer's decision on a shop.
 *
 * The shop's products are not touched. Every public product query requires the
 * shop to be approved and open as well, so refusing the shop already takes its
 * whole catalogue off the site; it used to also send every approved product
 * back to the review queue, which put a pile of unchanged listings on the desk
 * each time a shop was asked to fix its address, and left them dark after the
 * shop was approved again.
 */
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

  notifySafely(shop.ownerId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'فروشگاه شما تأیید شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'فروشگاه شما نیاز به اصلاح دارد'
          : 'فروشگاه شما تأیید نشد',
    body: notes.reviewNote?.trim() || shop.name,
    // The owner's own shops screen. The link used to be /trademaster/shops/:id,
    // a route the site never had, so every one of these opened a 404.
    link: '/dashboard/shops',
  });

  return updated;
}
