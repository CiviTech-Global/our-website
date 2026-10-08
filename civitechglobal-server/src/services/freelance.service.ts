import type { Prisma } from '@prisma/client';
import { toPage } from '../utils/page.js';
import { searchWhere } from './list-search.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTrackingCode } from './insurance-request.service.js';
import {
  PUBLIC_LISTING_WHERE,
  assertAuthorEditable,
  assertReviewable,
  assertSubmittable,
  reviewPatch,
  type ReviewDecision,
} from './moderation.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';
import { authorProfileSummary, authorProfileSummaries } from './profile.service.js';
import { removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { features } from '../config/features.js';
import {
  PROJECT_CARD_SELECT,
  clientStats,
  freelancerStats,
  presentProjectCards,
  projectActivity,
} from './project-cards.service.js';
import { assertWorkCategoryUsable, workCategoryScope } from './work-taxonomy.service.js';
import { notifyMatchingProjectAlerts } from './project-work.service.js';

/**
 * The freelance board.
 *
 * A verified client posts a piece of work; verified freelancers bid on it, and
 * so can this company. Bids are sealed — a bidder sees only their own — because
 * open bidding turns a marketplace into a race to the bottom and drives the
 * serious bidders out of going first.
 *
 * The unusual part is what happens between a bid being placed and the client
 * seeing it. A reviewer reads the bid against the scope and judges whether the
 * number is fair, and can send it back with a note and a suggested figure. So
 * somebody who has badly under-priced their own work gets a chance to correct
 * it rather than winning at a loss, and somebody who has wildly over-priced
 * finds out before the client simply ignores them.
 */

export interface ProjectInput {
  title: string;
  description: string;
  category?: string;
  skills?: string[];
  budgetMin?: bigint;
  budgetMax?: bigint;
  budgetUnknown?: boolean;
  deliverBy?: Date;
  openToCompanyOffer?: boolean;
  closesAt?: Date;
  // Second generation (FEATURE_PROJECTS_V2).
  currency?: string;
  workCategoryId?: string | null;
  pricingType?: 'FIXED' | 'HOURLY';
  experienceLevel?: string | null;
  duration?: string | null;
  weeklyHours?: string | null;
  urgent?: boolean;
  sealed?: boolean;
  nda?: boolean;
  visibility?: 'PUBLIC' | 'SIGNED_IN' | 'INVITE_ONLY';
  preferredCountries?: string[];
  languages?: string[];
  screeningQuestions?: string[];
  contractToHire?: boolean;
  freelancersNeeded?: number;
  onsite?: boolean;
  country?: string | null;
  province?: string | null;
  city?: string | null;
}

async function companyNameFor(userId: string): Promise<string | null> {
  const verification = await prisma.userVerification.findUnique({
    where: { userId },
    select: { kind: true, companyName: true },
  });
  return verification?.kind === 'COMPANY' ? (verification.companyName ?? null) : null;
}

export async function createProject(
  userId: string,
  input: ProjectInput,
  attachments: IncomingFile[],
) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);
  if (input.workCategoryId) await assertWorkCategoryUsable(input.workCategoryId);

  const stored = attachments.length > 0 ? await storeFiles(attachments) : [];

  try {
    return await prisma.freelanceProject.create({
      data: {
        code: generateTrackingCode(),
        authorId: userId,
        companyName: await companyNameFor(userId),
        ...input,
        skills: input.skills ?? [],
        moderationStatus: 'DRAFT',
        attachments: {
          create: stored.map((file) => ({
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
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

export async function updateProject(userId: string, projectId: string, input: Partial<ProjectInput>) {
  const project = await requireOwnProject(userId, projectId);
  assertAuthorEditable(project.moderationStatus);
  if (input.workCategoryId) await assertWorkCategoryUsable(input.workCategoryId);

  return prisma.freelanceProject.update({
    where: { id: projectId },
    data: input,
    select: { id: true, moderationStatus: true },
  });
}

export async function submitProject(userId: string, projectId: string) {
  const project = await requireOwnProject(userId, projectId);
  assertSubmittable(project.moderationStatus);
  await assertVerified(userId);

  return prisma.freelanceProject.update({
    where: { id: projectId },
    data: { moderationStatus: 'PENDING_REVIEW', submittedAt: new Date() },
    select: { id: true, moderationStatus: true },
  });
}

/**
 * The author takes their own project off the board.
 *
 * The counterpart of closeJob, which a posting has had all along. Accepting a
 * bid already moves a project to AWARDED, but that is not the only way one
 * ends: somebody who found a developer elsewhere, or no longer needs the work,
 * had no way to stop bids arriving.
 */
export async function closeProject(userId: string, projectId: string) {
  await requireOwnProject(userId, projectId);
  return prisma.freelanceProject.update({
    where: { id: projectId },
    data: { state: 'CLOSED' },
    select: { id: true, state: true },
  });
}

async function requireOwnProject(userId: string, projectId: string) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, authorId: true, moderationStatus: true, openToCompanyOffer: true },
  });

  if (!project || project.authorId !== userId) throw new AppError('این پروژه پیدا نشد.', 404);
  return project;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * The board's query. The first block is the board as it always was; the rest
 * are the second generation's filters, which the old board never sends.
 */
export interface ProjectBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  skills?: string[];
  budgetMin?: bigint;
  budgetMax?: bigint;
  sort?: 'newest' | 'budgetAsc' | 'budgetDesc' | 'fewestBids' | 'closingSoon';

  workCategoryId?: string;
  pricingType?: 'FIXED' | 'HOURLY';
  experienceLevel?: string;
  duration?: string;
  weeklyHours?: string;
  maxBids?: number;
  clientHired?: boolean;
  clientVerified?: boolean;
  urgent?: boolean;
  featured?: boolean;
  nda?: boolean;
  onsite?: boolean;
  contractToHire?: boolean;
  country?: string;
  language?: string;
  currency?: string;
  postedWithinDays?: number;
}

/** Same overlap rule as jobs.service.salaryRangeWhere. */
export function budgetRangeWhere(query: ProjectBoardQuery): Prisma.FreelanceProjectWhereInput {
  if (query.budgetMin === undefined && query.budgetMax === undefined) return {};
  return {
    budgetUnknown: false,
    AND: [
      ...(query.budgetMax !== undefined
        ? [{ OR: [{ budgetMin: null }, { budgetMin: { lte: query.budgetMax } }] }]
        : []),
      ...(query.budgetMin !== undefined
        ? [{ OR: [{ budgetMax: null }, { budgetMax: { gte: query.budgetMin } }] }]
        : []),
    ],
  };
}

export function projectSort(query: ProjectBoardQuery): Prisma.FreelanceProjectOrderByWithRelationInput[] {
  const featured: Prisma.FreelanceProjectOrderByWithRelationInput = { featured: 'desc' };
  switch (query.sort) {
    case 'budgetAsc':
      return [featured, { budgetMin: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }];
    case 'budgetDesc':
      return [featured, { budgetMax: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }];
    case 'fewestBids':
      // Where a new proposal has the best chance of being read.
      return [{ bids: { _count: 'asc' } }, { publishedAt: 'desc' }];
    case 'closingSoon':
      return [{ closesAt: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }];
    default:
      return [featured, { publishedAt: 'desc' }];
  }
}

export async function listPublicProjects(query: ProjectBoardQuery) {
  const where: Prisma.FreelanceProjectWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      // Members-only and invite-only projects never reach the public board.
      { visibility: 'PUBLIC' },
      {
        ...(query.category ? { category: query.category } : {}),
        ...(query.skills?.length ? { skills: { hasSome: query.skills } } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
                { skills: { has: query.search } },
              ],
            }
          : {}),
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
      budgetRangeWhere(query),
      ...(await boardFiltersV2(query)),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.freelanceProject.findMany({
      where,
      orderBy: projectSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: PROJECT_CARD_SELECT,
    }),
    prisma.freelanceProject.count({ where }),
  ]);

  return toPage(await presentProjectCards(rows), total, query.page, query.pageSize);
}

/**
 * One public project.
 *
 * Only PUBLIC ones: a members-only or invite-only brief is read through the
 * signed-in route (project-work.service.viewProject), which can tell who is
 * asking. An NDA project is shown here without its brief or files — the
 * signed-in route opens them once the reader has signed.
 */
export async function getPublicProject(code: string) {
  const decoded = code.trim().toUpperCase();
  const where = { code: decoded, ...PUBLIC_LISTING_WHERE, visibility: 'PUBLIC' as const };
  try {
    await prisma.freelanceProject.updateMany({ where, data: { viewCount: { increment: 1 } } });
  } catch {
    // Reading beats counting.
  }

  const project = await prisma.freelanceProject.findFirst({
    where,
    select: {
      ...PROJECT_CARD_SELECT,
      openToCompanyOffer: true,
      viewCount: true,
      screeningQuestions: true,
      attachments: { select: { id: true, originalName: true, sizeBytes: true } },
    },
  });

  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  const v2 = features.projectsV2;
  const [authorProfile, similar, clients, activity] = await Promise.all([
    authorProfileSummary(project.authorId),
    similarProjects(project),
    v2 ? clientStats([project.authorId]) : Promise.resolve(null),
    v2 ? projectActivity([project]) : Promise.resolve(null),
  ]);

  const { authorId, clientViewedAt: _viewed, ...rest } = project;
  const sealedBrief = v2 && project.nda;
  return {
    ...rest,
    // The NDA hides the brief and the files, never the fact that they exist.
    description: sealedBrief ? '' : project.description,
    attachments: sealedBrief ? [] : project.attachments,
    attachmentCount: project.attachments.length,
    authorProfile,
    similar,
    ...(v2 ? { client: clients!.get(authorId) ?? null, activity: activity!.get(project.id) ?? null } : {}),
  };
}

/** Same idea as jobs.service.similarJobs: category first, skills overlap. */
async function similarProjects(project: {
  id: string;
  category: string | null;
  workCategoryId?: string | null;
  skills: string[];
}) {
  const where: Prisma.FreelanceProjectWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    visibility: 'PUBLIC',
    id: { not: project.id },
    OR: [
      ...(project.workCategoryId ? [{ workCategoryId: project.workCategoryId }] : []),
      ...(project.category ? [{ category: project.category }] : []),
      ...(project.skills.length > 0 ? [{ skills: { hasSome: project.skills } }] : []),
    ],
  };
  if (!where.OR || where.OR.length === 0) return [];

  return prisma.freelanceProject.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take: 4,
    select: {
      code: true,
      title: true,
      category: true,
      pricingType: true,
      budgetMin: true,
      budgetMax: true,
      budgetUnknown: true,
      currency: true,
      publishedAt: true,
      _count: { select: { bids: { where: { moderationStatus: 'APPROVED' } } } },
    },
  });
}

