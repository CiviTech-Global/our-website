import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { notifySafely } from './notifications.service.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { authorProfileSummary, authorProfileSummaries } from './profile.service.js';
import { skillMatch } from './job-seeker.service.js';
import { workCategoryScope } from './work-taxonomy.service.js';
import {
  PROJECT_CARD_SELECT,
  clientStats,
  freelancerStats,
  presentProjectCards,
  projectActivity,
  type FreelancerLevel,
} from './project-cards.service.js';

/**
 * The freelance board's second generation, for signed-in members.
 *
 * Everything here needs to know who is asking: a members-only or invite-only
 * brief, an NDA that opens the brief once signed, the reader's own bid and
 * invitation, saved projects and alerts, the client's pipeline (shortlist,
 * interview, decline, notes, invitations), recommendations, the price guide a
 * bidder sees before sending, and the talent directory clients invite from.
 *
 * NOT REACHABLE WHILE FEATURE_PROJECTS_V2 IS OFF — the router that calls it is
 * gated once, as the jobs v2 router is.
 */

// ---------------------------------------------------------------------------
// Reading one project as a particular person
// ---------------------------------------------------------------------------

/**
 * One project, as this reader may see it.
 *
 * PUBLIC: anyone. SIGNED_IN: any member. INVITE_ONLY: the author and the
 * freelancers they invited. An NDA keeps the brief and the files closed to
 * everyone but the author until the reader has signed — and says so, rather
 * than pretending the brief is short.
 */
export async function viewProject(userId: string, code: string) {
  const project = await prisma.freelanceProject.findFirst({
    where: { code: code.trim().toUpperCase(), moderationStatus: 'APPROVED' },
    select: {
      ...PROJECT_CARD_SELECT,
      openToCompanyOffer: true,
      viewCount: true,
      screeningQuestions: true,
      attachments: { select: { id: true, originalName: true, sizeBytes: true } },
    },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  const isAuthor = project.authorId === userId;
  const [invite, signature, saved, myBid, me] = await Promise.all([
    prisma.projectInvite.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: userId } },
      select: { id: true, status: true, message: true, createdAt: true },
    }),
    prisma.projectNdaSignature.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      select: { signedAt: true, signedName: true },
    }),
    prisma.savedProject.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
      select: { id: true },
    }),
    prisma.projectBid.findUnique({
      where: { projectId_bidderId: { projectId: project.id, bidderId: userId } },
      select: {
        id: true,
        amount: true,
        currency: true,
        deliveryDays: true,
        message: true,
        milestones: true,
        screeningAnswers: true,
        moderationStatus: true,
        outcome: true,
        clientSeenAt: true,
        reviewNote: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { skills: true } }),
  ]);

  if (project.visibility === 'INVITE_ONLY' && !isAuthor && !invite && !myBid) {
    throw new AppError('این پروژه فقط برای دعوت‌شدگان است.', 404);
  }
  // A closed project stays readable to the people who took part in it.
  if (project.state !== 'OPEN' && !isAuthor && !myBid) {
    throw new AppError('این پروژه دیگر باز نیست.', 404);
  }

  const briefOpen = !project.nda || isAuthor || Boolean(signature);
  const [authorProfile, clients, activity] = await Promise.all([
    authorProfileSummary(project.authorId),
    clientStats([project.authorId]),
    projectActivity([project]),
  ]);

  const { authorId, clientViewedAt: _viewed, ...rest } = project;
  return {
    ...rest,
    description: briefOpen ? project.description : '',
    attachments: briefOpen ? project.attachments : [],
    attachmentCount: project.attachments.length,
    authorProfile,
    client: clients.get(authorId) ?? null,
    activity: activity.get(project.id) ?? null,
    viewer: {
      isAuthor,
      briefOpen,
      ndaSigned: signature ? { signedAt: signature.signedAt, signedName: signature.signedName } : null,
      saved: Boolean(saved),
      invite,
      myBid,
      match: skillMatch(project.skills, me?.skills ?? []),
      canBid:
        !isAuthor &&
        !myBid &&
        project.state === 'OPEN' &&
        (!project.closesAt || project.closesAt > new Date()) &&
        (project.visibility !== 'INVITE_ONLY' || Boolean(invite)),
    },
  };
}

