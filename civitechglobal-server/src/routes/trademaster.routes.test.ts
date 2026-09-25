// Before anything captures process.env. config/env.ts loads this too, but not
// until the app is imported inside a test — by which time the snapshot below
// would already have been taken without DATABASE_URL in it, and restoring that
// snapshot between cases would leave the app unable to start.
import 'dotenv/config';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The module must be invisible in production until it is finished.
 *
 * Tested through the real app rather than by reading the flag, because the
 * thing that matters is not "the boolean is false" but "a request gets
 * nothing" — and those come apart the moment somebody adds a route above the
 * gate, or mounts the router somewhere else, or reorders the middleware.
 *
 * The gate reads its environment at import time, so each case builds the app
 * from a fresh module registry.
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

/** The routing 404, as opposed to a handler answering "no such record". */
function looksUnrouted(body: { message?: string }): boolean {
  return /^Cannot (GET|POST) /.test(body.message ?? '');
}

describe('the TradeMaster feature gate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('answers 404 on a public route when the flag is off', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: undefined });
    const res = await request(app).get('/api/v1/trademaster/shops');

    expect(res.status).toBe(404);
  });

  it('answers 404 rather than 401 on an authenticated route when off', async () => {
    // A 401 would say "this exists, bring a token". The module should be
    // indistinguishable from one that was never built, so the gate has to sit
    // in front of `authenticate`, not behind it.
    const app = await appWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: undefined });
    const res = await request(app).get('/api/v1/trademaster/me/shops');

    expect(res.status).toBe(404);
  });

  it('answers 404 rather than 403 on the review desk when off', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: undefined });
    const res = await request(app).get('/api/v1/trademaster/admin/shops');

    expect(res.status).toBe(404);
  });

  it('routes the public board when the flag is on', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: 'true' });
    const res = await request(app).get('/api/v1/trademaster/shops');

    // Not asserting 200: without a database the handler cannot answer. What
    // this proves is that the request reached a handler at all, which is the
    // half the gate is responsible for.
    expect(looksUnrouted(res.body as { message?: string })).toBe(false);
  });

  it('still requires a token on the seller routes when the flag is on', async () => {
    // The gate opens the door; it must not also unlock everything behind it.
    const app = await appWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: 'true' });
    const res = await request(app).get('/api/v1/trademaster/me/shops');

    expect(res.status).toBe(401);
  });
});
