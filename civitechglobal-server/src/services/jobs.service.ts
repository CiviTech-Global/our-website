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
import { features } from '../config/features.js';
import { assertJobCategoryUsable, jobCategoryScope } from './job-taxonomy.service.js';
import { companySummarySelect, employerResponsiveness, presentCompanySummary } from './company.service.js';
import { notifyMatchingAlerts } from './job-seeker.service.js';
import { JOB_CARD_SELECT, presentJobCards } from './job-cards.service.js';

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
  openings?: number;
  country?: string;
  currency?: string;
  salaryPeriod?: 'HOUR' | 'MONTH' | 'YEAR';
  remoteWorldwide?: boolean;
  jobCategoryId?: string;
  seniority?: 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'EXECUTIVE';
  minExperienceYears?: number;
  educationLevel?: 'DIPLOMA' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE';
  fieldOfStudy?: string;
  benefits?: string[];
  workingHours?: string;
  urgent?: boolean;
  genderRequirement?: 'ANY' | 'MALE' | 'FEMALE';
  ageMin?: number;
  ageMax?: number;
  militaryService?: 'ANY' | 'COMPLETED_OR_EXEMPT';
  amriehEligible?: boolean;
  disabilityFriendly?: boolean;
}

/** An edit: absent leaves a field alone, null clears it. */
export type JobUpdate = {
  [K in keyof JobInput]?: JobInput[K] | null;
};

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
  await assertMarketplaceAllowed(userId);
  if (input.jobCategoryId) await assertJobCategoryUsable(input.jobCategoryId);

  // The company page, when the employer has one: the posting links to it, and
  // says its name rather than the one on the verification.
  const company = features.jobsV2
    ? await prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true, name: true } })
    : null;

  return prisma.jobPost.create({
    data: {
      code: generateTrackingCode(),
      authorId: userId,
      companyName: company?.name ?? (await companyNameFor(userId)),
      companyId: company?.id ?? null,
      ...input,
      skills: input.skills ?? [],
      // Created as a draft: writing an advert and publishing it are separate
      // decisions, and somebody should be able to stop halfway.
      moderationStatus: 'DRAFT',
    },
    select: { id: true, code: true, moderationStatus: true },
  });
}

