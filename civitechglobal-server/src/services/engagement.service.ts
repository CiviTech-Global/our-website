import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifyRole, notifySafely } from './notifications.service.js';
import { authorProfileSummary, type AuthorProfileSummary } from './profile.service.js';
import { removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * What happens after the deal: milestones, completion, two-sided reviews and
 * disputes. Awards record who won; this service is the work that follows.
 *
 * The shape of every rule here:
 *
 *  - the LISTING AUTHOR writes the milestone plan and approves deliveries —
 *    they are the buyer, and acceptance is their call;
 *  - the OTHER PARTY (applicant / winning bidder) delivers against it;
 *  - either party can complete an award that needed no plan, raise a dispute
 *    that freezes everything until staff resolve it, and review the other
 *    side once the award exists — one review per direction, ever;
 *  - money is out of scope: milestones carry no amounts, and the award stays
 *    a commitment record, not a settlement.
 *
 * Awards link to their application/bid by plain columns rather than Prisma
 * relations, so party resolution and listing context are assembled here in a
 * few indexed reads — see the note in profile.service for why.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AwardContext {
  award: {
    id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    agreedAmount: string | bigint | null;
    currency: string;
    completedAt: Date | null;
    disputeStatus: 'NONE' | 'OPEN' | 'RESOLVED';
    disputeReason: string | null;
    disputeOpenedAt: Date | null;
    jobApplicationId: string | null;
    projectBidId: string | null;
  };
  kind: 'job' | 'project';
  listing: { code: string; title: string };
  /** The account that posted the listing — employer or client. */
  authorId: string;
  /** The account that took the work on — applicant or winning bidder. Null
   *  only for the company's own offer, which has no bidder account. */
  counterpartyId: string | null;
}

export interface AwardView extends AwardContext {
  myRole: 'author' | 'counterparty';
  counterpartyProfile: AuthorProfileSummary | null;
  milestones: Array<{
    id: string;
    order: number;
    title: string;
    description: string | null;
    dueDate: Date | null;
    status: 'PENDING' | 'IN_REVIEW' | 'APPROVED';
    deliveryNote: string | null;
    deliveredAt: Date | null;
    deliveryOriginalName: string | null;
    approvedAt: Date | null;
  }>;
  myReview: { rating: number; text: string | null } | null;
  theirReview: { rating: number; text: string | null } | null;
}

// ---------------------------------------------------------------------------
// Party resolution
// ---------------------------------------------------------------------------

interface AnchorIds {
  applicationIds: string[];
  bidIds: string[];
  authorByApplication: Map<string, string>;
  authorByBid: Map<string, string>;
  counterpartyByApplication: Map<string, string>;
  counterpartyByBid: Map<string, string>;
  listingByApplication: Map<string, { code: string; title: string }>;
  listingByBid: Map<string, { code: string; title: string }>;
}

/** The joins the award columns cannot do themselves, for a set of awards. */
async function resolveAnchors(awards: Array<{ jobApplicationId: string | null; projectBidId: string | null }>): Promise<AnchorIds> {
  const applicationIds = awards.map((a) => a.jobApplicationId).filter((id): id is string => Boolean(id));
  const bidIds = awards.map((a) => a.projectBidId).filter((id): id is string => Boolean(id));

  const [applications, bids] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { id: { in: applicationIds } },
      select: {
        id: true,
        applicantId: true,
        job: { select: { code: true, title: true, authorId: true } },
      },
    }),
    prisma.projectBid.findMany({
      where: { id: { in: bidIds } },
      select: {
        id: true,
        bidderId: true,
        project: { select: { code: true, title: true, authorId: true } },
      },
    }),
  ]);

  return {
    applicationIds: applications.map((row) => row.id),
    bidIds: bids.map((row) => row.id),
    authorByApplication: new Map(applications.map((row) => [row.id, row.job.authorId])),
    authorByBid: new Map(bids.map((row) => [row.id, row.project.authorId])),
    counterpartyByApplication: new Map(applications.map((row) => [row.id, row.applicantId])),
    counterpartyByBid: new Map(
      bids.flatMap((row) => (row.bidderId ? [[row.id, row.bidderId] as const] : [])),
    ),
    listingByApplication: new Map(
      applications.map((row) => [row.id, { code: row.job.code, title: row.job.title }]),
    ),
    listingByBid: new Map(
      bids.map((row) => [row.id, { code: row.project.code, title: row.project.title }]),
    ),
  };
}

