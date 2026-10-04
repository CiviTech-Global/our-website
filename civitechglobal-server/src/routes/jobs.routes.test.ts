// Before anything captures process.env; see trademaster.routes.test.ts.
import 'dotenv/config';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The new job board's gate, through the real app.
 *
 * The board itself is live; only what is new hides behind FEATURE_JOBS_V2.
 * So the thing to pin is that the new routes are absent while it is off —
 * including the signed-in ones, which must not answer 401 and give away that
 * they exist — and that the live board under /market is untouched either way.
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

describe('the job board v2 feature gate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('answers 404 on a public route when the flag is off', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_JOBS_V2: undefined });
    const res = await request(app).get('/api/v1/jobs/companies');
    expect(res.status).toBe(404);
  });

  it('answers 404 rather than 401 on a signed-in route when off', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_JOBS_V2: undefined });
    const res = await request(app).get('/api/v1/jobs/me/saved');
    expect(res.status).toBe(404);
  });

  it('asks for a sign-in on a signed-in route when on', async () => {
    const app = await appWith({ NODE_ENV: 'production', FEATURE_JOBS_V2: 'true' });
    const res = await request(app).get('/api/v1/jobs/me/saved');
    expect(res.status).toBe(401);
  });
});