/** The author's own projects, with everything they may still change. See listOwnJobs. */
export async function listOwnProjects(userId: string) {
  const rows = await prisma.freelanceProject.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      ...PROJECT_CARD_SELECT,
      openToCompanyOffer: true,
      moderationStatus: true,
      reviewNote: true,
      createdAt: true,
      viewCount: true,
      screeningQuestions: true,
    },
  });
  if (!features.projectsV2) return rows;

  // The client's own gauges: what has come in, what they have not opened yet.
  const [activity, unseen] = await Promise.all([
    projectActivity(rows),
    prisma.projectBid.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: rows.map((row) => row.id) },
        moderationStatus: 'APPROVED',
        clientSeenAt: null,
        outcome: { not: 'WITHDRAWN' },
      },
      _count: { _all: true },
    }),
  ]);
  const unseenBy = new Map(unseen.map((row) => [row.projectId, row._count._all]));
  return rows.map((row) => ({
    ...row,
    activity: activity.get(row.id) ?? null,
    unseenBids: unseenBy.get(row.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Bids
// ---------------------------------------------------------------------------

export interface BidInput {
  amount: bigint;
  deliveryDays?: number;
  /** Second generation: the proposed plan, and one answer per screening question. */
  milestones?: Array<{ title: string; amount: string; days: number }>;
  screeningAnswers?: string[];
  message: string;
}

export async function placeBid(
  userId: string,
  projectId: string,
  input: BidInput,
  attachment: IncomingFile | null,
) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);

  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, ...PUBLIC_LISTING_WHERE },
    select: {
      id: true,
      authorId: true,
      title: true,
      code: true,
      currency: true,
      pricingType: true,
      nda: true,
      visibility: true,
      screeningQuestions: true,
      closesAt: true,
    },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد یا دیگر باز نیست.', 404);

  if (project.authorId === userId) {
    throw new AppError('نمی‌توانید برای پروژهٔ خودتان پیشنهاد بدهید.', 400);
  }

  const v2 = features.projectsV2;
  let invite: { id: string } | null = null;
  if (v2) {
    if (project.closesAt && project.closesAt <= new Date()) {
      throw new AppError('مهلت ارسال پیشنهاد برای این پروژه تمام شده است.', 409);
    }
    invite = await prisma.projectInvite.findUnique({
      where: { projectId_freelancerId: { projectId, freelancerId: userId } },
      select: { id: true },
    });
    if (project.visibility === 'INVITE_ONLY' && !invite) {
      throw new AppError('این پروژه فقط برای دعوت‌شدگان است.', 403);
    }
    if (project.nda) {
      const signed = await prisma.projectNdaSignature.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { id: true },
      });
      if (!signed) throw new AppError('پیش از پیشنهاد دادن، توافق‌نامهٔ عدم افشا را بپذیرید.', 409);
    }
    assertBidShape(project, input);
  }

  const existing = await prisma.projectBid.findUnique({
    where: { projectId_bidderId: { projectId, bidderId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('پیش‌تر برای این پروژه پیشنهاد داده‌اید.', 409);

  const stored = attachment ? (await storeFiles([attachment]))[0] : null;

  try {
    const bid = await prisma.projectBid.create({
      data: {
        projectId,
        bidderId: userId,
        amount: input.amount,
        currency: project.currency,
        deliveryDays: input.deliveryDays,
        message: input.message,
        attachmentOriginalName: stored?.originalName,
        attachmentStoredName: stored?.storedName,
        attachmentMimeType: stored?.mimeType,
        attachmentSizeBytes: stored?.sizeBytes,
        attachmentChecksum: stored?.checksum,
        // The second generation sends a bid straight to the client, as the
        // job board now sends an application; the fairness check becomes the
        // price guide the bidder sees before sending.
        moderationStatus: v2 ? 'APPROVED' : 'PENDING_REVIEW',
        ...(v2
          ? {
              reviewedAt: new Date(),
              milestones: input.milestones?.length ? input.milestones : undefined,
              screeningAnswers: input.screeningAnswers ?? [],
              invited: Boolean(invite),
            }
          : {}),
      },
      select: { id: true, moderationStatus: true },
    });

    if (v2) {
      if (invite) {
        await prisma.projectInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });
      }
      notifySafely(project.authorId, {
        type: 'bid.received',
        title: 'پیشنهاد تازه برای پروژهٔ شما',
        body: `پیشنهاد تازه‌ای برای «${project.title}» رسید.`,
        link: `/dashboard/projects?open=${project.id}`,
      });
    }
    return bid;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/**
 * This company's own offer, placed by staff.
 *
 * Marked so the client sees it as the company's professional offer rather than
 * as one freelancer among many — which is the honest presentation, since it is
 * the platform operator bidding on work advertised on its own platform.
 *
 * It goes through the same review as everyone else's. Exempting ourselves from
 * the check we impose on others would be the wrong way round.
 */
export async function placeCompanyOffer(
  staffUserId: string,
  projectId: string,
  input: BidInput,
) {
  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, ...PUBLIC_LISTING_WHERE },
    select: { id: true, openToCompanyOffer: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد یا دیگر باز نیست.', 404);

  if (!project.openToCompanyOffer) {
    // The client said no when they posted it. Somebody looking for an
    // individual should not be pitched by the operator regardless.
    throw new AppError('نویسندهٔ این پروژه پیشنهاد شرکت را نپذیرفته است.', 403);
  }

  const existing = await prisma.projectBid.findFirst({
    where: { projectId, isCompanyOffer: true },
    select: { id: true },
  });
  if (existing) throw new AppError('پیشنهاد شرکت برای این پروژه ثبت شده است.', 409);

  return prisma.projectBid.create({
    data: {
      projectId,
      bidderId: null,
      isCompanyOffer: true,
      amount: input.amount,
      deliveryDays: input.deliveryDays,
      message: input.message,
      moderationStatus: 'PENDING_REVIEW',
      internalNote: `Placed by staff ${staffUserId}`,
    },
    select: { id: true, moderationStatus: true, isCompanyOffer: true },
  });
}

/** A bidder sees their own bid and the reviewer's note on it. Nothing else. */
export async function listOwnBids(userId: string) {
  return prisma.projectBid.findMany({
    where: { bidderId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      deliveryDays: true,
      moderationStatus: true,
      // The fairness note, and what a reviewer thinks the work is worth.
      reviewNote: true,
      suggestedAmount: true,
      outcome: true,
      createdAt: true,
      project: { select: { code: true, title: true, state: true } },
    },
  });
}

/** Revising after a reviewer has asked for it — or, on the new board, any time before a decision. */
export async function reviseBid(userId: string, bidId: string, input: BidInput) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      bidderId: true,
      moderationStatus: true,
      outcome: true,
      project: { select: { pricingType: true, screeningQuestions: true, state: true } },
    },
  });

  if (!bid || bid.bidderId !== userId) throw new AppError('این پیشنهاد پیدا نشد.', 404);

  if (features.projectsV2 && bid.moderationStatus === 'APPROVED') {
    // Straight to the client, so straight back to them: no queue to re-enter.
    if (!['PENDING', 'SHORTLISTED', 'INTERVIEW'].includes(bid.outcome) || bid.project.state !== 'OPEN') {
      throw new AppError('این پیشنهاد دیگر قابل ویرایش نیست.', 409);
    }
    assertBidShape(bid.project, { ...input, screeningAnswers: input.screeningAnswers ?? undefined });
    return prisma.projectBid.update({
      where: { id: bidId },
      data: {
        amount: input.amount,
        deliveryDays: input.deliveryDays,
        message: input.message,
        milestones: input.milestones?.length ? input.milestones : undefined,
        ...(input.screeningAnswers ? { screeningAnswers: input.screeningAnswers } : {}),
        // An edited offer is new to the client again.
        clientSeenAt: null,
      },
      select: { id: true, moderationStatus: true },
    });
  }

  assertAuthorEditable(bid.moderationStatus);

  return prisma.projectBid.update({
    where: { id: bidId },
    data: {
      amount: input.amount,
      deliveryDays: input.deliveryDays,
      message: input.message,
      // Back into the queue: a revised number has not been judged yet.
      moderationStatus: 'PENDING_REVIEW',
    },
    select: { id: true, moderationStatus: true },
  });
}

