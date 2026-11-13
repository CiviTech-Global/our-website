import type { PlanLimitKind, PlanSubject, PlanTier } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { FeatureKey } from '../../catalog/plan-catalog.js';

/**
 * The one gate every limited action goes through.
 *
 * Two shapes of limit, both decided by the holder's best active subscription
 * item for the feature, falling back to the FREE level in the catalogue:
 *
 *   useQuota    MONTHLY and LIFETIME features. Records one PlanUsage row per
 *               action, keyed by the thing that used it, so resubmitting the
 *               same post is never counted twice and a refused one can give
 *               its unit back (releaseQuota).
 *   assertStock STOCK features: how many are live right now. Nothing is
 *               recorded; closing a listing frees its slot by itself.
 *
 * useQuota counts and records inside one transaction under an advisory lock
 * on (holder, feature), so two requests racing for the last unit cannot both
 * get it. assertStock checks under the same lock, but the listing goes live in
 * the caller's own write afterwards, so two publishes in the same instant can
 * still both pass: a slot over the limit at worst, never a lost listing.
 *
 * Enforcement is a switch. With BILLING_ENFORCE off the gate measures —
 * recording WOULD_BLOCK events — and lets the action through, so limits can be
 * watched before they bite. On by default in development only.
 */

export type Holder =
  | { subject: 'USER'; userId: string }
  | { subject: 'BUSINESS'; userId: string }
  | { subject: 'COMPANY'; companyId: string };

export interface Entitlement {
  tier: PlanTier;
  kind: PlanLimitKind;
  /** null = unlimited. */
  limit: number | null;
  liveDays: number | null;
  /** Where it came from: a subscription, the free level, or nothing configured. */
  source: 'subscription' | 'free' | 'unconfigured';
}

export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function holderKey(holder: Holder): string {
  switch (holder.subject) {
    case 'USER':
      return `u:${holder.userId}`;
    case 'BUSINESS':
      return `b:${holder.userId}`;
    case 'COMPANY':
      return `c:${holder.companyId}`;
  }
}

/**
 * Read per call, not once at import, so a test can switch it and a deploy can
 * change it without anybody wondering which value a long-lived module caught.
 * Trimmed before the fallback: an empty value from a template means "unset".
 */
export function billingEnforced(): boolean {
  const raw = (process.env.BILLING_ENFORCE ?? '').trim().toLowerCase();
  if (raw) return raw === 'true';
  return process.env.NODE_ENV === 'development';
}

const TIER_RANK: Record<PlanTier, number> = { FREE: 0, PRO: 1, PREMIUM: 2, VIP: 3 };

/** A larger limit wins; unlimited beats any number. */
function better(a: Entitlement, b: Entitlement): Entitlement {
  if (a.limit === null) return a;
  if (b.limit === null) return b;
  if (a.limit !== b.limit) return a.limit > b.limit ? a : b;
  return TIER_RANK[a.tier] >= TIER_RANK[b.tier] ? a : b;
}

function holderWhere(holder: Holder) {
  return holder.subject === 'COMPANY'
    ? { subject: 'COMPANY' as const, companyId: holder.companyId }
    : { subject: holder.subject as PlanSubject, userId: holder.userId };
}

/**
 * What the holder may do for one feature, right now.
 *
 * Each subscription item keeps the limit it was sold or granted with, and is
 * also measured against its tier's level in the catalogue today: when staff
 * raise a tier, everybody already on it gets the raise, and when they lower
 * one, nobody loses what they hold until their period ends.
 */
