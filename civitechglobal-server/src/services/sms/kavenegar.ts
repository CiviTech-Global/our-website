/**
 * Kavenegar, the SMS gateway this deployment buys.
 *
 * Built from the REST reference (kavenegar.com/rest.html) and the official
 * Node SDK (github.com/KaveNegar/kavenegar-node), which it mirrors on the wire:
 *
 *   POST https://api.kavenegar.com/v1/{API-KEY}/{scope}/{method}.json
 *   Content-Type: application/x-www-form-urlencoded; charset=UTF-8
 *   → { "return": { "status": 200, "message": "..." }, "entries": ... }
 *
 * The SDK itself is not used: it is callback-only, logs to the console on a
 * parse failure, and swallows the status into a callback argument. Thirty
 * lines of fetch say the same thing and can be tested.
 *
 * Two things the reference is explicit about and this file depends on:
 *  - The HTTP status mirrors return.status, so a refusal arrives as an HTTP
 *    error *with a body*. The body is read either way; that is where the
 *    reason is.
 *  - The API key is a path segment. It must never reach a log line or an
 *    error message, so errors here are built from the status, never the URL.
 */

const BASE = 'https://api.kavenegar.com/v1';
const TIMEOUT_MS = 10_000;

/**
 * What each return.status means, as the REST reference's table states it.
 * Only codes read in the reference itself are listed; anything else falls back
 * to the message Kavenegar sends with it.
 */
export const KAVENEGAR_STATUS: Record<number, string> = {
  200: 'accepted',
  400: 'incomplete parameters',
  401: 'account disabled',
  402: 'operation failed',
  403: 'invalid API key',
  404: 'unknown method',
  405: 'wrong HTTP method',
  406: 'required parameter empty',
  407: 'access not allowed from this IP',
  409: 'Kavenegar server unavailable, retry later',
  411: 'invalid receptor number',
  412: 'invalid sender line',
  413: 'message empty or too long',
  414: 'too many records in one call',
  417: 'invalid date',
  418: 'insufficient credit',
  419: 'array lengths do not match',
  420: 'links are not allowed in the message',
  424: 'template not found or not yet approved',
  607: 'invalid tag',
};

export class KavenegarError extends Error {
  constructor(
    readonly status: number | null,
    detail: string,
  ) {
    super(`Kavenegar ${status ?? 'network'}: ${detail}`);
    this.name = 'KavenegarError';
  }

  /** Nothing was sent and trying again may work. */
  get retryable(): boolean {
    return this.status === 409;
  }
}

interface Envelope<T> {
  return?: { status?: number; message?: string };
  entries?: T;
}

type Fetch = typeof fetch;

export interface KavenegarAccount {
  /** Remaining credit, in Rials. */
  remainCredit: number;
  type: string | null;
}

export class KavenegarClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  /** One call. Throws KavenegarError on anything but status 200. */
  async call<T>(scope: string, method: string, params: Record<string, string>): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${BASE}/${encodeURIComponent(this.apiKey)}/${scope}/${method}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // A network failure or timeout. The cause's message names the host at
      // most, never the path, so it is safe to carry.
      throw new KavenegarError(null, error instanceof Error ? error.message : 'request failed');
    }

    let body: Envelope<T> | null = null;
    try {
      body = (await response.json()) as Envelope<T>;
    } catch {
      // A proxy error page, or an empty body: fall back to the HTTP status.
    }

    const status = body?.return?.status ?? response.status;
    if (status !== 200) {
      throw new KavenegarError(status, KAVENEGAR_STATUS[status] ?? body?.return?.message ?? 'unexpected status');
    }
    return body?.entries as T;
  }

  /**
   * A one-time code through an approved verify template (verify/lookup).
   *
   * The only route that reliably reaches Iranian phones with a code: templates
   * are pre-approved, so the operators do not filter them as bulk SMS. The
   * template's text must contain %token. Tokens may not contain spaces.
   *
   * Retried once when Kavenegar answers 409 (its server unavailable — nothing
   * was sent). Any other failure is final: retrying a send that may have
   * reached the phone would text the person twice.
   */
  async verifyLookup(
    receptor: string,
    tokens: { token: string; token2?: string; token3?: string },
    template: string,
  ): Promise<{ messageId?: string; cost?: number }> {
    // Caught here rather than spent on a call: tokens may not contain spaces.
    for (const value of Object.values(tokens)) {
      if (value !== undefined && /\s/.test(value)) throw new KavenegarError(null, 'token contains whitespace');
    }
    const params: Record<string, string> = { receptor, template, token: tokens.token };
    if (tokens.token2) params.token2 = tokens.token2;
    if (tokens.token3) params.token3 = tokens.token3;

    const send = () => this.call<Array<{ messageid?: number | string; cost?: number }>>('verify', 'lookup', params);
    let entries;
    try {
      entries = await send();
    } catch (error) {
      if (!(error instanceof KavenegarError && error.retryable)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      entries = await send();
    }
    const first = Array.isArray(entries) ? entries[0] : undefined;
    return {
      messageId: first?.messageid !== undefined ? String(first.messageid) : undefined,
      cost: typeof first?.cost === 'number' ? first.cost : undefined,
    };
  }

  /** Remaining credit and account type (account/info). Sends nothing and costs nothing. */
  async accountInfo(): Promise<KavenegarAccount> {
    const entries = await this.call<{ remaincredit?: number; type?: string }>('account', 'info', {});
    return { remainCredit: Number(entries?.remaincredit ?? 0), type: entries?.type ?? null };
  }
}
