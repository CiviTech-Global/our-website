import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

/**
 * The whole stack, through real HTTP.
 *
 * `createApp` was written to be driven by supertest and never was, so every
 * behaviour that lives in middleware rather than in a service — the response
 * envelope, the security headers, cache directives, correlation ids, the body
 * cap — was only ever verified by hand with curl. Those are exactly the things
 * a unit test cannot see and a refactor quietly breaks.
 *
 * Deliberately limited to what needs no database: these run in CI on every
 * push, where there is no Postgres. Anything needing one belongs in a separate
 * suite with a container behind it.
 */

const app = createApp();

describe('response envelope', () => {
  it('answers an unmatched API route with JSON, not Express HTML', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');

    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body).toEqual({ success: false, message: expect.stringContaining('Cannot GET') });
  });

  it('serves the same routes under /api and /api/v1', async () => {
    const unversioned = await request(app).get('/api/health/live');
    const versioned = await request(app).get('/api/v1/track/NOPENOPE12');

    expect(unversioned.status).toBe(200);
    // 404 from the handler, not from a failure to route: /api/v1 must not be
    // swallowed by the /api mount and handed on as "/v1/...".
    expect(versioned.status).toBe(404);
    expect(versioned.body.message).not.toContain('Cannot GET');
  });
});

describe('correlation ids', () => {
  it('generates one and echoes it', async () => {
    const res = await request(app).get('/api/health/live');

    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('honours one the caller supplies, so a trace survives the hop', async () => {
    const res = await request(app)
      .get('/api/health/live')
      .set('x-request-id', 'trace-from-the-edge');

    expect(res.headers['x-request-id']).toBe('trace-from-the-edge');
  });

  it('echoes it on failures too, which is when somebody quotes it', async () => {
    const res = await request(app).get('/api/nope').set('x-request-id', 'quote-me');

    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBe('quote-me');
  });
});

describe('security headers', () => {
  it('sets the headers helmet is configured for', async () => {
    const res = await request(app).get('/api/health/live');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=63072000');
    expect(res.headers['strict-transport-security']).toContain('includeSubDomains');
    // Helmet removes this; leaking the framework helps nobody but an attacker.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('cache directives', () => {
  it('makes everything uncacheable by default', async () => {
    // The dangerous failure is a shared cache serving one person's response to
    // another, so a route that forgets to decide must land on no-store.
    const res = await request(app).get('/api/health/live');

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('never caches a response to a request carrying credentials', async () => {
    const res = await request(app)
      .get('/api/insurance/catalog')
      .set('Authorization', 'Bearer whatever');

    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('body limits', () => {
  it('refuses a payload over the 1 MB cap', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ message: 'x'.repeat(1_200_000) }));

    // 413 from the body parser, before any handler or validator sees it.
    expect(res.status).toBe(413);
  });
});

describe('client error intake', () => {
  it('accepts a report and says nothing back', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .send({ message: 'Cannot read properties of undefined', kind: 'boundary' });

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  it('validates rather than storing whatever it is sent', async () => {
    const res = await request(app).post('/api/client-errors').send({ kind: 'boundary' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unknown kind', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .send({ message: 'x', kind: 'not-a-kind' });

    expect(res.status).toBe(400);
  });
});

describe('metrics endpoint', () => {
  it('is absent rather than public when no token is configured', async () => {
    // 404, not 401: an endpoint that says "unauthorised" has confirmed it
    // exists and what it is.
    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(404);
    expect(res.text).not.toContain('civitech_http_requests_total');
  });
});

describe('health probes', () => {
  it('separates liveness from readiness', async () => {
    // /live must not touch a dependency: it answers "is this process up",
    // which is what an orchestrator restarts on.
    const live = await request(app).get('/api/health/live');
    expect(live.status).toBe(200);
    expect(live.body.success).toBe(true);

    // /ready checks Postgres and Redis, so with neither running in this suite
    // it must report 503 rather than a cheerful 200.
    const ready = await request(app).get('/api/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body.checks).toHaveProperty('database');
  });
});
