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
import { RESUME_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The job board.
 *
 * An employer writes a role, submits it, a person reads it, and only then does
 * it appear. Applications take the same route in the other direction: they
 * reach staff before they reach the employer.
 *
 * Both halves are gated on verification, which is what makes the board worth
 * reading â€” an advert from an account nobody has checked is worth about as
 * much as no advert.
 */

export interface JobInput {
  title: string;
  description: string;
  category?: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
  workArrangement: 'ONSITE' | 'HYBRID' | 'REMOTE';
  province?: string;
  city?: string;
  salaryMin?: bigint;
  salaryMax?: bigint;
  salaryUndisclosed?: boolean;
  skills?: string[];
  closesAt?: Date;
}

/**
 * The company name is copied from the author's verification at write time.
 *
 * A listing should keep saying which company placed it even if the account
 * later changes what it is verified as â€” the advert somebody replied to does
 * not retroactively become a different company's.
 */
async function companyNameFor(userId: string): Promise<string | null> {
  const verification = await prisma.userVerification.findUnique({
    where: { userId },
    select: { kind: true, companyName: true },
  });
  return verification?.kind === 'COMPANY' ? (verification.companyName ?? null) : null;
}

export async function createJob(userId: string, input: JobInput) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);

  return prisma.jobPost.create({
    data: {
      code: generateTrackingCode(),
      authorId: userId,
      companyName: await companyNameFor(userId),
      ...input,
      skills: input.skills ?? [],
      // Created as a draft: writing an advert and publishing it are separate
      // decisions, and somebody should be able to stop halfway.
      moderationStatus: 'DRAFT',
    },
    select: { id: true, code: true, moderationStatus: true },
  });
}

export async function updateJob(userId: string, jobId: string, input: Partial<JobInput>) {
  const job = await requireOwnJob(userId, jobId);
  assertAuthorEditable(job.moderationStatus);

  return prisma.jobPost.update({
    where: { id: jobId },
    data: input,
    select: { id: true, moderationStatus: true },
  });
}

export async function submitJob(userId: string, jobId: string) {
  const job = await requireOwnJob(userId, jobId);
  assertSubmittable(job.moderationStatus);
  await assertVerified(userId);

  return prisma.jobPost.update({
    where: { id: jobId },
    data: { moderationStatus: 'PENDING_REVIEW', submittedAt: new Date() },
    select: { id: true, moderationStatus: true },
  });
}

/** Withdrawing is the author's route back out once something is live. */
export async function closeJob(userId: string, jobId: string) {
  await requireOwnJob(userId, jobId);
  return prisma.jobPost.update({
    where: { id: jobId },
    data: { state: 'CLOSED' },
    select: { id: true, state: true },
  });
}

async function requireOwnJob(userId: string, jobId: string) {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, authorId: true, moderationStatus: true },
  });

  // The same answer whether it does not exist or belongs to somebody else:
  // otherwise this endpoint enumerates other people's drafts.
  if (!job || job.authorId !== userId) throw new AppError('Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  return job;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface JobQuery {
  page: number;
  pageSize: number;
  search?: string;
  employmentType?: string;
  workArrangement?: string;
  province?: string;
  category?: string;
  skills?: string[];
  salaryMin?: bigint;
  salaryMax?: bigint;
  sort?: 'newest' | 'salaryAsc' | 'salaryDesc' | 'closingSoon';
}

/**
 * A listing overlaps a filter range when the ranges intersect, treating a
 * missing endpoint as unbounded. `salaryUndisclosed` listings never match a
 * range filter â€” filtering by pay and then including rows that refuse to say
 * is not filtering.
 */
export function salaryRangeWhere(query: JobQuery): Prisma.JobPostWhereInput {
  if (query.salaryMin === undefined && query.salaryMax === undefined) return {};
  return {
    salaryUndisclosed: false,
    AND: [
      ...(query.salaryMax !== undefined
        ? [{ OR: [{ salaryMin: null }, { salaryMin: { lte: query.salaryMax } }] }]
        : []),
      ...(query.salaryMin !== undefined
        ? [{ OR: [{ salaryMax: null }, { salaryMax: { gte: query.salaryMin } }] }]
        : []),
    ],
  };
}

export function jobSort(query: JobQuery): Prisma.JobPostOrderByWithRelationInput[] {
  // Featured always sorts first â€” that is what featuring means. The chosen
  // sort breaks ties among same-prominence listings. Null salaries always sit
  // at the bottom of a pay sort, whichever direction it runs.
  const featured: Prisma.JobPostOrderByWithRelationInput = { featured: 'desc' };
  switch (query.sort) {
    case 'salaryAsc':
      return [featured, { salaryMin: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }];
    case 'salaryDesc':
      return [featured, { salaryMax: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }];
    case 'closingSoon':
      return [featured, { closesAt: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }];
    default:
      return [featured, { publishedAt: 'desc' }];
  }
}

