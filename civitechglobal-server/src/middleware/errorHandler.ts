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

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(
    { type: err.name, message: err.message, statusCode: (err as MaybeHttpError).statusCode },
    'Unhandled error',
  );

  // Capture the exception object only — never req/user/PII fields — before
  // responding to the client.
  Sentry.captureException(err);

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
