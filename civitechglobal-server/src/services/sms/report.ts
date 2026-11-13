import { prisma } from '../../config/database.js';
import { canSendSms, smsProvider } from './index.js';
import { SMS_TEMPLATES, type SmsKind } from './templates.js';
import { templateName } from './dispatch.js';
import { env } from '../../config/env.js';

/**
 * What texts have cost, for the staff SMS page: totals per kind over a window,
 * and the latest rows. Phone numbers are not here — the log keeps only hashes.
 */
export async function smsReport(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [groups, recent] = await Promise.all([
    prisma.smsMessage.groupBy({
      by: ['kind', 'status'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { cost: true },
    }),
    prisma.smsMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, kind: true, status: true, reason: true, cost: true, createdAt: true },
    }),
  ]);

  const kinds = (Object.keys(SMS_TEMPLATES) as SmsKind[]).map((kind) => {
    const rows = groups.filter((group) => group.kind === kind);
    const count = (status: string) => rows.find((row) => row.status === status)?._count._all ?? 0;
    return {
      kind,
      template: templateName(kind),
      sent: count('SENT'),
      failed: count('FAILED'),
      skipped: count('SKIPPED'),
      costRials: rows.reduce((sum, row) => sum + (row._sum.cost ?? 0), 0),
    };
  });

  return {
    days,
    provider: smsProvider().name,
    canSend: canSendSms(),
    memberAlerts: env.SMS_MEMBER_ALERTS,
    dailyCap: env.SMS_DAILY_CAP,
    totalCostRials: kinds.reduce((sum, kind) => sum + kind.costRials, 0),
    kinds,
    recent,
  };
}
