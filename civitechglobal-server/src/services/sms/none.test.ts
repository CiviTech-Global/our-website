import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * A deployment that has decided not to buy SMS, and what that decision must
 * not quietly turn into: a gateway that claims it can send.
 */
async function load(envOverrides: Record<string, unknown>) {
  vi.resetModules();
  // Spread over the real env, as the email provider's tests do: a partial
  // stub loses the logger's settings and pino refuses to build.
  vi.doMock('../../config/env.js', async (importOriginal) => {
    const actual = await importOriginal<{ env: Record<string, unknown> }>();
    return {
      env: {
        ...actual.env,
        SMS_PROVIDER: 'none',
        SMS_API_KEY: '',
        SMS_OTP_TEMPLATE: '',
        isProduction: false,
        ...envOverrides,
      },
    };
  });
  return import('./index.js');
}

afterEach(() => {
  vi.doUnmock('../../config/env.js');
  vi.resetModules();
});

describe('SMS_PROVIDER=none', () => {
  it('reports that it cannot send', async () => {
    const { canSendSms } = await load({ isProduction: true });
    expect(canSendSms()).toBe(false);
  });

  it('is permitted in production, unlike the console provider', async () => {
    const { smsProvider } = await load({ isProduction: true });
    expect(() => smsProvider()).not.toThrow();
    expect(smsProvider().name).toBe('none');
  });

  it('throws rather than pretending a code went out', async () => {
    const { smsProvider } = await load({ isProduction: true });
    await expect(smsProvider().sendOtp('09120000000', '123456')).rejects.toThrow(/SMS_PROVIDER=none/);
  });

  it('still treats the console provider as unable to reach a phone', async () => {
    const { canSendSms } = await load({ SMS_PROVIDER: 'console', isProduction: false });
    expect(canSendSms()).toBe(false);
  });

  it('reports a configured gateway as able to send', async () => {
    const { canSendSms } = await load({
      SMS_PROVIDER: 'kavenegar',
      SMS_API_KEY: 'k',
      SMS_OTP_TEMPLATE: 't',
      isProduction: true,
    });
    expect(canSendSms()).toBe(true);
  });
});
