import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { features } from '../config/features.js';
import { proposalBucket } from '../catalog/work-taxonomy.js';
import { authorProfileSummaries } from './profile.service.js';

/**
 * What a project card says, wherever a project is listed — and the two trust
 * panels the leading boards put beside a brief: "about the client" and the
 * activity on the project.
 *
 * Freelancers decide from those, before they spend a proposal. Upwork shows
 * whether the client's payment is verified, where they are, what they have
 * spent, their hire rate and when they joined, and on the brief itself how
 * many proposals have come in, how many are interviewing, how many invites
 * went out and when the client last looked. Freelancer.com shows the bid
 * count and the average bid. Every list here asks for the same fields and
 * gets the same facts, counted in one batch per list, never one per card.
 *
 * Individual bid amounts are never public. The average is, but only on a
 * project the client chose not to seal.
 */

export const PROJECT_CARD_SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  companyName: true,
  category: true,
  workCategoryId: true,
  workCategory: { select: { id: true, slug: true, name: true, nameEn: true, parentId: true } },
  skills: true,
  featured: true,
  urgent: true,
  nda: true,
  sealed: true,
  visibility: true,
  pricingType: true,
  experienceLevel: true,
  duration: true,
  weeklyHours: true,
  budgetMin: true,
  budgetMax: true,
  budgetUnknown: true,
  currency: true,
  deliverBy: true,
  publishedAt: true,
  closesAt: true,
  state: true,
  onsite: true,
  country: true,
  province: true,
  city: true,
  languages: true,
  preferredCountries: true,
  contractToHire: true,
  freelancersNeeded: true,
  clientViewedAt: true,
  authorId: true,
  _count: { select: { bids: { where: { moderationStatus: 'APPROVED' } } } },
} as const satisfies Prisma.FreelanceProjectSelect;

export type ProjectCardRow = Prisma.FreelanceProjectGetPayload<{ select: typeof PROJECT_CARD_SELECT }>;

/** A card shows the start of the brief; the page shows the rest. */
const EXCERPT_CHARS = 320;

