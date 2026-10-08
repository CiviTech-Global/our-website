import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { searchWhere } from './list-search.js';
import { generateTrackingCode } from './insurance-request.service.js';
import { assertReviewable, assertSubmittable, reviewPatch, type ReviewDecision } from './moderation.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';
import { authorProfileSummaries } from './profile.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { assertWorkCategoryUsable, workCategoryScope } from './work-taxonomy.service.js';
import { freelancerStats, type FreelancerLevel } from './project-cards.service.js';
import { PACKAGE_TIERS, UNLIMITED_REVISIONS, type PackageTier } from '../catalog/work-taxonomy.js';

/**
 * The service catalogue: ready-made work a freelancer sells at a fixed price,
 * the way Fiverr sells gigs — "I will design your logo", in up to three
 * packages (Basic, Standard, Premium), with extras, a gallery, FAQs and the
 * questions the seller needs answered to start.
 *
 * No money moves. Ordering is a request the seller accepts or declines;
 * accepting opens a contract (a MarketplaceAward) with one delivery milestone
 * due when the package promises, so delivery, revisions-by-conversation,
 * disputes and two-way reviews work exactly as they do for a project. A
 * service's reviews are the reviews its buyers left on those contracts, each
 * shown with what was paid and how long it took, as Fiverr shows them.
 *
 * Listings are moderated like every other listing on the site.
 *
 * NOT REACHABLE WHILE FEATURE_PROJECTS_V2 IS OFF — its router is gated once.
 */

export interface PackageInput {
  tier: PackageTier;
  name: string;
  description: string;
  price: bigint;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

export interface ServiceInput {
  title: string;
  description: string;
  workCategoryId?: string | null;
  skills?: string[];
  languages?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  requirements?: string[];
  currency?: string;
  packages: PackageInput[];
  extras?: Array<{ title: string; price: bigint; extraDays: number }>;
}

const MAX_SERVICES = 20;
const MAX_IMAGES = 6;

/**
 * A coherent set of packages: Basic always, each tier once, and dearer tiers
 * that are not cheaper or slower-to-promise-less than the one below — a
 * "Premium" that costs less than "Basic" is a typo the buyer would trust.
 */
function assertPackages(packages: PackageInput[]): void {
  const tiers = packages.map((pkg) => pkg.tier);
  if (!tiers.includes('BASIC')) throw new AppError('بستهٔ پایه الزامی است.', 400);
  if (new Set(tiers).size !== tiers.length) throw new AppError('هر بسته فقط یک بار.', 400);
  const ordered = PACKAGE_TIERS.flatMap((tier) => packages.filter((pkg) => pkg.tier === tier));
  for (let index = 1; index < ordered.length; index++) {
    if (ordered[index].price < ordered[index - 1].price) {
      throw new AppError('قیمت هر بسته نباید از بستهٔ پایین‌ترش کمتر باشد.', 400);
    }
  }
}

function packageRows(input: ServiceInput) {
  return input.packages.map((pkg) => ({
    tier: pkg.tier,
    name: pkg.name,
    description: pkg.description,
    price: pkg.price,
    currency: input.currency ?? 'IRT',
    deliveryDays: pkg.deliveryDays,
    revisions: pkg.revisions,
    features: pkg.features,
  }));
}

function extraRows(input: ServiceInput) {
  return (input.extras ?? []).map((extra, position) => ({ ...extra, position }));
}

// ---------------------------------------------------------------------------
// The seller
// ---------------------------------------------------------------------------

export async function createService(ownerId: string, input: ServiceInput, images: IncomingFile[]) {
  await assertVerified(ownerId);
  await assertMarketplaceAllowed(ownerId);
  assertPackages(input.packages);
  if (input.workCategoryId) await assertWorkCategoryUsable(input.workCategoryId);
  if (images.length > MAX_IMAGES) throw new AppError(`حداکثر ${MAX_IMAGES} تصویر.`, 400);

  const count = await prisma.service.count({ where: { ownerId } });
  if (count >= MAX_SERVICES) throw new AppError(`حداکثر ${MAX_SERVICES} خدمت می‌توانید داشته باشید.`, 409);

  const stored = await storeFiles(images, IMAGE_EXTENSIONS);
  try {
    return await prisma.service.create({
      data: {
        code: generateTrackingCode(),
        ownerId,
        title: input.title,
        description: input.description,
        workCategoryId: input.workCategoryId ?? null,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        faqs: (input.faqs ?? []) as Prisma.InputJsonValue,
        requirements: input.requirements ?? [],
        moderationStatus: 'DRAFT',
        packages: { create: packageRows(input) },
        extras: { create: extraRows(input) },
        images: {
          create: stored.map((file, position) => ({
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            position,
          })),
        },
      },
      select: { id: true, code: true, moderationStatus: true },
    });
  } catch (error) {
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
}

async function requireOwnService(ownerId: string, serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, ownerId: true, moderationStatus: true, state: true, title: true },
  });
  if (!service || service.ownerId !== ownerId) throw new AppError('این خدمت پیدا نشد.', 404);
  return service;
}

