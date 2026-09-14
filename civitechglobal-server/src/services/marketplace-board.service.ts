import { prisma } from '../config/database.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { authorProfileSummaries, type AuthorProfileSummary } from './profile.service.js';

/**
 * The landing page's window into the marketplace.
 *
 * Two small read-only surfaces: the headline numbers (how alive is the
 * board) and the staff-curated featured listings. Both are cacheable for
 * minutes — nothing here is personal, and a stale count on a hero section
 * costs nothing.
 */

export interface BoardStats {
  openJobs: number;
  openProjects: number;
  awardsGiven: number;
  verifiedUsers: number;
}

export async function getBoardStats(): Promise<BoardStats> {
  const [openJobs, openProjects, awardsGiven, verifiedUsers] = await Promise.all([
    prisma.jobPost.count({ where: PUBLIC_LISTING_WHERE }),
    prisma.freelanceProject.count({ where: PUBLIC_LISTING_WHERE }),
    prisma.marketplaceAward.count(),
    prisma.userVerification.count({ where: { status: 'APPROVED' } }),
  ]);

  return { openJobs, openProjects, awardsGiven, verifiedUsers };
}

const FEATURED_TAKE = 6;

interface FeaturedJobRow {
  code: string;
  title: string;
  companyName: string | null;
  category: string | null;
  employmentType: string;
  workArrangement: string;
  province: string | null;
  city: string | null;
  salaryMin: bigint | null;
  salaryMax: bigint | null;
  salaryUndisclosed: boolean;
  currency: string;
  featured: boolean;
  authorId: string;
}

interface FeaturedProjectRow {
  code: string;
  title: string;
  companyName: string | null;
  category: string | null;
  budgetMin: bigint | null;
  budgetMax: bigint | null;
  budgetUnknown: boolean;
  currency: string;
  featured: boolean;
  authorId: string;
  _count: { bids: number };
}

async function fillFeatured<T extends { featured: boolean; code: string }>(
  featured: T[],
  fetchLatest: (take: number) => Promise<T[]>,
): Promise<T[]> {
  // Featured first, then the newest non-featured fill the remaining slots, so
  // the showcase never renders half-empty before staff have curated anything.
  if (featured.length >= FEATURED_TAKE) return featured.slice(0, FEATURED_TAKE);
  const featuredCodes = new Set(featured.map((row) => row.code));
  const latest = await fetchLatest(FEATURED_TAKE);
  return [
    ...featured,
    ...latest.filter((row) => !row.featured && !featuredCodes.has(row.code)),
  ].slice(0, FEATURED_TAKE);
}

export async function getFeatured(): Promise<{
  jobs: Array<Omit<FeaturedJobRow, 'authorId'> & { authorProfile: AuthorProfileSummary | null }>;
  projects: Array<
    Omit<FeaturedProjectRow, 'authorId'> & { authorProfile: AuthorProfileSummary | null }
  >;
}> {
  const jobSelect = {
    code: true,
    title: true,
    companyName: true,
    category: true,
    employmentType: true,
    workArrangement: true,
    province: true,
    city: true,
    salaryMin: true,
    salaryMax: true,
    salaryUndisclosed: true,
    currency: true,
    featured: true,
    authorId: true,
  } as const;

  const projectSelect = {
    code: true,
    title: true,
    companyName: true,
    category: true,
    budgetMin: true,
    budgetMax: true,
    budgetUnknown: true,
    currency: true,
    featured: true,
    authorId: true,
    _count: { select: { bids: { where: { moderationStatus: 'APPROVED' as const } } } },
  } as const;

  const [featuredJobs, featuredProjects] = await Promise.all([
    prisma.jobPost.findMany({
      where: { ...PUBLIC_LISTING_WHERE, featured: true },
      orderBy: { featuredAt: 'desc' },
      take: FEATURED_TAKE,
      select: jobSelect,
    }),
    prisma.freelanceProject.findMany({
      where: { ...PUBLIC_LISTING_WHERE, featured: true },
      orderBy: { featuredAt: 'desc' },
      take: FEATURED_TAKE,
      select: projectSelect,
    }),
  ]);

  const [jobs, projects] = await Promise.all([
    fillFeatured(featuredJobs, (take) =>
      prisma.jobPost.findMany({
        where: PUBLIC_LISTING_WHERE,
        orderBy: { publishedAt: 'desc' },
        take,
        select: jobSelect,
      }),
    ),
    fillFeatured(featuredProjects, (take) =>
      prisma.freelanceProject.findMany({
        where: PUBLIC_LISTING_WHERE,
        orderBy: { publishedAt: 'desc' },
        take,
        select: projectSelect,
      }),
    ),
  ]);

  const [jobProfiles, projectProfiles] = await Promise.all([
    authorProfileSummaries(jobs.map((row) => row.authorId)),
    authorProfileSummaries(projects.map((row) => row.authorId)),
  ]);

  const strip = <T extends { authorId: string }>(row: T): Omit<T, 'authorId'> => {
    const { authorId: _ignored, ...rest } = row;
    return rest;
  };

  return {
    jobs: jobs.map((row) => ({ ...strip(row), authorProfile: jobProfiles.get(row.authorId) ?? null })),
    projects: projects.map((row) => ({
      ...strip(row),
      authorProfile: projectProfiles.get(row.authorId) ?? null,
    })),
  };
}
