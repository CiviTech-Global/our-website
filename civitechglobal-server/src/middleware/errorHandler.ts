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

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(
    { type: err.name, message: err.message, statusCode: (err as MaybeHttpError).statusCode },
    'Unhandled error',
  );

  // Capture the exception object only — never req/user/PII fields — before
  // responding to the client.
  if (shouldReportToSentry(err)) {
    Sentry.captureException(err);
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