/**
 * Editing. Drafts and send-backs are edited in place; a live service may be
 * edited too, and goes back to the reviewers — what the buyer reads is what
 * staff approved, as for every listing here.
 */
export async function updateService(
  ownerId: string,
  serviceId: string,
  input: ServiceInput,
  newImages: IncomingFile[],
  removeImageIds: string[],
) {
  const service = await requireOwnService(ownerId, serviceId);
  if (service.moderationStatus === 'PENDING_REVIEW') {
    throw new AppError('این خدمت در حال بررسی است و تا پایان بررسی قابل ویرایش نیست.', 409);
  }
  assertPackages(input.packages);
  if (input.workCategoryId) await assertWorkCategoryUsable(input.workCategoryId);

  const existingImages = await prisma.serviceImage.findMany({
    where: { serviceId },
    select: { id: true, storedName: true },
  });
  const removing = existingImages.filter((image) => removeImageIds.includes(image.id));
  if (existingImages.length - removing.length + newImages.length > MAX_IMAGES) {
    throw new AppError(`حداکثر ${MAX_IMAGES} تصویر.`, 400);
  }

  const stored = await storeFiles(newImages, IMAGE_EXTENSIONS);
  const relive = service.moderationStatus === 'APPROVED';
  try {
    await prisma.$transaction([
      prisma.servicePackage.deleteMany({ where: { serviceId } }),
      prisma.serviceExtra.deleteMany({ where: { serviceId } }),
      prisma.serviceImage.deleteMany({ where: { id: { in: removing.map((image) => image.id) } } }),
      prisma.service.update({
        where: { id: serviceId },
        data: {
          title: input.title,
          description: input.description,
          workCategoryId: input.workCategoryId ?? null,
          skills: input.skills ?? [],
          languages: input.languages ?? [],
          faqs: (input.faqs ?? []) as Prisma.InputJsonValue,
          requirements: input.requirements ?? [],
          ...(relive ? { moderationStatus: 'PENDING_REVIEW' as const, submittedAt: new Date() } : {}),
          packages: { create: packageRows(input) },
          extras: { create: extraRows(input) },
          images: {
            create: stored.map((file, index) => ({
              originalName: file.originalName,
              storedName: file.storedName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              checksum: file.checksum,
              position: existingImages.length + index,
            })),
          },
        },
      }),
    ]);
  } catch (error) {
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
  await Promise.all(removing.map((image) => removeFile(image.storedName)));
  return { id: serviceId, moderationStatus: relive ? 'PENDING_REVIEW' : service.moderationStatus };
}

export async function submitService(ownerId: string, serviceId: string) {
  const service = await requireOwnService(ownerId, serviceId);
  assertSubmittable(service.moderationStatus);
  await assertVerified(ownerId);
  return prisma.service.update({
    where: { id: serviceId },
    data: { moderationStatus: 'PENDING_REVIEW', submittedAt: new Date() },
    select: { id: true, moderationStatus: true },
  });
}

/** Paused: off the catalogue, nothing lost — for a seller who is busy or away. */
export async function setServiceState(ownerId: string, serviceId: string, state: 'ACTIVE' | 'PAUSED') {
  await requireOwnService(ownerId, serviceId);
  return prisma.service.update({ where: { id: serviceId }, data: { state }, select: { id: true, state: true } });
}

/** Deleting is for services nobody ordered; one with history is paused instead. */
export async function deleteService(ownerId: string, serviceId: string) {
  await requireOwnService(ownerId, serviceId);
  const orders = await prisma.serviceOrder.count({ where: { serviceId } });
  if (orders > 0) throw new AppError('این خدمت سفارش داشته است؛ به‌جای حذف، آن را متوقف کنید.', 409);
  const images = await prisma.serviceImage.findMany({ where: { serviceId }, select: { storedName: true } });
  await prisma.service.delete({ where: { id: serviceId } });
  await Promise.all(images.map((image) => removeFile(image.storedName)));
  return { id: serviceId };
}

const SERVICE_DETAIL_SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  workCategoryId: true,
  workCategory: { select: { id: true, slug: true, name: true, nameEn: true, parentId: true } },
  skills: true,
  languages: true,
  faqs: true,
  requirements: true,
  moderationStatus: true,
  reviewNote: true,
  state: true,
  featured: true,
  viewCount: true,
  createdAt: true,
  ownerId: true,
  packages: {
    orderBy: { price: 'asc' },
    select: { id: true, tier: true, name: true, description: true, price: true, currency: true, deliveryDays: true, revisions: true, features: true },
  },
  extras: { orderBy: { position: 'asc' }, select: { id: true, title: true, price: true, extraDays: true } },
  images: { orderBy: { position: 'asc' }, select: { id: true, originalName: true } },
} as const satisfies Prisma.ServiceSelect;