export async function entitlementFor(holder: Holder, featureKey: FeatureKey, now = new Date()): Promise<Entitlement> {
  const [items, levels] = await Promise.all([
    prisma.planSubscriptionItem.findMany({
      where: {
        featureKey,
        subscription: {
          ...holderWhere(holder),
          status: 'ACTIVE',
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
      },
      select: { tier: true, kind: true, limit: true, liveDays: true },
    }),
    prisma.planFeatureLevel.findMany({
      where: { feature: { key: featureKey } },
      select: { tier: true, kind: true, limit: true, liveDays: true },
    }),
  ]);

  const current = new Map(levels.map((level) => [level.tier, level]));
  const free = current.get('FREE');
  let best: Entitlement | null = free ? { ...free, source: 'free' } : null;
  for (const item of items) {
    let candidate: Entitlement = { ...item, source: 'subscription' };
    const today = current.get(item.tier);
    // Same kind only: a raise is a bigger number of the same thing, and a
    // monthly allowance is not comparable with a stock of live listings.
    if (today && today.kind === item.kind) candidate = better(candidate, { ...today, source: 'subscription' });
    best = best ? better(best, candidate) : candidate;
  }

  if (!best) {
    // The catalogue was not seeded. Failing closed here would stop every post
    // and bid on the site because of a missing seed; the deploy seeds on every
    // run, so this is loud rather than fatal.
    logger.warn({ featureKey }, 'Plan feature not in the catalogue; allowing');
    return { tier: 'FREE', kind: 'MONTHLY', limit: null, liveDays: null, source: 'unconfigured' };
  }
  return best;
}

export interface QuotaExceededData {
  feature: FeatureKey;
  subject: Holder['subject'];
  limit: number;
  used: number;
  kind: PlanLimitKind;
  /** When the oldest counted use leaves the window; null for STOCK/LIFETIME. */
  resetsAt: string | null;
}

export function quotaExceeded(data: QuotaExceededData): AppError {
  const message =
    data.kind === 'STOCK'
      ? 'به سقف تعداد فعال در پلن فعلی رسیده‌اید. برای افزودن مورد جدید، پلن خود را ارتقا دهید یا یکی از موارد فعال را ببندید.'
      : data.kind === 'LIFETIME'
        ? 'سهم رایگان این بخش استفاده شده است. برای ادامه، یکی از پلن‌ها را انتخاب کنید.'
        : 'به سقف ماهانهٔ پلن فعلی رسیده‌اید. برای ادامه، پلن خود را ارتقا دهید.';
  return new AppError(message, 402, undefined, { code: 'QUOTA_EXCEEDED', data });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function lock(tx: Tx, key: string, featureKey: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${key}|${featureKey}`}))`;
}

async function recordEvent(
  tx: Tx,
  key: string,
  featureKey: string,
  outcome: 'BLOCKED' | 'WOULD_BLOCK',
  limit: number,
  used: number,
) {
  await tx.planQuotaEvent.create({ data: { holderKey: key, featureKey, outcome, limit, used } });
}

/**
 * Count one use of a MONTHLY or LIFETIME feature by `subjectId`.
 *
 * Returns the liveDays of the level that allowed it (the free first post's 45
 * days), or null. Idempotent per subject: a second call for the same subject
 * returns what the first recorded.
 *
 * Called on a STOCK feature it delegates to nothing and returns null — callers
 * do not need to know which kind a feature currently is.
 */
export async function useQuota(
  holder: Holder,
  featureKey: FeatureKey,
  subjectId: string,
  now = new Date(),
): Promise<{ liveDays: number | null }> {
  const key = holderKey(holder);
  const entitlement = await entitlementFor(holder, featureKey, now);
  if (entitlement.kind === 'STOCK') return { liveDays: null };

  // Thrown after the transaction has committed, so the BLOCKED event it
  // records is kept rather than rolled back with the refusal.
  let refusal: AppError | null = null;

  const result = await prisma.$transaction(async (tx) => {
    await lock(tx, key, featureKey);

    const existing = await tx.planUsage.findUnique({
      where: { featureKey_subjectId: { featureKey, subjectId } },
      select: { id: true, liveDays: true, releasedAt: true },
    });
    if (existing && !existing.releasedAt) return { liveDays: existing.liveDays };

    if (entitlement.limit !== null) {
      const since = entitlement.kind === 'MONTHLY' ? new Date(now.getTime() - MONTH_MS) : undefined;
      const counted = await tx.planUsage.findMany({
        where: {
          holderKey: key,
          featureKey,
          releasedAt: null,
          ...(since ? { createdAt: { gt: since } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      if (counted.length >= entitlement.limit) {
        const enforce = billingEnforced();
        await recordEvent(tx, key, featureKey, enforce ? 'BLOCKED' : 'WOULD_BLOCK', entitlement.limit, counted.length);
        if (enforce) {
          refusal = quotaExceeded({
            feature: featureKey,
            subject: holder.subject,
            limit: entitlement.limit,
            used: counted.length,
            kind: entitlement.kind,
            resetsAt:
              entitlement.kind === 'MONTHLY' && counted[0]
                ? new Date(counted[0].createdAt.getTime() + MONTH_MS).toISOString()
                : null,
          });
          return null;
        }
      }
    }

    const liveDays = entitlement.liveDays ?? null;
    if (existing) {
      // Given back once, used again: the same subject, counted afresh.
      await tx.planUsage.update({
        where: { id: existing.id },
        data: { holderKey: key, releasedAt: null, createdAt: now, liveDays },
      });
    } else {
      await tx.planUsage.create({ data: { holderKey: key, featureKey, subjectId, liveDays, createdAt: now } });
    }
    return { liveDays };
  });

  if (refusal) throw refusal;
  return result ?? { liveDays: null };
}

/**
 * Check a STOCK feature before one more goes live.
 *
 * `countLive` counts what is live now, excluding the item being published (it
 * is not live yet). See the note at the top on what the lock does and does not
 * cover here.
 */
export async function assertStock(
  holder: Holder,
  featureKey: FeatureKey,
  countLive: () => Promise<number>,
  now = new Date(),
): Promise<void> {
  const entitlement = await entitlementFor(holder, featureKey, now);
  if (entitlement.limit === null) return;
  const key = holderKey(holder);
  const limit = entitlement.limit;

  let refusal: AppError | null = null;
  await prisma.$transaction(async (tx) => {
    await lock(tx, key, featureKey);
    const live = await countLive();
    if (live < limit) return;

    const enforce = billingEnforced();
    await recordEvent(tx, key, featureKey, enforce ? 'BLOCKED' : 'WOULD_BLOCK', limit, live);
    if (enforce) {
      refusal = quotaExceeded({
        feature: featureKey,
        subject: holder.subject,
        limit,
        used: live,
        kind: 'STOCK',
        resetsAt: null,
      });
    }
  });
  if (refusal) throw refusal;
}

/** Give a unit back: the item that used it was refused by staff. */
export async function releaseQuota(featureKey: FeatureKey, subjectId: string): Promise<void> {
  await prisma.planUsage.updateMany({
    where: { featureKey, subjectId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

/** liveDays recorded for a subject's use, for the 45-day first post. */
export async function liveDaysFor(featureKey: FeatureKey, subjectId: string): Promise<number | null> {
  const row = await prisma.planUsage.findUnique({
    where: { featureKey_subjectId: { featureKey, subjectId } },
    select: { liveDays: true, releasedAt: true },
  });
  return row && !row.releasedAt ? row.liveDays : null;
}

/** Used counts for MONTHLY/LIFETIME features, for the billing page. */
export async function usedCount(holder: Holder, featureKey: FeatureKey, kind: PlanLimitKind, now = new Date()) {
  return prisma.planUsage.count({
    where: {
      holderKey: holderKey(holder),
      featureKey,
      releasedAt: null,
      ...(kind === 'MONTHLY' ? { createdAt: { gt: new Date(now.getTime() - MONTH_MS) } } : {}),
    },
  });
}
