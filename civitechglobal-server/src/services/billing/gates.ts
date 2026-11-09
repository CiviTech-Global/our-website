import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { FeatureKey } from '../../catalog/plan-catalog.js';
import { assertStock, liveDaysFor, releaseQuota, useQuota, type Holder } from './quota.service.js';
import { countLive, stockHolder, type StockFeature } from './stock-counters.js';

/**
 * The plan gate, in the vocabulary of the services that call it.
 *
 * Which plan a post counts against follows who posted it:
 *   - as one of the author's shops (businessId)        → the Business plan
 *   - by a company account, under its company page     → the Company plan
 *   - otherwise, the person themselves                  → the User plan
 *
 * A personal account that kept an old company page still posts on its User
 * plan: company plans are for companies, which are legal entities with an
 * account of their own.
 */

type PostKind = 'job' | 'project';

const POST_FEATURES: Record<PostKind, Record<Holder['subject'], FeatureKey>> = {
  job: { USER: 'user.job_posts', BUSINESS: 'business.job_posts', COMPANY: 'company.job_posts' },
  project: { USER: 'user.projects', BUSINESS: 'business.projects', COMPANY: 'company.projects' },
};

async function loadPost(kind: PostKind, id: string) {
  const select = {
    authorId: true,
    businessId: true,
    companyId: true,
    author: { select: { accountKind: true } },
  } as const;
  return kind === 'job'
    ? prisma.jobPost.findUnique({ where: { id }, select })
    : prisma.freelanceProject.findUnique({ where: { id }, select });
}

export async function postingPlan(kind: PostKind, postId: string): Promise<{ holder: Holder; featureKey: FeatureKey } | null> {
  const post = await loadPost(kind, postId);
  if (!post) return null;

  let holder: Holder;
  if (post.businessId) holder = { subject: 'BUSINESS', userId: post.authorId };
  else if (post.companyId && post.author.accountKind === 'COMPANY') holder = { subject: 'COMPANY', companyId: post.companyId };
  else holder = { subject: 'USER', userId: post.authorId };

  return { holder, featureKey: POST_FEATURES[kind][holder.subject] };
}

/** Counts a post at submission. Idempotent: a resubmission is not a new post. */
export async function chargePost(kind: PostKind, postId: string): Promise<void> {
  const plan = await postingPlan(kind, postId);
  if (plan) await useQuota(plan.holder, plan.featureKey, postId);
}

/** Gives a refused post's unit back. */
export async function releasePost(kind: PostKind, postId: string): Promise<void> {
  await Promise.all(Object.values(POST_FEATURES[kind]).map((featureKey) => releaseQuota(featureKey, postId)));
}

/**
 * When a post that was allowed by a "live for N days" level is first
 * published, the date it must come down by. Null when no such limit applies.
 */
export async function liveUntilFor(kind: PostKind, postId: string, publishedAt: Date): Promise<Date | null> {
  const days = (
    await Promise.all(Object.values(POST_FEATURES[kind]).map((featureKey) => liveDaysFor(featureKey, postId)))
  ).find((value) => value !== null);
  return days ? new Date(publishedAt.getTime() + days * 24 * 60 * 60 * 1000) : null;
}

/** The earlier of the author's own closing date and the plan's. */
export function earlier(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

/** Counts a member's own action: an application, a bid, a request to buy. */
export async function chargeUser(userId: string, featureKey: FeatureKey, subjectId: string): Promise<void> {
  await useQuota({ subject: 'USER', userId }, featureKey, subjectId);
}

export async function releaseUser(featureKey: FeatureKey, subjectId: string): Promise<void> {
  await releaseQuota(featureKey, subjectId);
}

/** Checks a STOCK feature before one more listing goes live. */
export async function assertRoomFor(feature: StockFeature, userId: string, exceptId?: string): Promise<void> {
  await assertStock(stockHolder(feature, userId), feature, () => countLive(feature, userId, exceptId));
}

/**
 * The shop somebody wants to post a job or project as. Theirs, and live: a
 * draft shop has no public page for the post to point at.
 */
export async function shopToPostAs(userId: string, businessId: string) {
  const shop = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId, moderationStatus: 'APPROVED', state: 'OPEN' },
    select: { id: true, name: true },
  });
  if (!shop) throw new AppError('فقط به نام فروشگاه فعال خودتان می‌توانید آگهی ثبت کنید.', 400);
  return shop;
}

/** Stable subject ids for actions whose (thing, person) pair is unique. */
export const applicationSubject = (jobId: string, userId: string) => `application:${jobId}:${userId}`;
export const bidSubject = (projectId: string, userId: string) => `bid:${projectId}:${userId}`;