/** The seller's own services, with the numbers their dashboard shows. */
export async function listOwnServices(ownerId: string) {
  const rows = await prisma.service.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    select: SERVICE_DETAIL_SELECT,
  });
  const ids = rows.map((row) => row.id);
  const [orders, ratings] = await Promise.all([
    prisma.serviceOrder.groupBy({ by: ['serviceId', 'status'], where: { serviceId: { in: ids } }, _count: { _all: true } }),
    serviceRatings(ids),
  ]);
  return rows.map((row) => ({
    ...row,
    orders: Object.fromEntries(
      orders.filter((entry) => entry.serviceId === row.id).map((entry) => [entry.status, entry._count._all]),
    ),
    rating: ratings.get(row.id) ?? { avg: 0, count: 0 },
  }));
}

export async function getOwnService(ownerId: string, serviceId: string) {
  await requireOwnService(ownerId, serviceId);
  return prisma.service.findUnique({ where: { id: serviceId }, select: SERVICE_DETAIL_SELECT });
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

const LIVE_SERVICE_WHERE = {
  moderationStatus: 'APPROVED',
  state: 'ACTIVE',
  owner: { deletedAt: null, marketplacePaused: false },
} as const satisfies Prisma.ServiceWhereInput;

/** Average rating and count per service, from its buyers' reviews of the seller. */
async function serviceRatings(serviceIds: string[]): Promise<Map<string, { avg: number; count: number }>> {
  if (serviceIds.length === 0) return new Map();
  const orders = await prisma.serviceOrder.findMany({
    where: { serviceId: { in: serviceIds }, status: 'ACCEPTED' },
    select: { serviceId: true, sellerId: true, award: { select: { id: true } } },
  });
  const awardToService = new Map(
    orders.flatMap((order) => (order.award ? [[order.award.id, { serviceId: order.serviceId, sellerId: order.sellerId }] as const] : [])),
  );
  const reviews = await prisma.marketplaceReview.findMany({
    where: { awardId: { in: [...awardToService.keys()] } },
    select: { awardId: true, rateeId: true, rating: true },
  });
  const tally = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const owner = awardToService.get(review.awardId);
    // Only the buyer's review of the seller rates the service.
    if (!owner || review.rateeId !== owner.sellerId) continue;
    const entry = tally.get(owner.serviceId) ?? { sum: 0, count: 0 };
    entry.sum += review.rating;
    entry.count += 1;
    tally.set(owner.serviceId, entry);
  }
  return new Map(
    [...tally].map(([id, entry]) => [id, { avg: Math.round((entry.sum / entry.count) * 10) / 10, count: entry.count }]),
  );
}

