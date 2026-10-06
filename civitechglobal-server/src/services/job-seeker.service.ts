import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { notifySafely } from './notifications.service.js';
import { JOB_CARD_SELECT, presentJobCards } from './job-cards.service.js';

/**
 * The job-seeker's side of the board: what they saved, what they are waiting
 * to hear about, and what fits them.
 */

/** A posting that can still be read and answered. Re-evaluated per call: "now" in a module constant would freeze at boot. */
const openJobWhere = (): Prisma.JobPostWhereInput => ({
  ...PUBLIC_LISTING_WHERE,
  OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
});


// ---------------------------------------------------------------------------
// Saved jobs
// ---------------------------------------------------------------------------

const MAX_SAVED = 200;

export async function saveJob(userId: string, jobId: string) {
  const job = await prisma.jobPost.findFirst({ where: { id: jobId, ...PUBLIC_LISTING_WHERE }, select: { id: true } });
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);

  const count = await prisma.savedJob.count({ where: { userId } });
  if (count >= MAX_SAVED) throw new AppError('فهرست نشان‌شده‌ها پر است؛ چند مورد را بردارید.', 409);

  // Saving twice is the same as saving once, not an error.
  await prisma.savedJob.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: { userId, jobId },
    update: {},
  });
  return { jobId, saved: true };
}

export async function unsaveJob(userId: string, jobId: string) {
  await prisma.savedJob.deleteMany({ where: { userId, jobId } });
  return { jobId, saved: false };
}

/**
 * Everything the person saved, newest first — closed ones included and
 * marked, since "the role I saved has gone" is worth knowing rather than
 * having it silently vanish from the list.
 */
export async function listSavedJobs(userId: string) {
  const rows = await prisma.savedJob.findMany({
    where: { userId, job: { moderationStatus: 'APPROVED' } },
    orderBy: { createdAt: 'desc' },
    take: MAX_SAVED,
    select: { createdAt: true, job: { select: JOB_CARD_SELECT } },
  });
  const now = Date.now();
  const cards = await presentJobCards(rows.map((row) => row.job));
  return rows.map((row, index) => ({
    savedAt: row.createdAt,
    open: row.job.state === 'OPEN' && (!row.job.closesAt || row.job.closesAt.getTime() > now),
    job: cards[index],
  }));
}

