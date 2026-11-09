// The database, from the development .env locally; CI sets DATABASE_URL itself.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { seedPlanCatalog, setPrices } from './catalog.service.js';
import { MONTH_MS, assertStock, entitlementFor, holderKey, releaseQuota, useQuota, type Holder } from './quota.service.js';
import { checkout, confirmPayment, getOwnBilling, grant, quote } from './subscription.service.js';

/**
 * Plans and limits, against the real database.
 *
 * Not mocked, because what matters here is what the database does: the
 * advisory lock under concurrency, the unique (feature, subject) that makes a
 * resubmission free, the CHECK constraints on who may hold a subscription.
 *
 * Everything created is removed afterwards — the users (subscriptions cascade),
 * their usage and events by holder key, and the prices put back as they were.
 */

const RUN = randomUUID().slice(0, 8);
const userIds: string[] = [];
const companyIds: string[] = [];
let savedPrices: Array<{ featureKey: string; tier: 'FREE' | 'PRO' | 'PREMIUM' | 'VIP'; priceIrt: string | null }> = [];

const PRICED = [
  { featureKey: 'user.project_bids', tier: 'PRO', priceIrt: 89000 },
  { featureKey: 'user.project_bids', tier: 'VIP', priceIrt: 329000 },
  { featureKey: 'user.job_applications', tier: 'PREMIUM', priceIrt: 139000 },
] as const;

async function newUser(kind: 'INDIVIDUAL' | 'COMPANY' = 'INDIVIDUAL') {
  const email = `billing-${RUN}-${userIds.length}@test.invalid`;
  const user = await prisma.user.create({
    data: { email, emailHash: `hash-${email}`, password: 'x', firstName: 'Test', lastName: 'Billing', accountKind: kind },
    select: { id: true },
  });
  userIds.push(user.id);
  return user.id;
}

const enforce = (on: boolean) => {
  process.env.BILLING_ENFORCE = on ? 'true' : 'false';
};

async function expectQuotaExceeded(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).statusCode).toBe(402);
  expect((error as AppError).code).toBe('QUOTA_EXCEEDED');
  return error as AppError;
}

beforeAll(async () => {
  await seedPlanCatalog();
  const levels = await prisma.planFeatureLevel.findMany({
    where: { OR: PRICED.map((p) => ({ tier: p.tier, feature: { key: p.featureKey } })) },
    select: { tier: true, priceIrt: true, feature: { select: { key: true } } },
  });
  savedPrices = levels.map((level) => ({
    featureKey: level.feature.key,
    tier: level.tier,
    priceIrt: level.priceIrt === null ? null : level.priceIrt.toString(),
  }));
  await setPrices(PRICED.map((p) => ({ ...p })));
});

afterEach(() => {
  delete process.env.BILLING_ENFORCE;
});