/** The public board. Only approved, open listings, never anybody's draft. */
export async function listPublicJobs(query: JobQuery) {
  const where: Prisma.JobPostWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      {
        ...(query.employmentType ? { employmentType: query.employmentType as never } : {}),
        ...(query.workArrangement ? { workArrangement: query.workArrangement as never } : {}),
        ...(query.province ? { province: query.province } : {}),
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
        // A closing date that has passed hides the listing without anybody having
        // to run a job to expire it.
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
      salaryRangeWhere(query),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      orderBy: jobSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { ...publicJobFields(), authorId: true },
    }),
    prisma.jobPost.count({ where }),
  ]);

  const profiles = await authorProfileSummaries(rows.map((row) => row.authorId));
  const items = rows.map(({ authorId, ...row }) => ({
    ...row,
    authorProfile: profiles.get(authorId) ?? null,
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getPublicJob(code: string) {
  // Count the read before fetching so the returned viewCount includes this
  // one. A failed counter must never fail the read â€” see the schema note on
  // viewCount about the accepted under-count under the board cache.
  const decoded = code.trim().toUpperCase();
  try {
    await prisma.jobPost.updateMany({
      where: { code: decoded, ...PUBLIC_LISTING_WHERE },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Reading beats counting.
  }

  const job = await prisma.jobPost.findFirst({
    where: { code: decoded, ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicJobFields(),
      description: true,
      skills: true,
      closesAt: true,
      viewCount: true,
      authorId: true,
      _count: { select: { applications: { where: { moderationStatus: 'APPROVED' } } } },
    },
  });

  if (!job) throw new AppError('Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

  const [authorProfile, similar] = await Promise.all([
    authorProfileSummary(job.authorId),
    similarJobs(job),
  ]);

  return { ...job, authorProfile, similar };
}

/**
 * Suggestions for the detail page: same category first, then skill overlap.
 * A count, never identities â€” the sealed-board rule applies to suggestions
 * exactly as much as to the board itself.
 */
async function similarJobs(job: {
  id: string;
  category: string | null;
  skills: string[];
}): Promise<Array<{ code: string; title: string; category: string | null; employmentType: string }>> {
  const where: Prisma.JobPostWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    id: { not: job.id },
    OR: [
      ...(job.category ? [{ category: job.category }] : []),
      ...(job.skills.length > 0 ? [{ skills: { hasSome: job.skills } }] : []),
    ],
  };
  if (!where.OR || where.OR.length === 0) return [];

  return prisma.jobPost.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take: 4,
    select: { code: true, title: true, category: true, employmentType: true },
  });
}

function publicJobFields() {
  return {
    id: true,
    code: true,
    title: true,
    companyName: true,
    category: true,
    featured: true,
    employmentType: true,
    workArrangement: true,
    province: true,
    city: true,
    salaryMin: true,
    salaryMax: true,
    salaryUndisclosed: true,
    currency: true,
    publishedAt: true,
  } as const;
}

/** Everything the author sees about their own postings, drafts included. */
export async function listOwnJobs(userId: string) {
  return prisma.jobPost.findMany({
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
      _count: { select: { applications: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function apply(
  userId: string,
  jobId: string,
  input: { coverLetter?: string; expectedSalary?: bigint },
  cv: IncomingFile | null,
) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);

  const job = await prisma.jobPost.findFirst({
    where: { id: jobId, ...PUBLIC_LISTING_WHERE },
    select: { id: true, authorId: true },
  });
  if (!job) throw new AppError('Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯ ÛŒØ§ Ø¯ÛŒÚ¯Ø± Ø¨Ø§Ø² Ù†ÛŒØ³Øª.', 404);

  if (job.authorId === userId) {
    throw new AppError('Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø¨Ø±Ø§ÛŒ Ø¢Ú¯Ù‡ÛŒ Ø®ÙˆØ¯ØªØ§Ù† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¨Ø¯Ù‡ÛŒØ¯.', 400);
  }

  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('Ù¾ÛŒØ´â€ŒØªØ± Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒØ¯.', 409);

  // Only the CV formats the CV pile already accepts, for the same reasons.
  const stored = cv ? (await storeFiles([cv], RESUME_EXTENSIONS))[0] : null;

  try {
    return await prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: userId,
        coverLetter: input.coverLetter,
        expectedSalary: input.expectedSalary,
        cvOriginalName: stored?.originalName,
        cvStoredName: stored?.storedName,
        cvMimeType: stored?.mimeType,
        cvSizeBytes: stored?.sizeBytes,
        cvChecksum: stored?.checksum,
        // Straight into the queue: an application is not a draft, and the
        // applicant has nothing further to decide.
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
 * Answering a reviewer who asked for changes.
 *
 * Without this CHANGES_REQUESTED on an application was a dead end: the note
 * asks for something, and the unique constraint on (job, applicant) stops the
 * applicant from simply applying again. A review that cannot be answered is
 * just a rejection written politely.
 *
 * A new CV is optional â€” most notes are about the letter â€” and when one comes
 * the old file is removed only after the row points at the new one.
 */
export async function reviseApplication(
  userId: string,
  applicationId: string,
  input: { coverLetter?: string; expectedSalary?: bigint },
  cv: IncomingFile | null,
) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, applicantId: true, moderationStatus: true, cvStoredName: true },
  });

  if (!application || application.applicantId !== userId) {
    throw new AppError('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  }
  assertAuthorEditable(application.moderationStatus);

  const stored = cv ? (await storeFiles([cv], RESUME_EXTENSIONS))[0] : null;

  try {
    const updated = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        coverLetter: input.coverLetter,
        expectedSalary: input.expectedSalary,
        ...(stored
          ? {
              cvOriginalName: stored.originalName,
              cvStoredName: stored.storedName,
              cvMimeType: stored.mimeType,
              cvSizeBytes: stored.sizeBytes,
              cvChecksum: stored.checksum,
            }
          : {}),
        // Back into the queue: what changed has not been judged yet.
        moderationStatus: 'PENDING_REVIEW',
      },
      select: { id: true, moderationStatus: true },
    });

    if (stored && application.cvStoredName) await removeFile(application.cvStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/**
 * What the employer sees â€” only applications a reviewer has passed on.
 *
 * This is the half of moderation that does the work: the employer's inbox
 * contains what somebody judged worth their time, not everything that arrived.
 */
export async function listApplicationsForEmployer(userId: string, jobId: string) {
  await requireOwnJob(userId, jobId);

  const applications = await prisma.jobApplication.findMany({
    where: { jobId, moderationStatus: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      coverLetter: true,
      expectedSalary: true,
      cvOriginalName: true,
      outcome: true,
      createdAt: true,
      applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // The employer already sees the applicant's identity; the profile card adds
  // the public handle, verification state and reputation without another
  // query per row.
  const profiles = await authorProfileSummaries(applications.map((row) => row.applicant.id));
  return applications.map((row) => ({
    ...row,
    applicantProfile: profiles.get(row.applicant.id) ?? null,
  }));
}

/**
 * What an applicant sees of their own applications.
 *
 * Without this somebody applies and then has nowhere to look: no record of
 * what they applied to, no sign that a reviewer sent it back, no outcome. The
 * bidder side has had this from the start; the applicant side needs it for the
 * same reason.
 *
 * The reviewer's note is included, because it is written to the applicant.
 * internalNote is not â€” that one is written about them.
 */
export async function listOwnApplications(userId: string) {
  return prisma.jobApplication.findMany({
    where: { applicantId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      coverLetter: true,
      expectedSalary: true,
      cvOriginalName: true,
      moderationStatus: true,
      reviewNote: true,
      outcome: true,
      createdAt: true,
      job: { select: { code: true, title: true, companyName: true, state: true } },
    },
  });
}

export async function setApplicationOutcome(
  userId: string,
  applicationId: string,
  outcome: 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED',
) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      expectedSalary: true,
      moderationStatus: true,
      job: { select: { id: true, authorId: true, title: true } },
    },
  });

  if (!application || application.job.authorId !== userId) {
    throw new AppError('این درخواست پیدا نشد.', 404);
  }
  if (application.moderationStatus !== 'APPROVED') {
    throw new AppError('این درخواست هنوز بررسی نشده است.', 409);
  }

  // Accepting is the mirror of the freelance acceptBid: the role is taken,
  // everyone else waiting on it gets a clear no, the listing closes to new
  // applications, and the outcome is recorded as an award — the row the
  // milestones, reviews and any future settlement hang from.
  if (outcome === 'ACCEPTED') {
    const result = await prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { id: applicationId },
        data: { outcome: 'ACCEPTED' },
      });
      await tx.jobApplication.updateMany({
        where: { jobId: application.job.id, id: { not: applicationId }, outcome: 'PENDING' },
        data: { outcome: 'DECLINED' },
      });
      await tx.jobPost.update({
        where: { id: application.job.id },
        data: { state: 'AWARDED' },
      });

      const existing = await tx.marketplaceAward.findFirst({
        where: { jobApplicationId: applicationId },
        select: { id: true },
      });
      const award =
        existing ??
        (await tx.marketplaceAward.create({
          data: {
            jobApplicationId: applicationId,
            agreedAmount: application.expectedSalary,
            awardedById: userId,
          },
          select: { id: true },
        }));

      return { id: applicationId, outcome: 'ACCEPTED' as const, awardId: award.id };
    });

    notifySafely(application.applicantId, {
      type: 'award.created',
      title: 'پذیرفته شدید',
      body: `درخواست شما برای «${application.job.title}» پذیرفته شد. جزئیات همکاری در داشبورد شماست.`,
      link: '/dashboard/awards',
    });

    return result;
  }

  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: { outcome },
    select: { id: true, outcome: true },
  });
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export async function reviewJob(
  jobId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, authorId: true, title: true, moderationStatus: true, publishedAt: true },
  });
  if (!job) throw new AppError('Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

  assertReviewable(job.moderationStatus);

  const updated = await prisma.jobPost.update({
    where: { id: jobId },
    data: reviewPatch(decision, reviewer, notes, job.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });

  notifySafely(job.authorId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'آگهی شما منتشر شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'آگهی شما نیازمند اصلاح است'
          : 'آگهی شما رد شد',
    body:
      decision === 'APPROVED'
        ? `«${job.title}» تأیید و منتشر شد.`
        : `«${job.title}» — ${notes.reviewNote ?? ''}`,
    link: '/dashboard/jobs',
  });

  return updated;
}

