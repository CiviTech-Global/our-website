import type { PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { toPage } from '../../utils/page.js';

/**
 * The transactions ledger: every payment attempt, whatever it paid for.
 *
 * PaymentIntent is the atomic record of taking money — one row per attempt,
 * including the abandoned and the refused, because a ledger that only shows
 * successes cannot answer "the money left my card, where is it?". This is the
 * read model behind the admin payments page's transactions list.
 */

export interface TransactionListQuery {
  page: number;
  pageSize: number;
  status?: PaymentStatus;
  search?: string;
}

export async function listTransactions(query: TransactionListQuery) {
  const search = query.search?.trim();
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: 'insensitive' as const } },
            { order: { code: { contains: search, mode: 'insensitive' as const } } },
            { subscription: { code: { contains: search, mode: 'insensitive' as const } } },
            { paymentRequest: { code: { contains: search, mode: 'insensitive' as const } } },
            { paymentRequest: { title: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.paymentIntent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        purpose: true,
        status: true,
        amount: true,
        currency: true,
        reference: true,
        driver: true,
        failureReason: true,
        settledAt: true,
        createdAt: true,
        order: { select: { code: true } },
        subscription: { select: { code: true } },
        paymentRequest: { select: { code: true, title: true } },
      },
    }),
    prisma.paymentIntent.count({ where }),
  ]);

  return toPage(
    items.map((item) => ({
      id: item.id,
      purpose: item.purpose,
      status: item.status,
      amount: item.amount.toString(),
      currency: item.currency,
      reference: item.reference,
      driver: item.driver,
      failureReason: item.failureReason,
      settledAt: item.settledAt,
      createdAt: item.createdAt,
      orderCode: item.order?.code ?? null,
      subscriptionCode: item.subscription?.code ?? null,
      requestCode: item.paymentRequest?.code ?? null,
      requestTitle: item.paymentRequest?.title ?? null,
    })),
    total,
    query.page,
    query.pageSize,
  );
}
