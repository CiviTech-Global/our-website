import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { smsMemberSafely } from './sms/dispatch.js';
import { tokenWords } from './sms/templates.js';
import { prisma } from '../config/database.js';
import { toPage } from '../utils/page.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { pushSafely } from './push-devices.service.js';

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
  // The same notice on the member's phones, once the row exists: the row is
  // the record, the push only says there is something to read.
  pushSafely(userId, { title: input.title, body: input.body, link: input.link });
  smsForWaiting(userId, input.type);
}

/**
 * Notices where somebody is waiting for this member's answer also go by SMS —
 * only with SMS_MEMBER_ALERTS on, only to a verified phone that has not opted
 * out, and at most one such text per member per six hours, however many
 * arrive: the text says "something is waiting", the site says what.
 */
const WAITING_SMS: Record<string, string> = {
  'application.received': tokenWords('درخواست', 'همکاری'),
  'bid.received': tokenWords('پیشنهاد', 'پروژه'),
  'book.request': tokenWords('درخواست', 'خرید', 'کتاب'),
  'service.order': tokenWords('سفارش', 'خدمت'),
  'order.placed': tokenWords('سفارش', 'فروشگاه'),
};
const WAITING_SMS_GAP_SECONDS = 6 * 60 * 60;

function smsForWaiting(userId: string, type: string): void {
  const what = WAITING_SMS[type];
  if (!what || !env.SMS_MEMBER_ALERTS) return;
  redis
    .set(`sms:waiting:${userId}`, '1', 'EX', WAITING_SMS_GAP_SECONDS, 'NX')
    .then((first) => {
      if (first) smsMemberSafely(userId, 'waiting', 'alert', { token: what });
    })
    .catch((error) => logger.error({ err: error, type }, 'Waiting SMS throttle failed'));
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

  return { ...toPage(items, total, query.page, query.pageSize), unreadCount };
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

/**
 * Tells every member of staff who can work a desk that something arrived:
 * super admins, and admins holding the permission directly or through their
 * role. In-app only; staff are not texted about the queue.
 */
export function notifyStaffSafely(permission: string, input: NotifyInput): void {
  prisma.user
    .findMany({
      where: {
        deletedAt: null,
        OR: [
          { role: 'SUPER_ADMIN' },
          { role: 'ADMIN', permissions: { has: permission } },
          { role: 'ADMIN', adminRole: { permissions: { has: permission } } },
        ],
      },
      select: { id: true },
    })
    .then((staff) => {
      for (const member of staff) notifySafely(member.id, input);
    })
    .catch((error) => logger.error({ err: error, permission }, 'Failed to find staff to notify'));
}
