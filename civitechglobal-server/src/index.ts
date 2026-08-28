import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSentry } from './config/sentry.js';
import { disconnectPrisma } from './config/database.js';
import { disconnectRedis } from './config/redis.js';

initSentry(env.SENTRY_DSN || undefined, env.NODE_ENV);

const app = createApp();

function handleFatalError(label: string, err: unknown): void {
  logger.error({ err }, `${label} received`);
  setTimeout(() => process.exit(1), 1000).unref();
}

process.on('uncaughtException', (err) => handleFatalError('Uncaught exception', err));
process.on('unhandledRejection', (reason) => handleFatalError('Unhandled rejection', reason));

const server = app.listen(env.PORT, () => {
  logger.info(`API server listening on port ${env.PORT}`);
});

function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await disconnectPrisma();
      await disconnectRedis();
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