/**
 * What the project's author sees — approved bids only.
 *
 * The company's offer is flagged rather than filtered, so the client can weigh
 * it knowing exactly what it is. On the new board each bid also carries the
 * bidder's track record, the answers to the screening questions and the
 * proposed plan, and opening the list is what "last viewed by client" and the
 * bidder's "seen" mean.
 */
export async function listBidsForAuthor(userId: string, projectId: string) {
  await requireOwnProject(userId, projectId);
  const v2 = features.projectsV2;

  const bids = await prisma.projectBid.findMany({
    where: { projectId, moderationStatus: 'APPROVED' },
    orderBy: [{ isCompanyOffer: 'desc' }, { amount: 'asc' }],
    select: {
      id: true,
      amount: true,
      currency: true,
      deliveryDays: true,
      message: true,
      isCompanyOffer: true,
      attachmentOriginalName: true,
      outcome: true,
      createdAt: true,
      milestones: true,
      screeningAnswers: true,
      clientSeenAt: true,
      clientNote: true,
      outcomeChangedAt: true,
      invited: true,
      bidder: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const bidderIds = bids.flatMap((bid) => (bid.bidder ? [bid.bidder.id] : []));
  // Same addition as the employer's application inbox: the public handle and
  // reputation card beside the identity the author already sees.
  const [profiles, stats] = await Promise.all([
    authorProfileSummaries(bidderIds),
    v2 ? freelancerStats(bidderIds) : Promise.resolve(null),
  ]);

  if (v2) {
    const now = new Date();
    await prisma.$transaction([
      prisma.freelanceProject.update({ where: { id: projectId }, data: { clientViewedAt: now } }),
      prisma.projectBid.updateMany({
        where: { projectId, moderationStatus: 'APPROVED', clientSeenAt: null },
        data: { clientSeenAt: now },
      }),
    ]);
  }

  return bids.map((bid) => ({
    ...bid,
    bidderProfile: bid.bidder ? (profiles.get(bid.bidder.id) ?? null) : null,
    ...(v2 ? { bidderStats: bid.bidder ? (stats!.get(bid.bidder.id) ?? null) : null } : {}),
  }));
}

/**
 * The client picks one.
 *
 * Recorded as an award rather than merely a status, because the outcome is the
 * thing worth keeping even while no money moves through the platform — and it
 * is the row a fee or an invoice would later hang from.
 *
 * On the new board a project may hire more than one freelancer: it stays open
 * until as many have been hired as the client asked for. An hourly bid becomes
 * an hourly contract with a weekly limit, and a fixed bid's proposed plan
 * becomes the contract's milestones.
 */
export async function acceptBid(userId: string, bidId: string) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      amount: true,
      currency: true,
      moderationStatus: true,
      outcome: true,
      projectId: true,
      bidderId: true,
      deliveryDays: true,
      milestones: true,
      project: {
        select: {
          authorId: true,
          state: true,
          title: true,
          pricingType: true,
          weeklyHours: true,
          freelancersNeeded: true,
        },
      },
    },
  });

  if (!bid || bid.project.authorId !== userId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
  if (bid.moderationStatus !== 'APPROVED') {
    throw new AppError('این پیشنهاد هنوز بررسی نشده است.', 409);
  }
  if (bid.project.state !== 'OPEN') {
    throw new AppError('این پروژه دیگر باز نیست.', 409);
  }
  if (bid.outcome === 'ACCEPTED' || bid.outcome === 'WITHDRAWN') {
    throw new AppError('این پیشنهاد دیگر قابل پذیرش نیست.', 409);
  }

  const v2 = features.projectsV2;
  const hourly = v2 && bid.project.pricingType === 'HOURLY';

  const award = await prisma.$transaction(async (tx) => {
    await tx.projectBid.update({
      where: { id: bidId },
      data: { outcome: 'ACCEPTED', outcomeChangedAt: new Date() },
    });

    const hired = await tx.projectBid.count({ where: { projectId: bid.projectId, outcome: 'ACCEPTED' } });
    const full = !v2 || hired >= bid.project.freelancersNeeded;

    if (full) {
      // Everything else is declined in the same breath, so nobody is left
      // waiting on a project that has already been given to somebody.
      await tx.projectBid.updateMany({
        where: {
          projectId: bid.projectId,
          id: { not: bidId },
          outcome: { in: ['PENDING', 'SHORTLISTED', 'INTERVIEW'] },
        },
        data: { outcome: 'DECLINED', outcomeChangedAt: new Date() },
      });

      await tx.freelanceProject.update({
        where: { id: bid.projectId },
        data: { state: 'AWARDED' },
      });
    }

    const created = await tx.marketplaceAward.create({
      data: {
        projectBidId: bidId,
        // Copied, not referenced: what was agreed should not move if the bid
        // is later edited.
        agreedAmount: hourly ? null : bid.amount,
        currency: bid.currency,
        awardedById: userId,
        ...(hourly
          ? {
              pricingType: 'HOURLY' as const,
              hourlyRate: bid.amount,
              weeklyHourLimit: weeklyLimitFor(bid.project.weeklyHours),
            }
          : {}),
      },
      select: { id: true, agreedAmount: true, currency: true },
    });

    // The bidder's plan becomes the contract's milestones, dated from today.
    const plan = v2 && !hourly ? proposedPlan(bid.milestones) : [];
    let offset = 0;
    for (const [index, step] of plan.entries()) {
      offset += step.days;
      await tx.marketplaceMilestone.create({
        data: {
          awardId: created.id,
          order: index + 1,
          title: step.title,
          description: `${step.amount} ${bid.currency}`,
          dueDate: new Date(Date.now() + offset * 86_400_000),
        },
      });
    }

    return created;
  });

  if (bid.bidderId) {
    notifySafely(bid.bidderId, {
      type: 'award.created',
      title: 'پیشنهاد شما پذیرفته شد',
      body: `پیشنهاد شما برای «${bid.project.title}» پذیرفته شد. جزئیات همکاری در داشبورد شماست.`,
      link: '/dashboard/awards',
    });
  }

  return award;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export async function reviewProject(
  projectId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, authorId: true, title: true, moderationStatus: true, publishedAt: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  assertReviewable(project.moderationStatus);

  const updated = await prisma.freelanceProject.update({
    where: { id: projectId },
    data: reviewPatch(decision, reviewer, notes, project.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });

  // First publication only: an edit approved again is not news.
  if (features.projectsV2 && decision === 'APPROVED' && !project.publishedAt) {
    void notifyMatchingProjectAlerts(projectId);
  }

  notifySafely(project.authorId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'پروژهٔ شما منتشر شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'پروژهٔ شما نیازمند اصلاح است'
          : 'پروژهٔ شما رد شد',
    body:
      decision === 'APPROVED'
        ? `«${project.title}» تأیید و منتشر شد.`
        : `«${project.title}» — ${notes.reviewNote ?? ''}`,
    link: '/dashboard/projects',
  });

  return updated;
}

/**
 * Reviewing a bid, which is where the fairness judgement happens.
 *
 * `suggestedAmount` is advisory and never applied: the price on a bid stays
 * the bidder's own. Writing it into their bid for them would make the platform
 * a party to the negotiation rather than a check on it.
 */
export async function reviewBid(
  bidId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string; suggestedAmount?: bigint },
) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      bidderId: true,
      moderationStatus: true,
      project: { select: { title: true } },
    },
  });
  if (!bid) throw new AppError('این پیشنهاد پیدا نشد.', 404);

  assertReviewable(bid.moderationStatus);

  const { publishedAt: _ignored, ...patch } = reviewPatch(decision, reviewer, notes, new Date());

  const updated = await prisma.projectBid.update({
    where: { id: bidId },
    data: { ...patch, suggestedAmount: notes.suggestedAmount },
    select: { id: true, moderationStatus: true, suggestedAmount: true },
  });

  if (bid.bidderId) {
    notifySafely(bid.bidderId, {
      type: 'bid.reviewed',
      title:
        decision === 'APPROVED'
          ? 'پیشنهاد شما برای کارفرما ارسال شد'
          : decision === 'CHANGES_REQUESTED'
            ? 'پیشنهاد شما نیازمند اصلاح است'
            : 'پیشنهاد شما رد شد',
      body:
        decision === 'APPROVED'
          ? `پیشنهاد شما برای «${bid.project.title}» بررسی و برای کارفرما ارسال شد.`
          : `«${bid.project.title}» — ${notes.reviewNote ?? ''}`,
      link: '/dashboard/bids',
    });
  }

  return updated;
}

