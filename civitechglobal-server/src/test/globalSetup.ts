import { Redis } from 'ioredis';

/**
 * Give the suite a Redis keyspace of its own, and empty it before every run.
 *
 * The rate limiters are Redis-backed, which is right in production and was
 * quietly wrong in tests: `vitest.config.ts` declared no environment, so
 * `dotenv/config` handed the tests the development `.env` and every limiter
 * counted against the same keys a running dev server was using. Counters
 * survive the process, so after a few runs the window was saturated and the
 * suite started answering 429 to everything — `expected 429 to be 404` across
 * app.integration and sitemap.routes. Re-running one file alone did not help,
 * because the state was never in the run.
 *
 * CI never saw it: a fresh Redis service container per job is an empty
 * keyspace by accident. That is the worst kind of green.
 *
 * Database 15 rather than a key prefix, so this cannot collide with anything
 * the application chooses to store later, and FLUSHDB stays a safe thing to
 * do. `vitest.config.ts` points REDIS_URL here; dotenv does not override a
 * variable that is already set, so the .env value loses.
 */
const TEST_REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/15';

export async function setup(): Promise<void> {
  if (!/\/(1[0-5]|[0-9])$/.test(TEST_REDIS_URL)) {
    throw new Error(
      `Refusing to flush ${TEST_REDIS_URL}: the test Redis URL must name a database index, ` +
        'so that a misconfiguration cannot empty the development keyspace.'
    );
  }

  const client = new Redis(TEST_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await client.connect();
    await client.flushdb();
  } catch {
    // No Redis locally is not a reason to fail the suite. The limiters are
    // built to fail open, so the tests that do not care about them still pass,
    // and the ones that do would have needed a Redis anyway.
  } finally {
    client.disconnect();
  }
}
