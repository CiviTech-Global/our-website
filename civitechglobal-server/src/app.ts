import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { logger } from './config/logger.js';
import { prisma } from './config/database.js';
import { pingRedis } from './config/redis.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalRateLimiter } from './middleware/rateLimit.js';
import { recordRequest } from './services/metrics.service.js';
import { noStore } from './middleware/cacheControl.js';
import { optionalAuth } from './middleware/authenticate.js';
import routes from './routes/index.js';

/** Builds the Express app without starting a listener — used by both the
 * real entrypoint (src/index.ts) and tests (supertest against the app). */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ hsts: { maxAge: 63072000, includeSubDomains: true, preload: true } }));
  app.use(cors(corsOptions));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => {
        const header = req.headers['x-request-id'];
        if (typeof header === 'string' && header.trim()) return header.trim();
        if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
        return randomUUID();
      },
      customProps: (req) => ({
        user: req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
      }),
    }),
  );

  app.use((req, res, next) => {
    res.setHeader('x-request-id', req.id as string);
    next();
  });

  // Timed here rather than inside the router so the measurement includes body
  // parsing, authentication and the rate limiters — everything the caller
  // actually waited for, not just the handler.
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      // originalUrl, not req.route.path: the latter is relative to whichever
      // router matched, so it labels /api/insurance/catalog as "/catalog" and
      // collides with every other router that has one. req.baseUrl would put
      // the mount back, except Express restores it while unwinding the router
      // stack, so by the time this listener runs it is empty again.
      // recordRequest collapses ids and codes out of the path itself.
      recordRequest(req.method, req.originalUrl, res.statusCode, seconds);
    });
    next();
  });

  // Populate req.user (when a valid token is present) before routes/rate-limits key off it.
  app.use(optionalAuth);

  // Health probes must never be cached. A proxy holding a 200 for even a few
  // seconds reports a dead service as healthy, which is the one answer these
  // endpoints exist to prevent.
  app.use(['/api/health', '/api/v1/health'], noStore);

  // Registered on both mounts, like every other route, so a probe configured
  // against the versioned base does not silently 404.
  app.get(['/api/health/live', '/api/v1/health/live'], (_req, res) => {
    res.json({ success: true, message: 'CiviTech Global API is alive' });
  });

  app.get(['/api/health/ready', '/api/v1/health/ready'], async (_req, res) => {
    const checks: Record<string, boolean> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (err) {
      logger.error({ message: (err as Error).message }, 'Readiness check failed: database');
      checks.database = false;
    }

    try {
      await pingRedis();
      checks.redis = true;
    } catch (err) {
      logger.error({ message: (err as Error).message }, 'Readiness check failed: redis');
      checks.redis = false;
    }

    const healthy = Object.values(checks).every(Boolean);
    res.status(healthy ? 200 : 503).json({ success: healthy, message: healthy ? 'API is ready' : 'API is not ready', checks });
  });

  // Uncacheable by default. Endpoints that are genuinely public and identical
  // for everyone opt back in with publicCache(); anything that forgets stays
  // safe, because a shared cache serving one person's response to another is
  // worse than any latency it would have saved.
  //
  // Mounted twice. /api/v1 is the address to publish and the one a breaking
  // change would leave behind by adding /api/v2 beside it. /api is the
  // unversioned alias every existing client already uses, frozen at v1 — it
  // stays because silently repointing live callers is not a migration.
  //
  // /api/v1 must be mounted first: app.use('/api') also matches /api/v1/x and
  // would hand the router "/v1/x", which matches nothing.
  app.use('/api/v1', noStore, generalRateLimiter, routes);
  app.use('/api', noStore, generalRateLimiter, routes);

  app.use('/api', notFoundHandler);

  app.use(errorHandler);

  return app;
}

export { env };