export async function listProjectsForReview(query: {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.FreelanceProjectWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
    ...searchWhere(query.search, ['title', 'companyName', 'code', ['author', 'email']]),
  };

  const [items, total] = await Promise.all([
    prisma.freelanceProject.findMany({
      where,
      orderBy: { submittedAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        title: true,
        companyName: true,
        featured: true,
        moderationStatus: true,
        submittedAt: true,
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.freelanceProject.count({ where }),
  ]);

  return toPage(items, total, query.page, query.pageSize);
}

/** One project attachment, for a reviewer to look at. */
export async function getAttachmentForReview(attachmentId: string) {
  const attachment = await prisma.freelanceAttachment.findUnique({
    where: { id: attachmentId },
    select: { storedName: true, mimeType: true, originalName: true },
  });

  if (!attachment) throw new AppError('این فایل پیدا نشد.', 404);
  return attachment;
}

/** The bid queue, with the project's scope alongside so fairness can be judged. */
export async function listBidsForReview(query: { search?: string; page: number; pageSize: number }) {
  const where: Prisma.ProjectBidWhereInput = {
    moderationStatus: 'PENDING_REVIEW',
    ...searchWhere(query.search, [
      ['bidder', 'email'],
      ['bidder', 'firstName'],
      ['bidder', 'lastName'],
      ['project', 'title'],
      ['project', 'code'],
    ]),
  };

  const [items, total] = await Promise.all([
    prisma.projectBid.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        amount: true,
        currency: true,
        deliveryDays: true,
        message: true,
        isCompanyOffer: true,
        createdAt: true,
        bidder: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: {
          select: {
            code: true,
            title: true,
            description: true,
            budgetMin: true,
            budgetMax: true,
            budgetUnknown: true,
            currency: true,
          },
        },
      },
    }),
    prisma.projectBid.count({ where }),
  ]);

  return toPage(items, total, query.page, query.pageSize);
}

