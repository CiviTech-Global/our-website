// Before the env snapshot below. See the same note in manifest.test.ts.
import 'dotenv/config';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin panel's demo controls.
 *
 * DELETE /admin/demo empties every row a seed created. That is the most
 * destructive endpoint in this application, so the tests here are about who
 * cannot reach it rather than what it does when they can.
 */

async function appWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const { createApp } = await import('../app.js');
  return createApp();
}

/** The routing 404, as opposed to a handler answering "no". */
function looksUnrouted(body: { message?: string }): boolean {
  return /^Cannot (GET|POST|DELETE) /.test(body.message ?? '');
}

describe('the demo data endpoints', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  const ROUTES: Array<[string, string]> = [
    ['get', '/api/v1/admin/demo'],
    ['post', '/api/v1/admin/demo/seed'],
    ['delete', '/api/v1/admin/demo'],
  ];

  function send(app: Parameters<typeof request>[0], method: string, url: string) {
    if (method === 'get') return request(app).get(url);
    if (method === 'delete') return request(app).delete(url);
    return request(app).post(url).send({});
  }

  it('does not exist at all in production', async () => {
    // 404 rather than 403: a 403 announces that a "wipe the database" endpoint
    // lives here and invites somebody to keep trying.
    const app = await appWith({ NODE_ENV: 'production' });

    for (const [method, url] of ROUTES) {
      const res = await send(app, method, url);
      expect(res.status, `${method} ${url}`).toBe(404);
    }
  });

  it('requires authentication outside production', async () => {
    const app = await appWith({ NODE_ENV: 'development' });

    for (const [method, url] of ROUTES) {
      const res = await send(app, method, url);

      // 401, and specifically not 404 — which would mean the previous test was
      // passing because the routes are never mounted at all.
      expect(res.status, `${method} ${url}`).toBe(401);
      expect(looksUnrouted(res.body as { message?: string })).toBe(false);
    }
  });

  it('is mounted in development, so the production test is meaningful', async () => {
    const app = await appWith({ NODE_ENV: 'development' });
    const res = await request(app).get('/api/v1/admin/demo');

    expect(looksUnrouted(res.body as { message?: string })).toBe(false);
  });

  it('keeps the production guard even with a demo flag set', async () => {
    // There is no environment variable that opens this in production, and a
    // plausible-looking one must not appear to.
    const app = await appWith({ NODE_ENV: 'production', FEATURE_DEMO: 'true' });

    expect((await request(app).delete('/api/v1/admin/demo')).status).toBe(404);
  });
});
