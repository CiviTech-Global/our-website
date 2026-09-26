import { afterEach, describe, expect, it, vi } from 'vitest';
import { sandboxDriver } from './sandbox.js';

/**
 * The payment double.
 *
 * The point of these tests is that the sandbox is shaped like a real gateway,
 * not like the convenient thing. If `start` ever returned SUCCEEDED, every
 * caller could quietly come to assume payment is instant, and all of that code
 * would be wrong on the day ZarinPal replaced it — with money involved. So the
 * shape is asserted, not just the outcomes.
 */

const input = {
  orderCode: 'ABC1234567',
  amount: 450000n,
  currency: 'IRT',
  returnUrl: 'https://example.test/orders/return',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the sandbox payment driver', () => {
  it('never reports payment from start alone', async () => {
    const started = await sandboxDriver.start(input);

    // The assertion that matters most in this file.
    expect(started.status).toBe('PENDING');
    expect(started.status).not.toBe('SUCCEEDED');
  });

  it('issues a reference and a redirect back to the given return URL', async () => {
    const started = await sandboxDriver.start(input);

    expect(started.reference).toMatch(/^sbx-/);
    expect(started.redirectUrl).toContain(input.returnUrl);
    expect(started.redirectUrl).toContain(encodeURIComponent(started.reference));
  });

  it('appends the reference correctly to a return URL that already has a query', async () => {
    const started = await sandboxDriver.start({
      ...input,
      returnUrl: 'https://example.test/return?order=1',
    });

    expect(started.redirectUrl).toContain('?order=1&reference=');
    // One '?' only; a second would make the whole tail part of the first value.
    expect(started.redirectUrl?.match(/\?/g)).toHaveLength(1);
  });

  it('confirms a payment when verify is asked', async () => {
    const started = await sandboxDriver.start(input);
    const verified = await sandboxDriver.verify(started.reference);

    expect(verified.status).toBe('SUCCEEDED');
  });

  it('gives the same answer twice for the same reference', async () => {
    // confirmPayment is reachable from a refreshed return page and from a
    // webhook at the same time. A driver whose answer changed between calls
    // would make that unsafe.
    const started = await sandboxDriver.start(input);

    const first = await sandboxDriver.verify(started.reference);
    const second = await sandboxDriver.verify(started.reference);

    expect(second).toEqual(first);
  });

  it('refuses a reference it did not issue', async () => {
    // Otherwise a real gateway's reference could be "verified" by the sandbox
    // after a misconfiguration, marking an unpaid order paid.
    const verified = await sandboxDriver.verify('zarinpal-A0000000000000000000000000000001');

    expect(verified.status).toBe('FAILED');
    expect(verified.failureReason).toContain('not issued by the sandbox');
  });

  it('refuses a refund for a reference it did not issue', async () => {
    const refunded = await sandboxDriver.refund!('zarinpal-A000', 1n);
    expect(refunded.status).toBe('FAILED');
  });

  it('can be asked for a refusal, deterministically', async () => {
    vi.stubEnv('PAYMENT_SANDBOX_OUTCOME', 'fail');
    const started = await sandboxDriver.start(input);

    // Twice, because a random double would eventually pass this by luck.
    expect((await sandboxDriver.verify(started.reference)).status).toBe('FAILED');
    expect((await sandboxDriver.verify(started.reference)).status).toBe('FAILED');
  });

  it('can be asked for a payment the buyer never finished', async () => {
    vi.stubEnv('PAYMENT_SANDBOX_OUTCOME', 'pending');
    const started = await sandboxDriver.start(input);

    expect((await sandboxDriver.verify(started.reference)).status).toBe('PENDING');
  });

  it('treats an unrecognised outcome as success rather than throwing', async () => {
    // A typo in an env var should not take the development server down.
    vi.stubEnv('PAYMENT_SANDBOX_OUTCOME', 'sometimes');
    const started = await sandboxDriver.start(input);

    expect((await sandboxDriver.verify(started.reference)).status).toBe('SUCCEEDED');
  });

  it('carries the outcome in the reference, not in module state', async () => {
    // So one run can exercise all three, and so verify stays a pure function of
    // its argument — which is what makes calling it twice safe.
    vi.stubEnv('PAYMENT_SANDBOX_OUTCOME', 'fail');
    const failing = await sandboxDriver.start(input);

    vi.stubEnv('PAYMENT_SANDBOX_OUTCOME', 'succeed');
    const succeeding = await sandboxDriver.start(input);

    // The first reference still fails even though the setting has changed.
    expect((await sandboxDriver.verify(failing.reference)).status).toBe('FAILED');
    expect((await sandboxDriver.verify(succeeding.reference)).status).toBe('SUCCEEDED');
  });

  it('names itself, so a stored intent records which driver made it', () => {
    expect(sandboxDriver.name).toBe('sandbox');
  });
});
