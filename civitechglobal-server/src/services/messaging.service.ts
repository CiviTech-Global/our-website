import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifySafely } from './notifications.service.js';
import { assertMarketplaceAllowed } from './verification.service.js';
import { authorProfileSummary, type AuthorProfileSummary } from './profile.service.js';

/**
 * Two-party threads, anchored to an approved application or bid.
 *
 * Not a general chat, deliberately: contact opens only after moderation has
 * passed the anchor through, which is the same rule that makes the boards
 * worth reading. Before approval there is nothing to say that could not be
 * said in the cover letter or the bid; after it, both sides are verified and
 * accountable.
 *
 * Messages mark themselves read when the other party lists the thread — one
 * read receipt per message is all a two-party thread needs, and an explicit
 * "mark read" endpoint would be ceremony.
 */

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

interface ApplicationAnchor {
  id: string;
  applicantId: string;
  employerId: string;
  jobTitle: string;
  jobCode: string;
}

interface BidAnchor {
  id: string;
  bidderId: string | null;
  clientId: string;
  projectTitle: string;
  projectCode: string;
}

async function requireApplicationAccess(
  userId: string,
  applicationId: string,
): Promise<ApplicationAnchor> {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      moderationStatus: true,
      job: { select: { authorId: true, title: true, code: true } },
    },
  });

  if (!application) throw new AppError('این گفتگو پیدا نشد.', 404);
  const isParty =
    application.applicantId === userId || application.job.authorId === userId;
  if (!isParty) throw new AppError('این گفتگو مربوط به شما نیست.', 403);
  if (application.moderationStatus !== 'APPROVED') {
    // Before approval there is no thread: the reviewer's note is the channel.
    throw new AppError('گفتگو پس از تأیید درخواست باز می‌شود.', 409);
  }

  return {
    id: application.id,
    applicantId: application.applicantId,
    employerId: application.job.authorId,
    jobTitle: application.job.title,
    jobCode: application.job.code,
  };
}

async function requireBidAccess(userId: string, bidId: string): Promise<BidAnchor> {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      bidderId: true,
      moderationStatus: true,
      project: { select: { authorId: true, title: true, code: true } },
    },
  });

  if (!bid) throw new AppError('این گفتگو پیدا نشد.', 404);
  const isParty = bid.bidderId === userId || bid.project.authorId === userId;
  if (!isParty) throw new AppError('این گفتگو مربوط به شما نیست.', 403);
  if (bid.moderationStatus !== 'APPROVED') {
    throw new AppError('گفتگو پس از تأیید پیشنهاد باز می‌شود.', 409);
  }

  return {
    id: bid.id,
    bidderId: bid.bidderId,
    clientId: bid.project.authorId,
    projectTitle: bid.project.title,
    projectCode: bid.project.code,
  };
}

/** The account on the other side of the thread; null for the company's own offer. */
function counterpartOf(anchor: ApplicationAnchor | BidAnchor, userId: string): string | null {
  if ('applicantId' in anchor) {
    return anchor.applicantId === userId ? anchor.employerId : anchor.applicantId;
  }
  return anchor.bidderId === userId ? anchor.clientId : anchor.bidderId;
}

// ---------------------------------------------------------------------------
// Sending and reading
// ---------------------------------------------------------------------------

/** One rule with the posting/bidding gates: a paused account is silent. */
function assertCanMessage(userId: string): Promise<void> {
  return assertMarketplaceAllowed(userId);
}

export async function sendApplicationMessage(
  userId: string,
  applicationId: string,
  body: string,
) {
  const anchor = await requireApplicationAccess(userId, applicationId);
  await assertCanMessage(userId);

  const message = await prisma.marketplaceMessage.create({
    data: { applicationId, senderId: userId, body },
    select: { id: true, createdAt: true },
  });

  const counterpart = counterpartOf(anchor, userId);
  if (counterpart) {
    notifySafely(counterpart, {
      type: 'message.received',
      title: 'پیام جدید',
      body: `پیام جدید دربارهٔ «${anchor.jobTitle}»: ${body.slice(0, 80)}`,
      link: `/dashboard/messages/${applicationId}`,
    });
  }

  return message;
}

export async function sendBidMessage(userId: string, bidId: string, body: string) {
  const anchor = await requireBidAccess(userId, bidId);
  await assertCanMessage(userId);

  const message = await prisma.marketplaceMessage.create({
    data: { bidId, senderId: userId, body },
    select: { id: true, createdAt: true },
  });

  const counterpart = counterpartOf(anchor, userId);
  if (counterpart) {
    notifySafely(counterpart, {
      type: 'message.received',
      title: 'پیام جدید',
      body: `پیام جدید دربارهٔ «${anchor.projectTitle}»: ${body.slice(0, 80)}`,
      link: `/dashboard/messages/${bidId}`,
    });
  }

  return message;
}

const messageSelect = {
  id: true,
  body: true,
  senderId: true,
  readAt: true,
  createdAt: true,
} as const;

