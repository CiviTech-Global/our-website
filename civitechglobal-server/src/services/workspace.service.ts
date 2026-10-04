import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { features } from '../config/features.js';

/**
 * Everything the member's home screen shows, in one request.
 *
 * A member here is several people at once — somebody looking for work,
 * somebody hiring, a freelancer, a client, a seller — and most are only one
 * or two of them. The home screen shows a panel for each part they actually
 * play and an invitation for the rest, so this answers "which parts, and
 * what is waiting in each" rather than one flat row of totals.
 *
 * Counts only, plus the handful of recent rows a panel lists. Each panel's own
 * screen has the full list.
 */

const countBy = <K extends string>(rows: Array<{ _count: { _all: number } } & Record<K, unknown>>, key: K) =>
  Object.fromEntries(rows.map((row) => [String(row[key]), row._count._all])) as Record<string, number>;

const sum = (record: Record<string, number>) => Object.values(record).reduce((total, value) => total + value, 0);

/**
 * Awards where this person is the one doing the work. The award row holds the
 * application or bid id without a relation, so the person's accepted ones are
 * found first.
 */
async function awardsWon(userId: string) {
  const [applications, bids] = await Promise.all([
    prisma.jobApplication.findMany({ where: { applicantId: userId, outcome: 'ACCEPTED' }, select: { id: true } }),
    prisma.projectBid.findMany({ where: { bidderId: userId, outcome: 'ACCEPTED' }, select: { id: true } }),
  ]);
  if (applications.length === 0 && bids.length === 0) return [];
  const rows = await prisma.marketplaceAward.findMany({
    where: {
      OR: [
        { jobApplicationId: { in: applications.map((row) => row.id) } },
        { projectBidId: { in: bids.map((row) => row.id) } },
      ],
    },
    select: { status: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return [...counts].map(([status, count]) => ({ status, _count: { _all: count } }));
}

export async function getWorkspace(userId: string) {
  const ownJob: Prisma.JobPostWhereInput = { authorId: userId };
  const ownProject: Prisma.FreelanceProjectWhereInput = { authorId: userId };

  const [
    jobsByStatus,
    openJobs,
    applicantsByOutcome,
    unseenApplicants,
    recentApplicants,
    myApplicationsByOutcome,
    recentApplications,
    savedJobs,
    activeAlerts,
    projectsByStatus,
    openProjects,
    bidsReceivedPending,
    myBidsByOutcome,
    booksByStatus,
    awardsAsAuthor,
    awardsAsDoer,
    unreadNotifications,
    unreadMessages,
    recentNotifications,
    trackedRequests,
    verification,
    company,
  ] = await Promise.all([
    prisma.jobPost.groupBy({ by: ['moderationStatus'], where: ownJob, _count: { _all: true } }),
    prisma.jobPost.count({ where: { ...ownJob, moderationStatus: 'APPROVED', state: 'OPEN' } }),
    prisma.jobApplication.groupBy({
      by: ['outcome'],
      where: { job: ownJob, moderationStatus: 'APPROVED' },
      _count: { _all: true },
    }),
    prisma.jobApplication.count({
      where: { job: ownJob, moderationStatus: 'APPROVED', employerSeenAt: null, outcome: { not: 'WITHDRAWN' } },
    }),
    prisma.jobApplication.findMany({
      where: { job: ownJob, moderationStatus: 'APPROVED', outcome: { not: 'WITHDRAWN' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        outcome: true,
        createdAt: true,
        employerSeenAt: true,
        applicant: { select: { firstName: true, lastName: true } },
        job: { select: { id: true, code: true, title: true } },
      },
    }),
    prisma.jobApplication.groupBy({ by: ['outcome'], where: { applicantId: userId }, _count: { _all: true } }),
    prisma.jobApplication.findMany({
      where: { applicantId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        outcome: true,
        moderationStatus: true,
        employerSeenAt: true,
        updatedAt: true,
        job: { select: { code: true, title: true, companyName: true } },
      },
    }),
    features.jobsV2 ? prisma.savedJob.count({ where: { userId } }) : Promise.resolve(0),
    features.jobsV2 ? prisma.jobAlert.count({ where: { userId, active: true } }) : Promise.resolve(0),
    prisma.freelanceProject.groupBy({ by: ['moderationStatus'], where: ownProject, _count: { _all: true } }),
    prisma.freelanceProject.count({ where: { ...ownProject, moderationStatus: 'APPROVED', state: 'OPEN' } }),
    prisma.projectBid.count({ where: { project: ownProject, moderationStatus: 'APPROVED', outcome: 'PENDING' } }),
    prisma.projectBid.groupBy({ by: ['outcome'], where: { bidderId: userId }, _count: { _all: true } }),
    prisma.bookListing.groupBy({ by: ['moderationStatus'], where: { sellerId: userId }, _count: { _all: true } }),
    prisma.marketplaceAward.groupBy({ by: ['status'], where: { awardedById: userId }, _count: { _all: true } }),
    awardsWon(userId),
    prisma.notification.count({ where: { userId, readAt: null } }),
    // Both sides of every conversation: as the applicant or bidder, and as the
    // employer or client being written to. The old home figure counted only
    // the first, so an employer's unread messages from applicants never showed.
    prisma.marketplaceMessage.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        OR: [
          { application: { applicantId: userId } },
          { application: { job: { authorId: userId } } },
          { bid: { bidderId: userId } },
          { bid: { project: { authorId: userId } } },
        ],
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
    prisma.trackedRequest.count({ where: { userId } }),
    prisma.userVerification.findUnique({ where: { userId }, select: { status: true } }),
    features.jobsV2
      ? prisma.company.findUnique({ where: { ownerId: userId }, select: { slug: true, name: true, hidden: true } })
      : Promise.resolve(null),
  ]);

  const jobs = countBy(jobsByStatus, 'moderationStatus');
  const applicants = countBy(applicantsByOutcome, 'outcome');
  const myApplications = countBy(myApplicationsByOutcome, 'outcome');
  const projects = countBy(projectsByStatus, 'moderationStatus');
  const myBids = countBy(myBidsByOutcome, 'outcome');
  const books = countBy(booksByStatus, 'moderationStatus');
  const asAuthor = countBy(awardsAsAuthor, 'status');
  const asDoer = countBy(awardsAsDoer, 'status');

  return {
    verification: verification?.status ?? 'UNVERIFIED',
    hiring: {
      postings: sum(jobs),
      open: openJobs,
      byStatus: jobs,
      applicants: sum(applicants) - (applicants.WITHDRAWN ?? 0),
      unseen: unseenApplicants,
      byOutcome: applicants,
      recent: recentApplicants,
      company,
    },
    jobSearch: {
      applications: sum(myApplications) - (myApplications.WITHDRAWN ?? 0),
      byOutcome: myApplications,
      recent: recentApplications,
      savedJobs,
      activeAlerts,
    },
    client: {
      projects: sum(projects),
      open: openProjects,
      byStatus: projects,
      bidsAwaiting: bidsReceivedPending,
    },
    freelance: {
      bids: sum(myBids) - (myBids.WITHDRAWN ?? 0),
      byOutcome: myBids,
    },
    selling: {
      books: sum(books),
      booksByStatus: books,
    },
    collaborations: {
      active: (asAuthor.ACTIVE ?? 0) + (asDoer.ACTIVE ?? 0),
      completed: (asAuthor.COMPLETED ?? 0) + (asDoer.COMPLETED ?? 0),
    },
    unread: { notifications: unreadNotifications, messages: unreadMessages },
    recentNotifications,
    trackedRequests,
  };
}