/** The second generation's filters, as a where clause. Empty when none apply. */
async function boardFiltersV2(query: ProjectBoardQuery): Promise<Prisma.FreelanceProjectWhereInput[]> {
  if (!features.projectsV2) return [];
  const and: Prisma.FreelanceProjectWhereInput[] = [];

  if (query.workCategoryId) and.push({ workCategoryId: { in: await workCategoryScope(query.workCategoryId) } });
  if (query.pricingType) and.push({ pricingType: query.pricingType });
  if (query.experienceLevel) and.push({ experienceLevel: query.experienceLevel });
  if (query.duration) and.push({ duration: query.duration });
  if (query.weeklyHours) and.push({ weeklyHours: query.weeklyHours });
  if (query.urgent) and.push({ urgent: true });
  if (query.featured) and.push({ featured: true });
  if (query.nda) and.push({ nda: true });
  if (query.onsite) and.push({ onsite: true });
  if (query.contractToHire) and.push({ contractToHire: true });
  if (query.language) and.push({ languages: { has: query.language } });
  if (query.currency) and.push({ currency: query.currency });
  // "Open to freelancers in X": the client named X, or named nowhere.
  if (query.country) {
    and.push({ OR: [{ preferredCountries: { isEmpty: true } }, { preferredCountries: { has: query.country } }] });
  }
  if (query.postedWithinDays) {
    and.push({ publishedAt: { gte: new Date(Date.now() - query.postedWithinDays * 86_400_000) } });
  }
  if (query.clientVerified) and.push({ author: { verification: { status: 'APPROVED' } } });
  if (query.clientHired) and.push({ author: { awardsMade: { some: {} } } });
  if (query.maxBids !== undefined) {
    // Prisma cannot filter on a relation count, so the ids come first.
    const crowded = await prisma.projectBid.groupBy({
      by: ['projectId'],
      where: { moderationStatus: 'APPROVED', outcome: { not: 'WITHDRAWN' } },
      having: { projectId: { _count: { gt: query.maxBids } } },
    });
    if (crowded.length > 0) and.push({ id: { notIn: crowded.map((row) => row.projectId) } });
  }
  return and;
}