/** Accepting a project's NDA. The typed name is the signature. */
export async function signNda(userId: string, projectId: string, signedName: string) {
  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, ...PUBLIC_LISTING_WHERE },
    select: { id: true, nda: true, authorId: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);
  if (!project.nda) throw new AppError('این پروژه توافق‌نامهٔ عدم افشا ندارد.', 400);
  if (project.authorId === userId) throw new AppError('نیازی به امضای پروژهٔ خودتان نیست.', 400);

  await assertVerified(userId);
  return prisma.projectNdaSignature.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, signedName },
    update: {},
    select: { signedAt: true, signedName: true },
  });
}

/** Who has signed a project's NDA — for its author. */
export async function listNdaSignatures(userId: string, projectId: string) {
  await requireOwnProject(userId, projectId);
  return prisma.projectNdaSignature.findMany({
    where: { projectId },
    orderBy: { signedAt: 'desc' },
    select: { signedName: true, signedAt: true, user: { select: { firstName: true, lastName: true, username: true } } },
  });
}

async function requireOwnProject(userId: string, projectId: string) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, authorId: true, title: true, code: true, state: true, moderationStatus: true, visibility: true },
  });
  if (!project || project.authorId !== userId) throw new AppError('این پروژه پیدا نشد.', 404);
  return project;
}

// ---------------------------------------------------------------------------
// Saved projects
// ---------------------------------------------------------------------------

export async function saveProject(userId: string, projectId: string) {
  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, moderationStatus: 'APPROVED' },
    select: { id: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);
  await prisma.savedProject.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId },
    update: {},
  });
  return { projectId, saved: true };
}

export async function unsaveProject(userId: string, projectId: string) {
  await prisma.savedProject.deleteMany({ where: { userId, projectId } });
  return { projectId, saved: false };
}

export async function listSavedProjectIds(userId: string): Promise<string[]> {
  const rows = await prisma.savedProject.findMany({ where: { userId }, select: { projectId: true } });
  return rows.map((row) => row.projectId);
}

