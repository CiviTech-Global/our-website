import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Marketplace operations outside the review flow, and the audit trail they
 * write. Featuring, deadline extensions and pauses are judgement calls a
 * super admin may delegate to an ops desk — each one lands in the audit log
 * with its actor, because "who promoted this listing?" is a question that
 * arrives long after the fact.
 */

// ---------------------------------------------------------------------------
// The audit trail
// ---------------------------------------------------------------------------

export interface AuditInput {
  action: string;
  targetType: 'job' | 'project' | 'user' | 'award';
  targetId: string;
  meta?: Prisma.InputJsonValue;
}

export async function audit(actorId: string, input: AuditInput): Promise<void> {
  await prisma.marketplaceAuditEntry.create({
    data: {
      actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      meta: input.meta,
    },
  });
}

export async function listAudit(query: {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
}) {
  const where = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.marketplaceAuditEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.marketplaceAuditEntry.count({ where }),
  ]);

  // actorId is a plain column, not a relation (see the schema note), so the
  // actor names come in one bulk read.
  const actors = await prisma.user.findMany({
    where: { id: { in: [...new Set(items.map((entry) => entry.actorId))] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  return {
    items: items.map((entry) => ({ ...entry, actor: actorById.get(entry.actorId) ?? null })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

// ---------------------------------------------------------------------------
// Featuring
// ---------------------------------------------------------------------------

/**
 * Staff-curated prominence — never paid, there is no monetization here. The
 * landing page and the boards both sort featured first, so this is a real
 * editorial act and it is audited like one.
 */
export async function setJobFeatured(staffId: string, jobId: string, featured: boolean) {
  const job = await prisma.jobPost.findUnique({ where: { id: jobId }, select: { id: true, title: true } });
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);

  await prisma.jobPost.update({
    where: { id: jobId },
    data: { featured, featuredAt: featured ? new Date() : null },
  });
  await audit(staffId, {
    action: featured ? 'job.featured' : 'job.unfeatured',
    targetType: 'job',
    targetId: jobId,
    meta: { title: job.title },
  });

  return { id: jobId, featured };
}

export async function setProjectFeatured(staffId: string, projectId: string, featured: boolean) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  await prisma.freelanceProject.update({
    where: { id: projectId },
    data: { featured, featuredAt: featured ? new Date() : null },
  });
  await audit(staffId, {
    action: featured ? 'project.featured' : 'project.unfeatured',
    targetType: 'project',
    targetId: projectId,
    meta: { title: project.title },
  });

  return { id: projectId, featured };
}

// ---------------------------------------------------------------------------
// Deadlines
// ---------------------------------------------------------------------------

/** Extending a closing date keeps a live listing alive; it cannot be backdated. */
export async function extendJobDeadline(staffId: string, jobId: string, closesAt: Date) {
  const job = await prisma.jobPost.findUnique({ where: { id: jobId }, select: { id: true, title: true } });
  if (!job) throw new AppError('این آگهی پیدا نشد.', 404);
  if (closesAt.getTime() <= Date.now()) {
    throw new AppError('مهلت جدید باید در آینده باشد.', 400);
  }

  await prisma.jobPost.update({ where: { id: jobId }, data: { closesAt } });
  await audit(staffId, {
    action: 'job.deadline_extended',
    targetType: 'job',
    targetId: jobId,
    meta: { title: job.title, closesAt: closesAt.toISOString() },
  });

  return { id: jobId, closesAt };
}

export async function extendProjectDeadline(staffId: string, projectId: string, closesAt: Date) {
  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);
  if (closesAt.getTime() <= Date.now()) {
    throw new AppError('مهلت جدید باید در آینده باشد.', 400);
  }

  await prisma.freelanceProject.update({ where: { id: projectId }, data: { closesAt } });
  await audit(staffId, {
    action: 'project.deadline_extended',
    targetType: 'project',
    targetId: projectId,
    meta: { title: project.title, closesAt: closesAt.toISOString() },
  });

  return { id: projectId, closesAt };
}

// ---------------------------------------------------------------------------
// Pausing accounts
// ---------------------------------------------------------------------------

/**
 * The circuit breaker. A paused account cannot post, apply, bid or message,
 * and their public profile disappears; existing listings stay readable.
 * Unpausing clears the reason with the flag — a stale reason reads as an
 * accusation.
 */
export async function setUserPaused(
  staffId: string,
  userId: string,
  paused: boolean,
  reason?: string,
) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) throw new AppError('این کاربر پیدا نشد.', 404);
  if (paused && !reason?.trim()) {
    throw new AppError('برای محدود کردن دسترسی، باید دلیل بنویسید.', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: paused
      ? { marketplacePaused: true, pausedAt: new Date(), pausedReason: reason!.trim() }
      : { marketplacePaused: false, pausedAt: null, pausedReason: null },
  });
  await audit(staffId, {
    action: paused ? 'user.paused' : 'user.unpaused',
    targetType: 'user',
    targetId: userId,
    meta: { email: target.email, reason: paused ? reason!.trim() : undefined },
  });

  return { id: userId, marketplacePaused: paused };
}
