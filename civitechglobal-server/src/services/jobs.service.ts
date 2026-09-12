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
import { RESUME_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The job board.
 *
 * An employer writes a role, submits it, a person reads it, and only then does
 * it appear. Applications take the same route in the other direction: they
 * reach staff before they reach the employer.
 *
 * Both halves are gated on verification, which is what makes the board worth
 * reading — an advert from an account nobody has checked is worth about as
 * much as no advert.
 */

export interface JobInput {
  title: string;
  description: string;
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
 * later changes what it is verified as — the advert somebody replied to does
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
  if (!job || job.authorId !== userId) throw new AppError('این آگهی پیدا نشد.', 404);
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
}

/** The public board. Only approved, open listings, never anybody's draft. */
export async function listPublicJobs(query: JobQuery) {
  const where: Prisma.JobPostWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    ...(query.employmentType ? { employmentType: query.employmentType as never } : {}),
    ...(query.workArrangement ? { workArrangement: query.workArrangement as never } : {}),
    ...(query.province ? { province: query.province } : {}),
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
    OR: query.search ? undefined : [{ closesAt: null }, { closesAt: { gt: new Date() } }],
  };

  const [items, total] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: publicJobFields(),
    }),
    prisma.jobPost.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPublicJob(code: string) {
  const job = await prisma.jobPost.findFirst({
    where: { code: code.trim().toUpperCase(), ...PUBLIC_LISTING_WHERE },
    select: { ...publicJobFields(), description: true, skills: true, closesAt: true },
  });

  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);
  return job;
}

function publicJobFields() {
  return {
    id: true,
    code: true,
    title: true,
    companyName: true,
    employmentType: true,
    workArrangement: true,
    province: true,
    city: true,
    salaryMin: true,
    salaryMax: true,
    salaryUndisclosed: true,
    currency: true,
    publishedAt: true,
    // Deliberately not the author's identity. A board that publishes who
    // posted each advert publishes a list of verified accounts.
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

  const job = await prisma.jobPost.findFirst({
    where: { id: jobId, ...PUBLIC_LISTING_WHERE },
    select: { id: true, authorId: true },
  });
  if (!job) throw new AppError('این آگهی پیدا نشد یا دیگر باز نیست.', 404);

  if (job.authorId === userId) {
    throw new AppError('نمی‌توانید برای آگهی خودتان درخواست بدهید.', 400);
  }

  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId: userId } },
    select: { id: true },
  });
  if (existing) throw new AppError('پیش‌تر برای این آگهی درخواست داده‌اید.', 409);

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
 * A new CV is optional — most notes are about the letter — and when one comes
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
    throw new AppError('این درخواست پیدا نشد.', 404);
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
 * What the employer sees — only applications a reviewer has passed on.
 *
 * This is the half of moderation that does the work: the employer's inbox
 * contains what somebody judged worth their time, not everything that arrived.
 */
export async function listApplicationsForEmployer(userId: string, jobId: string) {
  await requireOwnJob(userId, jobId);

  return prisma.jobApplication.findMany({
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
 * internalNote is not — that one is written about them.
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
    select: { id: true, moderationStatus: true, job: { select: { authorId: true } } },
  });

  if (!application || application.job.authorId !== userId) {
    throw new AppError('این درخواست پیدا نشد.', 404);
  }
  if (application.moderationStatus !== 'APPROVED') {
    throw new AppError('این درخواست هنوز بررسی نشده است.', 409);
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
    select: { id: true, moderationStatus: true, publishedAt: true },
  });
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);

  assertReviewable(job.moderationStatus);

  return prisma.jobPost.update({
    where: { id: jobId },
    data: reviewPatch(decision, reviewer, notes, job.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });
}

export async function reviewApplication(
  applicationId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, moderationStatus: true },
  });
  if (!application) throw new AppError('این درخواست پیدا نشد.', 404);

  assertReviewable(application.moderationStatus);

  // An application has no publication date — it is passed to one employer
  // rather than published — so the patch's publishedAt branch never fires.
  const { publishedAt: _ignored, ...patch } = reviewPatch(decision, reviewer, notes, new Date());

  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: patch,
    select: { id: true, moderationStatus: true },
  });
}

export async function listJobsForReview(query: { status?: string; page: number; pageSize: number }) {
  const where: Prisma.JobPostWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
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
        moderationStatus: true,
        submittedAt: true,
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.jobPost.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
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
export async function listApplicationsForReview(query: { status?: string; page: number; pageSize: number }) {
  const where: Prisma.JobApplicationWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
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

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** An applicant's CV, for the reviewer holding the application. */
export async function getApplicationCvForReview(applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { cvStoredName: true, cvMimeType: true, cvOriginalName: true },
  });

  if (!application?.cvStoredName || !application.cvMimeType || !application.cvOriginalName) {
    throw new AppError('رزومه‌ای برای این درخواست ثبت نشده است.', 404);
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

  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);
  return job;
}
