import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { defineConfig } from 'vitest/config';

/**
 * The suite's Redis: database 15 on the Redis this machine's API uses.
 *
 * Host and port come from REDIS_URL (the shell's, else the development
 * `.env`), because they differ between machines: this one cannot bind 6379
 * (Windows reserves the range for Hyper-V) and runs Redis on 16379. A fixed
 * 6379 meant the suite ran with no Redis at all there, and the tests that
 * build the app in production mode waited on a connection that never came
 * and timed out whenever the machine was busy.
 *
 * Only a Redis on this machine is used. src/test/globalSetup.ts empties the
 * database before every run, and a REDIS_URL left pointing at a shared or
 * remote server must never be the one emptied. CI has no REDIS_URL and gets
 * its service container on 6379, as before.
 */
function testRedisUrl(): string {
  const configured =
    process.env.REDIS_URL?.trim() ||
    (existsSync('.env') ? parse(readFileSync('.env')).REDIS_URL?.trim() : undefined);
  let url: URL;
  try {
    url = new URL(configured || 'redis://127.0.0.1:6379');
  } catch {
    url = new URL('redis://127.0.0.1:6379');
  }
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) url = new URL('redis://127.0.0.1:6379');
  url.pathname = '/15';
  return url.toString();
}

const REDIS_URL = testRedisUrl();
// The global setup runs in this process, not in a test worker, so it reads
// the same value from here.
process.env.REDIS_URL = REDIS_URL;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /**
     * Set before anything imports `src/config/env.ts`. `dotenv/config` does not
     * overwrite a variable that already has a value, so this wins over the
     * development `.env` and the suite gets a Redis database of its own —
     * see src/test/globalSetup.ts for what went wrong without it.
     */
    env: { REDIS_URL },
    globalSetup: ['./src/test/globalSetup.ts'],
  },
});