export async function reviewApplication(
  applicationId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      moderationStatus: true,
      job: { select: { title: true } },
    },
  });
  if (!application) throw new AppError('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);

  assertReviewable(application.moderationStatus);

  // An application has no publication date â€” it is passed to one employer
  // rather than published â€” so the patch's publishedAt branch never fires.
  const { publishedAt: _ignored, ...patch } = reviewPatch(decision, reviewer, notes, new Date());

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: patch,
    select: { id: true, moderationStatus: true },
  });

  notifySafely(application.applicantId, {
    type: 'application.reviewed',
    title:
      decision === 'APPROVED'
        ? 'درخواست شما برای کارفرما ارسال شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'درخواست شما نیازمند اصلاح است'
          : 'درخواست شما رد شد',
    body:
      decision === 'APPROVED'
        ? `درخواست شما برای «${application.job.title}» بررسی و برای کارفرما ارسال شد.`
        : `«${application.job.title}» — ${notes.reviewNote ?? ''}`,
    link: '/dashboard/applications',
  });

  return updated;
}

export async function listJobsForReview(query: {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.JobPostWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
    ...searchWhere(query.search, ['title', 'companyName', 'code', ['author', 'email']]),
  };

  const [items, total] = await Promise.all([
    prisma.jobPost.findMany({
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
    prisma.jobPost.count({ where }),
  ]);

  return toPage(items, total, query.page, query.pageSize);
}

/**
 * The application queue.
 *
 * reviewApplication existed with nothing to find its subjects, so an
 * application that reached PENDING_REVIEW stayed there: invisible to staff,
 * and therefore never delivered to the employer either. The job it belongs to
 * comes along, since "is this worth the employer's time" cannot be judged
 * without knowing what the role is.
 */
export async function listApplicationsForReview(query: {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.JobApplicationWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
    // An application is found by the applicant or by the job it is for —
    // never by its own id, which nobody has ever read off a screen.
    ...searchWhere(query.search, [
      ['applicant', 'email'],
      ['applicant', 'firstName'],
      ['applicant', 'lastName'],
      ['job', 'title'],
      ['job', 'code'],
    ]),
  };

  const [items, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        coverLetter: true,
        expectedSalary: true,
        cvOriginalName: true,
        cvStoredName: true,
        moderationStatus: true,
        createdAt: true,
        applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, code: true, title: true, companyName: true, description: true } },
      },
    }),
    prisma.jobApplication.count({ where }),
  ]);

  return toPage(items, total, query.page, query.pageSize);
}

/** An applicant's CV, for the reviewer holding the application. */
export async function getApplicationCvForReview(applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { cvStoredName: true, cvMimeType: true, cvOriginalName: true },
  });

  if (!application?.cvStoredName || !application.cvMimeType || !application.cvOriginalName) {
    throw new AppError('Ø±Ø²ÙˆÙ…Ù‡â€ŒØ§ÛŒ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.', 404);
  }

  return {
    cvStoredName: application.cvStoredName,
    cvMimeType: application.cvMimeType,
    cvOriginalName: application.cvOriginalName,
  };
}

export async function getJobForReview(jobId: string) {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    include: {
      author: { select: { id: true, email: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!job) throw new AppError('Ø§ÛŒÙ† Ø¢Ú¯Ù‡ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 404);
  return job;
}
