import type { PaymentSplit } from './index.js';
import { isValidSheba, normalizeIban } from '../../utils/iban.js';

/**
 * The platform's commission on partner-paid flows — marketplace orders,
 * consultation bills, freelance contracts — in percent.
 *
 * Env-configured rather than hardcoded, because it is a business decision and
 * will move. Anything out of range reads as 0 — a misconfiguration must
 * degrade to a plain payment (everything settles to the platform account and
 * partners are settled manually), never to an error the payer sees.
 */
export function partnerCommissionPercent(): number {
  const raw = (process.env.PAYMENT_PARTNER_COMMISSION_PERCENT ?? '').trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value >= 100) return 0;
  return Math.floor(value);
}

/**
 * A partner's share of a payment, as a gateway split.
 *
 * With the commission on and a Sheba on file, the partner's share goes
 * straight to their bank account at the gateway (Zibal multiplexing) and only
 * the commission lands with us. Without a Sheba — or with the commission off —
 * this returns undefined and the payment is regular: everything settles to
 * the platform account and the partner is paid out afterwards. That fallback
 * is deliberate: a missing bank account must never block a payer.
 */
export function beneficiarySplit(
  total: bigint,
  percent: number,
  payoutIban: string | null | undefined,
): PaymentSplit[] | undefined {
  if (percent <= 0 || total <= 0n) return undefined;
  const iban = payoutIban ? normalizeIban(payoutIban) : '';
  if (!isValidSheba(iban)) return undefined;

  const share = total - (total * BigInt(percent)) / 100n;
  if (share <= 0n) return undefined;
  return [{ iban, amount: share }];
}