/** Saved projects as cards, newest saved first; closed ones stay, marked by their state. */
export async function listSavedProjects(userId: string) {
  const rows = await prisma.savedProject.findMany({
    where: { userId, project: { moderationStatus: 'APPROVED' } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, project: { select: PROJECT_CARD_SELECT } },
  });
  const cards = await presentProjectCards(rows.map((row) => row.project));
  return cards.map((card, index) => ({ ...card, savedAt: rows[index].createdAt }));
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface ProjectAlertQuery {
  search?: string;
  workCategoryId?: string;
  pricingType?: string;
  experienceLevel?: string;
  budgetMin?: string;
  country?: string;
  language?: string;
  skills?: string[];
}

const MAX_ALERTS = 20;

export async function listProjectAlerts(userId: string) {
  return prisma.projectAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createProjectAlert(userId: string, input: { name: string; query: ProjectAlertQuery }) {
  const count = await prisma.projectAlert.count({ where: { userId } });
  if (count >= MAX_ALERTS) throw new AppError(`حداکثر ${MAX_ALERTS} هشدار پروژه می‌توانید داشته باشید.`, 409);
  if (Object.values(input.query).every((value) => !value || (Array.isArray(value) && value.length === 0))) {
    throw new AppError('برای هشدار دست‌کم یک فیلتر یا کلیدواژه انتخاب کنید.', 400);
  }
  return prisma.projectAlert.create({
    data: { userId, name: input.name, query: input.query as Prisma.InputJsonValue },
  });
}

export async function updateProjectAlert(userId: string, id: string, input: { name?: string; active?: boolean }) {
  const alert = await prisma.projectAlert.findUnique({ where: { id }, select: { userId: true } });
  if (!alert || alert.userId !== userId) throw new AppError('این هشدار پیدا نشد.', 404);
  return prisma.projectAlert.update({ where: { id }, data: input });
}

export async function deleteProjectAlert(userId: string, id: string) {
  const { count } = await prisma.projectAlert.deleteMany({ where: { id, userId } });
  if (count === 0) throw new AppError('این هشدار پیدا نشد.', 404);
  return { id };
}

interface MatchableProject {
  title: string;
  description: string;
  skills: string[];
  workCategoryId: string | null;
  categoryParentId: string | null;
  pricingType: string;
  experienceLevel: string | null;
  budgetMin: bigint | null;
  budgetMax: bigint | null;
  budgetUnknown: boolean;
  currency: string;
  preferredCountries: string[];
  languages: string[];
}

/** Whether a project answers a saved search. Mirrors the board's filters, as job alerts do. */
export function projectAlertMatches(query: ProjectAlertQuery, project: MatchableProject): boolean {
  if (query.search) {
    const needle = query.search.trim().toLowerCase();
    if (needle && !`${project.title}\n${project.description}\n${project.skills.join(' ')}`.toLowerCase().includes(needle)) {
      return false;
    }
  }
  if (
    query.workCategoryId &&
    project.workCategoryId !== query.workCategoryId &&
    project.categoryParentId !== query.workCategoryId
  ) {
    return false;
  }
  if (query.pricingType && project.pricingType !== query.pricingType) return false;
  if (query.experienceLevel && project.experienceLevel !== query.experienceLevel) return false;
  if (query.country && project.preferredCountries.length > 0 && !project.preferredCountries.includes(query.country)) {
    return false;
  }
  if (query.language && !project.languages.includes(query.language)) return false;
  if (query.skills?.length) {
    const wanted = new Set(query.skills.map((skill) => skill.trim().toLowerCase()));
    if (!project.skills.some((skill) => wanted.has(skill.trim().toLowerCase()))) return false;
  }
  if (query.budgetMin) {
    if (project.currency !== 'IRT' || project.budgetUnknown) return false;
    const top = project.budgetMax ?? project.budgetMin;
    if (top === null || top < BigInt(query.budgetMin)) return false;
  }
  return true;
}

const ALERT_SCAN_LIMIT = 5000;

/**
 * Tell everyone whose saved search a newly published project answers, once
 * per person. Invite-only projects notify nobody: their author chose who
 * hears about them. Never throws.
 */
export async function notifyMatchingProjectAlerts(projectId: string): Promise<number> {
  try {
    const project = await prisma.freelanceProject.findUnique({
      where: { id: projectId },
      select: {
        code: true,
        authorId: true,
        title: true,
        description: true,
        skills: true,
        visibility: true,
        workCategoryId: true,
        workCategory: { select: { parentId: true } },
        pricingType: true,
        experienceLevel: true,
        budgetMin: true,
        budgetMax: true,
        budgetUnknown: true,
        currency: true,
        preferredCountries: true,
        languages: true,
      },
    });
    if (!project || project.visibility === 'INVITE_ONLY') return 0;

    const alerts = await prisma.projectAlert.findMany({
      where: { active: true, userId: { not: project.authorId }, user: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      take: ALERT_SCAN_LIMIT,
      select: { id: true, userId: true, name: true, query: true },
    });

    const matchable: MatchableProject = { ...project, categoryParentId: project.workCategory?.parentId ?? null };
    const byUser = new Map<string, { alertIds: string[]; name: string }>();
    for (const alert of alerts) {
      if (!projectAlertMatches(alert.query as ProjectAlertQuery, matchable)) continue;
      const entry = byUser.get(alert.userId);
      if (entry) entry.alertIds.push(alert.id);
      else byUser.set(alert.userId, { alertIds: [alert.id], name: alert.name });
    }

    for (const [userId, entry] of byUser) {
      notifySafely(userId, {
        type: 'project.alert',
        title: `پروژهٔ تازه برای «${entry.name}»`,
        body: project.title,
        link: `/projects/${project.code}`,
      });
    }
    const matchedIds = [...byUser.values()].flatMap((entry) => entry.alertIds);
    if (matchedIds.length > 0) {
      await prisma.projectAlert.updateMany({ where: { id: { in: matchedIds } }, data: { lastNotifiedAt: new Date() } });
    }
    return byUser.size;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

const MAX_INVITES_PER_PROJECT = 30;

/** The client asks a freelancer, by their public handle, to bid. */
export async function inviteFreelancer(
  clientId: string,
  projectId: string,
  input: { username: string; message?: string },
) {
  const project = await requireOwnProject(clientId, projectId);
  if (project.moderationStatus !== 'APPROVED' || project.state !== 'OPEN') {
    throw new AppError('فقط به پروژهٔ منتشرشده و باز می‌توان دعوت کرد.', 409);
  }
  await assertMarketplaceAllowed(clientId);

  const freelancer = await prisma.user.findFirst({
    where: { username: input.username.trim(), deletedAt: null, marketplacePaused: false },
    select: { id: true },
  });
  if (!freelancer) throw new AppError('این فریلنسر پیدا نشد.', 404);
  if (freelancer.id === clientId) throw new AppError('نمی‌توانید خودتان را دعوت کنید.', 400);

  const [count, existingBid] = await Promise.all([
    prisma.projectInvite.count({ where: { projectId } }),
    prisma.projectBid.findUnique({
      where: { projectId_bidderId: { projectId, bidderId: freelancer.id } },
      select: { id: true },
    }),
  ]);
  if (existingBid) throw new AppError('این فریلنسر پیش‌تر پیشنهاد داده است.', 409);
  if (count >= MAX_INVITES_PER_PROJECT) {
    throw new AppError(`حداکثر ${MAX_INVITES_PER_PROJECT} دعوت برای هر پروژه.`, 409);
  }

  const invite = await prisma.projectInvite.upsert({
    where: { projectId_freelancerId: { projectId, freelancerId: freelancer.id } },
    create: { projectId, freelancerId: freelancer.id, message: input.message || null },
    update: {},
    select: { id: true, status: true, createdAt: true },
  });

  notifySafely(freelancer.id, {
    type: 'project.invite',
    title: 'دعوت به ارسال پیشنهاد',
    body: `از شما دعوت شده برای «${project.title}» پیشنهاد بدهید.`,
    link: `/projects/${project.code}`,
  });
  return invite;
}

/** The invitations a client sent for one project, with each freelancer's card. */
export async function listInvitesForProject(clientId: string, projectId: string) {
  await requireOwnProject(clientId, projectId);
  const invites = await prisma.projectInvite.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, message: true, createdAt: true, respondedAt: true, freelancerId: true },
  });
  const ids = invites.map((invite) => invite.freelancerId);
  const [profiles, stats] = await Promise.all([authorProfileSummaries(ids), freelancerStats(ids)]);
  return invites.map(({ freelancerId, ...invite }) => ({
    ...invite,
    profile: profiles.get(freelancerId) ?? null,
    stats: stats.get(freelancerId) ?? null,
  }));
}

/** A freelancer's invitations, newest first, with the project as a card. */
export async function listMyInvites(userId: string) {
  const invites = await prisma.projectInvite.findMany({
    where: { freelancerId: userId, project: { moderationStatus: 'APPROVED' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
      respondedAt: true,
      project: { select: PROJECT_CARD_SELECT },
    },
  });
  const cards = await presentProjectCards(invites.map((invite) => invite.project));
  return invites.map(({ project: _project, ...invite }, index) => ({ ...invite, project: cards[index] }));
}

export async function declineInvite(userId: string, inviteId: string) {
  const invite = await prisma.projectInvite.findUnique({
    where: { id: inviteId },
    select: { freelancerId: true, status: true, project: { select: { authorId: true, title: true } } },
  });
  if (!invite || invite.freelancerId !== userId) throw new AppError('این دعوت پیدا نشد.', 404);
  if (invite.status !== 'PENDING') throw new AppError('به این دعوت پیش‌تر پاسخ داده‌اید.', 409);
  const updated = await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status: 'DECLINED', respondedAt: new Date() },
    select: { id: true, status: true },
  });
  notifySafely(invite.project.authorId, {
    type: 'project.invite.declined',
    title: 'دعوت شما رد شد',
    body: `یکی از فریلنسرهای دعوت‌شده برای «${invite.project.title}» پیشنهاد نمی‌دهد.`,
    link: '/dashboard/projects',
  });
  return updated;
}

