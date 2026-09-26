import type { PaymentStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler.js';
import { sandboxDriver } from './sandbox.js';

/**
 * Taking money, behind one seam.
 *
 * There is no real gateway yet. ZarinPal is coming, and the point of this file
 * is that when it does it becomes one more object in DRIVERS rather than a
 * change to the order service, the routes or the schema.
 *
 * The seam is deliberately narrow. A gateway does three things worth naming:
 * it is asked to start a payment and says where to send the buyer, it is asked
 * later whether that payment actually happened, and it is sometimes asked to
 * send the money back. Everything else — retries, receipts, reconciliation —
 * is this application's business, not the gateway's.
 *
 * `verify` exists as a separate step on purpose, and is the one part of this
 * that people get wrong. A buyer returning from a gateway is not evidence of
 * payment: the return is a redirect in a browser somebody can edit, replay or
 * fabricate. Money is confirmed by asking the gateway, server to server, which
 * is what verify is for. The sandbox driver is written to behave the same way
 * so that the code calling it cannot quietly grow a dependency on the easier,
 * wrong shape.
 */

export interface StartPaymentInput {
  /** Our own order code, quoted back in the gateway's records. */
  orderCode: string;
  /** Minor units, as everywhere else. */
  amount: bigint;
  currency: string;
  /** Where the gateway should send the buyer afterwards. */
  returnUrl: string;
  /** Shown on the gateway's own page where it supports one. */
  description?: string;
}

export interface StartedPayment {
  /** The gateway's identifier for this attempt. */
  reference: string;
  /**
   * Where to send the buyer, or null for a driver that needs no redirect.
   *
   * Null is not "nothing to do": it means the attempt is settled already, as
   * the sandbox driver's immediate mode does.
   */
  redirectUrl: string | null;
  status: PaymentStatus;
}

export interface VerifiedPayment {
  status: PaymentStatus;
  /** The gateway's own words when it refuses. Never translated, never shown raw. */
  failureReason?: string;
}

export interface PaymentDriver {
  /** Matches PaymentIntent.driver, so a stored row says which of these made it. */
  readonly name: string;
  start(input: StartPaymentInput): Promise<StartedPayment>;
  /**
   * Ask the gateway whether the money arrived.
   *
   * Must be safe to call more than once for the same reference: a buyer who
   * refreshes the return page, and a webhook arriving alongside them, both land
   * here.
   */
  verify(reference: string): Promise<VerifiedPayment>;
  refund?(reference: string, amount: bigint): Promise<VerifiedPayment>;
}

const DRIVERS: Record<string, PaymentDriver> = {
  [sandboxDriver.name]: sandboxDriver,
};

/**
 * The driver a new payment should use.
 *
 * Read from the environment rather than chosen per request: which gateway this
 * deployment uses is a property of the deployment, and letting a client pick
 * would let it pick the sandbox.
 */
export function activeDriver(): PaymentDriver {
  // Trimmed BEFORE the fallback, and `||` rather than `??`. Three states all
  // mean "not configured" and all reach here from a real deploy: unset, set to
  // an empty string by a template that had nothing to render, and set to
  // whitespace by a hand-edited env file. `??` accepts the second; putting the
  // trim after the fallback accepts the third. This site has already lost two
  // days to the first version of this mistake — see the note on
  // CANONICAL_ORIGIN in the web bundle.
  const name = (process.env.PAYMENT_DRIVER ?? '').trim().toLowerCase() || 'sandbox';
  const driver = DRIVERS[name];
  if (!driver) {
    // Louder than falling back to the sandbox: a deployment that meant to take
    // real money and names a driver that does not exist must not quietly start
    // marking orders paid for free.
    throw new AppError(`Unknown payment driver: ${name}`, 500);
  }
  return driver;
}

/** The driver a stored intent was created with, so verification matches start. */
export function driverByName(name: string): PaymentDriver {
  const driver = DRIVERS[name];
  if (!driver) throw new AppError(`Unknown payment driver: ${name}`, 500);
  return driver;
}

export { sandboxDriver };