/**
 * What a bid must look like on the second-generation board.
 *
 * Every screening question answered; a proposed plan only on fixed-price work
 * (an hourly contract is planned by the week), and adding up to the price.
 */
function assertBidShape(
  project: { pricingType: 'FIXED' | 'HOURLY'; screeningQuestions: string[] },
  input: BidInput,
): void {
  const answers = input.screeningAnswers ?? [];
  if (answers.length !== project.screeningQuestions.length || answers.some((answer) => !answer.trim())) {
    throw new AppError('لطفاً به همهٔ پرسش‌های کارفرما پاسخ دهید.', 400);
  }
  if (input.milestones?.length) {
    if (project.pricingType === 'HOURLY') {
      throw new AppError('پروژهٔ ساعتی مرحله‌بندی پرداخت ندارد.', 400);
    }
    const sum = input.milestones.reduce((total, step) => total + BigInt(step.amount), 0n);
    if (sum !== input.amount) {
      throw new AppError('جمع مبلغ مراحل باید با مبلغ پیشنهاد برابر باشد.', 400);
    }
  }
}

/** The weekly cap an hourly contract starts with, from what the client asked for. */
function weeklyLimitFor(weeklyHours: string | null): number | null {
  switch (weeklyHours) {
    case 'LESS_THAN_10':
      return 10;
    case 'TEN_TO_THIRTY':
      return 30;
    case 'MORE_THAN_THIRTY':
      return 40;
    default:
      return null;
  }
}

/** A stored plan, defensively: JSON from the database is not trusted to have the shape it was written with. */
function proposedPlan(value: Prisma.JsonValue | null): Array<{ title: string; amount: string; days: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((step) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) return [];
    const { title, amount, days } = step as Record<string, unknown>;
    return typeof title === 'string' && typeof amount === 'string' && typeof days === 'number'
      ? [{ title, amount, days }]
      : [];
  });
}