// ---------------------------------------------------------------------------
// The client's pipeline
// ---------------------------------------------------------------------------

const STAGE_NOTICE: Record<string, { title: string; body: (title: string) => string }> = {
  SHORTLISTED: { title: 'در فهرست کوتاه کارفرما هستید', body: (title) => `پیشنهاد شما برای «${title}» در فهرست کوتاه قرار گرفت.` },
  INTERVIEW: { title: 'دعوت به گفت‌وگو', body: (title) => `کارفرمای «${title}» می‌خواهد با شما گفت‌وگو کند.` },
  DECLINED: { title: 'نتیجهٔ پیشنهاد شما', body: (title) => `کارفرمای «${title}» پیشنهاد دیگری را انتخاب کرد.` },
};

/**
 * Moving a bid along: shortlist, interview, decline — or back to "new".
 * Accepting is acceptBid, which opens the contract.
 */
export async function setBidStage(
  clientId: string,
  bidId: string,
  outcome: 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'DECLINED',
) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      bidderId: true,
      outcome: true,
      moderationStatus: true,
      project: { select: { authorId: true, title: true, state: true } },
    },
  });
  if (!bid || bid.project.authorId !== clientId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
  if (bid.moderationStatus !== 'APPROVED') throw new AppError('این پیشنهاد هنوز به شما نرسیده است.', 409);
  if (bid.outcome === 'ACCEPTED' || bid.outcome === 'WITHDRAWN') {
    throw new AppError('وضعیت این پیشنهاد دیگر قابل تغییر نیست.', 409);
  }
  if (bid.outcome === outcome) return { id: bid.id, outcome };

  const updated = await prisma.projectBid.update({
    where: { id: bidId },
    data: { outcome, outcomeChangedAt: new Date(), clientSeenAt: new Date() },
    select: { id: true, outcome: true, outcomeChangedAt: true },
  });

  const notice = STAGE_NOTICE[outcome];
  if (notice && bid.bidderId) {
    notifySafely(bid.bidderId, {
      type: 'bid.stage',
      title: notice.title,
      body: notice.body(bid.project.title),
      link: '/dashboard/bids',
    });
  }
  return updated;
}

