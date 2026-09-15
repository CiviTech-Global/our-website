import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The provider is built once and memoised, so each case needs a fresh module
 * with its own env.
 */
async function load(overrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('../../config/env.js', async (importOriginal) => {
    const actual = await importOriginal<{ env: Record<string, unknown> }>();
    return { env: { ...actual.env, ...overrides } };
  });
  return import('./index.js');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('../../config/env.js');
  vi.resetModules();
});

describe('email provider', () => {
  it('reports that a deployment with no provider cannot send', async () => {
    const { canSendEmail } = await load({ EMAIL_PROVIDER: 'none', isProduction: true });
    expect(canSendEmail()).toBe(false);
  });

  it('throws rather than pretending a message went out', async () => {
    const { emailProvider } = await load({ EMAIL_PROVIDER: 'none', isProduction: true });

    // Silently succeeding is what made this a dead end that looked like a
    // working feature: "we have sent you a link" and nothing sent.
    await expect(
      emailProvider().send({ to: 'a@example.com', subject: 's', text: 't' })
    ).rejects.toThrow(/EMAIL_PROVIDER=none/);
  });

  it('still refuses to log live reset links in production', async () => {
    const { emailProvider } = await load({ EMAIL_PROVIDER: 'console', isProduction: true });
    expect(() => emailProvider()).toThrow(/not permitted in production/);
  });

  it('reports that a configured provider can send', async () => {
    const { canSendEmail } = await load({
      EMAIL_PROVIDER: 'resend',
      EMAIL_API_KEY: 'k',
      EMAIL_FROM: 'no-reply@example.com',
      isProduction: true,
    });
    expect(canSendEmail()).toBe(true);
  });

  it('refuses a real provider with no key rather than failing at send time', async () => {
    const { emailProvider } = await load({ EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: '' });
    expect(() => emailProvider()).toThrow(/EMAIL_API_KEY is required/);
  });
});
