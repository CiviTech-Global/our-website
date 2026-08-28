import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../../config/redis.js';
import { logger } from '../logger.js';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 300;

/** Rate limiter for the Telegram webhook endpoint, backed by Redis so the
 * limit is shared across every bot process instance — keyed by source IP,
 * since Telegram itself already dedupes/retries updates. */
export async function webhookRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void,
): Promise<void> {
  const key = `bot:webhook-rl:${request.ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_REQUESTS_PER_WINDOW) {
      reply.status(429).send({ ok: false, error: 'Too many requests' });
      return;
    }
  } catch (error) {
    // Fail open: a Redis outage shouldn't take down webhook delivery.
    logger.error({ error }, 'Webhook rate limit check failed');
  }

  done();
}
