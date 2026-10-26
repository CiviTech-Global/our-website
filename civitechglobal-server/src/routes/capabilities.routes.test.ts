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

    await expect(get()).resolves.toMatchObject({ email: true, sms: false });
  });

  it('answers "no" rather than failing when a provider cannot be built', async () => {
    // What a production deployment that left EMAIL_PROVIDER at its console
    // default actually does: constructing it throws, because live reset links
    // must never be written to a log.
    mocks.canSendEmail.mockImplementation(() => {
      throw new Error('console provider is not permitted in production');
    });
    mocks.canSendSms.mockReturnValue(false);

    await expect(get()).resolves.toMatchObject({ email: false, sms: false });
  });

  it('publishes the module switches and the app version floor', async () => {
    mocks.canSendEmail.mockReturnValue(true);
    mocks.canSendSms.mockReturnValue(true);
    process.env.MOBILE_MIN_VERSION = '1.2.0';
    process.env.MOBILE_LATEST_VERSION = 'not-a-version';

    const body = (await get()) as { features: Record<string, boolean>; mobile: Record<string, string> };

    expect(Object.keys(body.features)).toEqual(
      expect.arrayContaining(['tradeMaster', 'tradeMasterOrders', 'jobsV2', 'projectsV2', 'booksV2']),
    );
    // A malformed value must not reach the app as a version to compare.
    expect(body.mobile).toMatchObject({ minVersion: '1.2.0', latestVersion: '1.0.0' });
    delete process.env.MOBILE_MIN_VERSION;
    delete process.env.MOBILE_LATEST_VERSION;
  });

  it('publishes where the app can be had, and only safe links', async () => {
    process.env.MOBILE_BAZAAR_URL = 'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app';
    process.env.MOBILE_MYKET_URL = 'http://myket.ir/app/x';
    process.env.MOBILE_APK_ARM64_URL = '/downloads/rayan-1.0.0-arm64.apk';
    process.env.MOBILE_APK_ARMV7_URL = 'javascript:alert(1)';

    const body = (await get()) as { mobile: { downloads: Record<string, string | null> } };

    expect(body.mobile.downloads).toEqual({
      bazaar: 'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app',
      myket: null,
      apkArm64: '/downloads/rayan-1.0.0-arm64.apk',
      apkArmV7: null,
    });
    for (const key of ['MOBILE_BAZAAR_URL', 'MOBILE_MYKET_URL', 'MOBILE_APK_ARM64_URL', 'MOBILE_APK_ARMV7_URL']) {
      delete process.env[key];
    }
  });
});
