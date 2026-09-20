import type { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from '../auth/permissions.js';

/**
 * What is waiting for this member of staff.
 *
 * One answer for two screens: the count chips beside each link in the admin
 * sidebar, and the "needs attention" overview an admin lands on. Both used to
 * be the analytics dashboard, which required the `analytics` permission — so
 * an admin granted only CVs opened their own home screen onto an error.
 *
 * Every figure is scoped to what the caller may open. A count for a queue
 * somebody cannot reach is not information they can act on, and it tells them
 * how busy a desk they have no access to is.
 */

export interface Principal {
  userId: string;
  role: Role;
}

export interface QueueCount {
  /** Waiting on us. */
  open: number;
  total: number;
}

export type ActivityKind = 'project' | 'resume' | 'programme' | 'insurance' | 'message';

export interface ActivityItem {
  kind: ActivityKind;
  id: string;
  title: string;
  status: string;
  createdAt: Date;
}

export interface Workload {
  permissions: Permission[];
  queues: Partial<Record<QueueKey, QueueCount>>;
  users?: { total: number; staff: number };
  showcase?: { customers: number; partners: number; projects: number; hidden: number };
  /** Newest submissions across the intakes the caller can see. */
  recent: ActivityItem[];
  /** Submissions per day, oldest first, across the same intakes. */
  trend: Array<{ day: string; count: number }>;
}

export type QueueKey =
  | 'projects'
  | 'resumes'
  | 'programme'
  | 'insurance'
  | 'messages'
  | 'verification'
  | 'jobPosts'
  | 'applications'
  | 'freelanceProjects'
  | 'bids'
  | 'books'
  | 'consultations'
  | 'disputes';

export const TREND_DAYS = 14;

/** The union of a person's own grants and their role bundle's; everything for a super admin. */
export async function effectivePermissions(principal: Principal): Promise<Permission[]> {
  if (principal.role === 'SUPER_ADMIN') return [...ALL_PERMISSIONS];

  const user = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { permissions: true, adminRole: { select: { permissions: true } } },
  });
  const granted = new Set([...(user?.permissions ?? []), ...(user?.adminRole?.permissions ?? [])]);
  return ALL_PERMISSIONS.filter((permission) => granted.has(permission));
}

const OPEN_PROJECT = ['SUBMITTED', 'IN_REVIEW', 'NEEDS_CLARIFICATION'] as const;
const OPEN_RESUME = ['RECEIVED', 'IN_REVIEW'] as const;

/** A UTC calendar day, as the trend keys it. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fills the days nothing arrived, so a quiet Tuesday is a zero in the chart
 * rather than a gap the eye reads as the line continuing.
 */
export function buildTrend(dates: Date[], now: Date, days = TREND_DAYS) {
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(dayKey(date), (counts.get(dayKey(date)) ?? 0) + 1);

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() - (days - 1 - index));
    const key = dayKey(day);
    return { day: key, count: counts.get(key) ?? 0 };
  });
}

