import { Prisma, type PlanSubject, type PlanTier } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  PERIOD_DISCOUNT_PERCENT,
  PLAN_CATALOG,
  PLAN_TIERS,
  isFeatureKey,
  type FeatureKey,
  type PlanTierKey,
} from '../../catalog/plan-catalog.js';

/**
 * The plan catalogue: features, their levels per tier, and prices.
 *
 * Limits come from catalog/plan-catalog.ts and are re-applied on every seed.
 * Prices never come from code; they are set by staff, and survive re-seeding.
 */

/** Writes features and limits from the code catalogue. Prices are left alone. */
export async function seedPlanCatalog(): Promise<{ features: number; levels: number }> {
  let levels = 0;
  for (const [index, def] of PLAN_CATALOG.entries()) {
    const feature = await prisma.planFeature.upsert({
      where: { key: def.key },
      create: { key: def.key, subject: def.subject, name: def.name, nameEn: def.nameEn, sortOrder: index },
      update: { subject: def.subject, name: def.name, nameEn: def.nameEn, sortOrder: index },
      select: { id: true },
    });
    for (const tier of PLAN_TIERS) {
      const level = def.levels[tier];
      await prisma.planFeatureLevel.upsert({
        where: { featureId_tier: { featureId: feature.id, tier } },
        create: {
          featureId: feature.id,
          tier,
          kind: level.kind,
          limit: level.limit,
          liveDays: level.liveDays ?? null,
          // Free is free. Paid levels start unpriced: not purchasable until set.
          priceIrt: tier === 'FREE' ? 0n : null,
        },
        update: { kind: level.kind, limit: level.limit, liveDays: level.liveDays ?? null },
      });
      levels += 1;
    }
  }
  return { features: PLAN_CATALOG.length, levels };
}

export interface CatalogLevel {
  tier: PlanTier;
  kind: string;
  limit: number | null;
  liveDays: number | null;
  /** Toman, as a string: BigInt does not survive JSON. */
  priceIrt: string | null;
  priceUsdt: string | null;
}

export interface CatalogFeature {
  key: string;
  subject: PlanSubject;
  name: string;
  nameEn: string | null;
  levels: CatalogLevel[];
}

export interface CatalogTier {
  tier: PlanTier;
  /** Sum of the tier's monthly prices; null while any level is unpriced. */
  monthlyIrt: string | null;
  /** The same in USDT, for buyers outside Iran; shown, not yet purchasable. */
  monthlyUsdt: string | null;
}

export async function getCatalog(subject?: PlanSubject) {
  const rows = await prisma.planFeature.findMany({
    where: subject ? { subject } : {},
    orderBy: [{ subject: 'asc' }, { sortOrder: 'asc' }],
    select: {
      key: true,
      subject: true,
      name: true,
      nameEn: true,
      levels: {
        select: { tier: true, kind: true, limit: true, liveDays: true, priceIrt: true, priceUsdt: true },
      },
    },
  });

  const order = (tier: PlanTier) => PLAN_TIERS.indexOf(tier as PlanTierKey);
  const features: CatalogFeature[] = rows.map((row) => ({
    ...row,
    levels: [...row.levels]
      .sort((a, b) => order(a.tier) - order(b.tier))
      .map((level) => ({
        tier: level.tier,
        kind: level.kind,
        limit: level.limit,
        liveDays: level.liveDays,
        priceIrt: level.priceIrt === null ? null : level.priceIrt.toString(),
        priceUsdt: level.priceUsdt === null ? null : level.priceUsdt.toString(),
      })),
  }));

  const subjects = [...new Set(features.map((feature) => feature.subject))];
  const tiers: Record<string, CatalogTier[]> = {};
  for (const s of subjects) {
    tiers[s] = PLAN_TIERS.map((tier) => {
      let sum = 0n;
      // USDT in cents, so the sum is exact; the free tier is 0 in both.
      let cents = 0n;
      let complete = true;
      let completeUsdt = true;
      for (const feature of features.filter((f) => f.subject === s)) {
        const level = feature.levels.find((l) => l.tier === tier);
        if (!level || level.priceIrt === null) complete = false;
        else sum += BigInt(level.priceIrt);
        if (tier === 'FREE') continue;
        if (!level || level.priceUsdt === null) completeUsdt = false;
        else cents += BigInt(Math.round(Number(level.priceUsdt) * 100));
      }
      return {
        tier,
        monthlyIrt: complete ? sum.toString() : null,
        monthlyUsdt: completeUsdt ? (Number(cents) / 100).toFixed(2) : null,
      };
    });
  }

  return {
    features,
    tiers,
    periods: Object.entries(PERIOD_DISCOUNT_PERCENT).map(([months, discountPercent]) => ({
      months: Number(months),
      discountPercent,
    })),
  };
}

export interface PriceUpdate {
  featureKey: string;
  tier: PlanTier;
  /** Toman; null takes the level off sale. */
  priceIrt?: string | number | null;
  priceUsdt?: string | number | null;
}

/**
 * Sets prices. Staff only — the route checks the permission.
 *
 * Applies to future purchases only: a subscription freezes its prices.
 */
export async function setPrices(updates: PriceUpdate[]) {
  const applied: Array<{ featureKey: string; tier: PlanTier }> = [];
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      if (!isFeatureKey(update.featureKey)) throw new AppError(`ویژگی ناشناخته: ${update.featureKey}`, 400);
      if (update.tier === 'FREE' && update.priceIrt !== undefined && update.priceIrt !== null && BigInt(update.priceIrt) !== 0n) {
        throw new AppError('سطح رایگان قیمت ندارد.', 400);
      }
      const level = await tx.planFeatureLevel.findFirst({
        where: { tier: update.tier, feature: { key: update.featureKey } },
        select: { id: true },
      });
      if (!level) throw new AppError(`سطح ${update.tier} برای ${update.featureKey} وجود ندارد.`, 404);

      const priceIrt =
        update.priceIrt === undefined ? undefined : update.priceIrt === null ? null : BigInt(update.priceIrt);
      if (priceIrt !== undefined && priceIrt !== null && priceIrt < 0n) throw new AppError('قیمت منفی مجاز نیست.', 400);

      await tx.planFeatureLevel.update({
        where: { id: level.id },
        data: {
          ...(priceIrt !== undefined ? { priceIrt } : {}),
          ...(update.priceUsdt !== undefined
            ? { priceUsdt: update.priceUsdt === null ? null : new Prisma.Decimal(update.priceUsdt) }
            : {}),
        },
      });
      applied.push({ featureKey: update.featureKey, tier: update.tier });
    }
  });
  return { updated: applied.length };
}

/**
 * The level a feature has at a tier. For a purchase it must be priced — an
 * unpriced level is not on sale; a staff grant charges nothing and does not
 * care.
 */
export async function pricedLevel(featureKey: FeatureKey, tier: PlanTier, requirePrice = true) {
  const level = await prisma.planFeatureLevel.findFirst({
    where: { tier, feature: { key: featureKey } },
    select: { tier: true, kind: true, limit: true, liveDays: true, priceIrt: true, feature: { select: { subject: true } } },
  });
  if (!level) throw new AppError('این سطح در فهرست پلن‌ها نیست.', 404);
  if (requirePrice && level.priceIrt === null) {
    throw new AppError('این پلن هنوز برای فروش قیمت‌گذاری نشده است.', 409);
  }
  return level;
}