export async function updateJob(userId: string, jobId: string, input: JobUpdate) {
  const job = await requireOwnJob(userId, jobId);
  assertAuthorEditable(job.moderationStatus);

  // Required columns cannot be cleared; a null for one of them is ignored
  // rather than turned into a database error.
  if (input.jobCategoryId) await assertJobCategoryUsable(input.jobCategoryId);

  const {
    title,
    description,
    employmentType,
    workArrangement,
    salaryUndisclosed,
    skills,
    openings,
    jobCategoryId,
    benefits,
    urgent,
    genderRequirement,
    militaryService,
    amriehEligible,
    disabilityFriendly,
    country,
    currency,
    salaryPeriod,
    remoteWorldwide,
    ...rest
  } = input;
  const data: Prisma.JobPostUpdateInput = {
    ...rest,
    ...(country != null ? { country } : {}),
    ...(currency != null ? { currency } : {}),
    ...(salaryPeriod != null ? { salaryPeriod } : {}),
    ...(remoteWorldwide != null ? { remoteWorldwide } : {}),
    ...(jobCategoryId !== undefined
      ? { jobCategory: jobCategoryId === null ? { disconnect: true } : { connect: { id: jobCategoryId } } }
      : {}),
    ...(benefits != null ? { benefits } : {}),
    ...(urgent != null ? { urgent } : {}),
    ...(genderRequirement != null ? { genderRequirement } : {}),
    ...(militaryService != null ? { militaryService } : {}),
    ...(amriehEligible != null ? { amriehEligible } : {}),
    ...(disabilityFriendly != null ? { disabilityFriendly } : {}),
    ...(title != null ? { title } : {}),
    ...(description != null ? { description } : {}),
    ...(employmentType != null ? { employmentType } : {}),
    ...(workArrangement != null ? { workArrangement } : {}),
    ...(skills != null ? { skills } : {}),
    ...(openings != null ? { openings } : {}),
    ...(salaryUndisclosed != null ? { salaryUndisclosed } : {}),
    // "Negotiable" and a number say two different things; the switch wins.
    ...(salaryUndisclosed ? { salaryMin: null, salaryMax: null } : {}),
  };

  return prisma.jobPost.update({
    where: { id: jobId },
    data,
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
  category?: string;
  skills?: string[];
  salaryMin?: bigint;
  salaryMax?: bigint;
  sort?: 'newest' | 'salaryAsc' | 'salaryDesc' | 'closingSoon';
  jobCategoryId?: string;
  seniority?: string;
  maxExperience?: number;
  benefits?: string[];
  urgent?: boolean;
  amriehEligible?: boolean;
  disabilityFriendly?: boolean;
  postedWithinDays?: number;
  companySlug?: string;
  country?: string;
  remoteWorldwide?: boolean;
  currency?: string;
}

/**
 * The second-generation filters, as one where-clause.
 *
 * Only read while the flag is on: off, the board answers exactly as it always
 * has, whatever somebody puts in the query string.
 */
async function v2Where(query: JobQuery): Promise<Prisma.JobPostWhereInput[]> {
  if (!features.jobsV2) return [];
  const clauses: Prisma.JobPostWhereInput[] = [];
  if (query.jobCategoryId) clauses.push({ jobCategoryId: { in: await jobCategoryScope(query.jobCategoryId) } });
  if (query.seniority) clauses.push({ seniority: query.seniority as never });
  if (query.maxExperience !== undefined) {
    // "I have N years": roles asking for N or fewer, and roles that do not say.
    clauses.push({ OR: [{ minExperienceYears: null }, { minExperienceYears: { lte: query.maxExperience } }] });
  }
  if (query.benefits?.length) clauses.push({ benefits: { hasEvery: query.benefits } });
  if (query.urgent) clauses.push({ urgent: true });
  if (query.amriehEligible) clauses.push({ amriehEligible: true });
  if (query.disabilityFriendly) clauses.push({ disabilityFriendly: true });
  if (query.postedWithinDays) {
    clauses.push({ publishedAt: { gte: new Date(Date.now() - query.postedWithinDays * 86_400_000) } });
  }
  if (query.companySlug) clauses.push({ company: { slug: query.companySlug, hidden: false } });
  if (query.country) {
    // A country's roles, and the remote ones open to anybody anywhere — a
    // reader in Germany can take a worldwide remote role based in Iran.
    clauses.push({
      OR: [{ country: query.country }, { workArrangement: 'REMOTE', remoteWorldwide: true }],
    });
  }
  if (query.remoteWorldwide) clauses.push({ workArrangement: 'REMOTE', remoteWorldwide: true });
  return clauses;
}

/**
 * A listing overlaps a filter range when the ranges intersect, treating a
 * missing endpoint as unbounded. `salaryUndisclosed` listings never match a
 * range filter — filtering by pay and then including rows that refuse to say
 * is not filtering.
 */
export function salaryRangeWhere(query: JobQuery): Prisma.JobPostWhereInput {
  if (query.salaryMin === undefined && query.salaryMax === undefined) return {};
  return {
    salaryUndisclosed: false,
    // A floor in one currency says nothing about a range in another; the
    // board's floor is in toman unless the reader chose otherwise.
    currency: query.currency ?? 'IRT',
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
  // Featured always sorts first — that is what featuring means. The chosen
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
      ...(await v2Where(query)),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      orderBy: jobSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: JOB_CARD_SELECT,
    }),
    prisma.jobPost.count({ where }),
  ]);

  return toPage(await presentJobCards(rows), total, query.page, query.pageSize);
}

export async function getPublicJob(code: string) {
  // Count the read before fetching so the returned viewCount includes this
  // one. A failed counter must never fail the read — see the schema note on
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
      educationLevel: true,
      fieldOfStudy: true,
      workingHours: true,
      genderRequirement: true,
      ageMin: true,
      ageMax: true,
      militaryService: true,
      _count: { select: { applications: { where: { moderationStatus: 'APPROVED' } } } },
    },
  });

  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);

  const [authorProfile, similar, responsiveness] = await Promise.all([
    authorProfileSummary(job.authorId),
    similarJobs(job),
    features.jobsV2 ? employerResponsiveness(job.authorId) : Promise.resolve(null),
  ]);

  const { company, ...rest } = job;
  return { ...rest, company: presentCompanySummary(company), authorProfile, similar, responsiveness };
}

/**
 * Suggestions for the detail page: same category first, then skill overlap.
 * A count, never identities — the sealed-board rule applies to suggestions
 * exactly as much as to the board itself.
 */
