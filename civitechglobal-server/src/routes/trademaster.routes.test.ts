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

/**
 * One route in this module only works because of where it is declared.
 *
 * `/products/images/:id` and `/products/:shopSlug/:productSlug` both match two
 * segments after /products, so Express hands the request to whichever was
 * declared first. Declared the other way round, every image request would be
 * answered by the product handler looking for a shop called "images" — a 404
 * that looks like a missing product rather than a routing mistake, which is
 * exactly the kind of thing that survives a code review.
 *
 * Asserted against the router's own stack rather than by making requests,
 * because the distinguishing behaviour needs a database and this invariant
 * does not.
 */
describe('route declaration order', () => {
  interface Layer {
    route?: { path: string };
  }

  async function paths(): Promise<string[]> {
    vi.resetModules();
    process.env.FEATURE_TRADEMASTER = 'true';
    const router = (await import('./trademaster.routes.js')).default;
    return ((router as unknown as { stack: Layer[] }).stack ?? [])
      .map((layer) => layer.route?.path)
      .filter((path): path is string => typeof path === 'string');
  }

  it('declares the image route before the catch-all product route', async () => {
    const declared = await paths();
    const image = declared.indexOf('/products/images/:id');
    const product = declared.indexOf('/products/:shopSlug/:productSlug');

    expect(image, '/products/images/:id is not declared at all').toBeGreaterThanOrEqual(0);
    expect(product, '/products/:shopSlug/:productSlug is not declared at all').toBeGreaterThanOrEqual(0);
    expect(image).toBeLessThan(product);
  });
});

/**
 * The purchase path is built and not offered.
 *
 * The module is a catalogue for now, so every order route must be absent —
 * including in development, where the module itself is on. That asymmetry is
 * the whole point of the second flag, and it is the kind of thing that quietly
 * stops being true when somebody adds a route and copies the wrong neighbour.
 */
describe('the TradeMaster orders gate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  const ORDER_ROUTES: Array<[string, string]> = [
    ['post', '/api/v1/trademaster/checkout'],
    ['get', '/api/v1/trademaster/me/orders'],
    ['get', '/api/v1/trademaster/me/orders/abc'],
    ['post', '/api/v1/trademaster/me/orders/abc/pay'],
    ['post', '/api/v1/trademaster/me/payments/confirm'],
    ['post', '/api/v1/trademaster/me/orders/abc/move'],
    ['get', '/api/v1/trademaster/me/shops/abc/orders'],
  ];

  it('answers 404 on every order route with the module on and orders off', async () => {
    // One app for all seven, not one per route. vi.resetModules() gives each
    // fresh app its own Redis client which then retries a connection it may not
    // have; building seven of them made the later assertions time out purely
    // from accumulated retry delay, which looked like a routing failure.
    const app = await appWith({
      NODE_ENV: 'development',
      FEATURE_TRADEMASTER: 'true',
      FEATURE_TRADEMASTER_ORDERS: undefined,
    });

    for (const [method, url] of ORDER_ROUTES) {
      const res = await (method === 'get'
        ? request(app).get(url)
        : request(app).post(url).send({}));

      // 404, not 401: the gate sits in front of `authenticate`, so an
      // unauthenticated probe cannot even learn that the route exists. The
      // first version of this had the two the other way round and returned 401,
      // which a test caught and a reading of the code had not.
      expect(res.status, `${method} ${url}`).toBe(404);
    }

    // The same app must still serve the catalogue. Without this, the seven
    // assertions above would pass just as well if the orders gate had
    // accidentally taken the whole module down with it — which is the more
    // likely mistake of the two.
    const catalogue = await request(app).get('/api/v1/trademaster/shops');
    expect(looksUnrouted(catalogue.body as { message?: string })).toBe(false);
  });

  it('routes the order path when the flag is explicitly on', async () => {
    // So the negative tests above cannot pass because of a typo in a URL.
    const app = await appWith({
      NODE_ENV: 'development',
      FEATURE_TRADEMASTER: 'true',
      FEATURE_TRADEMASTER_ORDERS: 'true',
    });

    const res = await request(app).get('/api/v1/trademaster/me/orders');
    // 401 rather than 404: reachable, and still behind authentication.
    expect(res.status).toBe(401);
  });

  it('keeps orders off in production even when the module is on', async () => {
    const app = await appWith({
      NODE_ENV: 'production',
      FEATURE_TRADEMASTER: 'true',
      FEATURE_TRADEMASTER_ORDERS: undefined,
    });

    expect((await request(app).post('/api/v1/trademaster/checkout').send({})).status).toBe(404);
  });
});
