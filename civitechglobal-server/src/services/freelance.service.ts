import type { Prisma } from '@prisma/client';
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
import { assertVerified } from './verification.service.js';
import { removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

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

  if (!project || project.authorId !== userId) throw new AppError('این پروژه پیدا نشد.', 404);
  return project;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function listPublicProjects(query: {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}) {
  const where: Prisma.FreelanceProjectWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.freelanceProject.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: publicProjectFields(),
    }),
    prisma.freelanceProject.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPublicProject(code: string) {
  const project = await prisma.freelanceProject.findFirst({
    where: { code: code.trim().toUpperCase(), ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicProjectFields(),
      description: true,
      skills: true,
      deliverBy: true,
      openToCompanyOffer: true,
      attachments: { select: { id: true, originalName: true, sizeBytes: true } },
    },
  });

  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);
  return project;
}

function publicProjectFields() {
  return {
    id: true,
    code: true,
    title: true,
    companyName: true,
    category: true,
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

  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, ...PUBLIC_LISTING_WHERE },
    select: { id: true, authorId: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد یا دیگر باز نیست.', 404);

  if (project.authorId === userId) {
    throw new AppError('نمی‌توانید برای پروژهٔ خودتان پیشنهاد بدهید.', 400);
  }

  const existing = await prisma.projectBid.findUnique({
    where: { projectId_bidderId: { projectId, bidderId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('پیش‌تر برای این پروژه پیشنهاد داده‌اید.', 409);

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

/** Revising after a reviewer has asked for it. */
export async function reviseBid(userId: string, bidId: string, input: BidInput) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: { id: true, bidderId: true, moderationStatus: true },
  });

  if (!bid || bid.bidderId !== userId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
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
 * What the project's author sees — approved bids only.
 *
 * The company's offer is flagged rather than filtered, so the client can weigh
 * it knowing exactly what it is.
 */
export async function listBidsForAuthor(userId: string, projectId: string) {
  await requireOwnProject(userId, projectId);

  return prisma.projectBid.findMany({
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
}

/**
 * The client picks one.
 *
 * Recorded as an award rather than merely a status, because the outcome is the
 * thing worth keeping even while no money moves through the platform — and it
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
      project: { select: { authorId: true, state: true } },
    },
  });

  if (!bid || bid.project.authorId !== userId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
  if (bid.moderationStatus !== 'APPROVED') {
    throw new AppError('این پیشنهاد هنوز بررسی نشده است.', 409);
  }
  if (bid.project.state !== 'OPEN') {
    throw new AppError('این پروژه دیگر باز نیست.', 409);
  }

  return prisma.$transaction(async (tx) => {
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
    select: { id: true, moderationStatus: true, publishedAt: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  assertReviewable(project.moderationStatus);

  return prisma.freelanceProject.update({
    where: { id: projectId },
    data: reviewPatch(decision, reviewer, notes, project.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });
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
    select: { id: true, moderationStatus: true },
  });
  if (!bid) throw new AppError('این پیشنهاد پیدا نشد.', 404);

  assertReviewable(bid.moderationStatus);

  const { publishedAt: _ignored, ...patch } = reviewPatch(decision, reviewer, notes, new Date());

  return prisma.projectBid.update({
    where: { id: bidId },
    data: { ...patch, suggestedAmount: notes.suggestedAmount },
    select: { id: true, moderationStatus: true, suggestedAmount: true },
  });
}

export async function listProjectsForReview(query: {
  status?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.FreelanceProjectWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
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
        moderationStatus: true,
        submittedAt: true,
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.freelanceProject.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** The bid queue, with the project's scope alongside so fairness can be judged. */
export async function listBidsForReview(query: { page: number; pageSize: number }) {
  const where: Prisma.ProjectBidWhereInput = { moderationStatus: 'PENDING_REVIEW' };

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

  return { items, total, page: query.page, pageSize: query.pageSize };
}
