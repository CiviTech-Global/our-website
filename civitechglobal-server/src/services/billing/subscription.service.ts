import type { PlanSubject, PlanTier, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { activeDriver, driverByName } from '../payment/index.js';
import { notifySafely } from '../notifications.service.js';
import {
  PERIOD_DISCOUNT_PERCENT,
  PLAN_CATALOG,
  type FeatureKey,
  type PlanSubjectKey,
} from '../../catalog/plan-catalog.js';
import { pricedLevel } from './catalog.service.js';
import { MONTH_MS, billingEnforced, entitlementFor, usedCount, type Holder } from './quota.service.js';
import { countLive, isStockFeature } from './stock-counters.js';

/**
 * Buying a tier, or a custom mix of levels, for a number of prepaid months.
 *
 * The flow mirrors order payments: checkout creates the subscription as
 * PENDING_PAYMENT and a payment intent, the buyer goes to the gateway, and only
 * a server-side verify activates it. Activation is a guarded transition, so a
 * refreshed return page or a second confirm cannot extend anything twice.
 *
 * The sandbox driver is the only gateway today; ZarinPal joins as a driver.
 */

export interface PlanSelection {
  subject: PlanSubjectKey;
  months: number;
  /** A whole tier... */
  tier?: Exclude<PlanTier, 'FREE'>;
  /** ...or a custom mix: one level per feature. Features left out stay free. */
  items?: Array<{ featureKey: string; tier: PlanTier }>;
}

export interface Quote {
  subject: PlanSubject;
  tier: PlanTier | null;
  months: number;
  discountPercent: number;
  items: Array<{
    featureKey: FeatureKey;
    tier: PlanTier;
    kind: string;
    limit: number | null;
    liveDays: number | null;
    monthlyPrice: bigint;
  }>;
  monthlyTotal: bigint;
  total: bigint;
}

function featuresOf(subject: PlanSubjectKey): FeatureKey[] {
  return PLAN_CATALOG.filter((feature) => feature.subject === subject).map((feature) => feature.key);
}

export async function quote(selection: PlanSelection, options: { requirePrice?: boolean } = {}): Promise<Quote> {
  const requirePrice = options.requirePrice ?? true;
  const discountPercent = PERIOD_DISCOUNT_PERCENT[selection.months];
  if (discountPercent === undefined) {
    throw new AppError('مدت اشتراک باید ۱، ۳، ۶ یا ۱۲ ماه باشد.', 400);
  }
  const allowed = featuresOf(selection.subject);

  let wanted: Array<{ featureKey: FeatureKey; tier: PlanTier }>;
  if (selection.tier) {
    wanted = allowed.map((featureKey) => ({ featureKey, tier: selection.tier! }));
  } else if (selection.items?.length) {
    const seen = new Set<string>();
    wanted = [];
    for (const item of selection.items) {
      if (!(allowed as string[]).includes(item.featureKey)) {
        throw new AppError(`«${item.featureKey}» جزو پلن‌های این بخش نیست.`, 400);
      }
      if (seen.has(item.featureKey)) throw new AppError('هر ویژگی فقط یک بار انتخاب می‌شود.', 400);
      seen.add(item.featureKey);
      // A free level bought is nothing bought; leave it out.
      if (item.tier !== 'FREE') wanted.push({ featureKey: item.featureKey as FeatureKey, tier: item.tier });
    }
  } else {
    throw new AppError('یک پلن یا دست‌کم یک مورد را انتخاب کنید.', 400);
  }
  if (wanted.length === 0) throw new AppError('دست‌کم یک مورد غیررایگان انتخاب کنید.', 400);

  const items: Quote['items'] = [];
  for (const { featureKey, tier } of wanted) {
    const level = await pricedLevel(featureKey, tier, requirePrice);
    items.push({
      featureKey,
      tier,
      kind: level.kind,
      limit: level.limit,
      liveDays: level.liveDays,
      monthlyPrice: level.priceIrt ?? 0n,
    });
  }

  const monthlyTotal = items.reduce((sum, item) => sum + item.monthlyPrice, 0n);
  // Whole Toman, rounded down in the buyer's favour.
  const total = (monthlyTotal * BigInt(selection.months) * BigInt(100 - discountPercent)) / 100n;

  return {
    subject: selection.subject,
    tier: selection.tier ?? null,
    months: selection.months,
    discountPercent,
    items,
    monthlyTotal,
    total,
  };
}

/** The holder a user may buy for, or a refusal. */
async function resolveHolder(userId: string, subject: PlanSubjectKey): Promise<Holder> {
  if (subject === 'USER' || subject === 'BUSINESS') return { subject, userId };
  const company = await prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!company) throw new AppError('این حساب صفحهٔ شرکت ندارد.', 404);
  return { subject: 'COMPANY', companyId: company.id };
}

