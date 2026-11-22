import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { toPage } from '../../utils/page.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { notifySafely } from '../notifications.service.js';
import { activeDriver, driverByName } from './index.js';
import { beneficiarySplit, partnerCommissionPercent } from './partner-split.js';

/**
 * Payment requests: bills the desk issues for work the platform arranged.
 *
 * A consultation is scheduled by phone, a freelance contract is agreed in a
 * thread — neither flow takes money itself, by documented decision (the
 * ConsultationRequest is not a booking; the award lifecycle keeps money out of
 * scope). This service is where the money for those arrangements lives: staff
 * issue a request with a price and, optionally, a partner's Sheba; the payer
 * follows the link and pays through the gateway; the partner's share settles
 * straight to their account at transaction time and the commission stays with
 * the platform.
 *
 * The payer side is code-gated, like the public intake forms: the link is the
 * credential, no account needed. One live bill per thing — a consultation or
 * an award can be billed once, enforced by the unique keys on the link
 * columns.
 */

function appOrigin(): string {
  return env.APP_URL.replace(/\/+$/, '');
}

export interface CreatePaymentRequestInput {
  title: string;
  description?: string;
  amount: bigint;
  currency: 'IRT';
  payerUserId?: string;
  consultationRequestId?: string;
  awardId?: string;
  beneficiaryIban?: string;
  beneficiaryName?: string;
}

async function assertLinkTargets(input: CreatePaymentRequestInput): Promise<void> {
  if (input.payerUserId) {
    const payer = await prisma.user.findFirst({ where: { id: input.payerUserId }, select: { id: true } });
    if (!payer) throw new AppError('حساب payer پیدا نشد.', 404);
  }
  if (input.consultationRequestId) {
    const consultation = await prisma.consultationRequest.findFirst({
      where: { id: input.consultationRequestId },
      select: { id: true, paymentRequestId: true, expert: { select: { payoutIban: true } } },
    });
    if (!consultation) throw new AppError('درخواست مشاوره پیدا نشد.', 404);
    if (consultation.paymentRequestId) {
      throw new AppError('برای این درخواست قبلاً صورتحساب صادر شده است.', 409);
    }
    // The expert's Sheba on file is the default beneficiary: staff override by
    // naming one explicitly.
    input.beneficiaryIban ??= consultation.expert?.payoutIban ?? undefined;
  }
  if (input.awardId) {
    const award = await prisma.marketplaceAward.findFirst({
      where: { id: input.awardId },
      select: { id: true, paymentRequestId: true },
    });
    if (!award) throw new AppError('قرارداد پیدا نشد.', 404);
    if (award.paymentRequestId) {
      throw new AppError('برای این قرارداد قبلاً صورتحساب صادر شده است.', 409);
    }
  }
}

export async function createPaymentRequest(staffId: string, raw: CreatePaymentRequestInput) {
  const input = { ...raw };
  await assertLinkTargets(input);

  // A rare retry after a unique-code collision should not bill twice; the
  // link unique keys make the second insert fail loudly instead.
  const request = await prisma.paymentRequest.create({
    data: {
      code: generateTrackingCode(),
      title: input.title,
      description: input.description ?? null,
      amount: input.amount,
      currency: input.currency,
      payerUserId: input.payerUserId ?? null,
      consultationRequestId: input.consultationRequestId ?? null,
      awardId: input.awardId ?? null,
      beneficiaryIban: input.beneficiaryIban ?? null,
      beneficiaryName: input.beneficiaryName ?? null,
      createdById: staffId,
    },
    select: { id: true, code: true },
  });

  return { ...request, payUrl: `${appOrigin()}/pay?code=${encodeURIComponent(request.code)}` };
}

export async function listPaymentRequests(query: {
  page: number;
  pageSize: number;
  search?: string;
  paid?: 'true' | 'false';
}) {
  const where = {
    ...(query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' as const } },
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { beneficiaryName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.paid === 'true' ? { paidAt: { not: null } } : {}),
    ...(query.paid === 'false' ? { paidAt: null } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        title: true,
        amount: true,
        currency: true,
        beneficiaryName: true,
        beneficiaryIban: true,
        paidAt: true,
        createdAt: true,
        payerUser: { select: { firstName: true, lastName: true } },
        // The Sheba is a bank account: visible to staff only, which this
        // list is — but masked anyway, the last four digits suffice to
        // confirm which account a share went to.
      },
    }),
    prisma.paymentRequest.count({ where }),
  ]);

  return toPage(
    items.map((item) => ({
      ...item,
      amount: item.amount.toString(),
      beneficiaryIban: item.beneficiaryIban ? `…${item.beneficiaryIban.slice(-4)}` : null,
      payerName: item.payerUser ? [item.payerUser.firstName, item.payerUser.lastName].filter(Boolean).join(' ') : null,
      payerUser: undefined,
    })),
    total,
    query.page,
    query.pageSize,
  );
}

