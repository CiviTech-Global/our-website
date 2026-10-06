import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { features } from '../config/features.js';
import { authorProfileSummaries } from './profile.service.js';
import { companySummarySelect, presentCompanySummary } from './company-summary.js';

/**
 * What a job card says, wherever a job is listed.
 *
 * The boards Iranian job-seekers already use put a great deal on a card —
 * the company and its rating, place, pay, how long ago, "urgent", "the
 * employer answers", "reviewing CVs now", "interns welcome", how many have
 * applied — and a reader decides from the card whether to open the posting at
 * all. So every list here (the board, landing pages, company pages, saved
 * jobs, recommendations, similar jobs, the home page showcase) asks for the
 * same fields and gets the same facts, and a card means the same thing on
 * every screen.
 *
 * The facts that need counting are added in one batch per list, never one
 * query per card.
 */

export const JOB_CARD_SELECT = {
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
  closesAt: true,
  state: true,
  skills: true,
  jobCategoryId: true,
  jobCategory: { select: { id: true, slug: true, name: true, nameEn: true } },
  seniority: true,
  minExperienceYears: true,
  urgent: true,
  benefits: true,
  amriehEligible: true,
  disabilityFriendly: true,
  openings: true,
  authorId: true,
  company: { select: companySummarySelect },
} as const satisfies Prisma.JobPostSelect;

export type JobCardRow = Prisma.JobPostGetPayload<{ select: typeof JOB_CARD_SELECT }>;

/** How recently an employer must have opened applications to be "reviewing now". */
const REVIEWING_WINDOW_DAYS = 7;
/** The window responsiveness is measured over, and the age an application must reach first. */
const RESPONSIVE_WINDOW_DAYS = 180;
const RESPONSIVE_SETTLE_DAYS = 3;

/**
 * Which of these employers answer most of what reaches them — the same rule as
 * the company page (company.service employerResponsiveness), counted for many
 * employers at once.
 */
async function responsiveAuthors(authorIds: string[]): Promise<Set<string>> {
  if (authorIds.length === 0) return new Set();
  const now = Date.now();
  const rows = await prisma.jobApplication.findMany({
    where: {
      job: { authorId: { in: authorIds } },
      moderationStatus: 'APPROVED',
      outcome: { not: 'WITHDRAWN' },
      createdAt: {
        gte: new Date(now - RESPONSIVE_WINDOW_DAYS * 86_400_000),
        lte: new Date(now - RESPONSIVE_SETTLE_DAYS * 86_400_000),
      },
    },
    select: { employerSeenAt: true, outcome: true, job: { select: { authorId: true } } },
  });

  const tally = new Map<string, { total: number; answered: number }>();
  for (const row of rows) {
    const entry = tally.get(row.job.authorId) ?? { total: 0, answered: 0 };
    entry.total += 1;
    if (row.employerSeenAt || row.outcome !== 'PENDING') entry.answered += 1;
    tally.set(row.job.authorId, entry);
  }
  return new Set(
    [...tally].filter(([, entry]) => entry.total >= 3 && entry.answered / entry.total >= 0.8).map(([id]) => id),
  );
}

/**
 * The rows as cards: the author's public profile, the company summary, and —
 * on the new board — how many have applied, whether the employer is reviewing
 * applications this week, and whether they answer.
 */
export async function presentJobCards(rows: JobCardRow[]) {
  const ids = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.authorId))];
  const v2 = features.jobsV2 && rows.length > 0;

  const [profiles, applicantCounts, reviewing, responsive] = await Promise.all([
    authorProfileSummaries(authorIds),
    v2
      ? prisma.jobApplication.groupBy({
          by: ['jobId'],
          where: { jobId: { in: ids }, moderationStatus: 'APPROVED', outcome: { not: 'WITHDRAWN' } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    v2
      ? prisma.jobApplication.groupBy({
          by: ['jobId'],
          where: {
            jobId: { in: ids },
            employerSeenAt: { gte: new Date(Date.now() - REVIEWING_WINDOW_DAYS * 86_400_000) },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    v2 ? responsiveAuthors(authorIds) : Promise.resolve(new Set<string>()),
  ]);

  const counts = new Map(applicantCounts.map((row) => [row.jobId, row._count._all]));
  const reviewingIds = new Set(reviewing.map((row) => row.jobId));

  return rows.map(({ authorId, company, ...row }) => ({
    ...row,
    company: presentCompanySummary(company),
    authorProfile: profiles.get(authorId) ?? null,
    ...(v2
      ? {
          applicantCount: counts.get(row.id) ?? 0,
          reviewingNow: reviewingIds.has(row.id),
          responsiveEmployer: responsive.has(authorId),
        }
      : {}),
  }));
}

export type JobCard = Awaited<ReturnType<typeof presentJobCards>>[number];