/** The client's private note on a bid. */
export async function setBidNote(clientId: string, bidId: string, note: string | null) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: { project: { select: { authorId: true } } },
  });
  if (!bid || bid.project.authorId !== clientId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
  return prisma.projectBid.update({
    where: { id: bidId },
    data: { clientNote: note?.trim() || null },
    select: { id: true, clientNote: true },
  });
}

/** A bidder takes their offer back, while it is still undecided. */
export async function withdrawBid(userId: string, bidId: string) {
  const bid = await prisma.projectBid.findUnique({
    where: { id: bidId },
    select: { bidderId: true, outcome: true, project: { select: { authorId: true, title: true } } },
  });
  if (!bid || bid.bidderId !== userId) throw new AppError('این پیشنهاد پیدا نشد.', 404);
  if (!['PENDING', 'SHORTLISTED', 'INTERVIEW'].includes(bid.outcome)) {
    throw new AppError('این پیشنهاد دیگر قابل پس گرفتن نیست.', 409);
  }
  return prisma.projectBid.update({
    where: { id: bidId },
    data: { outcome: 'WITHDRAWN', outcomeChangedAt: new Date() },
    select: { id: true, outcome: true },
  });
}

/**
 * The bidder's own proposals, as their dashboard shows them: the project as
 * a card, where the bid stands, and whether the client has opened it.
 */
export async function listMyProposals(userId: string) {
  const bids = await prisma.projectBid.findMany({
    where: { bidderId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      deliveryDays: true,
      message: true,
      milestones: true,
      screeningAnswers: true,
      moderationStatus: true,
      reviewNote: true,
      suggestedAmount: true,
      outcome: true,
      clientSeenAt: true,
      outcomeChangedAt: true,
      invited: true,
      createdAt: true,
      project: { select: { ...PROJECT_CARD_SELECT, screeningQuestions: true } },
    },
  });
  const cards = await presentProjectCards(bids.map((bid) => bid.project));
  const awards = await prisma.marketplaceAward.findMany({
    where: { projectBidId: { in: bids.map((bid) => bid.id) } },
    select: { id: true, projectBidId: true, status: true },
  });
  const awardByBid = new Map(awards.map((award) => [award.projectBidId, award]));
  return bids.map(({ project, ...bid }, index) => ({
    ...bid,
    project: { ...cards[index], screeningQuestions: project.screeningQuestions },
    award: awardByBid.get(bid.id) ?? null,
  }));
}

