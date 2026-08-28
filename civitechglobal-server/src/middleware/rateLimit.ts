import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Request } from 'express';
import { redis } from '../config/redis.js';

// Backed by the shared ioredis client (config/redis.ts) so limits are
// enforced consistently across every API process/instance, not just
// in-memory per process.
function createStore(prefix: string): RedisStore {
  return new RedisStore({
    // `call` is ioredis's raw-command-sending method, which is exactly the
    // shape rate-limit-redis expects for `sendCommand`.
    sendCommand: (...args: string[]) =>
      redis.call(args[0] as string, ...args.slice(1)) as Promise<import('rate-limit-redis').RedisReply>,
    prefix,
  });
}

const keyGenerator = (req: Request): string => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'unknown');

const rateLimitMessage = { success: false, message: 'Too many attempts, please try again later.' };

// A Redis outage must not turn into a full API outage: every limiter here
// fails OPEN (passes the request through, unlimited) rather than 500ing,
// mirroring the bot's webhook rate limiter (see webhookRateLimit.ts). The
// shared Redis client (config/redis.ts) already logs connection errors, so
// an outage stays visible even though requests aren't blocked.

/** Brute-force protection for credential submission (login/register). */
export const credentialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  skipSuccessfulRequests: true,
  message: rateLimitMessage,
  store: createStore('rl:cred:'),
  passOnStoreError: true,
});

/** Token refresh is called on every app load; keep a higher bucket. */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: rateLimitMessage,
  store: createStore('rl:refresh:'),
  passOnStoreError: true,
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  store: createStore('rl:general:'),
  passOnStoreError: true,
});
