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

/**
 * The freelance board.
 *
 * A verified client posts a piece of work; verified freelancers bid on it, and
 * so can this company. Bids are sealed â€” a bidder sees only their own â€” because
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

async function requireOwnProject(userId: string, projectId: string) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, authorId: true, moderationStatus: true, openToCompanyOffer: true },
  });

  if (!project || project.authorId !== userId) throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  return project;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ProjectBoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  skills?: string[];
  budgetMin?: bigint;
  budgetMax?: bigint;
  sort?: 'newest' | 'budgetAsc' | 'budgetDesc';
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
    default:
      return [featured, { publishedAt: 'desc' }];
  }
}

export async function listPublicProjects(query: ProjectBoardQuery) {
  const where: Prisma.FreelanceProjectWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      {
        ...(query.category ? { category: query.category } : {}),
        ...(query.skills?.length ? { skills: { hasSome: query.skills } } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
      budgetRangeWhere(query),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.freelanceProject.findMany({
      where,
      orderBy: projectSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { ...publicProjectFields(), authorId: true },
    }),
    prisma.freelanceProject.count({ where }),
  ]);

  const profiles = await authorProfileSummaries(rows.map((row) => row.authorId));
  const items = rows.map(({ authorId, ...row }) => ({
    ...row,
    authorProfile: profiles.get(authorId) ?? null,
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getPublicProject(code: string) {
  const decoded = code.trim().toUpperCase();
  try {
    await prisma.freelanceProject.updateMany({
      where: { code: decoded, ...PUBLIC_LISTING_WHERE },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Reading beats counting.
  }

  const project = await prisma.freelanceProject.findFirst({
    where: { code: decoded, ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicProjectFields(),
      description: true,
      skills: true,
      deliverBy: true,
      openToCompanyOffer: true,
      closesAt: true,
      viewCount: true,
      authorId: true,
      attachments: { select: { id: true, originalName: true, sizeBytes: true } },
    },
  });

  if (!project) throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

  const [authorProfile, similar] = await Promise.all([
    authorProfileSummary(project.authorId),
    similarProjects(project),
  ]);

  return { ...project, authorProfile, similar };
}

/** Same idea as jobs.service.similarJobs: category first, skills overlap. */
async function similarProjects(project: {
  id: string;
  category: string | null;
  skills: string[];
}): Promise<Array<{ code: string; title: string; category: string | null }>> {
  const where: Prisma.FreelanceProjectWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    id: { not: project.id },
    OR: [
      ...(project.category ? [{ category: project.category }] : []),
      ...(project.skills.length > 0 ? [{ skills: { hasSome: project.skills } }] : []),
    ],
  };
  if (!where.OR || where.OR.length === 0) return [];

  return prisma.freelanceProject.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take: 4,
    select: { code: true, title: true, category: true },
  });
}

function publicProjectFields() {
  return {
    id: true,
    code: true,
    title: true,
    companyName: true,
    category: true,
    featured: true,
    budgetMin: true,
    budgetMax: true,
    budgetUnknown: true,
    currency: true,
    publishedAt: true,
    // How many have bid, never who or how much. Sealed means sealed; a count
    // conveys that there is competition without exposing anybody's number.
    _count: { select: { bids: { where: { moderationStatus: 'APPROVED' } } } },
  } as const;
}

export async function listOwnProjects(userId: string) {
  return prisma.freelanceProject.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      title: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { bids: { where: { moderationStatus: 'APPROVED' } } } },
    },
  });
}

// ---------------------------------------------------------------------------
// Bids
// ---------------------------------------------------------------------------