function holderData(holder: Holder) {
  return holder.subject === 'COMPANY'
    ? { subject: 'COMPANY' as const, companyId: holder.companyId }
    : { subject: holder.subject, userId: holder.userId };
}

function itemRows(q: Quote): Prisma.PlanSubscriptionItemCreateWithoutSubscriptionInput[] {
  return q.items.map((item) => ({
    featureKey: item.featureKey,
    tier: item.tier,
    kind: item.kind as never,
    limit: item.limit,
    liveDays: item.liveDays,
    monthlyPrice: item.monthlyPrice,
  }));
}

export async function checkout(userId: string, selection: PlanSelection, returnUrl: string) {
  const holder = await resolveHolder(userId, selection.subject);
  const q = await quote(selection);

  const subscription = await prisma.planSubscription.create({
    data: {
      code: generateTrackingCode(),
      ...holderData(holder),
      status: 'PENDING_PAYMENT',
      source: 'PURCHASE',
      tier: q.tier,
      months: q.months,
      total: q.total,
      currency: 'IRT',
      items: { create: itemRows(q) },
    },
    select: { id: true, code: true },
  });

  const driver = activeDriver();
  const started = await driver.start({
    orderCode: subscription.code,
    amount: q.total,
    currency: 'IRT',
    returnUrl,
    description: `اشتراک ${subscription.code}`,
  });

  await prisma.paymentIntent.create({
    data: {
      purpose: 'SUBSCRIPTION',
      subscriptionId: subscription.id,
      payerUserId: userId,
      driver: driver.name,
      status: started.status,
      amount: q.total,
      currency: 'IRT',
      reference: started.reference,
      redirectUrl: started.redirectUrl,
    },
  });

  return {
    subscriptionId: subscription.id,
    code: subscription.code,
    total: q.total.toString(),
    redirectUrl: started.redirectUrl,
    reference: started.reference,
  };
}

/** Starts the paid period now. Guarded: only a PENDING_PAYMENT row moves. */
async function activate(subscriptionId: string, months: number, now = new Date()) {
  const { count } = await prisma.planSubscription.updateMany({
    where: { id: subscriptionId, status: 'PENDING_PAYMENT' },
    data: {
      status: 'ACTIVE',
      startsAt: now,
      endsAt: new Date(now.getTime() + months * MONTH_MS),
    },
  });
  return count === 1;
}

/**
 * Ask the gateway whether the money arrived, and activate on success.
 * Scoped to the payer; safe to call repeatedly.
 */
