import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZibalClient, ZibalError, zibalDriver } from './zibal.js';
import { isValidSheba, normalizeIban } from '../../utils/iban.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * The Zibal driver, against a stubbed wire.
 *
 * The fetch double records each request and answers from a queue. The
 * assertions here are about the three things that matter: Toman→Rial
 * conversion happens exactly once per amount, the multiplexing payload
 * carries the beneficiary shares, and verify's result codes map onto the
 * seam's SUCCEEDED/FAILED without ever trusting the browser-sent callback.
 *
 * The driver builds its client with the global fetch, so stubFetch replaces
 * that global and returns both the double and the recorded calls.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(answers: Array<Response | (() => Response)>): {
  double: typeof fetch;
  calls: Array<{ url: string; body: Record<string, unknown> }>;
} {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const double = (async (input: unknown, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
    });
    const next = answers.shift();
    if (!next) throw new Error('stub exhausted');
    return typeof next === 'function' ? next() : next;
  }) as unknown as typeof fetch;
  return { double, calls };
}

const RETURN_URL = 'https://example.ir/dashboard/orders';

function startInput(overrides: Record<string, unknown> = {}) {
  return {
    orderCode: 'ORD-1',
    amount: 25000n, // Tomans
    currency: 'IRT',
    returnUrl: RETURN_URL,
    ...overrides,
  } as Parameters<typeof zibalDriver.start>[0];
}

beforeEach(() => {
  vi.stubEnv('ZIBAL_MERCHANT_ID', 'merchant-key');
  vi.stubEnv('APP_URL', 'https://example.ir');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('normalizeIban / isValidSheba', () => {
  it('strips separators and uppercases', () => {
    expect(normalizeIban('ir06 1200 0000 0000 0000 0000 01')).toBe('IR061200000000000000000001');
    expect(isValidSheba('IR061200000000000000000001')).toBe(true);
    expect(isValidSheba('IR0612')).toBe(false);
  });
});

describe('zibal start', () => {
  it('requests the payment in rials and returns the gateway page as redirect', async () => {
    const { double, calls } = stubFetch([jsonResponse({ trackId: 12345, result: 100, message: 'success' })]);
    vi.stubGlobal('fetch', double);

    const started = await zibalDriver.start(startInput());

    expect(started).toEqual({
      reference: '12345',
      redirectUrl: 'https://gateway.zibal.ir/start/12345',
      status: 'PENDING',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://gateway.zibal.ir/v1/request');
    expect(calls[0].body).toMatchObject({
      merchant: 'merchant-key',
      amount: 250000, // rials: ×10, once
      orderId: 'ORD-1',
      callbackUrl: 'https://example.ir/api/payments/zibal/callback',
    });
    expect(calls[0].body.multiplexingInfos).toBeUndefined();
  });

  it('sends beneficiary shares as multiplexing infos, also in rials', async () => {
    const { double, calls } = stubFetch([jsonResponse({ trackId: 99, result: 100 })]);
    vi.stubGlobal('fetch', double);

    await zibalDriver.start(
      startInput({
        splits: [{ iban: 'IR06 1200 0000 0000 0000 0000 01', amount: 22500n }],
      }),
    );

    expect(calls[0].body.multiplexingInfos).toEqual([
      { bankAccount: 'IR061200000000000000000001', amount: 225000 },
    ]);
  });

  it('refuses a split that consumes the whole payment — nothing would settle with us', async () => {
    const { double, calls } = stubFetch([jsonResponse({ trackId: 1, result: 100 })]);
    vi.stubGlobal('fetch', double);

    await expect(
      zibalDriver.start(
        startInput({ splits: [{ iban: 'IR061200000000000000000001', amount: 25000n }] }),
      ),
    ).rejects.toThrow(AppError);
    expect(calls).toHaveLength(0); // the gateway was never called
  });

  it('turns a gateway refusal into a 502, never exposing the raw refusal to the buyer', async () => {
    const { double } = stubFetch([jsonResponse({ result: 102, message: 'merchant not found' })]);
    vi.stubGlobal('fetch', double);

    await expect(zibalDriver.start(startInput())).rejects.toMatchObject({
      statusCode: 502,
      code: 'PAYMENT_GATEWAY_ERROR',
    });
  });

  it('refuses non-toman payments rather than converting silently', async () => {
    await expect(
      zibalDriver.start(startInput({ currency: 'USDT' })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('is unavailable without a merchant id', async () => {
    vi.stubEnv('ZIBAL_MERCHANT_ID', '   ');
    await expect(zibalDriver.start(startInput())).rejects.toMatchObject({
      statusCode: 503,
      code: 'PAYMENTS_UNAVAILABLE',
    });
  });
});

describe('zibal verify', () => {
  it('confirms on result 100', async () => {
    const { double } = stubFetch([jsonResponse({ result: 100, status: 2, refNumber: 555, amount: 250000 })]);
    vi.stubGlobal('fetch', double);

    await expect(zibalDriver.verify('12345')).resolves.toEqual({ status: 'SUCCEEDED' });
  });

  it('treats an already-verified payment as success, so verify stays idempotent', async () => {
    const { double } = stubFetch([jsonResponse({ result: 101, message: 'already verified' })]);
    vi.stubGlobal('fetch', double);

    await expect(zibalDriver.verify('12345')).resolves.toEqual({ status: 'SUCCEEDED' });
  });

  it('maps a business refusal to FAILED with the gateway reason', async () => {
    const { double } = stubFetch([jsonResponse({ result: 202, message: 'trackId not found' })]);
    vi.stubGlobal('fetch', double);

    await expect(zibalDriver.verify('12345')).resolves.toEqual({
      status: 'FAILED',
      failureReason: 'zibal 202: trackId not found',
    });
  });

  it('refuses references it did not issue', async () => {
    await expect(zibalDriver.verify('sbx-succeed-abc')).resolves.toMatchObject({ status: 'FAILED' });
    await expect(zibalDriver.verify('12a45')).resolves.toMatchObject({ status: 'FAILED' });
  });

  it('keeps the intent pending on a network failure instead of failing it', async () => {
    const { double } = stubFetch([
      () => {
        throw new Error('socket hangup');
      },
    ]);
    vi.stubGlobal('fetch', double);

    await expect(zibalDriver.verify('12345')).rejects.toMatchObject({
      statusCode: 502,
      code: 'PAYMENT_GATEWAY_ERROR',
    });
  });
});

describe('ZibalClient', () => {
  it('surfaces an unreadable answer as ZibalError, not as a crash', async () => {
    const client = new ZibalClient(
      'merchant-key',
      (async () => new Response('<html>proxy error</html>', { status: 502 })) as unknown as typeof fetch,
    );
    await expect(client.verifyPayment(1)).rejects.toBeInstanceOf(ZibalError);
  });

  it('builds the payment page url from the trackId', () => {
    const client = new ZibalClient('merchant-key');
    expect(client.paymentPageUrl(9876543210)).toBe('https://gateway.zibal.ir/start/9876543210');
  });
});
