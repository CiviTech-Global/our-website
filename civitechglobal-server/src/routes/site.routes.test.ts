// Before anything captures process.env; see trademaster.routes.test.ts.
import 'dotenv/config';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The site-settings endpoints, through the real app.
 *
 * The public read is every page's business and must answer without a token;
 * the write changes what the company's own site shows, so the thing to pin is
 * that both admin routes refuse an anonymous caller with 401 — and that the
 * 401 comes from the auth gate, not from the route not existing.
 */

vi.mock('../services/site.service.js', () => ({
  getSocialRail: vi.fn(async () => ({ enabled: false, links: [] })),
  saveSocialRail: vi.fn(async (input: unknown) => input),
}));

// With no Redis reachable, the shared client's commands queue behind its
// reconnect loop, and every request through the rate limiter waits seconds
// for a store error that passOnStoreError was always going to wave through.
// What is under test here is routing and the auth gate, not the limiter, so
// the store's commands fail fast instead.
vi.mock('../config/redis.js', () => ({
  redis: {
    call: vi.fn(async () => {
      throw new Error('no redis in tests');
    }),
  },
  pingRedis: vi.fn(async () => {}),
  disconnectRedis: vi.fn(async () => {}),
}));

async function app() {
  vi.resetModules();
  const { createApp } = await import('../app.js');
  return createApp();
}

const original = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...original };
});

describe('the social rail endpoints', () => {
  it('serves the public read without a token', async () => {
    const res = await request(await app()).get('/api/v1/site/social-rail');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { enabled: false, links: [] } });
  });

  it('caches the public read briefly', async () => {
    const res = await request(await app()).get('/api/v1/site/social-rail');

    expect(res.headers['cache-control']).toContain('public');
    expect(res.headers['cache-control']).toContain('max-age=60');
  });

  const ADMIN_ROUTES: Array<[string, string]> = [
    ['get', '/api/v1/site/admin/social-rail'],
    ['put', '/api/v1/site/admin/social-rail'],
  ];

  it('requires a token on both admin routes', async () => {
    const application = await app();

    for (const [method, url] of ADMIN_ROUTES) {
      const pending = method === 'get' ? request(application).get(url) : request(application).put(url).send({});
      const res = await pending;

      // 401, and specifically not 404 — which would mean the routes are
      // simply not mounted and the gate is untested.
      expect(res.status, `${method} ${url}`).toBe(401);
      expect(/^Cannot /.test((res.body as { message?: string }).message ?? '')).toBe(false);
    }
  });
});
