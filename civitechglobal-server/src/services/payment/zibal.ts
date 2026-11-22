import { AppError } from '../../middleware/errorHandler.js';
import { normalizeIban } from '../../utils/iban.js';
import type { PaymentDriver, StartPaymentInput, StartedPayment, VerifiedPayment } from './index.js';

/**
 * Zibal (zibal.ir), the payment gateway this deployment buys.
 *
 * Built from Zibal's own IPG reference (help.zibal.ir — the same document the
 * OpenAPI spec in this repo's research folder describes), the same way
 * kavenegar.ts is built from Kavenegar's REST reference: plain fetch, ten
 * second timeout, an injectable fetchImpl for tests, and no SDK. The official
 * `zibal` npm package adds error classes and a wrapper around the same three
 * calls; owning the thirty lines here keeps the wire format in this codebase,
 * testable and free of a dependency's release schedule.
 *
 * The wire, in four calls:
 *
 *   POST {base}/v1/request   { merchant, amount(RIALS), callbackUrl, orderId,
 *                              multiplexingInfos? } → { trackId, result, message }
 *   GET  {base}/start/{trackId}                       → the buyer's browser goes here
 *   GET  {callbackUrl}?trackId&success&status&orderId → the buyer's browser comes back
 *   POST {base}/v1/verify    { merchant, trackId }    → the money question, server to server
 *
 * Two units of account meet here and the conversion lives in exactly one
 * place: this application counts Tomans in BigInt everywhere, Zibal counts
 * Rials; one Toman is ten Rials. Amounts cross the wire as JSON numbers —
 * safe, because an Iranian amount in Rials is far below 2^53.
 *
 * Shared payments (تسهیم): /v1/request takes `multiplexingInfos`, a list of
 * beneficiaries — each a Sheba (`bankAccount`) or a registered sub-merchant
 * (`subMerchantId`) plus a Rial amount. Whatever is not named stays in our own
 * account, and Zibal settles each named share to its beneficiary directly.
 * That is the whole mechanism behind "our money in our account, partners paid
 * to their own pockets": the caller passes the *partner's* share and the
 * remainder is ours by default rather than by a second transfer.
 *
 * Sandbox: merchant `zibal` is Zibal's public test account and exercises the
 * whole flow without real money.
 */

const BASE = 'https://gateway.zibal.ir';
const TIMEOUT_MS = 10_000;

/** This application counts Tomans; Zibal counts Rials. */
const TOMAN_TO_RIAL = 10n;

// Result codes from the "جداول" section of Zibal's IPG reference. Only the
// codes this driver branches on are named; a refusal arrives with a `message`
// from Zibal which is kept verbatim, so an unlisted code still lands in
// failureReason legibly.
export const ZIBAL_RESULT_SUCCESS = 100;
export const ZIBAL_RESULT_ALREADY_VERIFIED = 101;

export const ZIBAL_RESULT_MESSAGES: Record<number, string> = {
  100: 'success',
  101: 'already verified',
  102: 'merchant not found or inactive',
  103: 'merchant inactive',
  104: 'merchant blacklisted',
  201: 'invalid parameters',
  202: 'trackId not found',
  203: 'amount does not match the transaction',
};

export class ZibalError extends Error {
  constructor(
    readonly result: number | null,
    detail: string,
  ) {
    super(`Zibal ${result ?? 'network'}: ${detail}`);
    this.name = 'ZibalError';
  }
}

export interface MultiplexingInfo {
  /** Beneficiary Sheba (IR…). */
  bankAccount: string;
  /** Share in Rials. The unnamed remainder stays with the merchant. */
  amount?: number;
  /** Registered Zibal sub-merchant id; alternative to bankAccount. */
  subMerchantId?: string;
  /** Whether this share absorbs the transaction fee (feeMode 0 only). */
  wagePayer?: boolean;
}

interface ZibalEnvelope {
  result?: number;
  message?: string;
  [key: string]: unknown;
}

type Fetch = typeof fetch;

export class ZibalClient {
  constructor(
    private readonly merchant: string,
    private readonly fetchImpl: Fetch = fetch,
    private readonly baseUrl: string = BASE,
  ) {}

  /**
   * One POST. Throws ZibalError only when the transport or the envelope
   * itself is unreadable; a business refusal arrives as HTTP 200 with
   * result != 100 and is returned, not thrown, so the driver can decide.
   */
  private async post<T extends ZibalEnvelope>(path: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // A network failure or timeout. The cause names the host at most,
      // never the merchant key, so it is safe to carry.
      throw new ZibalError(null, error instanceof Error ? error.message : 'request failed');
    }

    let parsed: ZibalEnvelope | null = null;
    try {
      parsed = (await response.json()) as ZibalEnvelope;
    } catch {
      // A proxy error page or an empty body.
    }
    if (!response.ok || !parsed || typeof parsed.result !== 'number') {
      throw new ZibalError(
        parsed && typeof parsed.result === 'number' ? parsed.result : response.status,
        (parsed?.message as string | undefined) ?? `HTTP ${response.status}`,
      );
    }
    return parsed as T;
  }

  /** Step 1 — register the payment, get the trackId that names it from here on. */
  async requestPayment(input: {
    amount: number;
    callbackUrl: string;
    description?: string;
    orderId?: string;
    mobile?: string;
    multiplexingInfos?: MultiplexingInfo[];
  }): Promise<{ trackId?: number; result: number; message?: string }> {
    return this.post('/v1/request', { merchant: this.merchant, ...input });
  }

  /** Step 3 — the money question. Idempotent: an already-verified payment says so. */
  async verifyPayment(trackId: number): Promise<{
    result: number;
    message?: string;
    status?: number;
    amount?: number;
    refNumber?: number;
    cardNumber?: string;
    paidAt?: string;
    orderId?: string;
  }> {
    return this.post('/v1/verify', { merchant: this.merchant, trackId });
  }

  /** Step 4 — a full report on a trackId, for reconciliation and support. */
  async inquiry(trackId: number): Promise<ZibalEnvelope> {
    return this.post('/v1/inquiry', { merchant: this.merchant, trackId });
  }

  /** Step 2 — where the buyer's browser is sent. */
  paymentPageUrl(trackId: number): string {
    return `${this.baseUrl}/start/${trackId}`;
  }
}

