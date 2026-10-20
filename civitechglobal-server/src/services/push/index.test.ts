import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Choosing the push provider, as the SMS module does: nothing until one is
 * named, the console only off production (it would put every member's
 * notifications in the log), and a real provider only with its credentials.
 */

const config = vi.hoisted(() => ({
  env: {
    PUSH_PROVIDER: 'none',
    PUSHE_API_TOKEN: '',
    PUSHE_APP_ID: '',
    PUSHE_API_URL: 'https://push.test/notifications',
    isProduction: false,
  },
}));

vi.mock('../../config/env.js', () => config);
vi.mock('../../config/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

const { canSendPush, pushProvider, resetPushProviderForTests } = await import('./index.js');

afterEach(() => {
  resetPushProviderForTests();
  Object.assign(config.env, { PUSH_PROVIDER: 'none', PUSHE_API_TOKEN: '', PUSHE_APP_ID: '', isProduction: false });
  vi.unstubAllGlobals();
});

describe('the push provider', () => {
  it('is none by default, and none cannot reach a phone', () => {
    expect(pushProvider().name).toBe('none');
    expect(canSendPush()).toBe(false);
  });

  it('refuses the console in production', () => {
    Object.assign(config.env, { PUSH_PROVIDER: 'console', isProduction: true });

    expect(() => pushProvider()).toThrow(/not permitted in production/);
  });

  it('refuses Pushe without its credentials', () => {
    config.env.PUSH_PROVIDER = 'pushe';

    expect(() => pushProvider()).toThrow(/PUSHE_API_TOKEN/);
  });

  it('sends through Pushe with its token, to the given devices, carrying the link', async () => {
    Object.assign(config.env, { PUSH_PROVIDER: 'pushe', PUSHE_API_TOKEN: 'secret', PUSHE_APP_ID: 'app' });
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);

    expect(canSendPush()).toBe(true);
    await pushProvider().send(['pid_1'], { title: 'T', body: 'B', link: '/inbox' });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://push.test/notifications');
    expect((init.headers as Record<string, string>).Authorization).toBe('Token secret');
    expect(JSON.parse(init.body as string)).toMatchObject({
      app_ids: ['app'],
      data: { title: 'T', content: 'B' },
      custom_content: { link: '/inbox' },
      filters: { device_id: ['pid_1'] },
    });
  });

  it('throws when Pushe refuses, so the caller logs it', async () => {
    Object.assign(config.env, { PUSH_PROVIDER: 'pushe', PUSHE_API_TOKEN: 'secret', PUSHE_APP_ID: 'app' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));

    await expect(pushProvider().send(['pid_1'], { title: 'T', body: 'B' })).rejects.toThrow(/401/);
  });
});
