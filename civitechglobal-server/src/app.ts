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
import { errorHandler } from './middleware/errorHandler.js';
import { generalRateLimiter } from './middleware/rateLimit.js';
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

  // Populate req.user (when a valid token is present) before routes/rate-limits key off it.
  app.use(optionalAuth);

  app.get('/api/health/live', (_req, res) => {
    res.json({ success: true, message: 'CiviTech Global API is alive' });
  });

  app.get('/api/health/ready', async (_req, res) => {
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

  app.use('/api', generalRateLimiter, routes);

  app.use(errorHandler);

  return app;
}

export { env };