export interface ServiceCatalogQuery {
  page: number;
  pageSize: number;
  search?: string;
  workCategoryId?: string;
  /** The starting (cheapest) price, in `currency`. */
  priceMin?: bigint;
  priceMax?: bigint;
  currency?: string;
  /** Some package delivers within this many days. */
  deliveryDays?: number;
  language?: string;
  sellerCountry?: string;
  sellerLevel?: FreelancerLevel;
  verifiedSeller?: boolean;
  featured?: boolean;
  sort?: 'recommended' | 'newest' | 'priceAsc' | 'priceDesc' | 'rating' | 'bestSelling';
  sellerUsername?: string;
}

const LEVEL_ORDER: FreelancerLevel[] = ['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED'];
const CATALOG_CANDIDATES = 600;

/**
 * The catalogue. Price, rating, best-selling and seller level are computed
 * from packages, reviews and contracts rather than stored, so the catalogue
 * filters and sorts over a bounded candidate set — plenty at this size, and
 * never a number that has drifted from what it summarises.
 */
export async function listPublicServices(query: ServiceCatalogQuery) {
  const and: Prisma.ServiceWhereInput[] = [LIVE_SERVICE_WHERE];
  if (query.search) {
    const needle = query.search.trim();
    and.push({
      OR: [
        { title: { contains: needle, mode: 'insensitive' } },
        { description: { contains: needle, mode: 'insensitive' } },
        { skills: { has: needle } },
      ],
    });
  }
  if (query.workCategoryId) and.push({ workCategoryId: { in: await workCategoryScope(query.workCategoryId) } });
  if (query.language) and.push({ languages: { has: query.language } });
  if (query.sellerCountry) and.push({ owner: { country: query.sellerCountry } });
  if (query.verifiedSeller) and.push({ owner: { verification: { status: 'APPROVED' } } });
  if (query.featured) and.push({ featured: true });
  if (query.sellerUsername) and.push({ owner: { username: query.sellerUsername } });
  if (query.deliveryDays) and.push({ packages: { some: { deliveryDays: { lte: query.deliveryDays } } } });
  if (query.currency) and.push({ packages: { some: { tier: 'BASIC', currency: query.currency } } });
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    and.push({
      packages: {
        some: {
          tier: 'BASIC',
          ...(query.priceMin !== undefined ? { price: { gte: query.priceMin } } : {}),
          ...(query.priceMax !== undefined ? { price: { lte: query.priceMax } } : {}),
        },
      },
    });
  }

  const rows = await prisma.service.findMany({
    where: { AND: and },
    orderBy: query.sort === 'newest' ? { createdAt: 'desc' } : [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: CATALOG_CANDIDATES,
    select: {
      id: true,
      code: true,
      title: true,
      featured: true,
      createdAt: true,
      ownerId: true,
      languages: true,
      workCategory: { select: { id: true, slug: true, name: true, nameEn: true } },
      packages: { select: { tier: true, price: true, currency: true, deliveryDays: true } },
      images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
      _count: { select: { orders: { where: { status: 'ACCEPTED' } } } },
    },
  });

  const ownerIds = [...new Set(rows.map((row) => row.ownerId))];
  const [ratings, stats, profiles] = await Promise.all([
    serviceRatings(rows.map((row) => row.id)),
    freelancerStats(ownerIds),
    authorProfileSummaries(ownerIds),
  ]);

  let cards = rows.map(({ ownerId, packages, images, _count, ...row }) => {
    const basic = packages.find((pkg) => pkg.tier === 'BASIC') ?? packages[0];
    const seller = stats.get(ownerId);
    return {
      ...row,
      startingPrice: basic?.price.toString() ?? null,
      currency: basic?.currency ?? 'IRT',
      fastestDelivery: packages.length ? Math.min(...packages.map((pkg) => pkg.deliveryDays)) : null,
      packageCount: packages.length,
      coverImageId: images[0]?.id ?? null,
      ordersCompleted: _count.orders,
      rating: ratings.get(row.id) ?? { avg: 0, count: 0 },
      seller: {
        username: profiles.get(ownerId)?.username ?? null,
        level: seller?.level ?? 'NEW',
        verified: seller?.verified ?? false,
        country: seller?.country ?? 'IR',
        lastActiveAt: seller?.lastActiveAt ?? null,
      },
    };
  });

  if (query.sellerLevel) {
    const floor = LEVEL_ORDER.indexOf(query.sellerLevel);
    cards = cards.filter((card) => LEVEL_ORDER.indexOf(card.seller.level) >= floor);
  }

  const price = (card: (typeof cards)[number]) => BigInt(card.startingPrice ?? '0');
  switch (query.sort) {
    case 'priceAsc':
      cards.sort((a, b) => (price(a) < price(b) ? -1 : price(a) > price(b) ? 1 : 0));
      break;
    case 'priceDesc':
      cards.sort((a, b) => (price(a) > price(b) ? -1 : price(a) < price(b) ? 1 : 0));
      break;
    case 'rating':
      cards.sort((a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count);
      break;
    case 'bestSelling':
      cards.sort((a, b) => b.ordersCompleted - a.ordersCompleted);
      break;
    case 'recommended':
    case undefined:
      // Featured first, then a blend of rating confidence, sales and seller level.
      cards.sort((a, b) => recommendScore(b) - recommendScore(a));
      break;
    default:
      break;
  }

  const start = (query.page - 1) * query.pageSize;
  return toPage(cards.slice(start, start + query.pageSize), cards.length, query.page, query.pageSize);
}

function recommendScore(card: {
  featured: boolean;
  rating: { avg: number; count: number };
  ordersCompleted: number;
  seller: { level: FreelancerLevel };
}): number {
  // A Bayesian-style rating: five reviews at 5.0 should not outrank fifty at 4.9.
  const prior = 4;
  const confidence = (card.rating.avg * card.rating.count + prior * 3) / (card.rating.count + 3);
  return (
    (card.featured ? 10 : 0) +
    confidence * 2 +
    Math.log10(1 + card.ordersCompleted) * 2 +
    LEVEL_ORDER.indexOf(card.seller.level)
  );
}

/** One service, with everything its page shows. */
export async function getPublicService(code: string) {
  const where = { code: code.trim().toUpperCase(), ...LIVE_SERVICE_WHERE };
  try {
    await prisma.service.updateMany({ where, data: { viewCount: { increment: 1 } } });
  } catch {
    // Reading beats counting.
  }
  const service = await prisma.service.findFirst({ where, select: SERVICE_DETAIL_SELECT });
  if (!service) throw new AppError('این خدمت پیدا نشد.', 404);

  const { ownerId, moderationStatus: _status, reviewNote: _note, ...rest } = service;
  const [stats, profiles, owner, reviews, ratings, more, queue] = await Promise.all([
    freelancerStats([ownerId]),
    authorProfileSummaries([ownerId]),
    prisma.user.findUnique({ where: { id: ownerId }, select: { firstName: true, lastName: true, bio: true } }),
    serviceReviews(service.id, ownerId),
    serviceRatings([service.id]),
    prisma.service.findMany({
      where: { ...LIVE_SERVICE_WHERE, ownerId, id: { not: service.id } },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: { code: true, title: true, packages: { where: { tier: 'BASIC' }, select: { price: true, currency: true } } },
    }),
    // "Orders in queue", as Fiverr shows it: work the seller has taken on and not finished.
    prisma.serviceOrder.count({ where: { sellerId: ownerId, status: 'ACCEPTED', award: { status: 'ACTIVE' } } }),
  ]);

  return {
    ...rest,
    rating: ratings.get(service.id) ?? { avg: 0, count: 0 },
    reviews,
    seller: {
      profile: profiles.get(ownerId) ?? null,
      displayName: owner ? `${owner.firstName} ${owner.lastName.charAt(0)}.` : null,
      bio: owner?.bio ?? null,
      stats: stats.get(ownerId) ?? null,
      ordersInQueue: queue,
    },
    moreFromSeller: more.map((row) => ({
      code: row.code,
      title: row.title,
      startingPrice: row.packages[0]?.price.toString() ?? null,
      currency: row.packages[0]?.currency ?? 'IRT',
    })),
  };
}

/**
 * A service's reviews: what each buyer said, with the package's price range
 * and how long the work took — never who the buyer is beyond their country.
 */
async function serviceReviews(serviceId: string, sellerId: string) {
  const orders = await prisma.serviceOrder.findMany({
    where: { serviceId, status: 'ACCEPTED' },
    select: {
      price: true,
      currency: true,
      tier: true,
      createdAt: true,
      buyer: { select: { country: true } },
      award: { select: { id: true, completedAt: true } },
    },
  });
  const byAward = new Map(orders.flatMap((order) => (order.award ? [[order.award.id, order] as const] : [])));
  const reviews = await prisma.marketplaceReview.findMany({
    where: { awardId: { in: [...byAward.keys()] }, rateeId: sellerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { awardId: true, rating: true, text: true, createdAt: true },
  });

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((row) => row.rating === stars).length }));
  return {
    breakdown,
    items: reviews.map((review) => {
      const order = byAward.get(review.awardId)!;
      const days = order.award?.completedAt
        ? Math.max(1, Math.round((order.award.completedAt.getTime() - order.createdAt.getTime()) / 86_400_000))
        : null;
      return {
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt,
        tier: order.tier,
        price: order.price.toString(),
        currency: order.currency,
        durationDays: days,
        buyerCountry: order.buyer.country,
      };
    }),
  };
}