export function excerpt(text: string, max = EXCERPT_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > max * 0.6 ? space : max)}…`;
}

// ---------------------------------------------------------------------------
// About the client
// ---------------------------------------------------------------------------

export interface ClientStats {
  verified: boolean;
  companyName: string | null;
  country: string;
  province: string | null;
  city: string | null;
  memberSince: string;
  lastActiveAt: string | null;
  projectsPosted: number;
  openProjects: number;
  /** Contracts this client has started, on projects and services alike. */
  hires: number;
  /** Share of their finished projects (awarded, closed, expired) that led to a hire. */
  hireRate: number | null;
  /** What they agreed to pay across their contracts, by currency. */
  committed: Array<{ currency: string; amount: string }>;
  ratingAvg: number;
  ratingCount: number;
  username: string | null;
}

export async function clientStats(userIds: string[]): Promise<Map<string, ClientStats>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();

  const [users, posted, open, finished, hiredOn, awards, profiles] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        createdAt: true,
        country: true,
        lastActiveAt: true,
        verification: { select: { status: true, kind: true, companyName: true, province: true, city: true } },
      },
    }),
    prisma.freelanceProject.groupBy({
      by: ['authorId'],
      where: { authorId: { in: ids }, moderationStatus: 'APPROVED' },
      _count: { _all: true },
    }),
    prisma.freelanceProject.groupBy({
      by: ['authorId'],
      where: { authorId: { in: ids }, moderationStatus: 'APPROVED', state: 'OPEN' },
      _count: { _all: true },
    }),
    prisma.freelanceProject.groupBy({
      by: ['authorId'],
      where: { authorId: { in: ids }, moderationStatus: 'APPROVED', state: { in: ['AWARDED', 'CLOSED', 'EXPIRED'] } },
      _count: { _all: true },
    }),
    // Finished projects that ended in at least one accepted bid.
    prisma.freelanceProject.groupBy({
      by: ['authorId'],
      where: {
        authorId: { in: ids },
        moderationStatus: 'APPROVED',
        state: { in: ['AWARDED', 'CLOSED', 'EXPIRED'] },
        bids: { some: { outcome: 'ACCEPTED' } },
      },
      _count: { _all: true },
    }),
    prisma.marketplaceAward.groupBy({
      by: ['awardedById', 'currency'],
      where: { awardedById: { in: ids }, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { agreedAmount: true },
    }),
    authorProfileSummaries(ids),
  ]);

  const count = (rows: Array<{ authorId: string; _count: { _all: number } }>) =>
    new Map(rows.map((row) => [row.authorId, row._count._all]));
  const postedBy = count(posted);
  const openBy = count(open);
  const finishedBy = count(finished);
  const hiredBy = count(hiredOn);

  const result = new Map<string, ClientStats>();
  for (const user of users) {
    const theirAwards = awards.filter((row) => row.awardedById === user.id);
    const done = finishedBy.get(user.id) ?? 0;
    const profile = profiles.get(user.id);
    result.set(user.id, {
      verified: user.verification?.status === 'APPROVED',
      companyName: user.verification?.kind === 'COMPANY' ? (user.verification.companyName ?? null) : null,
      country: user.country,
      province: user.verification?.province ?? null,
      city: user.verification?.city ?? null,
      memberSince: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      projectsPosted: postedBy.get(user.id) ?? 0,
      openProjects: openBy.get(user.id) ?? 0,
      hires: theirAwards.reduce((sum, row) => sum + row._count._all, 0),
      hireRate: done > 0 ? Math.round(((hiredBy.get(user.id) ?? 0) / done) * 100) : null,
      committed: theirAwards
        .filter((row) => row._sum.agreedAmount != null)
        .map((row) => ({ currency: row.currency, amount: row._sum.agreedAmount!.toString() })),
      ratingAvg: profile?.ratingAvg ?? 0,
      ratingCount: profile?.ratingCount ?? 0,
      username: profile?.username ?? null,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Activity on a project
// ---------------------------------------------------------------------------

export interface ProjectActivity {
  bidCount: number;
  proposalRange: string;
  /** Shortlisted or invited to interview. */
  interviewing: number;
  hired: number;
  invitesSent: number;
  unansweredInvites: number;
  lastViewedByClient: string | null;
  /** Only on an unsealed project; never an individual amount. */
  averageBid: string | null;
}

export async function projectActivity(
  rows: Array<{ id: string; sealed: boolean; clientViewedAt: Date | null; _count: { bids: number } }>,
): Promise<Map<string, ProjectActivity>> {
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return new Map();
  const openIds = rows.filter((row) => !row.sealed).map((row) => row.id);

  const [stages, invites, averages] = await Promise.all([
    prisma.projectBid.groupBy({
      by: ['projectId', 'outcome'],
      where: { projectId: { in: ids }, moderationStatus: 'APPROVED' },
      _count: { _all: true },
    }),
    prisma.projectInvite.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: ids } },
      _count: { _all: true },
    }),
    openIds.length > 0
      ? prisma.projectBid.groupBy({
          by: ['projectId'],
          // The operator's own offer is not "the market", and a withdrawn
          // bid is no longer on the table.
          where: {
            projectId: { in: openIds },
            moderationStatus: 'APPROVED',
            isCompanyOffer: false,
            outcome: { not: 'WITHDRAWN' },
          },
          _avg: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const result = new Map<string, ProjectActivity>();
  for (const row of rows) {
    const stage = (outcomes: string[]) =>
      stages
        .filter((entry) => entry.projectId === row.id && outcomes.includes(entry.outcome))
        .reduce((sum, entry) => sum + entry._count._all, 0);
    const invite = (statuses: string[]) =>
      invites
        .filter((entry) => entry.projectId === row.id && statuses.includes(entry.status))
        .reduce((sum, entry) => sum + entry._count._all, 0);
    const average = averages.find((entry) => entry.projectId === row.id)?._avg.amount;
    const live = row._count.bids - stage(['WITHDRAWN']);

    result.set(row.id, {
      bidCount: live,
      proposalRange: proposalBucket(live),
      interviewing: stage(['SHORTLISTED', 'INTERVIEW']),
      hired: stage(['ACCEPTED']),
      invitesSent: invite(['PENDING', 'ACCEPTED', 'DECLINED']),
      unansweredInvites: invite(['PENDING']),
      lastViewedByClient: row.clientViewedAt?.toISOString() ?? null,
      averageBid: !row.sealed && average != null ? BigInt(Math.round(Number(average))).toString() : null,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/**
 * The rows as cards. On the old board a card is what it always was (the
 * author's profile and the bid count); the second generation adds the client
 * panel and the activity, so the card can say "payment verified, 4 hires,
 * 5–10 proposals, 2 interviewing".
 */
export async function presentProjectCards(rows: ProjectCardRow[]) {
  const v2 = features.projectsV2 && rows.length > 0;
  const authorIds = rows.map((row) => row.authorId);

  const [profiles, clients, activity] = await Promise.all([
    authorProfileSummaries([...new Set(authorIds)]),
    v2 ? clientStats(authorIds) : Promise.resolve(new Map<string, ClientStats>()),
    v2 ? projectActivity(rows) : Promise.resolve(new Map<string, ProjectActivity>()),
  ]);

  return rows.map(({ authorId, description, clientViewedAt: _viewed, ...row }) => ({
    ...row,
    // An NDA project's card says what kind of work it is, not what it is.
    excerpt: row.nda ? null : excerpt(description),
    authorProfile: profiles.get(authorId) ?? null,
    ...(v2 ? { client: clients.get(authorId) ?? null, activity: activity.get(row.id) ?? null } : {}),
  }));
}

export type ProjectCard = Awaited<ReturnType<typeof presentProjectCards>>[number];

// ---------------------------------------------------------------------------
// Freelancers
// ---------------------------------------------------------------------------

export type FreelancerLevel = 'NEW' | 'RISING' | 'ESTABLISHED' | 'TOP_RATED';

export interface FreelancerStats {
  completed: number;
  active: number;
  /** Completed out of everything that ended, as a percentage; null before anything ended. */
  jobSuccess: number | null;
  /** Milestones delivered by their due date, as a percentage. */
  onTime: number | null;
  ratingAvg: number;
  ratingCount: number;
  level: FreelancerLevel;
  memberSince: string;
  lastActiveAt: string | null;
  lastDeliveryAt: string | null;
  country: string;
  languages: string[];
  hourlyRate: string | null;
  hourlyCurrency: string;
  availability: string;
  verified: boolean;
  skills: string[];
}

/**
 * The level badge. Earned, never bought, and recomputed on every read so it
 * can fall as well as rise — the honest version of Fiverr's and Upwork's
 * seller levels.
 */
export function freelancerLevel(stats: {
  completed: number;
  jobSuccess: number | null;
  ratingAvg: number;
  ratingCount: number;
}): FreelancerLevel {
  if (stats.completed >= 10 && (stats.jobSuccess ?? 0) >= 90 && stats.ratingAvg >= 4.7) return 'TOP_RATED';
  if (stats.completed >= 5 && (stats.jobSuccess ?? 0) >= 80 && stats.ratingAvg >= 4.3) return 'ESTABLISHED';
  if (stats.completed >= 1 && stats.ratingAvg >= 4.5) return 'RISING';
  return 'NEW';
}

export async function freelancerStats(userIds: string[]): Promise<Map<string, FreelancerStats>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();

  // A contract is anchored by id, not by relation (see engagement.service),
  // so the freelancer's side is found through the winning bids and the
  // accepted service orders first.
  const [users, wonBids, acceptedOrders, profiles] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        createdAt: true,
        lastActiveAt: true,
        country: true,
        languages: true,
        hourlyRate: true,
        hourlyCurrency: true,
        availability: true,
        skills: true,
        verification: { select: { status: true } },
      },
    }),
    prisma.projectBid.findMany({
      where: { bidderId: { in: ids }, outcome: 'ACCEPTED' },
      select: { id: true, bidderId: true },
    }),
    prisma.serviceOrder.findMany({
      where: { sellerId: { in: ids }, status: 'ACCEPTED' },
      select: { id: true, sellerId: true },
    }),
    authorProfileSummaries(ids),
  ]);

  const ownerByBid = new Map(wonBids.map((row) => [row.id, row.bidderId!]));
  const ownerByOrder = new Map(acceptedOrders.map((row) => [row.id, row.sellerId]));

  const awards = await prisma.marketplaceAward.findMany({
    where: {
      OR: [{ projectBidId: { in: [...ownerByBid.keys()] } }, { serviceOrderId: { in: [...ownerByOrder.keys()] } }],
    },
    select: { id: true, status: true, completedAt: true, projectBidId: true, serviceOrderId: true },
  });
  const ownerByAward = new Map(
    awards.map((row) => [
      row.id,
      (row.projectBidId ? ownerByBid.get(row.projectBidId) : undefined) ??
        (row.serviceOrderId ? ownerByOrder.get(row.serviceOrderId) : undefined) ??
        null,
    ]),
  );

  const milestones = await prisma.marketplaceMilestone.findMany({
    where: { awardId: { in: awards.map((row) => row.id) }, deliveredAt: { not: null }, dueDate: { not: null } },
    select: { awardId: true, deliveredAt: true, dueDate: true },
  });

  const result = new Map<string, FreelancerStats>();
  for (const user of users) {
    const theirs = awards.filter((row) => ownerByAward.get(row.id) === user.id);
    const completed = theirs.filter((row) => row.status === 'COMPLETED').length;
    const cancelled = theirs.filter((row) => row.status === 'CANCELLED').length;
    const ended = completed + cancelled;
    const theirMilestones = milestones.filter((row) => ownerByAward.get(row.awardId) === user.id);
    const onTimeCount = theirMilestones.filter((row) => row.deliveredAt! <= row.dueDate!).length;
    const lastDelivery = theirs
      .map((row) => row.completedAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const profile = profiles.get(user.id);
    const jobSuccess = ended > 0 ? Math.round((completed / ended) * 100) : null;
    const ratingAvg = profile?.ratingAvg ?? 0;
    const ratingCount = profile?.ratingCount ?? 0;

    result.set(user.id, {
      completed,
      active: theirs.filter((row) => row.status === 'ACTIVE').length,
      jobSuccess,
      onTime: theirMilestones.length > 0 ? Math.round((onTimeCount / theirMilestones.length) * 100) : null,
      ratingAvg,
      ratingCount,
      level: freelancerLevel({ completed, jobSuccess, ratingAvg, ratingCount }),
      memberSince: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      lastDeliveryAt: lastDelivery?.toISOString() ?? null,
      country: user.country,
      languages: user.languages,
      hourlyRate: user.hourlyRate?.toString() ?? null,
      hourlyCurrency: user.hourlyCurrency,
      availability: user.availability,
      verified: user.verification?.status === 'APPROVED',
      skills: user.skills,
    });
  }
  return result;
}
