import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * Cross-process notification: the API tells the bot that a request arrived.
 *
 * The API has no Telegram credentials and should not acquire any — the bot
 * process already holds the token, and handing a second service the ability to
 * post as the bot widens the blast radius of an API compromise for no gain.
 * Both processes already share Redis, so a pub/sub channel carries the event
 * across with no new dependency and no HTTP coupling between them.
 *
 * Delivery is at-most-once by design. If the bot is down, the notification is
 * lost — and that is the right trade: the admin panel is the system of record,
 * a missed Telegram ping costs a few minutes of latency, and the alternative
 * (a durable queue with retries and dead letters) is a lot of machinery to
 * guarantee delivery of a convenience.
 */

export const NEW_REQUEST_CHANNEL = 'insurance:new-request';

export interface NewRequestEvent {
  requestId: string;
  trackingCode: string;
  productTitle: string;
  categoryTitle: string;
  /** Deliberately no name, phone, city or answers — see the note below. */
  createdAt: string;
}

export async function publishNewRequest(event: NewRequestEvent): Promise<void> {
  try {
    await redis.publish(NEW_REQUEST_CHANNEL, JSON.stringify(event));
  } catch (error) {
    // A failed notification must never fail the submission: the applicant's
    // request is already committed and they are owed a confirmation, not a 500.
    logger.error({ err: error, requestId: event.requestId }, 'Failed to publish new-request notification');
  }
}