export interface BidInput {
  amount: bigint;
  deliveryDays?: number;
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
    select: { id: true, authorId: true },
  });
  if (!project) throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯ ÛŒØ§ Ø¯ÛŒÚ¯Ø± Ø¨Ø§Ø² Ù†ÛŒØ³Øª.', 404);

  if (project.authorId === userId) {
    throw new AppError('Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø¨Ø±Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡Ù” Ø®ÙˆØ¯ØªØ§Ù† Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ø¨Ø¯Ù‡ÛŒØ¯.', 400);
  }

  const existing = await prisma.projectBid.findUnique({
    where: { projectId_bidderId: { projectId, bidderId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('Ù¾ÛŒØ´â€ŒØªØ± Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒØ¯.', 409);

  const stored = attachment ? (await storeFiles([attachment]))[0] : null;

  try {
    return await prisma.projectBid.create({
      data: {
        projectId,
        bidderId: userId,
        amount: input.amount,
        deliveryDays: input.deliveryDays,
        message: input.message,
        attachmentOriginalName: stored?.originalName,
        attachmentStoredName: stored?.storedName,
        attachmentMimeType: stored?.mimeType,
        attachmentSizeBytes: stored?.sizeBytes,
        attachmentChecksum: stored?.checksum,
        moderationStatus: 'PENDING_REVIEW',
      },
      select: { id: true, moderationStatus: true },
    });
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/**
 * This company's own offer, placed by staff.
 *
 * Marked so the client sees it as the company's professional offer rather than
 * as one freelancer among many â€” which is the honest presentation, since it is
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
  if (!project) throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯ ÛŒØ§ Ø¯ÛŒÚ¯Ø± Ø¨Ø§Ø² Ù†ÛŒØ³Øª.', 404);

  if (!project.openToCompanyOffer) {
    // The client said no when they posted it. Somebody looking for an
    // individual should not be pitched by the operator regardless.
    throw new AppError('Ù†ÙˆÛŒØ³Ù†Ø¯Ù‡Ù” Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ø´Ø±Ú©Øª Ø±Ø§ Ù†Ù¾Ø°ÛŒØ±ÙØªÙ‡ Ø§Ø³Øª.', 403);
  }

  const existing = await prisma.projectBid.findFirst({
    where: { projectId, isCompanyOffer: true },
    select: { id: true },
  });
  if (existing) throw new AppError('Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ø´Ø±Ú©Øª Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.', 409);

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

/** Revising after a reviewer has asked for it. */
export async function reviseBid(userId: string, bidId: string, input: BidInput) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: { id: true, bidderId: true, moderationStatus: true },
  });

  if (!bid || bid.bidderId !== userId) throw new AppError('Ø§ÛŒÙ† Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  assertAuthorEditable(bid.moderationStatus);

  return prisma.projectBid.update({
    where: { id: bidId },
    data: {
      ...input,
      // Back into the queue: a revised number has not been judged yet.
      moderationStatus: 'PENDING_REVIEW',
    },
    select: { id: true, moderationStatus: true },
  });
}

/**
 * What the project's author sees â€” approved bids only.
 *
 * The company's offer is flagged rather than filtered, so the client can weigh
 * it knowing exactly what it is.
 */
export async function listBidsForAuthor(userId: string, projectId: string) {
  await requireOwnProject(userId, projectId);

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
      bidder: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Same addition as the employer's application inbox: the public handle and
  // reputation card beside the identity the author already sees.
  const profiles = await authorProfileSummaries(
    bids.flatMap((bid) => (bid.bidder ? [bid.bidder.id] : [])),
  );
  return bids.map((bid) => ({
    ...bid,
    bidderProfile: bid.bidder ? (profiles.get(bid.bidder.id) ?? null) : null,
  }));
}

/**
 * The client picks one.
 *
 * Recorded as an award rather than merely a status, because the outcome is the
 * thing worth keeping even while no money moves through the platform â€” and it
 * is the row a fee or an invoice would later hang from.
 */
export async function acceptBid(userId: string, bidId: string) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      amount: true,
      currency: true,
      moderationStatus: true,
      projectId: true,
      bidderId: true,
      project: { select: { authorId: true, state: true, title: true } },
    },
  });

  if (!bid || bid.project.authorId !== userId) throw new AppError('Ø§ÛŒÙ† Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  if (bid.moderationStatus !== 'APPROVED') {
    throw new AppError('Ø§ÛŒÙ† Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ù‡Ù†ÙˆØ² Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.', 409);
  }
  if (bid.project.state !== 'OPEN') {
    throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ø¯ÛŒÚ¯Ø± Ø¨Ø§Ø² Ù†ÛŒØ³Øª.', 409);
  }

  const award = await prisma.$transaction(async (tx) => {
    await tx.projectBid.update({ where: { id: bidId }, data: { outcome: 'ACCEPTED' } });

    // Everything else is declined in the same breath, so nobody is left
    // waiting on a project that has already been given to somebody.
    await tx.projectBid.updateMany({
      where: { projectId: bid.projectId, id: { not: bidId }, outcome: 'PENDING' },
      data: { outcome: 'DECLINED' },
    });

    await tx.freelanceProject.update({
      where: { id: bid.projectId },
      data: { state: 'AWARDED' },
    });

    return tx.marketplaceAward.create({
      data: {
        projectBidId: bidId,
        // Copied, not referenced: what was agreed should not move if the bid
        // is later edited.
        agreedAmount: bid.amount,
        currency: bid.currency,
        awardedById: userId,
      },
      select: { id: true, agreedAmount: true, currency: true },
    });
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
  if (!project) throw new AppError('Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

  assertReviewable(project.moderationStatus);

  const updated = await prisma.freelanceProject.update({
    where: { id: projectId },
    data: reviewPatch(decision, reviewer, notes, project.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });

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
  if (!bid) throw new AppError('Ø§ÛŒÙ† Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

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

  if (!attachment) throw new AppError('Ø§ÛŒÙ† ÙØ§ÛŒÙ„ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
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
