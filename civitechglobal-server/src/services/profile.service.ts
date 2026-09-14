import { prisma } from '../config/database.js';

/**
 * The public face of a marketplace account.
 *
 * Identity on the boards flows through the profile, and the profile exists
 * only when the account holder has chosen a username: the public job board
 * used to name nobody at all, on the grounds that a board listing who posted
 * each advert publishes a list of verified accounts. That is still true for
 * anyone without a username — for them `authorProfile` is null and their
 * listing is anonymous. A self-chosen handle plus a headline is an identity
 * the holder opted into, and it is what makes reputation mean anything.
 *
 * Real names, email and phone are never part of this shape.
 */

export interface AuthorProfileSummary {
  username: string;
  headline: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
}

/**
 * The summary card shown next to an author or bidder's name.
 *
 * Returns null when the user has no username — the signal that the person has
 * not opted into a public profile, which the client renders as a plain
 * anonymous listing.
 */
export async function authorProfileSummary(
  userId: string,
): Promise<AuthorProfileSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      headline: true,
      deletedAt: true,
      marketplacePaused: true,
      verification: { select: { status: true } },
    },
  });

  if (!user || user.deletedAt || user.marketplacePaused || !user.username) return null;

  const aggregate = await prisma.marketplaceReview.aggregate({
    where: { rateeId: userId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    username: user.username,
    headline: user.headline,
    verified: user.verification?.status === 'APPROVED',
    ratingAvg: aggregate._avg.rating ?? 0,
    ratingCount: aggregate._count._all,
  };
}

/**
 * The fields an account holder may set on their own public profile.
 * An empty string clears the field back to null.
 */
export interface ProfileInput {
  headline?: string;
  bio?: string;
  website?: string;
}

/** The numbers behind the user dashboard's welcome row. */
export async function getOwnStats(userId: string) {
  const [
    jobAggregates,
    projectAggregates,
    applicationsByOutcome,
    bidsByOutcome,
    awardedApplications,
    awardedBids,
    unreadNotifications,
    unreadMessageApplications,
    unreadMessageBids,
  ] = await Promise.all([
    prisma.jobPost.aggregate({
      where: { authorId: userId },
      _count: { _all: true },
      _sum: { viewCount: true },
    }),
    prisma.freelanceProject.aggregate({
      where: { authorId: userId },
      _count: { _all: true },
      _sum: { viewCount: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['outcome'],
      where: { applicantId: userId },
      _count: { _all: true },
    }),
    prisma.projectBid.groupBy({
      by: ['outcome'],
      where: { bidderId: userId },
      _count: { _all: true },
    }),
    prisma.jobApplication.findMany({
      where: { applicantId: userId, outcome: 'ACCEPTED' },
      select: { id: true },
    }),
    prisma.projectBid.findMany({
      where: { bidderId: userId, outcome: 'ACCEPTED' },
      select: { id: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.marketplaceMessage.count({
      where: { application: { applicantId: userId }, senderId: { not: userId }, readAt: null },
    }),
    prisma.marketplaceMessage.count({
      where: { bid: { bidderId: userId }, senderId: { not: userId }, readAt: null },
    }),
  ]);

  const byOutcome = (
    rows: Array<{ outcome: string; _count: { _all: number } }>,
  ): Record<string, number> => Object.fromEntries(rows.map((row) => [row.outcome, row._count._all]));

  const wonAwards = awardedApplications.length + awardedBids.length;

  return {
    listings: {
      total: jobAggregates._count._all + projectAggregates._count._all,
      views: (jobAggregates._sum.viewCount ?? 0) + (projectAggregates._sum.viewCount ?? 0),
    },
    applications: {
      total: applicationsByOutcome.reduce((sum, row) => sum + row._count._all, 0),
      byOutcome: byOutcome(applicationsByOutcome),
    },
    bids: {
      total: bidsByOutcome.reduce((sum, row) => sum + row._count._all, 0),
      byOutcome: byOutcome(bidsByOutcome),
    },
    awards: { won: wonAwards },
    unread: {
      notifications: unreadNotifications,
      messages: unreadMessageApplications + unreadMessageBids,
    },
  };
}

/** The account's own profile fields, for the settings form's defaults. */
export async function getOwnProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, headline: true, bio: true, website: true },
  });
}

export async function updateOwnProfile(userId: string, input: ProfileInput) {
  const clear = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

  return prisma.user.update({
    where: { id: userId },
    data: {
      headline: input.headline === undefined ? undefined : clear(input.headline),
      bio: input.bio === undefined ? undefined : clear(input.bio),
      website: input.website === undefined ? undefined : clear(input.website),
    },
    select: { username: true, headline: true, bio: true, website: true },
  });
}

// --- The public profile page -------------------------------------------------

export interface PublicProfileReview {
  rating: number;
  text: string | null;
  createdAt: Date;
  /// Which side of the deal wrote this, relative to the listing: the author
  /// of the listing (employer/client) or the person who took it on
  /// (applicant/freelancer). The rater's own identity stays hidden — see the
  /// note on getPublicProfile.
  role: 'employer' | 'applicant' | 'client' | 'freelancer';
  listingCode: string;
  listingTitle: string;
}

export interface PublicProfile {
  username: string;
  headline: string | null;
  bio: string | null;
  website: string | null;
  companyName: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  joinedAt: Date;
  jobs: Array<{
    code: string;
    title: string;
    employmentType: string;
    state: string;
    publishedAt: Date | null;
  }>;
  projects: Array<{
    code: string;
    title: string;
    category: string | null;
    state: string;
    publishedAt: Date | null;
  }>;
  reviews: PublicProfileReview[];
}

/**
 * What a stranger may see of an account.
 *
 * The privacy rules, in one place:
 *  - no email, no phone, no real name — contact happens through the platform;
 *  - paused accounts disappear entirely, listings included: pausing is a
 *    circuit breaker, and a circuit breaker that leaves the person's public
 *    face up has not broken the circuit;
 *  - reviews name the listing they belong to and which side wrote them, but
 *    never the rater: a visible rater on a one-to-one deal is an invitation
 *    to retaliate across the next one.
 *
 * Returns null when there is nothing to show; the route turns that into 404.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findFirst({
    where: {
      username: username.trim().toLowerCase(),
      deletedAt: null,
      marketplacePaused: false,
    },
    select: {
      id: true,
      username: true,
      headline: true,
      bio: true,
      website: true,
      createdAt: true,
      verification: { select: { status: true, companyName: true } },
    },
  });
  if (!user) return null;

  const [jobs, projects, reviews] = await Promise.all([
    prisma.jobPost.findMany({
      where: {
        authorId: user.id,
        moderationStatus: 'APPROVED',
        state: { in: ['OPEN', 'AWARDED'] },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        code: true,
        title: true,
        employmentType: true,
        state: true,
        publishedAt: true,
      },
    }),
    prisma.freelanceProject.findMany({
      where: {
        authorId: user.id,
        moderationStatus: 'APPROVED',
        state: { in: ['OPEN', 'AWARDED'] },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        code: true,
        title: true,
        category: true,
        state: true,
        publishedAt: true,
      },
    }),
    prisma.marketplaceReview.findMany({
      where: { rateeId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        rating: true,
        text: true,
        createdAt: true,
        raterId: true,
        awardId: true,
      },
    }),
  ]);

  // Awards link to their application/bid by plain columns rather than a
  // relation, so the listing context is assembled here in three small reads
  // instead of a traversal Prisma cannot type.
  const awards = await prisma.marketplaceAward.findMany({
    where: { id: { in: reviews.map((review) => review.awardId) } },
    select: { id: true, jobApplicationId: true, projectBidId: true },
  });
  const applications = await prisma.jobApplication.findMany({
    where: { id: { in: awards.map((award) => award.jobApplicationId).filter(Boolean) as string[] } },
    select: { id: true, job: { select: { code: true, title: true, authorId: true } } },
  });
  const bids = await prisma.projectBid.findMany({
    where: { id: { in: awards.map((award) => award.projectBidId).filter(Boolean) as string[] } },
    select: { id: true, project: { select: { code: true, title: true, authorId: true } } },
  });
  const listingByAward = new Map<
    string,
    { code: string; title: string; authorId: string; kind: 'job' | 'project' }
  >();
  for (const award of awards) {
    if (award.jobApplicationId) {
      const application = applications.find((row) => row.id === award.jobApplicationId);
      if (application) {
        listingByAward.set(award.id, { ...application.job, kind: 'job' });
      }
    } else if (award.projectBidId) {
      const bid = bids.find((row) => row.id === award.projectBidId);
      if (bid) {
        listingByAward.set(award.id, { ...bid.project, kind: 'project' });
      }
    }
  }

  const aggregate = await prisma.marketplaceReview.aggregate({
    where: { rateeId: user.id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const shapedReviews: PublicProfileReview[] = reviews.flatMap((review) => {
    const listing = listingByAward.get(review.awardId);
    if (!listing) return [];
    const raterIsAuthor = listing.authorId === review.raterId;
    const role =
      listing.kind === 'job'
        ? raterIsAuthor
          ? ('employer' as const)
          : ('applicant' as const)
        : raterIsAuthor
          ? ('client' as const)
          : ('freelancer' as const);
    return [{ rating: review.rating, text: review.text, createdAt: review.createdAt, role, listingCode: listing.code, listingTitle: listing.title }];
  });

  return {
    username: user.username as string,
    headline: user.headline,
    bio: user.bio,
    website: user.website,
    companyName:
      user.verification?.status === 'APPROVED' ? (user.verification.companyName ?? null) : null,
    verified: user.verification?.status === 'APPROVED',
    ratingAvg: aggregate._avg.rating ?? 0,
    ratingCount: aggregate._count._all,
    joinedAt: user.createdAt,
    jobs,
    projects,
    reviews: shapedReviews,
  };
}

/** Bulk variant for list endpoints: one query for N authors instead of N+1. */
export async function authorProfileSummaries(
  userIds: string[],
): Promise<Map<string, AuthorProfileSummary>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null, marketplacePaused: false, username: { not: null } },
    select: {
      id: true,
      username: true,
      headline: true,
      verification: { select: { status: true } },
    },
  });

  const aggregates = await prisma.marketplaceReview.groupBy({
    by: ['rateeId'],
    where: { rateeId: { in: users.map((user) => user.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingByUser = new Map(
    aggregates.map((row) => [row.rateeId, { avg: row._avg.rating ?? 0, count: row._count._all }]),
  );

  return new Map(
    users.map((user) => [
      user.id,
      {
        username: user.username as string,
        headline: user.headline,
        verified: user.verification?.status === 'APPROVED',
        ratingAvg: ratingByUser.get(user.id)?.avg ?? 0,
        ratingCount: ratingByUser.get(user.id)?.count ?? 0,
      },
    ]),
  );
}