/** What the payer sees: enough to pay, nothing they should not. */
export async function paymentRequestStatus(code: string) {
  const request = await prisma.paymentRequest.findFirst({
    where: { code },
    select: { code: true, title: true, description: true, amount: true, currency: true, paidAt: true },
  });
  if (!request) throw new AppError('این صورتحساب پیدا نشد.', 404);
  return {
    code: request.code,
    title: request.title,
    description: request.description,
    amount: request.amount.toString(),
    currency: request.currency,
    paid: request.paidAt !== null,
    paidAt: request.paidAt,
  };
}

/**
 * Begin paying a bill. One row per attempt, as everywhere else in this
 * module: an abandoned link tried twice is two PaymentIntents.
 */
export async function startPayment(code: string) {
  const request = await prisma.paymentRequest.findFirst({
    where: { code },
    select: { id: true, code: true, title: true, amount: true, currency: true, paidAt: true, payerUserId: true, beneficiaryIban: true },
  });
  if (!request) throw new AppError('این صورتحساب پیدا نشد.', 404);
  if (request.paidAt) throw new AppError('این صورتحساب قبلاً پرداخت شده است.', 409);

  const splits = beneficiarySplit(request.amount, partnerCommissionPercent(), request.beneficiaryIban);

  const returnUrl = `${appOrigin()}/pay?code=${encodeURIComponent(request.code)}`;
  const driver = activeDriver();
  const started = await driver.start({
    orderCode: request.code,
    amount: request.amount,
    currency: request.currency,
    returnUrl,
    description: request.title,
    splits,
  });

  await prisma.paymentIntent.create({
    data: {
      purpose: 'PAYMENT_REQUEST',
      paymentRequestId: request.id,
      payerUserId: request.payerUserId,
      driver: driver.name,
      status: started.status,
      amount: request.amount,
      currency: request.currency,
      reference: started.reference,
      redirectUrl: started.redirectUrl,
      buyerReturnUrl: returnUrl,
      splits: splits
        ? (splits.map((s) => ({ iban: s.iban, amount: s.amount.toString() })) as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return { redirectUrl: started.redirectUrl, reference: started.reference };
}

/**
 * Ask the gateway whether the money arrived, and mark the bill paid once.
 * Safe to call repeatedly; the gateway callback and the payer's return page
 * both land here.
 */
export async function confirmPayment(reference: string) {
  const intent = await prisma.paymentIntent.findFirst({
    where: { reference, purpose: 'PAYMENT_REQUEST' },
    select: {
      id: true,
      driver: true,
      status: true,
      paymentRequest: { select: { id: true, code: true, title: true, paidAt: true, createdById: true } },
    },
  });
  if (!intent?.paymentRequest) throw new AppError('این پرداخت پیدا نشد.', 404);
  const request = intent.paymentRequest;

  if (intent.status === 'SUCCEEDED' || request.paidAt) {
    return { status: 'SUCCEEDED' as const, code: request.code };
  }

  const result = await driverByName(intent.driver).verify(reference);
  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      status: result.status,
      failureReason: result.failureReason,
      settledAt: result.status === 'SUCCEEDED' ? new Date() : null,
    },
  });

  if (result.status === 'SUCCEEDED') {
    // Guarded on both sides: whichever of the callback and the return page
    // verifies second sees count 0 and just reads the fact back.
    const { count } = await prisma.paymentRequest.updateMany({
      where: { id: request.id, paidAt: null },
      data: { paidAt: new Date() },
    });
    if (count === 1 && request.createdById) {
      notifySafely(request.createdById, {
        type: 'payment_request.paid',
        title: 'صورتحساب پرداخت شد',
        body: request.title,
        link: '/dashboard',
      });
    }
    return { status: 'SUCCEEDED' as const, code: request.code };
  }

  return { status: result.status, code: request.code };
}
