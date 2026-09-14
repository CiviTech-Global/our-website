import { prisma } from '../config/database.js';

/**
 * The marketplace health dashboard. Everything here is a count over a known
 * window — nothing personal, nothing realtime-critical — computed fresh on
 * each read because a cached number on a staff dashboard eventually gets
 * believed after it stopped being true.
 */

const REVIEW_SAMPLE = 200;

function averageHours(pairs: Array<{ start: Date | null; end: Date | null }>): number | null {
  const diffs = pairs
    .filter((pair) => pair.start && pair.end)
    .map((pair) => (pair.end!.getTime() - pair.start!.getTime()) / 3_600_000)
    .filter((hours) => hours >= 0);
  if (diffs.length === 0) return null;
  return Math.round((diffs.reduce((sum, hours) => sum + hours, 0) / diffs.length) * 10) / 10;
}

export async function getMarketplaceAnalytics() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86_400_000);

  const [
    jobsByStatus,
    projectsByStatus,
    verificationsByStatus,
    applicationsByStatus,
    bidsByStatus,
    awardsByStatus,
    openDisputes,
    featuredCount,
    recentJobs,
    recentProjects,
    recentApplications,
    recentBids,
    awardsTotal,
    awardsCompleted,
    publishedJobs,
    publishedProjects,
    recentJobCategories,
    recentProjectCategories,
    recentJobSkills,
    recentProjectSkills,
  ] = await Promise.all([
    prisma.jobPost.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    prisma.freelanceProject.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    prisma.userVerification.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.jobApplication.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    prisma.projectBid.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    prisma.marketplaceAward.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.marketplaceAward.count({ where: { disputeStatus: 'OPEN' } }),
    prisma.jobPost.count({ where: { featured: true } }),
    prisma.jobPost.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: REVIEW_SAMPLE,
      select: { submittedAt: true, reviewedAt: true },
    }),
    prisma.freelanceProject.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: REVIEW_SAMPLE,
      select: { submittedAt: true, reviewedAt: true },
    }),
    prisma.jobApplication.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: REVIEW_SAMPLE,
      select: { createdAt: true, reviewedAt: true },
    }),
    prisma.projectBid.findMany({
      where: { reviewedAt: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: REVIEW_SAMPLE,
      select: { createdAt: true, reviewedAt: true },
    }),
    prisma.marketplaceAward.count(),
    prisma.marketplaceAward.count({ where: { status: 'COMPLETED' } }),
    prisma.jobPost.findMany({
      where: { publishedAt: { gte: twelveWeeksAgo } },
      select: { publishedAt: true },
    }),
    prisma.freelanceProject.findMany({
      where: { publishedAt: { gte: twelveWeeksAgo } },
      select: { publishedAt: true },
    }),
    prisma.jobPost.findMany({
      where: { publishedAt: { gte: ninetyDaysAgo }, category: { not: null } },
      select: { category: true },
    }),
    prisma.freelanceProject.findMany({
      where: { publishedAt: { gte: ninetyDaysAgo }, category: { not: null } },
      select: { category: true },
    }),
    prisma.jobPost.findMany({
      where: { publishedAt: { gte: ninetyDaysAgo } },
      select: { skills: true },
    }),
    prisma.freelanceProject.findMany({
      where: { publishedAt: { gte: ninetyDaysAgo } },
      select: { skills: true },
    }),
  ]);

  const featuredProjectsCount = await prisma.freelanceProject.count({ where: { featured: true } });

  const byStatus = (rows: Array<Record<string, unknown> & { _count: { _all: number } }>, key: string) =>
    Object.fromEntries(rows.map((row) => [row[key], row._count._all]));

  // Twelve weekly buckets of published listings, oldest first. Volumes here
  // are staff-dashboard scale, so bucketing in memory is honest and cheap.
  const weeklyTrend = Array.from({ length: 12 }, (_, index) => {
    const weekStart = new Date(twelveWeeksAgo.getTime() + index * 7 * 86_400_000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
    const inWeek = (date: Date | null) => date && date >= weekStart && date < weekEnd;
    return {
      week: weekStart.toISOString().slice(0, 10),
      jobs: publishedJobs.filter((row) => inWeek(row.publishedAt)).length,
      projects: publishedProjects.filter((row) => inWeek(row.publishedAt)).length,
    };
  });

  const tally = (values: Array<string | null>) => {
    const frequencies = new Map<string, number>();
    for (const value of values) {
      if (value) frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
    }
    return [...frequencies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, total]) => ({ value, total }));
  };

  return {
    queues: {
      jobs: byStatus(jobsByStatus as never, 'moderationStatus'),
      projects: byStatus(projectsByStatus as never, 'moderationStatus'),
      verifications: byStatus(verificationsByStatus as never, 'status'),
      applications: byStatus(applicationsByStatus as never, 'moderationStatus'),
      bids: byStatus(bidsByStatus as never, 'moderationStatus'),
    },
    awards: {
      total: awardsTotal,
      byStatus: byStatus(awardsByStatus as never, 'status'),
      completed: awardsCompleted,
      openDisputes,
      completionRate: awardsTotal === 0 ? null : Math.round((awardsCompleted / awardsTotal) * 100),
    },
    featured: { jobs: featuredCount, projects: featuredProjectsCount },
    reviewSpeedHours: {
      jobs: averageHours(recentJobs.map((row) => ({ start: row.submittedAt, end: row.reviewedAt }))),
      projects: averageHours(recentProjects.map((row) => ({ start: row.submittedAt, end: row.reviewedAt }))),
      applications: averageHours(recentApplications.map((row) => ({ start: row.createdAt, end: row.reviewedAt }))),
      bids: averageHours(recentBids.map((row) => ({ start: row.createdAt, end: row.reviewedAt }))),
    },
    weeklyTrend,
    topCategories: [
      ...tally(recentJobCategories.map((row) => row.category)),
      ...tally(recentProjectCategories.map((row) => row.category)),
    ]
      .reduce<Array<{ value: string; total: number }>>((merged, row) => {
        const existing = merged.find((item) => item.value === row.value);
        if (existing) existing.total += row.total;
        else merged.push({ ...row });
        return merged;
      }, [])
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    topSkills: tally([
      ...recentJobSkills.flatMap((row) => row.skills),
      ...recentProjectSkills.flatMap((row) => row.skills),
    ]),
  };
}
