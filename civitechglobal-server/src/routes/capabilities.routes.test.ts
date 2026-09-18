import { describe, expect, it, vi } from 'vitest';

/**
 * The capability endpoint has one job beyond reporting two booleans: never
 * fail. Building a provider throws on a misconfiguration, and the deployment
 * that is most likely to be misconfigured is exactly the one whose pages need
 * to know not to offer the feature.
 */
const mocks = vi.hoisted(() => ({
  canSendEmail: vi.fn(() => true),
  canSendSms: vi.fn(() => true),
}));

vi.mock('../services/email/index.js', () => ({ canSendEmail: mocks.canSendEmail }));
vi.mock('../services/sms/index.js', () => ({ canSendSms: mocks.canSendSms }));
vi.mock('../middleware/cacheControl.js', () => ({
  publicCache: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { default: router } = await import('./capabilities.routes.js');

/** Invokes the single GET handler without standing up an HTTP server. */
async function get(): Promise<unknown> {
  const layer = (router as unknown as { stack: Array<{ route?: { stack: Array<{ handle: unknown }> } }> }).stack.find(
    (entry) => entry.route,
  );
  const handlers = layer!.route!.stack.map((entry) => entry.handle as (...args: unknown[]) => void);
  const handler = handlers[handlers.length - 1];

  return new Promise((resolve) => {
    const res = {
      status: () => res,
      json: (body: { data: unknown }) => resolve(body.data),
    };
    handler({}, res, () => {});
  });
}

describe('capabilities', () => {
  it('reports what each provider says', async () => {
    mocks.canSendEmail.mockReturnValue(true);
    mocks.canSendSms.mockReturnValue(false);

    await expect(get()).resolves.toEqual({ email: true, sms: false });
  });

  it('answers "no" rather than failing when a provider cannot be built', async () => {
    // What a production deployment that left EMAIL_PROVIDER at its console
    // default actually does: constructing it throws, because live reset links
    // must never be written to a log.
    mocks.canSendEmail.mockImplementation(() => {
      throw new Error('console provider is not permitted in production');
    });
    mocks.canSendSms.mockReturnValue(false);

    await expect(get()).resolves.toEqual({ email: false, sms: false });
  });
});