function contextOf(
  award: AwardContext['award'],
  anchors: AnchorIds,
): Omit<AwardContext, 'award'> | null {
  if (award.jobApplicationId) {
    const authorId = anchors.authorByApplication.get(award.jobApplicationId);
    const listing = anchors.listingByApplication.get(award.jobApplicationId);
    const counterpartyId = anchors.counterpartyByApplication.get(award.jobApplicationId);
    if (!authorId || !listing || !counterpartyId) return null;
    return { kind: 'job', listing, authorId, counterpartyId };
  }
  if (award.projectBidId) {
    const authorId = anchors.authorByBid.get(award.projectBidId);
    const listing = anchors.listingByBid.get(award.projectBidId);
    if (!authorId || !listing) return null;
    return {
      kind: 'project',
      listing,
      authorId,
      counterpartyId: anchors.counterpartyByBid.get(award.projectBidId) ?? null,
    };
  }
  return null;
}

async function requireAwardContext(awardId: string): Promise<AwardContext> {
  const award = await prisma.marketplaceAward.findUnique({
    where: { id: awardId },
    select: {
      id: true,
      status: true,
      agreedAmount: true,
      currency: true,
      completedAt: true,
      disputeStatus: true,
      disputeReason: true,
      disputeOpenedAt: true,
      jobApplicationId: true,
      projectBidId: true,
    },
  });
  if (!award) throw new AppError('این همکاری پیدا نشد.', 404);

  const anchors = await resolveAnchors([award]);
  const context = contextOf(award, anchors);
  if (!context) throw new AppError('این همکاری پیدا نشد.', 404);
  return { award, ...context };
}

function requireParty(context: AwardContext, userId: string): 'author' | 'counterparty' {
  if (context.authorId === userId) return 'author';
  if (context.counterpartyId === userId) return 'counterparty';
  throw new AppError('این همکاری مربوط به شما نیست.', 403);
}

/** Everything freezes while a dispute is open — one rule, enforced centrally. */
function assertNoOpenDispute(context: AwardContext): void {
  if (context.award.disputeStatus === 'OPEN') {
    throw new AppError('این همکاری در حالت اختلاف است و تا پایان بررسی آن ثابت می‌ماند.', 409);
  }
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function listMyAwards(userId: string): Promise<AwardView[]> {
  // The award columns cannot join, so the candidate ids come first: every
  // application and bid the user is party to, on either side of the deal.
  const [asApplicant, asBidder, authoredJobs, authoredProjects] = await Promise.all([
    prisma.jobApplication.findMany({ where: { applicantId: userId }, select: { id: true } }),
    prisma.projectBid.findMany({ where: { bidderId: userId }, select: { id: true } }),
    prisma.jobPost.findMany({ where: { authorId: userId }, select: { id: true } }),
    prisma.freelanceProject.findMany({ where: { authorId: userId }, select: { id: true } }),
  ]);

  const [jobApplications, projectBids] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { jobId: { in: authoredJobs.map((row) => row.id) } },
      select: { id: true },
    }),
    prisma.projectBid.findMany({
      where: { projectId: { in: authoredProjects.map((row) => row.id) } },
      select: { id: true },
    }),
  ]);

  const applicationIds = [...asApplicant, ...jobApplications].map((row) => row.id);
  const bidIds = [...asBidder, ...projectBids].map((row) => row.id);

  const awards = await prisma.marketplaceAward.findMany({
    where: {
      OR: [{ jobApplicationId: { in: applicationIds } }, { projectBidId: { in: bidIds } }],
    },
    orderBy: { createdAt: 'desc' },
  });

  const anchors = await resolveAnchors(awards);
  const milestones = await prisma.marketplaceMilestone.findMany({
    where: { awardId: { in: awards.map((award) => award.id) } },
    orderBy: { order: 'asc' },
  });
  const reviews = await prisma.marketplaceReview.findMany({
    where: { awardId: { in: awards.map((award) => award.id) } },
  });
  const profiles = await Promise.all(
    awards.map((award) => {
      const context = contextOf(award, anchors);
      const counterpartyId = context?.counterpartyId ?? null;
      return counterpartyId ? authorProfileSummary(counterpartyId) : null;
    }),
  );

  const views: AwardView[] = [];
  for (let index = 0; index < awards.length; index++) {
    const award = awards[index];
    const context = contextOf(award, anchors);
    if (!context) continue;

    let myRole: 'author' | 'counterparty';
    try {
      myRole = requireParty({ award, ...context }, userId);
    } catch {
      continue;
    }

    const awardMilestones = milestones.filter((row) => row.awardId === award.id);
    const awardReviews = reviews.filter((row) => row.awardId === award.id);

    views.push({
      award: {
        id: award.id,
        status: award.status,
        agreedAmount: award.agreedAmount,
        currency: award.currency,
        completedAt: award.completedAt,
        disputeStatus: award.disputeStatus,
        disputeReason: award.disputeReason,
        disputeOpenedAt: award.disputeOpenedAt,
        jobApplicationId: award.jobApplicationId,
        projectBidId: award.projectBidId,
      },
      ...context,
      myRole,
      counterpartyProfile: profiles[index],
      milestones: awardMilestones.map((row) => ({
        id: row.id,
        order: row.order,
        title: row.title,
        description: row.description,
        dueDate: row.dueDate,
        status: row.status,
        deliveryNote: row.deliveryNote,
        deliveredAt: row.deliveredAt,
        deliveryOriginalName: row.deliveryOriginalName,
        approvedAt: row.approvedAt,
      })),
      myReview: awardReviews
        .filter((row) => row.raterId === userId)
        .map((row) => ({ rating: row.rating, text: row.text }))[0] ?? null,
      theirReview: awardReviews
        .filter((row) => row.rateeId === userId)
        .map((row) => ({ rating: row.rating, text: row.text }))[0] ?? null,
    });
  }

  return views;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export interface MilestoneInput {
  title: string;
  description?: string;
  dueDate?: Date;
}

