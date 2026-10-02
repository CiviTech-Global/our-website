import type { ListingKind, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { boundingBox, distanceKm, type Point } from '../utils/geo.js';

/**
 * What the shop, product and category services share.
 *
 * In a module of its own because the three import each other otherwise, and an
 * import cycle between modules that export plain objects is how a constant
 * comes out `undefined` at startup — silently, and only in the order the
 * runtime happened to load things.
 */

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
 * Persian and Arabic-Indic digits as ASCII.
 *
 * An Iranian keyboard types ۰۹۱۲ for a phone number and ۱۲۰۰۰۰ for a price, and
 * both are as valid as their ASCII spelling. Normalised before validation rather
 * than refused after it: "the number you typed is not a number" is not an
 * answer anybody can act on.
 */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/** Prisma's unique-constraint failure, which a slug race can produce. */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002';
}

/**
 * Visible means the product is published AND its shop is.
 *
 * One predicate rather than a condition repeated at each call site: the day
 * somebody adds a public query and forgets the shop half, the catalogue of a
 * closed storefront goes back on sale.
 */
export const PUBLIC_PRODUCT_WHERE = {
  ...PUBLIC_LISTING_WHERE,
  business: PUBLIC_LISTING_WHERE,
} as const satisfies Prisma.ProductWhereInput;

/**
 * A category and its children, as ids.
 *
 * Choosing "Clothing" has to find the coats filed under "Clothing › Coats",
 * or a parent category is a filter that returns nothing. The tree is two levels
 * deep by rule (see the category service), so one level of children is all of
 * them. Inactive children are left out, as they are everywhere public.
 */
export async function categoryScope(categoryId: string): Promise<string[]> {
  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId, active: true },
    select: { id: true },
  });
  return [categoryId, ...children.map((child) => child.id)];
}

/** The product-side filters a shop query can also ask about. */
export interface CatalogueFilter {
  kind?: ListingKind;
  categoryId?: string;
}

/**
 * The public products matching a kind and a category, as a where clause.
 *
 * Returned rather than applied so the shop queries can use it under
 * `products: { some: … }` — "shops that sell services", "shops with something
 * in Clothing" — and the product queries can use it directly.
 */
export async function catalogueWhere(filter: CatalogueFilter): Promise<Prisma.ProductWhereInput> {
  return {
    ...PUBLIC_PRODUCT_WHERE,
    ...(filter.kind ? { kind: filter.kind } : {}),
    ...(filter.categoryId ? { categoryId: { in: await categoryScope(filter.categoryId) } } : {}),
  };
}

/**
 * Which kinds of thing each shop offers publicly.
 *
 * A badge on the card — "products", "services", or both — so a buyer after a
 * haircut can tell the barber from the shop that sells combs without opening
 * either. One grouped query for the whole page rather than one per shop.
 */
export async function shopKinds(shopIds: string[]): Promise<Map<string, ListingKind[]>> {
  const result = new Map<string, ListingKind[]>();
  if (shopIds.length === 0) return result;

  const rows = await prisma.product.groupBy({
    by: ['businessId', 'kind'],
    where: { ...PUBLIC_PRODUCT_WHERE, businessId: { in: shopIds } },
  });

  for (const row of rows) {
    const kinds = result.get(row.businessId) ?? [];
    kinds.push(row.kind);
    result.set(row.businessId, kinds.sort());
  }
  return result;
}

/**
 * How many public shops a radius search may consider before it stops being
 * exhaustive.
 *
 * Beyond this the answer is "the nearest of the first N in the box" rather than
 * "the nearest N", which is a real difference and worth naming. A catalogue of
 * local shops does not reach it; one that does wants PostGIS and a different
 * query, not a bigger number here.
 */
export const MAX_RADIUS_CANDIDATES = 2000;

/** The widest radius a caller may ask for, in kilometres. */
export const MAX_RADIUS_KM = 200;

/** What the radius search returns for each shop it keeps. */
export interface ShopDistance {
  id: string;
  distanceKm: number;
}

/**
 * Public shops within a radius of a point, nearest first.
 *
 * A bounding box narrows it in the database, then the exact great-circle
 * distance trims the box's corners off — the box is a rectangle and the radius
 * is a circle. Sorted by distance alone: on a "near me" search the nearest shop
 * is the answer, and putting a featured one ahead of it is how a list comes to
 * show 0.7 km above 0.4 km.
 */
export async function shopsWithinRadius(
  where: Prisma.BusinessWhereInput,
  centre: Point,
  radiusKm: number
): Promise<ShopDistance[]> {
  const radius = Math.min(radiusKm, MAX_RADIUS_KM);
  const box = boundingBox(centre, radius);

  const longitude: Prisma.BusinessWhereInput = box.crossesAntimeridian
    ? // Two ranges, because the box wraps: everything east of the minimum OR
      // everything west of the maximum.
      { OR: [{ longitude: { gte: box.minLongitude } }, { longitude: { lte: box.maxLongitude } }] }
    : { longitude: { gte: box.minLongitude, lte: box.maxLongitude } };

  const candidates = await prisma.business.findMany({
    where: { AND: [where, { latitude: { gte: box.minLatitude, lte: box.maxLatitude } }, longitude] },
    take: MAX_RADIUS_CANDIDATES,
    select: { id: true, latitude: true, longitude: true },
  });

  return candidates
    .filter((shop) => shop.latitude !== null && shop.longitude !== null)
    .map((shop) => ({
      id: shop.id,
      distanceKm: distanceKm(centre, {
        latitude: shop.latitude as number,
        longitude: shop.longitude as number,
      }),
    }))
    .filter((row) => row.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * How far away the nearest matching shop is, ignoring the radius.
 *
 * Asked only when a radius search came back empty. "Nothing within 25 km" with
 * no further word reads as a broken feature; "the nearest is 142 km away" tells
 * the reader what to do next, and the page offers to widen the circle.
 */
export async function nearestShopKm(
  where: Prisma.BusinessWhereInput,
  centre: Point
): Promise<number | null> {
  const shops = await prisma.business.findMany({
    where: { AND: [where, { latitude: { not: null } }, { longitude: { not: null } }] },
    take: MAX_RADIUS_CANDIDATES,
    select: { latitude: true, longitude: true },
  });

  let nearest: number | null = null;
  for (const shop of shops) {
    const km = distanceKm(centre, {
      latitude: shop.latitude as number,
      longitude: shop.longitude as number,
    });
    if (nearest === null || km < nearest) nearest = km;
  }
  return nearest === null ? null : roundKm(nearest);
}

/** Rounded to 100 m: a precise figure implies precision this does not have. */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}