async function similarJobs(job: {
  id: string;
  category: string | null;
  jobCategoryId: string | null;
  skills: string[];
}) {
  const where: Prisma.JobPostWhereInput = {
    ...PUBLIC_LISTING_WHERE,
    id: { not: job.id },
    // Still open: a suggestion that has closed is a dead end.
    AND: [{ OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] }],
    OR: [
      ...(job.jobCategoryId ? [{ jobCategoryId: job.jobCategoryId }] : []),
      ...(job.category ? [{ category: job.category }] : []),
      ...(job.skills.length > 0 ? [{ skills: { hasSome: job.skills } }] : []),
    ],
  };
  if (!where.OR || where.OR.length === 0) return [];

  // Full cards, the same as the board's: a suggestion is only useful if the
  // reader can judge it without opening it.
  const rows = await prisma.jobPost.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take: 4,
    select: JOB_CARD_SELECT,
  });
  return presentJobCards(rows);
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
    country: true,
    salaryPeriod: true,
    remoteWorldwide: true,
    jobCategoryId: true,
    jobCategory: { select: { id: true, slug: true, name: true, nameEn: true } },
    seniority: true,
    minExperienceYears: true,
    urgent: true,
    benefits: true,
    amriehEligible: true,
    disabilityFriendly: true,
    openings: true,
    company: { select: companySummarySelect },
  } as const;
}

/** Everything the author sees about their own postings, drafts included. */
/**
 * The author's own postings, with everything they may still change.
 *
 * The editable fields are here rather than behind a second request for one
 * posting: this is one person's own handful of listings, and the screen that
 * shows them is the screen that edits them. Returning only the title meant the
 * edit form had nothing to open with, which is why there was no edit form.
 */
export async function listOwnJobs(userId: string) {
  return prisma.jobPost.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      employmentType: true,
      workArrangement: true,
      province: true,
      city: true,
      salaryMin: true,
      salaryMax: true,
      salaryUndisclosed: true,
      skills: true,
      category: true,
      closesAt: true,
      openings: true,
      country: true,
      currency: true,
      salaryPeriod: true,
      remoteWorldwide: true,
      jobCategoryId: true,
      seniority: true,
      minExperienceYears: true,
      educationLevel: true,
      fieldOfStudy: true,
      benefits: true,
      workingHours: true,
      urgent: true,
      genderRequirement: true,
      ageMin: true,
      ageMax: true,
      militaryService: true,
      amriehEligible: true,
      disabilityFriendly: true,
      viewCount: true,
      moderationStatus: true,
      state: true,
      reviewNote: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });
}

/**
 * Where each of the author's postings stands: how many applied, how many are
 * still unread, and how many sit at each stage. One query for all of them.
 */
export async function ownJobPipelineCounts(userId: string) {
  const rows = await prisma.jobApplication.groupBy({
    by: ['jobId', 'outcome'],
    where: { job: { authorId: userId }, moderationStatus: 'APPROVED' },
    _count: { _all: true },
  });
  const unseen = await prisma.jobApplication.groupBy({
    by: ['jobId'],
    where: { job: { authorId: userId }, moderationStatus: 'APPROVED', employerSeenAt: null, outcome: { not: 'WITHDRAWN' } },
    _count: { _all: true },
  });

  const result: Record<string, { total: number; unseen: number; byOutcome: Record<string, number> }> = {};
  for (const row of rows) {
    const entry = (result[row.jobId] ??= { total: 0, unseen: 0, byOutcome: {} });
    entry.byOutcome[row.outcome] = row._count._all;
    if (row.outcome !== 'WITHDRAWN') entry.total += row._count._all;
  }
  for (const row of unseen) (result[row.jobId] ??= { total: 0, unseen: 0, byOutcome: {} }).unseen = row._count._all;
  return result;
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
    where: { id: jobId, ...PUBLIC_LISTING_WHERE, OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
    select: { id: true, authorId: true, title: true },
  });
  if (!job) throw new AppError('این آگهی پیدا نشد یا دیگر باز نیست.', 404);

  if (job.authorId === userId) {
    throw new AppError('نمی‌توانید برای آگهی خودتان درخواست بدهید.', 400);
  }

  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId: userId } },
    select: { id: true, outcome: true },
  });
  if (existing && existing.outcome !== 'WITHDRAWN') {
    throw new AppError('پیش‌تر برای این آگهی درخواست داده‌اید.', 409);
  }

  // On the new board an application goes straight to the verified employer,
  // the way every major board works; staff still review the postings, and act
  // on reports. Off, it waits for a reviewer as it always has.
  const direct = features.jobsV2;

  // Only the CV formats the CV pile already accepts, for the same reasons.
  const stored = cv ? (await storeFiles([cv], RESUME_EXTENSIONS))[0] : null;

  const fields = {
    coverLetter: input.coverLetter ?? null,
    expectedSalary: input.expectedSalary ?? null,
    cvOriginalName: stored?.originalName ?? null,
    cvStoredName: stored?.storedName ?? null,
    cvMimeType: stored?.mimeType ?? null,
    cvSizeBytes: stored?.sizeBytes ?? null,
    cvChecksum: stored?.checksum ?? null,
    // Straight into the queue (or, directly, to the employer): an application
    // is not a draft, and the applicant has nothing further to decide.
    moderationStatus: direct ? ('APPROVED' as const) : ('PENDING_REVIEW' as const),
    ...(direct ? { reviewedAt: new Date() } : {}),
    outcome: 'PENDING' as const,
    employerSeenAt: null,
    outcomeChangedAt: null,
    employerNote: null,
  };

  try {
    // Somebody who withdrew and changed their mind applies again in the same
    // row: the (job, applicant) pair is unique, and the employer should see
    // one application from them, not a withdrawn one beside a live one.
    const created = existing
      ? await prisma.jobApplication.update({
          where: { id: existing.id },
          data: { ...fields, createdAt: new Date() },
          select: { id: true, moderationStatus: true, cvStoredName: true },
        })
      : await prisma.jobApplication.create({
          data: { jobId, applicantId: userId, ...fields },
          select: { id: true, moderationStatus: true, cvStoredName: true },
        });

    if (direct) {
      notifySafely(job.authorId, {
        type: 'application.received',
        title: 'درخواست تازه برای آگهی شما',
        body: `یک نفر برای «${job.title}» درخواست داد.`,
        link: '/dashboard/jobs',
      });
    }
    return { id: created.id, moderationStatus: created.moderationStatus };
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/**
 * Taking an application back.
 *
 * Allowed until the employer has decided — after an acceptance or a decline
 * there is nothing left to withdraw from. The row stays, marked, so the
 * employer's count does not silently drop and the applicant can apply again.
 */
export async function withdrawApplication(userId: string, applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, applicantId: true, outcome: true },
  });
  if (!application || application.applicantId !== userId) throw new AppError('این درخواست پیدا نشد.', 404);
  if (application.outcome === 'ACCEPTED' || application.outcome === 'DECLINED') {
    throw new AppError('برای این درخواست تصمیم گرفته شده و دیگر قابل پس‌گرفتن نیست.', 409);
  }
  if (application.outcome === 'WITHDRAWN') return { id: application.id, outcome: 'WITHDRAWN' as const };

  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: { outcome: 'WITHDRAWN', outcomeChangedAt: new Date() },
    select: { id: true, outcome: true },
  });
}