/** The client's counts across all their projects, for the dashboard's gauges. */
export async function clientPipeline(userId: string) {
  const [projects, stages, unseen, invites] = await Promise.all([
    prisma.freelanceProject.groupBy({ by: ['state'], where: { authorId: userId, moderationStatus: 'APPROVED' }, _count: { _all: true } }),
    prisma.projectBid.groupBy({
      by: ['outcome'],
      where: { project: { authorId: userId }, moderationStatus: 'APPROVED' },
      _count: { _all: true },
    }),
    prisma.projectBid.count({
      where: { project: { authorId: userId }, moderationStatus: 'APPROVED', clientSeenAt: null, outcome: { not: 'WITHDRAWN' } },
    }),
    prisma.projectInvite.groupBy({ by: ['status'], where: { project: { authorId: userId } }, _count: { _all: true } }),
  ]);
  const of = <T extends { _count: { _all: number } }>(rows: T[], pick: (row: T) => string) =>
    Object.fromEntries(rows.map((row) => [pick(row), row._count._all]));
  return {
    projects: of(projects, (row) => row.state),
    bids: of(stages, (row) => row.outcome),
    unseenBids: unseen,
    invites: of(invites, (row) => row.status),
  };
}

// ---------------------------------------------------------------------------
// Recommendations and the price guide
// ---------------------------------------------------------------------------

const RECOMMEND_POOL = 400;

/**
 * Projects that fit this freelancer, best first: their profile skills (two
 * points each) and the categories they bid in or saved (one point). Projects
 * they already bid on, and their own, are left out.
 */