export async function confirmPayment(reference: string, payerUserId: string) {
  const intent = await prisma.paymentIntent.findFirst({
    where: { reference, purpose: 'SUBSCRIPTION', payerUserId },
    select: {
      id: true,
      driver: true,
      status: true,
      subscription: { select: { id: true, code: true, months: true, status: true } },
    },
  });
  if (!intent?.subscription) throw new AppError('این پرداخت پیدا نشد.', 404);

  if (intent.status === 'SUCCEEDED') {
    return { status: intent.status, subscriptionId: intent.subscription.id, code: intent.subscription.code };
  }

  const result = await driverByName(intent.driver).verify(reference);
  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      status: result.status,
      failureReason: result.failureReason,
      settledAt: result.status === 'SUCCEEDED' ? new Date() : null,
    },
  });

  if (result.status === 'SUCCEEDED' && (await activate(intent.subscription.id, intent.subscription.months))) {
    notifySafely(payerUserId, {
      type: 'billing.activated',
      title: 'اشتراک فعال شد',
      body: `اشتراک ${intent.subscription.code} فعال شد.`,
      link: '/dashboard/billing',
    });
  }
  if (result.status === 'FAILED') {
    await prisma.planSubscription.updateMany({
      where: { id: intent.subscription.id, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED' },
    });
  }

  return { status: result.status, subscriptionId: intent.subscription.id, code: intent.subscription.code };
}

/**
 * Staff grant: a founding member, a compensation, an account the desk opened.
 * Active at once, at no charge, and recorded with who gave it.
 */
export async function grant(
  staffId: string,
  input: PlanSelection & { userId?: string; companyId?: string; note?: string },
) {
  let holder: Holder;
  if (input.subject === 'COMPANY') {
    if (!input.companyId) throw new AppError('شرکت را مشخص کنید.', 400);
    const company = await prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true } });
    if (!company) throw new AppError('این شرکت پیدا نشد.', 404);
    holder = { subject: 'COMPANY', companyId: company.id };
  } else {
    if (!input.userId) throw new AppError('کاربر را مشخص کنید.', 400);
    const user = await prisma.user.findFirst({ where: { id: input.userId, deletedAt: null }, select: { id: true } });
    if (!user) throw new AppError('این کاربر پیدا نشد.', 404);
    holder = { subject: input.subject, userId: user.id };
  }

  // A grant is free, so an unpriced level can be given.
  const q = await quote(input, { requirePrice: false });
  const now = new Date();
  const created = await prisma.planSubscription.create({
    data: {
      code: generateTrackingCode(),
      ...holderData(holder),
      status: 'ACTIVE',
      source: 'STAFF_GRANT',
      tier: q.tier,
      months: q.months,
      startsAt: now,
      endsAt: new Date(now.getTime() + q.months * MONTH_MS),
      total: 0n,
      grantedById: staffId,
      note: input.note?.trim() || null,
      items: { create: itemRows(q) },
    },
    select: { id: true, code: true, status: true, startsAt: true, endsAt: true },
  });
  const recipient = holder.subject === 'COMPANY' ? await companyOwner(holder.companyId) : holder.userId;
  if (recipient) {
    notifySafely(recipient, {
      type: 'billing.granted',
      title: 'یک پلن به شما اعطا شد',
      body: `پلن ${created.code} از طرف پشتیبانی برای ${q.months} ماه فعال شد.`,
      link: '/dashboard/billing',
    });
  }
  return created;
}

async function companyOwner(companyId: string): Promise<string | null> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { ownerId: true } });
  return company?.ownerId ?? null;
}

export async function cancelForStaff(subscriptionId: string) {
  const row = await prisma.planSubscription.findUnique({
    where: { id: subscriptionId },
    select: { status: true, code: true, userId: true, companyId: true },
  });
  if (!row) throw new AppError('این اشتراک پیدا نشد.', 404);
  if (row.status === 'CANCELLED') return { id: subscriptionId, status: row.status };
  const cancelled = await prisma.planSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED' },
    select: { id: true, status: true },
  });
  const recipient = row.userId ?? (row.companyId ? await companyOwner(row.companyId) : null);
  if (recipient) {
    notifySafely(recipient, {
      type: 'billing.cancelled',
      title: 'اشتراک شما لغو شد',
      body: `اشتراک ${row.code} از طرف پشتیبانی لغو شد. برای پیگیری با پشتیبانی تماس بگیرید.`,
      link: '/dashboard/billing',
    });
  }
  return cancelled;
}

