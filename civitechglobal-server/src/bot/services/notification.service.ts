import type { Api } from 'grammy';
import type { Lead, InsuranceCategory, InsuranceSubcategory } from '@prisma/client';
import { botConfig } from '../config.js';
import { logger } from '../logger.js';

type LeadWithRelations = Lead & { category: { title: string } | InsuranceCategory; subcategory: { title: string } | InsuranceSubcategory };

function toPersianDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Intentionally omits PII (name/phone/city) — admins get category + id and
 * open the admin dashboard for full details. */
function formatLeadNotification(lead: LeadWithRelations): string {
  return [
    '🛎 درخواست جدید بیمه',
    '',
    `دسته: ${lead.category.title}`,
    `زیرشاخه: ${lead.subcategory.title}`,
    `شناسه: ${lead.id}`,
    `تاریخ: ${toPersianDate(lead.createdAt)}`,
    '',
    'برای مشاهده جزئیات کامل به پنل مدیریت مراجعه کنید.',
  ].join('\n');
}

export const notificationService = {
  notifyAdmins: async (api: Api, lead: LeadWithRelations): Promise<void> => {
    const adminIds = botConfig.adminUserIds;
    if (adminIds.length === 0) {
      logger.warn('No admin Telegram user IDs configured; skipping admin notification.');
      return;
    }

    const message = formatLeadNotification(lead);
    for (const adminId of adminIds) {
      try {
        await api.sendMessage(adminId, message);
      } catch (error) {
        logger.error({ adminId, leadId: lead.id, error }, 'Failed to send admin notification');
      }
    }
  },
};