/** The author writes the plan. Only while the award is live and undisputed. */
export async function addMilestone(userId: string, awardId: string, input: MilestoneInput) {
  const context = await requireAwardContext(awardId);
  if (requireParty(context, userId) !== 'author') {
    throw new AppError('فقط ثبت‌کنندهٔ آگهی می‌تواند مراحل کار را تعریف کند.', 403);
  }
  if (context.award.status !== 'ACTIVE') {
    throw new AppError('این همکاری دیگر فعال نیست.', 409);
  }
  assertNoOpenDispute(context);

  const last = await prisma.marketplaceMilestone.findFirst({
    where: { awardId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  return prisma.marketplaceMilestone.create({
    data: {
      awardId,
      order: (last?.order ?? 0) + 1,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
    },
    select: { id: true, order: true, title: true, status: true },
  });
}

/** The counterparty delivers. Optional one-file evidence, stored like a bid attachment. */
export async function deliverMilestone(
  userId: string,
  milestoneId: string,
  deliveryNote: string,
  attachment: IncomingFile | null,
) {
  const milestone = await prisma.marketplaceMilestone.findUnique({
    where: { id: milestoneId },
    include: { award: true },
  });
  if (!milestone) throw new AppError('این مرحله پیدا نشد.', 404);

  const context = await requireAwardContext(milestone.awardId);
  if (requireParty(context, userId) !== 'counterparty') {
    throw new AppError('تحویل هر مرحله با طرف انجام‌دهندهٔ کار است.', 403);
  }
  if (context.award.status !== 'ACTIVE') throw new AppError('این همکاری دیگر فعال نیست.', 409);
  assertNoOpenDispute(context);
  if (milestone.status !== 'PENDING') {
    throw new AppError('این مرحله پیش‌تر تحویل داده شده است.', 409);
  }

  const stored = attachment ? (await storeFiles([attachment]))[0] : null;

  try {
    const updated = await prisma.marketplaceMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'IN_REVIEW',
        deliveryNote,
        deliveredAt: new Date(),
        deliveryOriginalName: stored?.originalName,
        deliveryStoredName: stored?.storedName,
        deliveryMimeType: stored?.mimeType,
        deliverySizeBytes: stored?.sizeBytes,
        deliveryChecksum: stored?.checksum,
      },
      select: { id: true, status: true },
    });

    notifySafely(context.authorId, {
      type: 'milestone.delivered',
      title: 'تحویل مرحله',
      body: `«${milestone.title}» در «${context.listing.title}» تحویل داده شد و در انتظار تأیید شماست.`,
      link: '/dashboard/awards',
    });

    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/** The author approves a delivery. Approving the last one completes the award. */
export async function approveMilestone(userId: string, milestoneId: string) {
  const milestone = await prisma.marketplaceMilestone.findUnique({
    where: { id: milestoneId },
    include: { award: true },
  });
  if (!milestone) throw new AppError('این مرحله پیدا نشد.', 404);

  const context = await requireAwardContext(milestone.awardId);
  if (requireParty(context, userId) !== 'author') {
    throw new AppError('تأیید هر مرحله با ثبت‌کنندهٔ آگهی است.', 403);
  }
  if (context.award.status !== 'ACTIVE') throw new AppError('این همکاری دیگر فعال نیست.', 409);
  assertNoOpenDispute(context);
  if (milestone.status !== 'IN_REVIEW') {
    throw new AppError('این مرحله در انتظار تأیید نیست.', 409);
  }

  await prisma.marketplaceMilestone.update({
    where: { id: milestoneId },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: userId },
  });

  const remaining = await prisma.marketplaceMilestone.count({
    where: { awardId: milestone.awardId, status: { not: 'APPROVED' } },
  });

  if (context.counterpartyId) {
    notifySafely(context.counterpartyId, {
      type: 'milestone.approved',
      title: 'تأیید مرحله',
      body: `«${milestone.title}» در «${context.listing.title}» تأیید شد.`,
      link: '/dashboard/awards',
    });
  }

  if (remaining === 0) {
    await completeAwardRow(context, userId);
  }

  return { id: milestoneId, status: 'APPROVED' as const, awardCompleted: remaining === 0 };
}

/**
 * Completing an award with nothing left to approve — or one that never had a
 * milestone plan at all. Either party may call it; it is a statement that the
 * work is done, and the other side can dispute it if it is not.
 */
export async function completeAward(userId: string, awardId: string) {
  const context = await requireAwardContext(awardId);
  requireParty(context, userId);
  if (context.award.status !== 'ACTIVE') throw new AppError('این همکاری دیگر فعال نیست.', 409);
  assertNoOpenDispute(context);

  const open = await prisma.marketplaceMilestone.count({
    where: { awardId, status: { not: 'APPROVED' } },
  });
  if (open > 0) {
    throw new AppError('هنوز مراحلی هستند که تأیید نشده‌اند.', 409);
  }

  await completeAwardRow(context, userId);
  return { id: awardId, status: 'COMPLETED' as const };
}

async function completeAwardRow(context: AwardContext, byUserId: string): Promise<void> {
  await prisma.marketplaceAward.update({
    where: { id: context.award.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const otherId =
    context.authorId === byUserId ? context.counterpartyId : context.authorId;
  for (const userId of [otherId, byUserId].filter((id): id is string => Boolean(id))) {
    notifySafely(userId, {
      type: 'award.completed',
      title: 'پایان همکاری',
      body: `همکاری روی «${context.listing.title}» با موفقیت به پایان رسید. حالا می‌توانید به طرف مقابل امتیاز بدهید.`,
      link: '/dashboard/awards',
    });
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface AwardReviewInput {
  rating: number;
  text?: string;
}

/**
 * One review per direction per award, enforced by the unique key and checked
 * here for a friendly error. Reviews only exist after an award — there is no
 * drive-by rating on this platform.
 */
export async function reviewAward(userId: string, awardId: string, input: AwardReviewInput) {
  const context = await requireAwardContext(awardId);
  const myRole = requireParty(context, userId);
  if (context.award.status !== 'ACTIVE' && context.award.status !== 'COMPLETED') {
    throw new AppError('فقط همکاری فعال یا پایان‌یافته قابل امتیازدهی است.', 409);
  }

  const rateeId = myRole === 'author' ? context.counterpartyId : context.authorId;
  if (!rateeId) throw new AppError('این همکاری طرف مقابل ندارد.', 409);

  const existing = await prisma.marketplaceReview.findUnique({
    where: { awardId_raterId: { awardId, raterId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('پیش‌تر برای این همکاری امتیاز ثبت کرده‌اید.', 409);

  try {
    const review = await prisma.marketplaceReview.create({
      data: {
        awardId,
        raterId: userId,
        rateeId,
        rating: input.rating,
        text: input.text?.trim() || null,
      },
      select: { id: true, rating: true },
    });

    notifySafely(rateeId, {
      type: 'review.received',
      title: 'امتیاز جدید',
      body: `برای «${context.listing.title}» امتیاز ${input.rating} از ۵ دریافت کردید.`,
      link: '/dashboard/awards',
    });

    return review;
  } catch (error) {
    // The unique key is the backstop for a racing double-submit; report it as
    // the rule, not as a database accident.
    if ((error as { code?: string }).code === 'P2002') {
      throw new AppError('پیش‌تر برای این همکاری امتیاز ثبت کرده‌اید.', 409);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

/** Either party freezes the award and calls staff in. */
export async function openDispute(userId: string, awardId: string, reason: string) {
  const context = await requireAwardContext(awardId);
  requireParty(context, userId);
  if (context.award.status !== 'ACTIVE') throw new AppError('این همکاری دیگر فعال نیست.', 409);
  if (context.award.disputeStatus !== 'NONE') {
    throw new AppError('برای این همکاری اختلاف قبلاً ثبت شده است.', 409);
  }

  await prisma.marketplaceAward.update({
    where: { id: awardId },
    data: { disputeStatus: 'OPEN', disputeReason: reason, disputeOpenedAt: new Date() },
  });

  // Staff on both the moderation desks and the ops desk get the call; anyone
  // holding either can act, and SUPER_ADMIN holds both by bypass.
  notifyRole(
    ['SUPER_ADMIN', 'ADMIN'],
    {
      type: 'award.dispute_opened',
      title: 'اختلاف در همکاری',
      body: `روی «${context.listing.title}» اختلاف ثبت شد: ${reason.slice(0, 120)}`,
      link: '/admin/awards',
    },
  ).catch(() => undefined);

  const otherId = context.authorId === userId ? context.counterpartyId : context.authorId;
  if (otherId) {
    notifySafely(otherId, {
      type: 'award.disputed',
      title: 'اختلاف ثبت شد',
      body: `طرف مقابل برای «${context.listing.title}» اختلاف ثبت کرد. همکاری تا بررسی کارشناسان متوقف شده است.`,
      link: '/dashboard/awards',
    });
  }

  return { id: awardId, disputeStatus: 'OPEN' as const };
}

/** The staff queue of frozen collaborations, newest dispute first. */
export async function listOpenDisputes() {
  const awards = await prisma.marketplaceAward.findMany({
    where: { disputeStatus: 'OPEN' },
    orderBy: { disputeOpenedAt: 'asc' },
    take: 50,
  });

  const anchors = await resolveAnchors(awards);
  return awards
    .map((award) => {
      const context = contextOf(award, anchors);
      if (!context) return null;
      return {
        awardId: award.id,
        listing: context.listing,
        kind: context.kind,
        disputeReason: award.disputeReason,
        disputeOpenedAt: award.disputeOpenedAt,
        agreedAmount: award.agreedAmount,
        currency: award.currency,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

/** Staff close the dispute out; the award unfreezes and work continues. */
export async function resolveDispute(awardId: string, note: string) {
  const context = await requireAwardContext(awardId);
  if (context.award.disputeStatus !== 'OPEN') {
    throw new AppError('این همکاری اختلاف باز ندارد.', 409);
  }

  await prisma.marketplaceAward.update({
    where: { id: awardId },
    data: {
      disputeStatus: 'RESOLVED',
      disputeResolvedAt: new Date(),
      disputeResolutionNote: note,
    },
  });

  // The audit row is written by the route layer, which knows the action name.
  for (const userId of [context.authorId, context.counterpartyId].filter(
    (id): id is string => Boolean(id),
  )) {
    notifySafely(userId, {
      type: 'award.dispute_resolved',
      title: 'تصمیم دربارهٔ اختلاف',
      body: `اختلاف «${context.listing.title}» بررسی و بسته شد: ${note.slice(0, 120)}`,
      link: '/dashboard/awards',
    });
  }

  return { id: awardId, disputeStatus: 'RESOLVED' as const };
}
