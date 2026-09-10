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

/**
 * Password-reset and verification emails.
 *
 * Tight, because each request sends mail to somebody. Unthrottled it is a way
 * to use us to flood a third party's inbox, and `skipSuccessfulRequests` is
 * deliberately off for the same reason — a successful send is exactly the
 * thing being abused.
 */
export const accountEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: rateLimitMessage,
  store: createStore('rl:acctmail:'),
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

/**
 * One-time code requests.
 *
 * Every send costs real money and lands on someone's phone, so this is the one
 * limiter where being noisy matters more than being permissive: an unthrottled
 * endpoint here is both an SMS bill and a way to harass a phone number. The
 * per-number cooldown in otp.service is the other half — this bounds a single
 * source hitting many numbers, that bounds many sources hitting one number.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.' },
  store: createStore('rl:otp:'),
  passOnStoreError: true,
});

/** Public, unauthenticated form submission. */
export const insuranceSubmitRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.' },
  store: createStore('rl:insurance:'),
  passOnStoreError: true,
});

/**
 * Project enquiries. Tighter than the insurance limiter because each request
 * can carry 25 MB of attachments, so the cost of a flood is disk and CPU, not
 * just rows. This is the per-CALLER bound; the per-IDENTITY rules (three a day,
 * one hour apart) live in client-identity.service.ts and cover the case of one
 * person moving between addresses.
 */
export const projectSubmitRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.' },
  store: createStore('rl:project:'),
  passOnStoreError: true,
});

/**
 * Answering a proposal (accept/decline) and reading a tracking code. Cheap
 * actions with no upload behind them, so they get their own budget rather than
 * sharing the submit limiter — a client who filed a brief this hour must still
 * be able to accept the proposal that came back.
 */
export const projectRespondRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.' },
  store: createStore('rl:project-respond:'),
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