export async function getServiceImage(imageId: string) {
  const image = await prisma.serviceImage.findFirst({
    where: { id: imageId, service: LIVE_SERVICE_WHERE },
    select: { storedName: true, mimeType: true, originalName: true },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  return image;
}

/** The seller's own image, whatever state the service is in, for the editor. */
export async function getOwnServiceImage(ownerId: string, imageId: string) {
  const image = await prisma.serviceImage.findFirst({
    where: { id: imageId, service: { ownerId } },
    select: { storedName: true, mimeType: true, originalName: true },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  return image;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderInput {
  tier: PackageTier;
  extraIds?: string[];
  requirementAnswers?: string[];
  note?: string;
}

/** A buyer asks for a package. The seller answers; nothing is charged. */
export async function placeOrder(buyerId: string, serviceId: string, input: OrderInput) {
  await assertVerified(buyerId);
  await assertMarketplaceAllowed(buyerId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, ...LIVE_SERVICE_WHERE },
    select: {
      id: true,
      ownerId: true,
      title: true,
      requirements: true,
      packages: { where: { tier: input.tier } },
      extras: true,
    },
  });
  if (!service) throw new AppError('این خدمت پیدا نشد یا فعال نیست.', 404);
  if (service.ownerId === buyerId) throw new AppError('نمی‌توانید خدمت خودتان را سفارش دهید.', 400);
  const pkg = service.packages[0];
  if (!pkg) throw new AppError('این بسته پیدا نشد.', 400);

  const answers = input.requirementAnswers ?? [];
  if (answers.length !== service.requirements.length || answers.some((answer) => !answer.trim())) {
    throw new AppError('لطفاً به همهٔ پرسش‌های فروشنده پاسخ دهید.', 400);
  }

  const chosen = service.extras.filter((extra) => input.extraIds?.includes(extra.id));
  if (chosen.length !== new Set(input.extraIds ?? []).size) throw new AppError('یکی از امکانات انتخاب‌شده پیدا نشد.', 400);

  const open = await prisma.serviceOrder.count({ where: { serviceId, buyerId, status: 'REQUESTED' } });
  if (open > 0) throw new AppError('سفارش قبلی شما برای این خدمت هنوز منتظر پاسخ فروشنده است.', 409);

  const order = await prisma.serviceOrder.create({
    data: {
      code: generateTrackingCode(),
      serviceId,
      buyerId,
      sellerId: service.ownerId,
      tier: pkg.tier,
      packageName: pkg.name,
      price: pkg.price + chosen.reduce((sum, extra) => sum + extra.price, 0n),
      currency: pkg.currency,
      deliveryDays: pkg.deliveryDays + chosen.reduce((sum, extra) => sum + extra.extraDays, 0),
      revisions: pkg.revisions,
      extras: chosen.map((extra) => ({ title: extra.title, price: extra.price.toString(), extraDays: extra.extraDays })),
      requirementAnswers: answers,
      note: input.note?.trim() || null,
    },
    select: { id: true, code: true, status: true, price: true, deliveryDays: true },
  });

  notifySafely(service.ownerId, {
    type: 'service.order',
    title: 'سفارش تازه',
    body: `سفارش تازه‌ای برای «${service.title}» (${pkg.name}) رسید.`,
    link: '/dashboard/orders',
  });
  return order;
}

const ORDER_SELECT = {
  id: true,
  code: true,
  tier: true,
  packageName: true,
  price: true,
  currency: true,
  deliveryDays: true,
  revisions: true,
  extras: true,
  requirementAnswers: true,
  note: true,
  status: true,
  respondedAt: true,
  declineReason: true,
  createdAt: true,
  buyerId: true,
  sellerId: true,
  service: { select: { id: true, code: true, title: true, requirements: true, images: { take: 1, orderBy: { position: 'asc' }, select: { id: true } } } },
  award: { select: { id: true, status: true } },
} as const satisfies Prisma.ServiceOrderSelect;

/** Orders on either side: what I bought, what I was asked to deliver. */
export async function listOrders(userId: string, side: 'buyer' | 'seller') {
  const rows = await prisma.serviceOrder.findMany({
    where: side === 'buyer' ? { buyerId: userId } : { sellerId: userId },
    orderBy: { createdAt: 'desc' },
    select: ORDER_SELECT,
  });
  const otherIds = rows.map((row) => (side === 'buyer' ? row.sellerId : row.buyerId));
  const profiles = await authorProfileSummaries([...new Set(otherIds)]);
  return rows.map(({ buyerId, sellerId, ...row }) => ({
    ...row,
    counterparty: profiles.get(side === 'buyer' ? sellerId : buyerId) ?? null,
  }));
}

/**
 * The seller takes the order on: a contract opens with one delivery milestone
 * due when the package promised, so the rest of the work happens where every
 * other contract's does.
 */
export async function acceptOrder(sellerId: string, orderId: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      sellerId: true,
      buyerId: true,
      status: true,
      price: true,
      currency: true,
      deliveryDays: true,
      revisions: true,
      packageName: true,
      service: { select: { title: true } },
    },
  });
  if (!order || order.sellerId !== sellerId) throw new AppError('این سفارش پیدا نشد.', 404);
  if (order.status !== 'REQUESTED') throw new AppError('به این سفارش پیش‌تر پاسخ داده شده است.', 409);

  const revisions = order.revisions === UNLIMITED_REVISIONS ? 'نامحدود' : String(order.revisions);
  const award = await prisma.$transaction(async (tx) => {
    await tx.serviceOrder.update({ where: { id: orderId }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
    const created = await tx.marketplaceAward.create({
      data: {
        serviceOrderId: orderId,
        agreedAmount: order.price,
        currency: order.currency,
        awardedById: order.buyerId,
      },
      select: { id: true },
    });
    await tx.marketplaceMilestone.create({
      data: {
        awardId: created.id,
        order: 1,
        title: `تحویل — ${order.packageName}`,
        description: `بازبینی: ${revisions}`,
        dueDate: new Date(Date.now() + order.deliveryDays * 86_400_000),
      },
    });
    return created;
  });

  notifySafely(order.buyerId, {
    type: 'service.order.accepted',
    title: 'سفارش شما پذیرفته شد',
    body: `فروشنده سفارش «${order.service.title}» را پذیرفت. پیگیری در بخش همکاری‌ها.`,
    link: '/dashboard/awards',
  });
  return { id: orderId, status: 'ACCEPTED' as const, awardId: award.id };
}

export async function declineOrder(sellerId: string, orderId: string, reason: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { sellerId: true, buyerId: true, status: true, service: { select: { title: true } } },
  });
  if (!order || order.sellerId !== sellerId) throw new AppError('این سفارش پیدا نشد.', 404);
  if (order.status !== 'REQUESTED') throw new AppError('به این سفارش پیش‌تر پاسخ داده شده است.', 409);
  const updated = await prisma.serviceOrder.update({
    where: { id: orderId },
    data: { status: 'DECLINED', respondedAt: new Date(), declineReason: reason.trim() },
    select: { id: true, status: true },
  });
  notifySafely(order.buyerId, {
    type: 'service.order.declined',
    title: 'سفارش شما پذیرفته نشد',
    body: `فروشنده نتوانست سفارش «${order.service.title}» را بپذیرد: ${reason.trim()}`,
    link: '/dashboard/orders',
  });
  return updated;
}

