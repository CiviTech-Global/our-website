import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationTarget {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

function formatErrors(error: ZodError) {
  return error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
}

function validationError(message: string, errors: ReturnType<typeof formatErrors>) {
  return Object.assign(new Error(message), { statusCode: 400, errors });
}

export function validate(schemaOrTarget: ZodSchema | ValidationTarget) {
  const target: ValidationTarget = schemaOrTarget instanceof ZodSchema ? { body: schemaOrTarget } : schemaOrTarget;

  return (req: Request, _res: Response, next: NextFunction) => {
    if (target.body) {
      const result = target.body.safeParse(req.body);
      if (!result.success) return next(validationError('Validation failed', formatErrors(result.error)));
      req.body = result.data;
    }

    if (target.query) {
      const result = target.query.safeParse(req.query);
      if (!result.success) return next(validationError('Validation failed', formatErrors(result.error)));
      // Express 5 exposes `req.query` as a getter-only property, so a plain
      // assignment throws ("Cannot set property query of #<IncomingMessage>
      // which has only a getter"). Redefine it instead to keep controllers
      // reading the coerced/validated value via `req.query` unchanged.
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    if (target.params) {
      const result = target.params.safeParse(req.params);
      if (!result.success) return next(validationError('Validation failed', formatErrors(result.error)));
      Object.defineProperty(req, 'params', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    next();
  };
}
