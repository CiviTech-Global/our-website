import type { PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { confirmPayment as confirmOrderPayment } from '../trademaster-order.service.js';
import { confirmPayment as confirmSubscriptionPayment } from '../billing/subscription.service.js';
import { confirmPayment as confirmPaymentRequest } from './payment-request.service.js';

/**
 * Confirming a payment from the gateway's callback.
 *
 * The buyer-facing confirm routes (POST /trademaster/me/payments/confirm and
 * POST /billing/confirm) are caller-scoped: they exist so the return page can
 * ask "what happened to *my* payment?". The gateway callback is different —
 * Zibal sends the buyer's browser to /api/payments/zibal/callback with a
 * trackId, and there may be no logged-in session on that redirect at all.
 * So this module confirms by reference only, dispatching on the intent's
 * purpose to the same service functions the return pages use. Those stay
 * idempotent, which is what makes callback + return page + a refreshed tab a
 * safe combination.
 */

/** Confirm whatever an intent was for, without needing to know who is asking. */
export async function confirmByReference(reference: string): Promise<{ status: PaymentStatus }> {
  const intent = await prisma.paymentIntent.findFirst({
    where: { reference },
    select: { purpose: true, payerUserId: true },
  });
  if (!intent) throw new AppError('این پرداخت پیدا نشد.', 404);

  if (intent.purpose === 'ORDER') return confirmOrderPayment(reference);
  if (intent.purpose === 'PAYMENT_REQUEST') return confirmPaymentRequest(reference);
  // SUBSCRIPTION rows are scoped to their payer everywhere else; the callback
  // recovers the payer from the intent itself rather than trusting a session.
  if (!intent.payerUserId) throw new AppError('این پرداخت پیدا نشد.', 404);
  return confirmSubscriptionPayment(reference, intent.payerUserId);
}

/**
 * The gateway says the buyer did not finish (success=0). That is a statement,
 * not a question: no verify call is needed, and making one would only turn a
 * definite "not paid" into a network error. Open intents are marked FAILED
 * with a guarded updateMany, so an intent that is already SUCCEEDED — or
 * already examined by the buyer's return page — is not moved backwards.
 */
export async function markAbandonedByReference(reference: string): Promise<void> {
  await prisma.paymentIntent.updateMany({
    where: { reference, status: { in: ['CREATED', 'PENDING'] } },
    data: { status: 'FAILED', failureReason: 'buyer did not complete the payment (gateway callback)' },
  });
}

/**
 * Where the Zibal callback sends the buyer's browser.
 *
 * The destination is the return URL stored on the PaymentIntent when the
 * payment started — never a value from the callback's query string, which the
 * buyer can edit freely. The reference is appended so the return page can run
 * its usual confirm call; that call is idempotent, and when our own verify
 * above already settled the intent it short-circuits into a status read.
 */
export async function zibalCallbackTarget(query: { trackId: string; success: string | undefined }): Promise<string> {
  const fallback = `${env.APP_URL.replace(/\/+$/, '')}/`;
  const intent = await prisma.paymentIntent.findFirst({
    where: { reference: query.trackId },
    select: { buyerReturnUrl: true },
  });
  if (!intent) return fallback;

  if (query.success === '1') {
    try {
      await confirmByReference(query.trackId);
    } catch {
      // A gateway hiccup must not strand the buyer on a blank error page:
      // the return page re-runs confirm with the reference, which retries
      // the verify.
    }
  } else {
    await markAbandonedByReference(query.trackId);
  }

  const base = (intent.buyerReturnUrl ?? '').trim() || fallback;
  return `${base}${base.includes('?') ? '&' : '?'}reference=${encodeURIComponent(query.trackId)}`;
}
