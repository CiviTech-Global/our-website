import { describe, it, expect, vi } from 'vitest';
import { z, ZodError } from 'zod';
import type { Request, Response } from 'express';
import { errorHandler, AppError } from './errorHandler.js';

vi.mock('../config/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
const captureException = vi.fn();
vi.mock('../config/sentry.js', () => ({ Sentry: { captureException: (...a: unknown[]) => captureException(...a) } }));

function run(err: Error) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  errorHandler(err, { id: 'req-1' } as unknown as Request, res as unknown as Response, vi.fn());
  return res;
}

describe('errorHandler', () => {
  /**
   * Every multipart route parses its schema by hand, because the structured
   * half of the request arrives as a JSON form field rather than as the body —
   * so validate() never sees it and the ZodError reaches here raw. Before this
   * branch existed those routes answered a bad payload with "Internal server
   * error", blaming us for the caller's mistake and dropping the per-field
   * detail that would have said which field was wrong.
   */
  it('answers a hand-parsed schema failure with 400 and the field paths', () => {
    const schema = z.object({ legalLastName: z.string().min(2), nested: z.object({ n: z.number() }) });
    let err!: ZodError;
    try {
      schema.parse({ legalLastName: 'K', nested: { n: 'x' } });
    } catch (caught) {
      err = caught as ZodError;
    }

    const res = run(err);

    expect(res.statusCode).toBe(400);
    const body = res.body as { success: boolean; message: string; errors: Array<{ path: string; message: string }> };
    expect(body.success).toBe(false);
    expect(body.message).toBe('Validation failed');
    expect(body.errors.map((e) => e.path)).toEqual(['legalLastName', 'nested.n']);
  });

  it('does not spend Sentry quota on a caller mistake', () => {
    captureException.mockClear();
    try {
      z.object({ a: z.string() }).parse({});
    } catch (err) {
      run(err as Error);
    }
    expect(captureException).not.toHaveBeenCalled();
  });

  it('still reports an unhandled throw', () => {
    captureException.mockClear();
    run(new Error('the database fell over'));
    expect(captureException).toHaveBeenCalledOnce();
  });

  it('leaves AppError untouched', () => {
    const res = run(new AppError('Not found', 404));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Not found' });
  });
});