/**
 * The merchant key, from the environment rather than a constructor, matching
 * how the rest of this module (PAYMENT_DRIVER and friends) reads payment
 * configuration: which gateway a deployment is, is a property of the
 * deployment. Trimmed, because a hand-edited env file is exactly where a
 * trailing newline hides. Unset means this deployment cannot take money yet —
 * the same 503 the registry uses for the sandbox-in-production refusal.
 */
function configuredMerchant(): string {
  const merchant = (process.env.ZIBAL_MERCHANT_ID ?? '').trim();
  if (!merchant) {
    throw new AppError('درگاه پرداخت پیکربندی نشده است.', 503, undefined, { code: 'PAYMENTS_UNAVAILABLE' });
  }
  return merchant;
}

/**
 * Where Zibal sends the buyer afterwards. On the site's own public origin:
 * nginx proxies /api/ to this server, so the gateway's domain check (the
 * callbackUrl's domain must match the registered gateway website) and the
 * route both hold. The buyer's actual destination after our callback is read
 * from the PaymentIntent, never from the query string — see
 * confirmation.service.ts.
 */
function callbackUrl(): string {
  const origin = (process.env.APP_URL ?? 'http://localhost:5173').trim().replace(/\/+$/, '');
  return `${origin}/api/payments/zibal/callback`;
}

function toMultiplexingInfos(input: StartPaymentInput): MultiplexingInfo[] | undefined {
  if (!input.splits?.length) return undefined;

  // Every split must leave something with us: a payment whose shares consume
  // the whole amount would settle nothing to the platform account, which is a
  // configuration mistake and not a thing to discover in the settlement
  // report. Zibal itself refuses it; refusing here is the clearer error.
  const total = input.amount;
  let shared = 0n;
  const infos = input.splits.map((split) => {
    if (split.amount <= 0n) {
      throw new AppError('مبلغ تسهیم باید بیشتر از صفر باشد.', 500);
    }
    shared += split.amount;
    return { bankAccount: normalizeIban(split.iban), amount: Number(split.amount * TOMAN_TO_RIAL) };
  });
  if (shared >= total) {
    throw new AppError('سهم تسهیم نمی‌تواند تمام مبلغ پرداخت را پوشش دهد.', 500);
  }
  return infos;
}

/** Zibal's trackId: a positive integer, carried as our PaymentIntent.reference. */
function trackIdFrom(reference: string): number | null {
  const trackId = Number(reference);
  if (!Number.isSafeInteger(trackId) || trackId <= 0 || String(trackId) !== reference.trim()) return null;
  return trackId;
}

export const zibalDriver: PaymentDriver = {
  name: 'zibal',

  async start(input: StartPaymentInput): Promise<StartedPayment> {
    if (input.currency !== 'IRT') {
      throw new AppError('درگاه پرداخت فقط پرداخت به تومان را پشتیبانی می‌کند.', 400);
    }

    const client = new ZibalClient(configuredMerchant());
    const response = await client.requestPayment({
      amount: Number(input.amount * TOMAN_TO_RIAL),
      callbackUrl: callbackUrl(),
      description: input.description,
      orderId: input.orderCode,
      multiplexingInfos: toMultiplexingInfos(input),
    });

    if (response.result !== ZIBAL_RESULT_SUCCESS || !response.trackId) {
      throw new AppError(
        `Zibal: ${response.message ?? ZIBAL_RESULT_MESSAGES[response.result] ?? `request failed (${response.result})`}`,
        502,
        undefined,
        { code: 'PAYMENT_GATEWAY_ERROR' },
      );
    }

    return {
      reference: String(response.trackId),
      redirectUrl: client.paymentPageUrl(response.trackId),
      // PENDING, like every honest driver: nothing is paid until verify says so.
      status: 'PENDING',
    };
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    const trackId = trackIdFrom(reference);
    if (trackId === null) {
      // A reference this driver did not issue — refused for the same reason
      // the sandbox refuses foreign references.
      return { status: 'FAILED', failureReason: 'reference not issued by the zibal driver' };
    }

    let response;
    try {
      response = await new ZibalClient(configuredMerchant()).verifyPayment(trackId);
    } catch (error) {
      if (error instanceof ZibalError) {
        // The gateway could not be reached or answered unreadably. That is not
        // a refusal: the intent stays PENDING and the caller may call verify
        // again — the buyer refreshing the return page does exactly that.
        throw new AppError('پاسخ درگاه پرداخت خوانده نشد؛ لطفاً دوباره تلاش کنید.', 502, undefined, {
          code: 'PAYMENT_GATEWAY_ERROR',
        });
      }
      throw error;
    }

    // 101 is "already verified": the money arrived and was confirmed on an
    // earlier call. Treated as success, which is what makes verify safe to
    // call twice — a refreshed return page and the gateway callback landing
    // together both end here.
    if (response.result === ZIBAL_RESULT_SUCCESS || response.result === ZIBAL_RESULT_ALREADY_VERIFIED) {
      return { status: 'SUCCEEDED' };
    }

    return {
      status: 'FAILED',
      failureReason: `zibal ${response.result}: ${response.message ?? ZIBAL_RESULT_MESSAGES[response.result] ?? 'verification failed'}`,
    };
  },
};
