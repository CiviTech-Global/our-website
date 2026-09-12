import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSentry } from './config/sentry.js';
import { connectPrisma, disconnectPrisma } from './config/database.js';
import { disconnectRedis } from './config/redis.js';

initSentry(env.SENTRY_DSN || undefined, env.NODE_ENV);

const app = createApp();

function handleFatalError(label: string, err: unknown): void {
  logger.error({ err }, `${label} received`);
  setTimeout(() => process.exit(1), 1000).unref();
}

process.on('uncaughtException', (err) => handleFatalError('Uncaught exception', err));
process.on('unhandledRejection', (reason) => handleFatalError('Unhandled rejection', reason));

/**
 * Warm the connection pool before announcing the port.
 *
 * Prisma connects lazily, so without this the first query of the process pays
 * for establishing the pool — which is slow enough to trip the readiness
 * probe's own deadline and make a perfectly healthy service report itself as
 * not ready on its first check.
 *
 * Not fatal if it fails: a database that is briefly unreachable at boot is a
 * thing to report through the probe and recover from, not a reason to refuse
 * to start and lose the endpoint that would have explained it.
 */
connectPrisma()
  .then(() => logger.info('Database pool ready'))
  .catch((err: unknown) => logger.error({ err }, 'Could not reach the database at startup'));

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