export async function recommendedProjects(userId: string, limit = 12) {
  const [user, bids, saved, invites] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { skills: true } }),
    prisma.projectBid.findMany({ where: { bidderId: userId }, select: { projectId: true, project: { select: { workCategoryId: true } } } }),
    prisma.savedProject.findMany({ where: { userId }, select: { project: { select: { workCategoryId: true } } } }),
    prisma.projectInvite.findMany({ where: { freelancerId: userId }, select: { projectId: true } }),
  ]);
  const mySkills = user?.skills ?? [];
  const bidOn = new Set(bids.map((row) => row.projectId));
  const invitedTo = new Set(invites.map((row) => row.projectId));
  const categories = new Set(
    [...bids.map((row) => row.project.workCategoryId), ...saved.map((row) => row.project.workCategoryId)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  if (mySkills.length === 0 && categories.size === 0) return { items: [], basis: 'none' as const };

  const pool = await prisma.freelanceProject.findMany({
    where: {
      ...PUBLIC_LISTING_WHERE,
      visibility: { in: ['PUBLIC', 'SIGNED_IN'] },
      authorId: { not: userId },
      OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
    },
    orderBy: { publishedAt: 'desc' },
    take: RECOMMEND_POOL,
    select: PROJECT_CARD_SELECT,
  });

  const scored = pool
    .filter((project) => !bidOn.has(project.id))
    .map((project) => {
      const match = skillMatch(project.skills, mySkills);
      const score =
        match.matched.length * 2 +
        (project.workCategoryId && categories.has(project.workCategoryId) ? 1 : 0) +
        (invitedTo.has(project.id) ? 3 : 0);
      return { project, match, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.project.publishedAt?.getTime() ?? 0) - (a.project.publishedAt?.getTime() ?? 0))
    .slice(0, limit);

  const cards = await presentProjectCards(scored.map((entry) => entry.project));
  return {
    basis: mySkills.length > 0 ? ('skills' as const) : ('activity' as const),
    items: cards.map((card, index) => ({
      ...card,
      match: { matched: scored[index].match.matched.length, total: scored[index].match.total },
    })),
  };
}

/** A median needs a sample; below this the guide says only what the client asked for. */
const MIN_GUIDE_SAMPLE = 5;

function median(values: bigint[]): bigint | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2n;
}

/**
 * What a bidder sees before sending: the client's own budget, and what work
 * of this kind has actually been agreed for here.
 *
 * The second generation's replacement for the staff fairness check — the
 * same judgement ("this looks low for the scope"), given at the moment it can
 * still change the number. Built from agreed contracts only, never from open
 * bids, and only from a sample large enough that no single contract shows
 * through.
 */
export async function priceGuide(projectId: string) {
  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, moderationStatus: 'APPROVED' },
    select: {
      workCategoryId: true,
      pricingType: true,
      currency: true,
      budgetMin: true,
      budgetMax: true,
      budgetUnknown: true,
    },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  let agreed: bigint[] = [];
  if (project.workCategoryId) {
    const scope = await workCategoryScope(project.workCategoryId);
    const winning = await prisma.projectBid.findMany({
      where: {
        outcome: 'ACCEPTED',
        currency: project.currency,
        project: { workCategoryId: { in: scope }, pricingType: project.pricingType },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { amount: true },
    });
    agreed = winning.map((row) => row.amount);
  }

  const enough = agreed.length >= MIN_GUIDE_SAMPLE;
  const sorted = [...agreed].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const at = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
  return {
    pricingType: project.pricingType,
    currency: project.currency,
    budget: project.budgetUnknown
      ? null
      : { min: project.budgetMin?.toString() ?? null, max: project.budgetMax?.toString() ?? null },
    market: enough
      ? {
          sample: agreed.length,
          low: at(0.25).toString(),
          median: median(agreed)!.toString(),
          high: at(0.75).toString(),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Talent
// ---------------------------------------------------------------------------

export interface TalentQuery {
  page: number;
  pageSize: number;
  search?: string;
  skills?: string[];
  workCategoryId?: string;
  country?: string;
  language?: string;
  availability?: string;
  level?: FreelancerLevel;
  minRating?: number;
  verified?: boolean;
  sort?: 'relevance' | 'rating' | 'newest';
}

/**
 * The talent directory: people with a public profile who offer something —
 * skills on their profile or a live service — for clients to browse and invite.
 *
 * Contact details are never part of it; the card is the public profile and
 * the earned track record.
 */
export async function listTalent(query: TalentQuery) {
  const and: Prisma.UserWhereInput[] = [
    { deletedAt: null, marketplacePaused: false, username: { not: null } },
    { OR: [{ skills: { isEmpty: false } }, { services: { some: { moderationStatus: 'APPROVED', state: 'ACTIVE' } } }] },
  ];
  if (query.search) {
    const needle = query.search.trim();
    and.push({
      OR: [
        { headline: { contains: needle, mode: 'insensitive' } },
        { bio: { contains: needle, mode: 'insensitive' } },
        { username: { contains: needle, mode: 'insensitive' } },
        { skills: { has: needle } },
      ],
    });
  }
  if (query.skills?.length) and.push({ skills: { hasSome: query.skills } });
  if (query.country) and.push({ country: query.country });
  if (query.language) and.push({ languages: { has: query.language } });
  if (query.availability) and.push({ availability: query.availability });
  if (query.verified) and.push({ verification: { status: 'APPROVED' } });
  if (query.workCategoryId) {
    const scope = await workCategoryScope(query.workCategoryId);
    and.push({
      OR: [
        { services: { some: { workCategoryId: { in: scope }, moderationStatus: 'APPROVED', state: 'ACTIVE' } } },
        { bids: { some: { outcome: 'ACCEPTED', project: { workCategoryId: { in: scope } } } } },
      ],
    });
  }

  const where: Prisma.UserWhereInput = { AND: and };
  // Rating and level are computed, not stored, so those filters and that
  // sort run over a bounded candidate set rather than in SQL.
  const computed = query.level !== undefined || query.minRating !== undefined || query.sort === 'rating';
  const CANDIDATES = 500;

  const candidates = await prisma.user.findMany({
    where,
    orderBy: query.sort === 'newest' ? { createdAt: 'desc' } : { lastActiveAt: { sort: 'desc', nulls: 'last' } },
    skip: computed ? 0 : (query.page - 1) * query.pageSize,
    take: computed ? CANDIDATES : query.pageSize,
    select: { id: true, username: true, headline: true, firstName: true, lastName: true },
  });
  const total = computed ? null : await prisma.user.count({ where });

  const ids = candidates.map((row) => row.id);
  const [stats, services] = await Promise.all([
    freelancerStats(ids),
    prisma.service.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: ids }, moderationStatus: 'APPROVED', state: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);
  const serviceCount = new Map(services.map((row) => [row.ownerId, row._count._all]));

  let rows = candidates.map((row) => ({
    username: row.username!,
    // The public name is the first name and an initial, as on the bid cards.
    displayName: `${row.firstName} ${row.lastName.charAt(0)}.`,
    headline: row.headline,
    serviceCount: serviceCount.get(row.id) ?? 0,
    stats: stats.get(row.id)!,
  }));

  if (query.level) {
    const order: FreelancerLevel[] = ['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED'];
    rows = rows.filter((row) => order.indexOf(row.stats.level) >= order.indexOf(query.level!));
  }
  if (query.minRating !== undefined) rows = rows.filter((row) => row.stats.ratingAvg >= query.minRating!);
  if (query.sort === 'rating') {
    rows.sort((a, b) => b.stats.ratingAvg - a.stats.ratingAvg || b.stats.ratingCount - a.stats.ratingCount);
  }

  if (computed) {
    const start = (query.page - 1) * query.pageSize;
    return toPage(rows.slice(start, start + query.pageSize), rows.length, query.page, query.pageSize);
  }
  return toPage(rows, total!, query.page, query.pageSize);
}

// ---------------------------------------------------------------------------
// The freelancer's own profile settings, and their public card
// ---------------------------------------------------------------------------

const FREELANCER_PROFILE_SELECT = {
  languages: true,
  hourlyRate: true,
  hourlyCurrency: true,
  availability: true,
  country: true,
} as const satisfies Prisma.UserSelect;

export async function getFreelancerProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: FREELANCER_PROFILE_SELECT });
}

export async function updateFreelancerProfile(
  userId: string,
  input: {
    languages?: string[];
    hourlyRate?: bigint | null;
    hourlyCurrency?: string;
    availability?: string;
    country?: string;
  },
) {
  return prisma.user.update({ where: { id: userId }, data: input, select: FREELANCER_PROFILE_SELECT });
}

/**
 * The track-record card shown on a public profile and in the talent
 * directory: earned numbers and live services, never contact details.
 */
export async function freelancerCard(username: string) {
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null, marketplacePaused: false },
    select: { id: true },
  });
  if (!user) throw new AppError('این پروفایل پیدا نشد.', 404);
  const [stats, services] = await Promise.all([
    freelancerStats([user.id]),
    prisma.service.findMany({
      where: { ownerId: user.id, moderationStatus: 'APPROVED', state: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        code: true,
        title: true,
        packages: { where: { tier: 'BASIC' }, select: { price: true, currency: true, deliveryDays: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
      },
    }),
  ]);
  return {
    stats: stats.get(user.id) ?? null,
    services: services.map((service) => ({
      code: service.code,
      title: service.title,
      startingPrice: service.packages[0]?.price.toString() ?? null,
      currency: service.packages[0]?.currency ?? 'IRT',
      deliveryDays: service.packages[0]?.deliveryDays ?? null,
      coverImageId: service.images[0]?.id ?? null,
    })),
  };
}

/** How often "last active" is written: often enough to mean something, rarely enough to cost nothing. */
const ACTIVITY_GRANULARITY_MS = 5 * 60_000;

/** Marks the member active now, at most once per few minutes. Never throws. */
export async function touchActivity(userId: string): Promise<void> {
  try {
    const now = new Date();
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now.getTime() - ACTIVITY_GRANULARITY_MS) } }],
      },
      data: { lastActiveAt: now },
    });
  } catch {
    // Presence is a nicety; it must never fail a request.
  }
}