/** Lists a thread and marks the other side's messages read in the same breath. */
export async function listApplicationMessages(userId: string, applicationId: string) {
  const anchor = await requireApplicationAccess(userId, applicationId);

  const messages = await prisma.marketplaceMessage.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'asc' },
    select: messageSelect,
  });

  await prisma.marketplaceMessage.updateMany({
    where: { applicationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    anchor: {
      kind: 'application' as const,
      listingTitle: anchor.jobTitle,
      listingCode: anchor.jobCode,
      path: `/jobs/${anchor.jobCode}`,
    },
    messages: messages.map((message) => ({ ...message, mine: message.senderId === userId })),
  };
}

export async function listBidMessages(userId: string, bidId: string) {
  const anchor = await requireBidAccess(userId, bidId);

  const messages = await prisma.marketplaceMessage.findMany({
    where: { bidId },
    orderBy: { createdAt: 'asc' },
    select: messageSelect,
  });

  await prisma.marketplaceMessage.updateMany({
    where: { bidId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    anchor: {
      kind: 'bid' as const,
      listingTitle: anchor.projectTitle,
      listingCode: anchor.projectCode,
      path: `/projects/${anchor.projectCode}`,
    },
    messages: messages.map((message) => ({ ...message, mine: message.senderId === userId })),
  };
}

// ---------------------------------------------------------------------------
// The inbox
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  /** The thread anchor id — doubles as the thread URL segment. */
  threadId: string;
  kind: 'application' | 'bid';
  listingTitle: string;
  listingCode: string;
  path: string;
  counterpart: AuthorProfileSummary | null;
  /// null covers both "no username" and the company's own offer, which has no
  /// account on the other side at all; the client renders a neutral label.
  counterpartName: string | null;
  lastMessage: { body: string; createdAt: Date; mine: boolean } | null;
  unreadCount: number;
}

/**
 * Every thread the account can open, with the last thing said in it. A thread
 * exists in this list only once it has at least one message — an approved
 * application with nothing said yet is an offer to talk, not a conversation.
 */
export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const [applications, bids] = await Promise.all([
    prisma.jobApplication.findMany({
      where: {
        moderationStatus: 'APPROVED',
        OR: [{ applicantId: userId }, { job: { authorId: userId } }],
      },
      select: {
        id: true,
        applicantId: true,
        job: {
          select: { title: true, code: true, authorId: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, readAt: true },
        },
      },
    }),
    prisma.projectBid.findMany({
      where: {
        moderationStatus: 'APPROVED',
        OR: [{ bidderId: userId }, { project: { authorId: userId } }],
      },
      select: {
        id: true,
        bidderId: true,
        project: { select: { title: true, code: true, authorId: true } },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, readAt: true },
        },
      },
    }),
  ]);

  // Unread counts per anchor in one query each, not per thread.
  const applicationIds = applications.map((row) => row.id);
  const bidIds = bids.map((row) => row.id);
  const [unreadApplications, unreadBids, counterpartProfiles] = await Promise.all([
    prisma.marketplaceMessage.groupBy({
      by: ['applicationId'],
      where: { applicationId: { in: applicationIds }, senderId: { not: userId }, readAt: null },
      _count: { _all: true },
    }),
    prisma.marketplaceMessage.groupBy({
      by: ['bidId'],
      where: { bidId: { in: bidIds }, senderId: { not: userId }, readAt: null },
      _count: { _all: true },
    }),
    (async () => {
      const ids = new Set<string>();
      for (const row of applications) {
        const other = row.applicantId === userId ? row.job.authorId : row.applicantId;
        ids.add(other);
      }
      for (const row of bids) {
        const other = row.bidderId === userId ? row.project.authorId : row.bidderId;
        if (other) ids.add(other);
      }
      const map = new Map<string, AuthorProfileSummary>();
      for (const id of ids) {
        const summary = await authorProfileSummary(id);
        if (summary) map.set(id, summary);
      }
      return map;
    })(),
  ]);

  const unreadByApplication = new Map(
    unreadApplications.map((row) => [row.applicationId, row._count._all]),
  );
  const unreadByBid = new Map(unreadBids.map((row) => [row.bidId, row._count._all]));

  const conversations: ConversationSummary[] = [];

  for (const row of applications) {
    if (row.messages.length === 0) continue;
    const otherId = row.applicantId === userId ? row.job.authorId : row.applicantId;
    const profile = counterpartProfiles.get(otherId) ?? null;
    const last = row.messages[0];
    conversations.push({
      threadId: row.id,
      kind: 'application',
      listingTitle: row.job.title,
      listingCode: row.job.code,
      path: `/jobs/${row.job.code}`,
      counterpart: profile,
      /// null when the other side has no public profile — the client falls
      /// back to a neutral label.
      counterpartName: profile ? `@${profile.username}` : null,
      lastMessage: {
        body: last.body,
        createdAt: last.createdAt,
        mine: last.senderId === userId,
      },
      unreadCount: unreadByApplication.get(row.id) ?? 0,
    });
  }

  for (const row of bids) {
    if (row.messages.length === 0) continue;
    const otherId = row.bidderId === userId ? row.project.authorId : row.bidderId;
    const profile = otherId ? (counterpartProfiles.get(otherId) ?? null) : null;
    const last = row.messages[0];
    conversations.push({
      threadId: row.id,
      kind: 'bid',
      listingTitle: row.project.title,
      listingCode: row.project.code,
      path: `/projects/${row.project.code}`,
      counterpart: profile,
      /// null covers both "no username" and the company's own offer, which
      /// has no account on the other side at all.
      counterpartName: profile ? `@${profile.username}` : null,
      lastMessage: {
        body: last.body,
        createdAt: last.createdAt,
        mine: last.senderId === userId,
      },
      unreadCount: unreadByBid.get(row.id) ?? 0,
    });
  }

  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt.getTime() ?? 0;
    const bTime = b.lastMessage?.createdAt.getTime() ?? 0;
    return bTime - aTime;
  });

  return conversations;
}