/** Just the ids, so a list can draw its bookmark icons in one request. */
export async function listSavedJobIds(userId: string): Promise<string[]> {
  const rows = await prisma.savedJob.findMany({ where: { userId }, select: { jobId: true } });
  return rows.map((row) => row.jobId);
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface AlertQuery {
  search?: string;
  country?: string;
  province?: string;
  jobCategoryId?: string;
  employmentType?: string;
  workArrangement?: string;
  seniority?: string;
  salaryMin?: string;
}

const MAX_ALERTS = 20;

export async function listAlerts(userId: string) {
  return prisma.jobAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createAlert(userId: string, input: { name: string; query: AlertQuery }) {
  const count = await prisma.jobAlert.count({ where: { userId } });
  if (count >= MAX_ALERTS) throw new AppError(`حداکثر ${MAX_ALERTS} هشدار شغلی می‌توانید داشته باشید.`, 409);
  if (Object.values(input.query).every((value) => !value)) {
    // An alert on everything is a notification for every posting.
    throw new AppError('برای هشدار دست‌کم یک فیلتر یا کلیدواژه انتخاب کنید.', 400);
  }
  return prisma.jobAlert.create({
    data: { userId, name: input.name, query: input.query as Prisma.InputJsonValue },
  });
}

export async function updateAlert(userId: string, id: string, input: { name?: string; active?: boolean }) {
  const alert = await prisma.jobAlert.findUnique({ where: { id }, select: { userId: true } });
  if (!alert || alert.userId !== userId) throw new AppError('این هشدار پیدا نشد.', 404);
  return prisma.jobAlert.update({ where: { id }, data: input });
}

export async function deleteAlert(userId: string, id: string) {
  const { count } = await prisma.jobAlert.deleteMany({ where: { id, userId } });
  if (count === 0) throw new AppError('این هشدار پیدا نشد.', 404);
  return { id };
}

interface MatchableJob {
  title: string;
  description: string;
  country: string;
  remoteWorldwide: boolean;
  currency: string;
  province: string | null;
  jobCategoryId: string | null;
  categoryParentId: string | null;
  employmentType: string;
  workArrangement: string;
  seniority: string | null;
  salaryMin: bigint | null;
  salaryMax: bigint | null;
  salaryUndisclosed: boolean;
}

/**
 * Whether a posting answers a saved search.
 *
 * Mirrors the board's own filters, so an alert never promises something the
 * board would not have shown for the same search. Two deliberate choices: a
 * remote role matches any province, because where it is based does not
 * matter to the person doing it; and a category matches its children, as on
 * the board.
 */
export function alertMatches(query: AlertQuery, job: MatchableJob): boolean {
  if (query.search) {
    const needle = query.search.trim().toLowerCase();
    if (needle && !`${job.title}\n${job.description}`.toLowerCase().includes(needle)) return false;
  }
  // A worldwide remote role answers any country; otherwise the country must match.
  if (query.country && job.country !== query.country && !(job.workArrangement === 'REMOTE' && job.remoteWorldwide)) {
    return false;
  }
  if (query.province && job.province !== query.province && job.workArrangement !== 'REMOTE') return false;
  if (
    query.jobCategoryId &&
    job.jobCategoryId !== query.jobCategoryId &&
    job.categoryParentId !== query.jobCategoryId
  ) {
    return false;
  }
  if (query.employmentType && job.employmentType !== query.employmentType) return false;
  if (query.workArrangement && job.workArrangement !== query.workArrangement) return false;
  if (query.seniority && job.seniority !== query.seniority) return false;
  if (query.salaryMin) {
    // Alert floors are in toman, as the board's are by default.
    if (job.currency !== 'IRT') return false;
    const floor = BigInt(query.salaryMin);
    const top = job.salaryMax ?? job.salaryMin;
    if (job.salaryUndisclosed || top === null || top < floor) return false;
  }
  return true;
}

/** How many alerts are read per publication. Past this, matching moves to a queue. */
const ALERT_SCAN_LIMIT = 5000;

/**
 * Tell everyone whose saved search a newly published posting answers.
 *
 * Runs when a posting is first published, so there is no schedule to keep and
 * nothing to fall behind. One notification per person however many of their
 * alerts match — three pings for one advert is how alerts get switched off.
 * Never throws: a published posting must not fail because a notification did.
 */
export async function notifyMatchingAlerts(jobId: string): Promise<number> {
  try {
    const job = await prisma.jobPost.findUnique({
      where: { id: jobId },
      select: {
        code: true,
        authorId: true,
        title: true,
        description: true,
        companyName: true,
        country: true,
        remoteWorldwide: true,
        currency: true,
        province: true,
        jobCategoryId: true,
        jobCategory: { select: { parentId: true } },
        employmentType: true,
        workArrangement: true,
        seniority: true,
        salaryMin: true,
        salaryMax: true,
        salaryUndisclosed: true,
      },
    });
    if (!job) return 0;

    const alerts = await prisma.jobAlert.findMany({
      where: { active: true, userId: { not: job.authorId }, user: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      take: ALERT_SCAN_LIMIT,
      select: { id: true, userId: true, name: true, query: true },
    });

    const matchable: MatchableJob = { ...job, categoryParentId: job.jobCategory?.parentId ?? null };
    const byUser = new Map<string, { alertIds: string[]; name: string }>();
    for (const alert of alerts) {
      if (!alertMatches(alert.query as AlertQuery, matchable)) continue;
      const entry = byUser.get(alert.userId);
      if (entry) entry.alertIds.push(alert.id);
      else byUser.set(alert.userId, { alertIds: [alert.id], name: alert.name });
    }

    for (const [userId, entry] of byUser) {
      notifySafely(userId, {
        type: 'job.alert',
        title: `فرصت شغلی تازه برای «${entry.name}»`,
        body: job.companyName ? `${job.title} — ${job.companyName}` : job.title,
        link: `/jobs/${job.code}`,
      });
    }

    const matchedIds = [...byUser.values()].flatMap((entry) => entry.alertIds);
    if (matchedIds.length > 0) {
      await prisma.jobAlert.updateMany({ where: { id: { in: matchedIds } }, data: { lastNotifiedAt: new Date() } });
    }
    return byUser.size;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Matching and recommendations
// ---------------------------------------------------------------------------

/** Skills compared the way people mean them: case and spacing aside. */
const normalizeSkill = (skill: string) => skill.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * How a posting's skills compare with somebody's: which they have, which not.
 *
 * Exact after normalising, deliberately. "react" and "react native" are
 * different skills, and a fuzzy match that counts one as the other tells the
 * reader they are a fit when they are not.
 */
export function skillMatch(jobSkills: string[], mySkills: string[]) {
  const mine = new Set(mySkills.map(normalizeSkill));
  const matched = jobSkills.filter((skill) => mine.has(normalizeSkill(skill)));
  const missing = jobSkills.filter((skill) => !mine.has(normalizeSkill(skill)));
  return { matched, missing, total: jobSkills.length };
}

/** How many recent postings are scored for one person. */
const RECOMMEND_POOL = 400;

/**
 * Roles that fit this person, best first.
 *
 * Scored on two things they told us: the skills on their profile (two points
 * each), and the categories of roles they applied for or saved (one point).
 * Roles they already applied to, and their own, are left out. Nothing here is
 * a guess about who they are — only what they said and did.
 */
export async function recommendedJobs(userId: string, limit = 12) {
  const [user, applied, saved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { skills: true } }),
    prisma.jobApplication.findMany({
      where: { applicantId: userId },
      select: { jobId: true, job: { select: { jobCategoryId: true } } },
    }),
    prisma.savedJob.findMany({ where: { userId }, select: { job: { select: { jobCategoryId: true } } } }),
  ]);

  const mySkills = user?.skills ?? [];
  const appliedIds = new Set(applied.map((row) => row.jobId));
  const categories = new Set(
    [...applied.map((row) => row.job.jobCategoryId), ...saved.map((row) => row.job.jobCategoryId)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  if (mySkills.length === 0 && categories.size === 0) return { items: [], basis: 'none' as const };

  const pool = await prisma.jobPost.findMany({
    where: { ...openJobWhere(), authorId: { not: userId } },
    orderBy: { publishedAt: 'desc' },
    take: RECOMMEND_POOL,
    select: JOB_CARD_SELECT,
  });

  const scored = pool
    .filter((job) => !appliedIds.has(job.id))
    .map((job) => {
      const match = skillMatch(job.skills, mySkills);
      const score = match.matched.length * 2 + (job.jobCategoryId && categories.has(job.jobCategoryId) ? 1 : 0);
      return { job, match, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.job.publishedAt?.getTime() ?? 0) - (a.job.publishedAt?.getTime() ?? 0))
    .slice(0, limit);

  const cards = await presentJobCards(scored.map((entry) => entry.job));
  return {
    basis: mySkills.length > 0 ? ('skills' as const) : ('activity' as const),
    items: cards.map((card, index) => ({
      ...card,
      match: { matched: scored[index].match.matched.length, total: scored[index].match.total },
    })),
  };
}

/** The reader's own skills against one posting, for the "how well do I fit" panel. */
export async function myMatchForJob(userId: string, jobId: string) {
  const [user, job] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { skills: true } }),
    prisma.jobPost.findFirst({ where: { id: jobId, ...PUBLIC_LISTING_WHERE }, select: { skills: true } }),
  ]);
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);
  const mySkills = user?.skills ?? [];
  return { ...skillMatch(job.skills, mySkills), hasProfileSkills: mySkills.length > 0 };
}
