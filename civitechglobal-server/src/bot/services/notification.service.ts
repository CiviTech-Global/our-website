import type { Api } from 'grammy';
import { botConfig } from '../config.js';
import { logger } from '../logger.js';
import type { NewRequestEvent } from '../../services/notify.service.js';

interface NotifiableRequest {
  id: string;
  trackingCode: string;
  createdAt: Date;
  product: { title: string; category: { title: string } } | null;
  category: { title: string } | null;
  subcategory: { title: string } | null;
}

function toPersianDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function broadcast(api: Api, message: string, context: Record<string, unknown>): Promise<void> {
  const adminIds = botConfig.adminUserIds;
  if (adminIds.length === 0) {
    logger.warn('No admin Telegram user IDs configured; skipping admin notification.');
    return;
  }

  for (const adminId of adminIds) {
    try {
      await api.sendMessage(adminId, message);
    } catch (error) {
      logger.error({ adminId, ...context, error }, 'Failed to send admin notification');
    }
  }
}

/** Intentionally omits PII (name/phone/city/answers) — admins get the product
 * and the tracking code, and open the admin dashboard for full details. A
 * Telegram message is not a place to spill an applicant's details, and admin
 * chats get forwarded. */
function formatBotRequest(request: NotifiableRequest): string {
  // Website rows resolve their category through the product; legacy and bot
  // rows carry it directly. Take whichever is present.
  const categoryTitle = request.product?.category.title ?? request.category?.title ?? '—';
  const productTitle = request.product?.title ?? request.subcategory?.title ?? '—';

  return [
    '🛎 درخواست جدید بیمه (تلگرام)',
    '',
    `دسته: ${categoryTitle}`,
    `نوع بیمه: ${productTitle}`,
    `کد پیگیری: ${request.trackingCode}`,
    `تاریخ: ${toPersianDate(request.createdAt)}`,
    '',
    'برای مشاهده جزئیات کامل به پنل مدیریت مراجعه کنید.',
  ].join('\n');
}

function formatWebRequest(event: NewRequestEvent): string {
  return [
    '🌐 درخواست جدید بیمه (وب‌سایت)',
    '',
    `دسته: ${event.categoryTitle}`,
    `نوع بیمه: ${event.productTitle}`,
    `کد پیگیری: ${event.trackingCode}`,
    `تاریخ: ${toPersianDate(new Date(event.createdAt))}`,
    '',
    'شماره تماس این درخواست با پیامک تأیید شده است.',
    'برای مشاهده جزئیات کامل به پنل مدیریت مراجعه کنید.',
  ].join('\n');
}

export const notificationService = {
  notifyAdmins: (api: Api, request: NotifiableRequest): Promise<void> =>
    broadcast(api, formatBotRequest(request), { requestId: request.id }),

  /** Called from the Redis subscription when the website files a request. */
  notifyAdminsOfWebRequest: (api: Api, event: NewRequestEvent): Promise<void> =>
    broadcast(api, formatWebRequest(event), { requestId: event.requestId }),
};
