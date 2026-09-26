import { randomUUID } from 'node:crypto';
import type { PaymentDriver, StartPaymentInput, StartedPayment, VerifiedPayment } from './index.js';

/**
 * A payment gateway that takes no money.
 *
 * It exists so the order lifecycle can be built and tested before ZarinPal is
 * wired up, and it is shaped to behave like a real gateway rather than like the
 * convenient thing: `start` returns a reference and a redirect, and nothing is
 * paid until `verify` is called server-side. Written the easy way — returning
 * SUCCEEDED from `start` — it would let the calling code grow a dependency on
 * payment being instant, and that code would then be wrong on the day a real
 * gateway replaced it.
 *
 * The outcome is decided by the reference, not by chance. A test that needs a
 * refusal asks for one; a test that needs success gets success every time.
 * Randomness in a payment double makes a suite that fails one run in twenty and
 * teaches people to re-run it.
 *
 * PAYMENT_SANDBOX_OUTCOME steers manual use in development:
 *   succeed (default) — verify confirms
 *   fail             — verify refuses
 *   pending          — verify says the buyer has not finished
 */

const REFERENCE_PREFIX = 'sbx';

type Outcome = 'succeed' | 'fail' | 'pending';

function configuredOutcome(): Outcome {
  const raw = (process.env.PAYMENT_SANDBOX_OUTCOME ?? 'succeed').trim().toLowerCase();
  return raw === 'fail' || raw === 'pending' ? raw : 'succeed';
}

/**
 * The outcome encoded in a reference.
 *
 * Carried in the reference so a single run can exercise all three without
 * touching the environment, and so verify is a pure function of its argument —
 * which is what makes it safe to call twice.
 */
function outcomeOf(reference: string): Outcome {
  if (reference.includes('-fail-')) return 'fail';
  if (reference.includes('-pending-')) return 'pending';
  return 'succeed';
}

export const sandboxDriver: PaymentDriver = {
  name: 'sandbox',

  async start(input: StartPaymentInput): Promise<StartedPayment> {
    const outcome = configuredOutcome();
    const reference = `${REFERENCE_PREFIX}-${outcome}-${randomUUID()}`;

    return {
      reference,
      // A URL on this site rather than a fabricated external one: it is where
      // the buyer would come back to, and a developer clicking it should land
      // somewhere real instead of a dead host.
      redirectUrl: `${input.returnUrl}${input.returnUrl.includes('?') ? '&' : '?'}reference=${encodeURIComponent(reference)}`,
      // PENDING, not SUCCEEDED. Nothing is paid until verify says so.
      status: 'PENDING',
    };
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    if (!reference.startsWith(`${REFERENCE_PREFIX}-`)) {
      // A reference this driver did not issue. Refusing rather than accepting
      // it is the whole point: otherwise a real gateway's reference could be
      // verified by the sandbox after a misconfiguration.
      return { status: 'FAILED', failureReason: 'reference not issued by the sandbox driver' };
    }

    switch (outcomeOf(reference)) {
      case 'fail':
        return { status: 'FAILED', failureReason: 'sandbox: refused by request' };
      case 'pending':
        return { status: 'PENDING' };
      default:
        return { status: 'SUCCEEDED' };
    }
  },

  async refund(reference: string): Promise<VerifiedPayment> {
    if (!reference.startsWith(`${REFERENCE_PREFIX}-`)) {
      return { status: 'FAILED', failureReason: 'reference not issued by the sandbox driver' };
    }
    return { status: 'REFUNDED' };
  },
};