export async function getWorkload(principal: Principal, now = new Date()): Promise<Workload> {
  const permissions = await effectivePermissions(principal);
  const can = (permission: Permission) => permissions.includes(permission);

  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (TREND_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const queues: Workload['queues'] = {};
  const tasks: Array<Promise<void>> = [];
  const recent: ActivityItem[] = [];
  const arrivals: Date[] = [];

  const pair = async (open: Promise<number>, total: Promise<number>): Promise<QueueCount> => {
    const [o, t] = await Promise.all([open, total]);
    return { open: o, total: t };
  };

  if (can(PERMISSIONS.projects)) {
    tasks.push(
      (async () => {
        queues.projects = await pair(
          prisma.projectRequest.count({ where: { status: { in: [...OPEN_PROJECT] } } }),
          prisma.projectRequest.count(),
        );
        const [latest, dates] = await Promise.all([
          prisma.projectRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, title: true, status: true, createdAt: true },
          }),
          prisma.projectRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        ]);
        recent.push(...latest.map((row) => ({ kind: 'project' as const, ...row })));
        arrivals.push(...dates.map((row) => row.createdAt));
      })(),
    );
  }

  if (can(PERMISSIONS.resumes)) {
    tasks.push(
      (async () => {
        const [jobs, programme, latest, dates] = await Promise.all([
          pair(
            prisma.resumeSubmission.count({ where: { track: 'JOB', status: { in: [...OPEN_RESUME] } } }),
            prisma.resumeSubmission.count({ where: { track: 'JOB' } }),
          ),
          pair(
            prisma.resumeSubmission.count({
              where: { track: { not: 'JOB' }, status: { in: [...OPEN_RESUME] } },
            }),
            prisma.resumeSubmission.count({ where: { track: { not: 'JOB' } } }),
          ),
          prisma.resumeSubmission.findMany({
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, fullName: true, track: true, status: true, createdAt: true },
          }),
          prisma.resumeSubmission.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        ]);
        queues.resumes = jobs;
        queues.programme = programme;
        recent.push(
          ...latest.map((row) => ({
            kind: row.track === 'JOB' ? ('resume' as const) : ('programme' as const),
            id: row.id,
            title: row.fullName,
            status: row.status,
            createdAt: row.createdAt,
          })),
        );
        arrivals.push(...dates.map((row) => row.createdAt));
      })(),
    );
  }

  if (can(PERMISSIONS.insurance)) {
    tasks.push(
      (async () => {
        const [counts, latest, dates] = await Promise.all([
          pair(prisma.insuranceRequest.count({ where: { status: 'NEW' } }), prisma.insuranceRequest.count()),
          prisma.insuranceRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, fullName: true, status: true, createdAt: true },
          }),
          prisma.insuranceRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        ]);
        queues.insurance = counts;
        recent.push(
          ...latest.map((row) => ({
            kind: 'insurance' as const,
            id: row.id,
            title: row.fullName,
            status: row.status,
            createdAt: row.createdAt,
          })),
        );
        arrivals.push(...dates.map((row) => row.createdAt));
      })(),
    );
  }

  if (can(PERMISSIONS.messages)) {
    tasks.push(
      (async () => {
        const [counts, latest, dates] = await Promise.all([
          // An open ticket is one nobody has answered yet — the inbox's own
          // definition of "waiting on us".
          pair(prisma.contactMessage.count({ where: { status: 'OPEN' } }), prisma.contactMessage.count()),
          prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, subject: true, name: true, status: true, createdAt: true },
          }),
          prisma.contactMessage.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        ]);
        queues.messages = counts;
        recent.push(
          ...latest.map((row) => ({
            kind: 'message' as const,
            id: row.id,
            title: row.subject || row.name,
            status: row.status,
            createdAt: row.createdAt,
          })),
        );
        arrivals.push(...dates.map((row) => row.createdAt));
      })(),
    );
  }

  if (can(PERMISSIONS.verification)) {
    tasks.push(
      (async () => {
        queues.verification = await pair(
          prisma.userVerification.count({ where: { status: 'PENDING' } }),
          prisma.userVerification.count(),
        );
      })(),
    );
  }

  if (can(PERMISSIONS.jobs)) {
    tasks.push(
      (async () => {
        const [posts, applications] = await Promise.all([
          pair(prisma.jobPost.count({ where: { moderationStatus: 'PENDING_REVIEW' } }), prisma.jobPost.count()),
          pair(
            prisma.jobApplication.count({ where: { moderationStatus: 'PENDING_REVIEW' } }),
            prisma.jobApplication.count(),
          ),
        ]);
        queues.jobPosts = posts;
        queues.applications = applications;
      })(),
    );
  }

  if (can(PERMISSIONS.freelance)) {
    tasks.push(
      (async () => {
        const [projects, bids] = await Promise.all([
          pair(
            prisma.freelanceProject.count({ where: { moderationStatus: 'PENDING_REVIEW' } }),
            prisma.freelanceProject.count(),
          ),
          pair(prisma.projectBid.count({ where: { moderationStatus: 'PENDING_REVIEW' } }), prisma.projectBid.count()),
        ]);
        queues.freelanceProjects = projects;
        queues.bids = bids;
      })(),
    );
  }

  if (can(PERMISSIONS.books)) {
    tasks.push(
      (async () => {
        queues.books = await pair(
          prisma.bookListing.count({ where: { moderationStatus: 'PENDING_REVIEW' } }),
          prisma.bookListing.count(),
        );
      })(),
    );
  }

  if (can(PERMISSIONS.consultations)) {
    tasks.push(
      (async () => {
        queues.consultations = await pair(
          // NEW and CONTACTED both still want somebody's attention; a
          // scheduled one is waiting for a date, not for us.
          prisma.consultationRequest.count({ where: { status: { in: ['NEW', 'CONTACTED'] } } }),
          prisma.consultationRequest.count(),
        );
      })(),
    );
  }

  if (can(PERMISSIONS.marketplaceOps)) {
    tasks.push(
      (async () => {
        queues.disputes = await pair(
          prisma.marketplaceAward.count({ where: { disputeStatus: 'OPEN' } }),
          prisma.marketplaceAward.count({ where: { disputeStatus: { not: 'NONE' } } }),
        );
      })(),
    );
  }

  let users: Workload['users'];
  if (can(PERMISSIONS.users)) {
    tasks.push(
      (async () => {
        const [total, staff] = await Promise.all([
          prisma.user.count({ where: { deletedAt: null } }),
          prisma.user.count({ where: { deletedAt: null, role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
        ]);
        users = { total, staff };
      })(),
    );
  }

  let showcase: Workload['showcase'];
  if (can(PERMISSIONS.showcase)) {
    tasks.push(
      (async () => {
        const [customers, partners, projects, hiddenOrgs, hiddenProjects] = await Promise.all([
          prisma.showcaseOrganization.count({ where: { kind: 'CUSTOMER' } }),
          prisma.showcaseOrganization.count({ where: { kind: 'PARTNER' } }),
          prisma.showcaseProject.count(),
          prisma.showcaseOrganization.count({ where: { published: false } }),
          prisma.showcaseProject.count({ where: { published: false } }),
        ]);
        showcase = { customers, partners, projects, hidden: hiddenOrgs + hiddenProjects };
      })(),
    );
  }

  await Promise.all(tasks);

  return {
    permissions,
    queues,
    ...(users ? { users } : {}),
    ...(showcase ? { showcase } : {}),
    recent: recent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8),
    trend: buildTrend(arrivals, now),
  };
}
