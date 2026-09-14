import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * In-app notifications.
 *
 * Every event a user would otherwise have to keep checking a queue for —
 * a review decision, an award, a milestone, a message — becomes a row here,
 * rendered by the bell in the dashboard. `type` is a string the service layer
 * owns (see the emit points), so adding a kind never means a migration.
 *
 * Delivery is best-effort by design, the same philosophy as notify.service:
 * a notification is a convenience, the underlying row is the record, so a
 * failed write must never fail the business action that caused it. Callers
 * therefore use notifySafely and never await the result for correctness.
 */

export interface NotifyInput {
  type: string;
  title: string;
  body: string;
  /** A client-side route, e.g. /dashboard/projects. Never an external URL. */
  link?: string;
}

export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

/** Fire-and-forget: logs, never throws, callers do not await for correctness. */
export function notifySafely(userId: string, input: NotifyInput): void {
  notifyUser(userId, input).catch((error) => {
    logger.error(
      { err: error, userId, type: input.type },
      'Failed to write in-app notification',
    );
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  query: { page: number; pageSize: number },
) {
  const where = { userId };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  return { items, total, unreadCount, page: query.page, pageSize: query.pageSize };
}

export function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, notificationId: string) {
  // scoped to the owner: a notification id is not proof of ownership
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) throw new AppError('این اعلان پیدا نشد.', 404);
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Everyone holding one of the roles, for staff-targeted events (disputes, queues). */
export async function notifyRole(
  roles: Array<'SUPER_ADMIN' | 'ADMIN'>,
  input: NotifyInput,
  filter?: { permission?: string },
): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: roles },
      ...(filter?.permission ? { permissions: { has: filter.permission } } : {}),
    },
    select: { id: true },
  });
  await Promise.all(users.map((user) => notifyUser(user.id, input)));
}
