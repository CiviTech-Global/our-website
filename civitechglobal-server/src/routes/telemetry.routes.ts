import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { clientErrorRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { recordClientError, renderMetrics } from '../services/metrics.service.js';

const router = Router();

/**
 * Browser errors, and metrics.
 *
 * Front-end failures were entirely invisible: a broken page was something you
 * learned about when somebody bothered to tell you, and most people do not
 * bother, they leave. This is the smallest thing that fixes that — the browser
 * posts what it caught, the server writes it to the same structured log as
 * everything else. No SDK, so it costs the bundle about a kilobyte rather than
 * the thirty-odd a full one does.
 */

const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  // Bounded hard: a stack is the largest thing a page can make us store, and
  // this endpoint is unauthenticated.
  stack: z.string().trim().max(4000).optional(),
  source: z.string().trim().max(500).optional(),
  line: z.number().int().min(0).max(10_000_000).optional(),
  column: z.number().int().min(0).max(10_000_000).optional(),
  /** Route the page was on, not the full URL — query strings carry codes. */
  route: z.string().trim().max(200).optional(),
  kind: z.enum(['error', 'unhandledrejection', 'boundary']).default('error'),
  release: z.string().trim().max(60).optional(),
});

router.post(
  '/client-errors',
  clientErrorRateLimiter,
  validate(clientErrorSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof clientErrorSchema>;
    recordClientError();

    // warn, not error: a browser extension injecting a script into the page
    // produces these too, and they are not our incidents. The volume is the
    // signal — one is noise, two hundred of the same message is a release.
    logger.warn(
      {
        clientError: body,
        userAgent: req.get('user-agent')?.slice(0, 200),
        requestId: req.id,
      },
      'Client-side error',
    );

    // 204: the page is already broken, and there is nothing useful to say back.
    res.status(204).end();
  },
);

/**
 * Prometheus scrape endpoint.
 *
 * Not public. There is no scraper on this host yet, so rather than leave an
 * unauthenticated endpoint describing our traffic shape, it is gated on a token
 * and simply absent until one is configured.
 */
router.get('/metrics', (req: Request, res: Response) => {
  if (!env.METRICS_TOKEN) throw new AppError('Not found', 404);

  const provided = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (provided !== env.METRICS_TOKEN) throw new AppError('Not found', 404);

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(renderMetrics());
});

export default router;
