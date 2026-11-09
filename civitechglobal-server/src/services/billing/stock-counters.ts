import type { ModerationStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import type { FeatureKey } from '../../catalog/plan-catalog.js';
import type { Holder } from './quota.service.js';

/**
 * What "live" means for each STOCK feature.
 *
 * Counted from the listings themselves rather than from a ledger of slots, so
 * a listing closed by its owner, refused by staff or removed by any other route
 * frees its slot without anyone remembering to give it back. Waiting for review
 * counts: it is about to be live, and not counting it lets somebody queue past
 * the limit.
 */

const OCCUPYING: ModerationStatus[] = ['PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'];

export type StockFeature = 'business.shops' | 'business.items' | 'user.service_listings' | 'user.book_listings';

export const STOCK_FEATURES: StockFeature[] = [
  'business.shops',
  'business.items',
  'user.service_listings',
  'user.book_listings',
];

export function isStockFeature(key: FeatureKey): key is StockFeature {
  return (STOCK_FEATURES as string[]).includes(key);
}

/** Live count for a STOCK feature, optionally leaving one listing out (the one being published). */
export async function countLive(feature: StockFeature, userId: string, exceptId?: string): Promise<number> {
  const not = exceptId ? { NOT: { id: exceptId } } : {};
  switch (feature) {
    case 'business.shops':
      return prisma.business.count({
        where: { ownerId: userId, moderationStatus: { in: OCCUPYING }, state: { not: 'CLOSED' }, ...not },
      });
    case 'business.items':
      // Products publish without a review step, so PENDING_REVIEW only occurs
      // after the desk asked for changes; APPROVED and OPEN is what is on sale.
      return prisma.product.count({
        where: {
          business: { ownerId: userId },
          moderationStatus: { in: ['APPROVED', 'PENDING_REVIEW'] },
          state: 'OPEN',
          ...not,
        },
      });
    case 'user.service_listings':
      return prisma.service.count({
        where: { ownerId: userId, moderationStatus: { in: OCCUPYING }, state: 'ACTIVE', ...not },
      });
    case 'user.book_listings':
      return prisma.bookListing.count({
        where: {
          sellerId: userId,
          // The company's own shelf is not a member's listing.
          postedByCompany: false,
          moderationStatus: { in: OCCUPYING },
          state: 'OPEN',
          ...not,
        },
      });
  }
}

/** The holder a STOCK feature belongs to. All four are held by an account. */
export function stockHolder(feature: StockFeature, userId: string): Holder {
  return feature.startsWith('business.') ? { subject: 'BUSINESS', userId } : { subject: 'USER', userId };
}