/** The employer's own note on a candidate. Never shown to the applicant. */
export async function setEmployerNote(userId: string, applicationId: string, note: string | null) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, moderationStatus: true, job: { select: { authorId: true } } },
  });
  if (!application || application.job.authorId !== userId || application.moderationStatus !== 'APPROVED') {
    throw new AppError('این درخواست پیدا نشد.', 404);
  }
  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: { employerNote: note?.trim() || null },
    select: { id: true, employerNote: true },
  });
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

  const [applications, job] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { jobId, moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        coverLetter: true,
        expectedSalary: true,
        cvOriginalName: true,
        outcome: true,
        createdAt: true,
        employerSeenAt: true,
        outcomeChangedAt: true,
        employerNote: true,
        applicant: { select: { id: true, firstName: true, lastName: true, email: true, skills: true } },
      },
    }),
    prisma.jobPost.findUnique({ where: { id: jobId }, select: { skills: true } }),
  ]);

  // Opening the inbox is what "seen" means to the applicant: the employer has
  // the list in front of them. Marked after reading, so this response still
  // shows which ones were new.
  if (features.jobsV2) {
    await prisma.jobApplication.updateMany({
      where: { jobId, moderationStatus: 'APPROVED', employerSeenAt: null },
      data: { employerSeenAt: new Date() },
    });
  }

  const jobSkills = (job?.skills ?? []).map((skill) => skill.trim().toLowerCase());

  // The employer already sees the applicant's identity; the profile card adds
  // the public handle, verification state and reputation without another
  // query per row.
  const profiles = await authorProfileSummaries(applications.map((row) => row.applicant.id));
  return applications.map((row) => {
    const theirs = new Set(row.applicant.skills.map((skill) => skill.trim().toLowerCase()));
    return {
      ...row,
      // Only the overlap with this role: the employer is judging fit for it.
      skillMatch: { matched: jobSkills.filter((skill) => theirs.has(skill)).length, total: jobSkills.length },
      applicantProfile: profiles.get(row.applicant.id) ?? null,
    };
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
      employerSeenAt: true,
      outcomeChangedAt: true,
      job: { select: { code: true, title: true, companyName: true, state: true } },
    },
  });
}

