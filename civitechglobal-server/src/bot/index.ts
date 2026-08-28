import 'dotenv/config';
import type { FastifyInstance } from 'fastify';
import { createApp } from './app.js';
import { botConfig } from './config.js';
import { logger } from './logger.js';
import { initSentry } from '../config/sentry.js';
import { disconnectPrisma } from '../config/database.js';
import { disconnectRedis } from '../config/redis.js';

initSentry(botConfig.sentryDsn || undefined, botConfig.nodeEnv);

function gracefulShutdown(app: FastifyInstance, signal: string): void {
  logger.info(`${signal} received. Shutting down gracefully...`);

  void (async () => {
    try {
      // Fastify's onClose hook (see bot/app.ts) stops bot polling.
      await app.close();
      logger.info('Bot server closed');
      await disconnectPrisma();
      await disconnectRedis();
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
    } finally {
      process.exit(0);
    }
  })();

  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

async function bootstrap(): Promise<void> {
  try {
    const app = await createApp();
    await app.listen({ port: botConfig.port, host: '0.0.0.0' });
    logger.info({ port: botConfig.port, mode: botConfig.mode }, 'Bot server started');

    process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start bot server');
    process.exit(1);
  }
}

void bootstrap();