/** Marks lapsed subscriptions EXPIRED. Cosmetic: entitlements already ignore them. */
export async function expireLapsed(now = new Date()) {
  const { count } = await prisma.planSubscription.updateMany({
    where: { status: 'ACTIVE', endsAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
  return count;
}

const subscriptionSelect = {
  id: true,
  code: true,
  subject: true,
  status: true,
  source: true,
  tier: true,
  months: true,
  startsAt: true,
  endsAt: true,
  total: true,
  currency: true,
  createdAt: true,
  items: { select: { featureKey: true, tier: true, kind: true, limit: true, liveDays: true, monthlyPrice: true } },
} satisfies Prisma.PlanSubscriptionSelect;

function serialize<T extends { total: bigint; items: Array<{ monthlyPrice: bigint }> }>(row: T) {
  return {
    ...row,
    total: row.total.toString(),
    items: row.items.map((item) => ({ ...item, monthlyPrice: item.monthlyPrice.toString() })),
  };
}

/** Per-feature limit and current use, for one holder. */
async function usageFor(holder: Holder, now: Date) {
  const features = PLAN_CATALOG.filter((feature) => feature.subject === holder.subject);
  return Promise.all(
    features.map(async (feature) => {
      const entitlement = await entitlementFor(holder, feature.key, now);
      const used =
        isStockFeature(feature.key) && holder.subject !== 'COMPANY'
          ? await countLive(feature.key, holder.userId)
          : await usedCount(holder, feature.key, entitlement.kind, now);
      return {
        featureKey: feature.key,
        name: feature.name,
        nameEn: feature.nameEn,
        tier: entitlement.tier,
        kind: entitlement.kind,
        limit: entitlement.limit,
        liveDays: entitlement.liveDays,
        used,
      };
    }),
  );
}

/**
 * Everything the billing page shows: for each plan this account can hold,
 * what is in force, how much of it is used, and the subscription history.
 */
export async function getOwnBilling(userId: string) {
  const now = new Date();
  await expireLapsed(now);

  const company = await prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true, name: true } });
  const holders: Holder[] = [
    { subject: 'USER', userId },
    { subject: 'BUSINESS', userId },
    ...(company ? [{ subject: 'COMPANY' as const, companyId: company.id }] : []),
  ];

  const subscriptions = await prisma.planSubscription.findMany({
    where: { OR: [{ userId }, ...(company ? [{ companyId: company.id }] : [])], status: { not: 'PENDING_PAYMENT' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: subscriptionSelect,
  });

  return {
    enforced: billingEnforced(),
    company,
    plans: await Promise.all(
      holders.map(async (holder) => ({
        subject: holder.subject,
        usage: await usageFor(holder, now),
        active: subscriptions
          .filter((s) => s.subject === holder.subject && s.status === 'ACTIVE')
          .map(serialize),
      })),
    ),
    history: subscriptions.map(serialize),
  };
}

export async function getOwnPayment(userId: string, subscriptionId: string) {
  const row = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, OR: [{ userId }, { company: { ownerId: userId } }] },
    select: subscriptionSelect,
  });
  if (!row) throw new AppError('این اشتراک پیدا نشد.', 404);
  return serialize(row);
}

export async function listForStaff(query: { page: number; pageSize: number; status?: string; search?: string }) {
  const term = query.search?.trim();
  const where: Prisma.PlanSubscriptionWhereInput = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(term
      ? {
          OR: [
            { code: { contains: term, mode: 'insensitive' } },
            { user: { email: { contains: term, mode: 'insensitive' } } },
            { user: { lastName: { contains: term, mode: 'insensitive' } } },
            { company: { name: { contains: term, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.planSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...subscriptionSelect,
        note: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.planSubscription.count({ where }),
  ]);
  return { items: rows.map(serialize), total, page: query.page, pageSize: query.pageSize };
}