export async function cancelOrder(buyerId: string, orderId: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { buyerId: true, status: true },
  });
  if (!order || order.buyerId !== buyerId) throw new AppError('این سفارش پیدا نشد.', 404);
  if (order.status !== 'REQUESTED') throw new AppError('این سفارش دیگر قابل لغو نیست.', 409);
  return prisma.serviceOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', respondedAt: new Date() },
    select: { id: true, status: true },
  });
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function listServicesForReview(query: { status?: string; search?: string; page: number; pageSize: number }) {
  const where: Prisma.ServiceWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
    ...searchWhere(query.search, ['title', 'code', ['owner', 'email']]),
  };
  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { submittedAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...SERVICE_DETAIL_SELECT,
        submittedAt: true,
        internalNote: true,
        owner: { select: { id: true, email: true, firstName: true, lastName: true, username: true } },
      },
    }),
    prisma.service.count({ where }),
  ]);
  return toPage(items, total, query.page, query.pageSize);
}

export async function reviewService(
  serviceId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, ownerId: true, title: true, moderationStatus: true },
  });
  if (!service) throw new AppError('این خدمت پیدا نشد.', 404);
  assertReviewable(service.moderationStatus);

  const { publishedAt: _ignored, ...patch } = reviewPatch(decision, reviewer, notes, new Date());
  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: patch,
    select: { id: true, moderationStatus: true },
  });
  notifySafely(service.ownerId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'خدمت شما منتشر شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'خدمت شما نیازمند اصلاح است'
          : 'خدمت شما رد شد',
    body: decision === 'APPROVED' ? `«${service.title}» تأیید و منتشر شد.` : `«${service.title}» — ${notes.reviewNote ?? ''}`,
    link: '/dashboard/services',
  });
  return updated;
}

export async function setServiceFeatured(serviceId: string, featured: boolean) {
  return prisma.service.update({
    where: { id: serviceId },
    data: { featured, featuredAt: featured ? new Date() : null },
    select: { id: true, featured: true },
  });
}

/** Staff may open any service's image, whatever its state. */
export async function getServiceImageForReview(imageId: string) {
  const image = await prisma.serviceImage.findUnique({
    where: { id: imageId },
    select: { storedName: true, mimeType: true, originalName: true },
  });
  if (!image) throw new AppError('این تصویر پیدا نشد.', 404);
  return image;
}

