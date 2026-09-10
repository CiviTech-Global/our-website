import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { Sentry } from '../config/sentry.js';

export class AppError extends Error {
  statusCode: number;
  errors?: Array<{ path: string; message: string }>;

  constructor(message: string, statusCode: number, errors?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface MaybeHttpError extends Error {
  statusCode?: number;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Errors we deliberately throw to shape a 4xx response are control flow, not
 * incidents. An "Invalid credentials" on every mistyped password would spend
 * the Sentry quota and bury the 500s that actually need attention, so only
 * server-side failures are reported.
 */
const CLIENT_ERROR_NAMES = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError']);

function shouldReportToSentry(err: Error): boolean {
  const statusCode = (err as MaybeHttpError).statusCode;
  if (typeof statusCode === 'number') return statusCode >= 500;
  // These carry no statusCode but are answered below as 401s — an expired
  // token is the normal end of a session, not an incident.
  if (CLIENT_ERROR_NAMES.has(err.name)) return false;
  // Anything else never passed through AppError — it is an unhandled throw,
  // which is exactly what Sentry is for.
  return true;
}

/**
 * Anything under /api that matched no route.
 *
 * Without this, Express answers with its own HTML error page — which breaks the
 * { success, message } envelope every other response keeps, and hands an API
 * client a block of markup to parse when it asked for JSON.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // Echoed on every failure so a user can quote it and it can be found in the
  // logs. Set on the response rather than in the body: it belongs to the
  // request, not to the error, and this way it is present on 500s too.
  if (_req.id) res.setHeader('x-request-id', String(_req.id));

  const statusCode = (err as MaybeHttpError).statusCode;

  // Level by severity, for the same reason Sentry filters by it: a 404 on a
  // mistyped tracking code and a 429 on a rate limit are the system working,
  // not incidents. Logging them at error level buries the 500s that matter and
  // costs real money in log volume once traffic is non-trivial. Anything
  // without a statusCode never passed through AppError, so it is an unhandled
  // throw and stays at error.
  const level = typeof statusCode === "number" && statusCode < 500 ? "warn" : "error";
  logger[level](
    { type: err.name, message: err.message, statusCode, requestId: _req.id },
    level === "warn" ? "Request rejected" : "Unhandled error",
  );

  // Capture the exception object only — never req/user/PII fields — before
  // responding to the client.
  if (shouldReportToSentry(err)) {
    // The request id is the one thing that ties a Sentry event to the log
    // lines around it, and to whatever the user quoted when they reported it.
    Sentry.captureException(err, { tags: { request_id: String(_req.id ?? '') } });
  }

  if (err instanceof AppError) {
    const response: Record<string, unknown> = { success: false, message: err.message };
    if (err.errors) response.errors = err.errors;
    res.status(err.statusCode).json(response);
    return;
  }

  const httpErr = err as MaybeHttpError;
  if (httpErr.statusCode === 400 && httpErr.errors) {
    res.status(400).json({ success: false, message: err.message, errors: httpErr.errors });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired' });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
}