afterAll(async () => {
  const keys = [
    ...userIds.flatMap((id) => [`u:${id}`, `b:${id}`]),
    ...companyIds.map((id) => `c:${id}`),
  ];
  await prisma.planUsage.deleteMany({ where: { holderKey: { in: keys } } });
  await prisma.planQuotaEvent.deleteMany({ where: { holderKey: { in: keys } } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (savedPrices.length) await setPrices(savedPrices);
});

describe('monthly limits on the free tier', () => {
  it('allows up to the limit and refuses the next one with a machine code', async () => {
    enforce(true);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    // Free: 3 bids a month.
    for (let i = 0; i < 3; i += 1) await useQuota(holder, 'user.project_bids', `bid-${RUN}-a${i}`);

    const error = await expectQuotaExceeded(useQuota(holder, 'user.project_bids', `bid-${RUN}-a3`));
    expect(error.data).toMatchObject({ feature: 'user.project_bids', limit: 3, used: 3, kind: 'MONTHLY' });

    const events = await prisma.planQuotaEvent.findMany({ where: { holderKey: holderKey(holder) } });
    expect(events.map((e) => e.outcome)).toEqual(['BLOCKED']);
  });

  it('does not count the same subject twice', async () => {
    enforce(true);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    for (let i = 0; i < 5; i += 1) await useQuota(holder, 'user.project_bids', `bid-${RUN}-same`);
    expect(await prisma.planUsage.count({ where: { holderKey: holderKey(holder) } })).toBe(1);
  });

  it('gives a unit back when the thing that used it is refused', async () => {
    enforce(true);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    for (let i = 0; i < 3; i += 1) await useQuota(holder, 'user.project_bids', `bid-${RUN}-r${i}`);
    await releaseQuota('user.project_bids', `bid-${RUN}-r0`);
    await expect(useQuota(holder, 'user.project_bids', `bid-${RUN}-r3`)).resolves.toBeDefined();
  });

  it('forgets uses older than 30 days', async () => {
    enforce(true);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    const longAgo = new Date(Date.now() - MONTH_MS - 60_000);
    for (let i = 0; i < 3; i += 1) await useQuota(holder, 'user.project_bids', `bid-${RUN}-old${i}`, longAgo);
    await expect(useQuota(holder, 'user.project_bids', `bid-${RUN}-new`)).resolves.toBeDefined();
  });

  it('only measures while enforcement is off', async () => {
    enforce(false);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    for (let i = 0; i < 5; i += 1) await useQuota(holder, 'user.project_bids', `bid-${RUN}-m${i}`);

    const outcomes = (await prisma.planQuotaEvent.findMany({ where: { holderKey: holderKey(holder) } })).map((e) => e.outcome);
    expect(outcomes).toEqual(['WOULD_BLOCK', 'WOULD_BLOCK']);
  });

  it('lets exactly the limit through when requests race', async () => {
    enforce(true);
    const holder: Holder = { subject: 'USER', userId: await newUser() };
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => useQuota(holder, 'user.project_bids', `bid-${RUN}-race${i}`)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(await prisma.planUsage.count({ where: { holderKey: holderKey(holder), releasedAt: null } })).toBe(3);
  });
});

describe('the free first post', () => {
  it('is one post ever, live for 45 days', async () => {
    enforce(true);
    const holder: Holder = { subject: 'BUSINESS', userId: await newUser() };

    const first = await useQuota(holder, 'business.job_posts', `job-${RUN}-first`);
    expect(first.liveDays).toBe(45);

    // Lifetime: a month later it is still used up.
    const later = new Date(Date.now() + 2 * MONTH_MS);
    const error = await expectQuotaExceeded(useQuota(holder, 'business.job_posts', `job-${RUN}-second`, later));
    expect(error.data).toMatchObject({ kind: 'LIFETIME', limit: 1 });
  });
});

describe('stock limits', () => {
  it('compares what is live with the limit', async () => {
    enforce(true);
    const holder: Holder = { subject: 'BUSINESS', userId: await newUser() };
    // Free: one shop.
    await expect(assertStock(holder, 'business.shops', async () => 0)).resolves.toBeUndefined();
    await expectQuotaExceeded(assertStock(holder, 'business.shops', async () => 1));
  });
});

describe('subscriptions', () => {
  it('a granted tier raises the limit, and only for its holder', async () => {
    const userId = await newUser();
    // A whole tier, granted: works even where the tier is not fully priced.
    await grant('staff-test', { subject: 'USER', userId, tier: 'PRO', months: 1 });
    const mine = await entitlementFor({ subject: 'USER', userId }, 'user.project_bids');
    expect(mine).toMatchObject({ tier: 'PRO', limit: 20, source: 'subscription' });

    const business = await entitlementFor({ subject: 'BUSINESS', userId }, 'business.shops');
    expect(business.source).toBe('free');
  });

  it('prices a custom mix from different tiers, with the period discount', async () => {
    const q = await quote({
      subject: 'USER',
      months: 12,
      items: [
        { featureKey: 'user.project_bids', tier: 'VIP' },
        { featureKey: 'user.job_applications', tier: 'PREMIUM' },
        { featureKey: 'user.book_requests', tier: 'FREE' },
      ],
    });
    expect(q.items.map((i) => `${i.featureKey}:${i.tier}`)).toEqual([
      'user.project_bids:VIP',
      'user.job_applications:PREMIUM',
    ]);
    expect(q.monthlyTotal).toBe(329000n + 139000n);
    // Twelve months at 20% off.
    expect(q.total).toBe(((329000n + 139000n) * 12n * 80n) / 100n);
  });

  it('refuses a mix with a feature from another plan', async () => {
    await expect(
      quote({ subject: 'USER', months: 1, items: [{ featureKey: 'business.shops', tier: 'PRO' }] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('activates only once the sandbox confirms, and only once', async () => {
    const userId = await newUser();
    const started = await checkout(
      userId,
      { subject: 'USER', months: 3, items: [{ featureKey: 'user.project_bids', tier: 'PRO' }] },
      'http://localhost/return',
    );

    const pending = await prisma.planSubscription.findUnique({ where: { id: started.subscriptionId } });
    expect(pending?.status).toBe('PENDING_PAYMENT');
    expect(await entitlementFor({ subject: 'USER', userId }, 'user.project_bids')).toMatchObject({ limit: 3 });

    await confirmPayment(started.reference, userId);
    await confirmPayment(started.reference, userId);

    const active = await prisma.planSubscription.findUnique({ where: { id: started.subscriptionId } });
    expect(active?.status).toBe('ACTIVE');
    expect(active!.endsAt!.getTime() - active!.startsAt!.getTime()).toBe(3 * MONTH_MS);
    expect(await entitlementFor({ subject: 'USER', userId }, 'user.project_bids')).toMatchObject({ limit: 20 });
  });

  it('will not confirm somebody else\'s payment', async () => {
    const payer = await newUser();
    const stranger = await newUser();
    const started = await checkout(
      payer,
      { subject: 'USER', months: 1, items: [{ featureKey: 'user.project_bids', tier: 'PRO' }] },
      'http://localhost/return',
    );
    await expect(confirmPayment(started.reference, stranger)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('a company plan belongs to the company, never to a person', async () => {
    const ownerId = await newUser('COMPANY');
    const company = await prisma.company.create({
      data: { ownerId, name: 'Test Co', slug: `test-co-${RUN}` },
      select: { id: true },
    });
    companyIds.push(company.id);

    await expect(
      prisma.planSubscription.create({
        data: { code: `X${RUN}`, subject: 'COMPANY', userId: ownerId, source: 'STAFF_GRANT', months: 1, total: 0n },
      }),
    ).rejects.toThrow();

    const billing = await getOwnBilling(ownerId);
    expect(billing.plans.map((p) => p.subject)).toEqual(['USER', 'BUSINESS', 'COMPANY']);
  });
});
