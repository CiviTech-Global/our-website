import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { env } from './env.js';

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedis(): Redis {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  });

  client.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  client.on('connect', () => {
    logger.debug('Redis connected');
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export async function pingRedis(): Promise<void> {
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch (err) {
    logger.error({ err }, 'Error closing Redis connection');
  }
}