export async function setApplicationOutcome(
  userId: string,
  applicationId: string,
  outcome: 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'DECLINED',
) {
  if (outcome === 'INTERVIEW' && !features.jobsV2) throw new AppError('این مرحله پشتیبانی نمی‌شود.', 400);

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      expectedSalary: true,
      outcome: true,
      moderationStatus: true,
      job: { select: { id: true, authorId: true, title: true, openings: true } },
    },
  });

  if (!application || application.job.authorId !== userId) {
    throw new AppError('این درخواست پیدا نشد.', 404);
  }
  if (application.moderationStatus !== 'APPROVED') {
    throw new AppError('این درخواست هنوز بررسی نشده است.', 409);
  }
  if (application.outcome === 'WITHDRAWN') {
    throw new AppError('متقاضی این درخواست را پس گرفته است.', 409);
  }

  // Accepting is the mirror of the freelance acceptBid, with one difference: a
  // role can hire more than one person. The award is recorded every time — the
  // row the milestones, reviews and any future settlement hang from — but the
  // listing only closes, and everyone still waiting only hears no, once the
  // last opening is filled. Before, the first hire closed a role advertised for
  // five people and declined the other four's candidates with it.
  if (outcome === 'ACCEPTED') {
    const result = await prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { id: applicationId },
        data: { outcome: 'ACCEPTED', outcomeChangedAt: new Date(), employerSeenAt: new Date() },
      });

      const hired = await tx.jobApplication.count({
        where: { jobId: application.job.id, outcome: 'ACCEPTED' },
      });
      if (hired >= application.job.openings) {
        await tx.jobApplication.updateMany({
          where: { jobId: application.job.id, id: { not: applicationId }, outcome: { in: ['PENDING', 'SHORTLISTED'] } },
          data: { outcome: 'DECLINED' },
        });
        await tx.jobPost.update({
          where: { id: application.job.id },
          data: { state: 'AWARDED' },
        });
      }

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

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { outcome, outcomeChangedAt: new Date(), employerSeenAt: new Date() },
    select: { id: true, outcome: true },
  });

  // On the new board the applicant hears about each step, not only the end:
  // silence after applying is the complaint every job-seeker has.
  if (features.jobsV2 && outcome !== application.outcome) {
    const words = {
      SHORTLISTED: ['در فهرست کوتاه قرار گرفتید', 'به فهرست کوتاه'],
      INTERVIEW: ['دعوت به مصاحبه', 'به مرحلهٔ مصاحبه'],
      DECLINED: ['نتیجهٔ درخواست شما', 'به نتیجه'],
    } as const;
    const [title] = words[outcome];
    notifySafely(application.applicantId, {
      type: 'application.stage',
      title,
      body:
        outcome === 'DECLINED'
          ? `کارفرما برای «${application.job.title}» با فرد دیگری ادامه می‌دهد. برای فرصت‌های بعدی موفق باشید.`
          : `درخواست شما برای «${application.job.title}» ${words[outcome][1]} رسید.`,
      link: '/dashboard/applications',
    });
  }

  return updated;
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
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);

  assertReviewable(job.moderationStatus);

  const updated = await prisma.jobPost.update({
    where: { id: jobId },
    data: reviewPatch(decision, reviewer, notes, job.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });

  // Saved searches hear about a posting once: when it first goes live, not on
  // every later re-approval after an edit.
  if (features.jobsV2 && decision === 'APPROVED' && !job.publishedAt) {
    void notifyMatchingAlerts(jobId);
  }

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
  if (!application) throw new AppError('این درخواست پیدا نشد.', 404);

  assertReviewable(application.moderationStatus);

  // An application has no publication date — it is passed to one employer
  // rather than published — so the patch's publishedAt branch never fires.
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

/**
 * An applicant's CV, for the employer the application was sent to.
 *
 * The employer saw the file's name and had no way to open it — the only route
 * to the bytes was the staff one. Same rule as the employer's inbox: only an
 * application that reached them, on a posting that is theirs, and the same
 * "not found" for both failures so the route does not confirm which it was.
 */
export async function getApplicationCvForEmployer(userId: string, applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      moderationStatus: true,
      cvStoredName: true,
      cvMimeType: true,
      cvOriginalName: true,
      job: { select: { authorId: true } },
    },
  });

  if (
    !application ||
    application.job.authorId !== userId ||
    application.moderationStatus !== 'APPROVED' ||
    !application.cvStoredName ||
    !application.cvMimeType ||
    !application.cvOriginalName
  ) {
    throw new AppError('رزومه‌ای برای این درخواست پیدا نشد.', 404);
  }

  return {
    cvStoredName: application.cvStoredName,
    cvMimeType: application.cvMimeType,
    cvOriginalName: application.cvOriginalName,
  };
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
