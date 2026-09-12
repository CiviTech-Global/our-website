import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { openApiDocument } from './openapi.js';

/**
 * Keeps the hand-written specification honest.
 *
 * A document that describes endpoints which no longer exist is worse than no
 * document, because people believe it. Every documented path is driven through
 * the real app here: it does not check the response shape — that needs a
 * database — but it does prove the route is still there, which is the failure
 * that actually happens when somebody renames or removes one.
 */

const app = createApp();

/** The routing 404, as opposed to a handler answering "no such record". */
function isUnrouted(status: number, body: { message?: string }): boolean {
  return status === 404 && /^Cannot (GET|POST|PATCH|PUT|DELETE) /.test(body.message ?? '');
}

/** Path templates carry {braces}; supertest needs something concrete. */
function concrete(path: string): string {
  return path.replace('{slug}', 'third-party-motor').replace('{code}', 'AAAAAAAAAA');
}

const operations = Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
  Object.keys(methods).map((method) => ({ path, method })),
);

describe('the specification matches the app', () => {
  it('documents a meaningful number of operations', () => {
    // Guards against the list silently emptying — a passing suite over nothing
    // is the failure mode of every "assert each item" test.
    expect(operations.length).toBeGreaterThanOrEqual(14);
  });

  it.each(operations)('$method $path is routed', async ({ path, method }) => {
    const url = `/api/v1${concrete(path)}`;
    const res = await (method === 'get' ? request(app).get(url) : request(app).post(url).send({}));

    expect(isUnrouted(res.status, res.body)).toBe(false);
  });

  it.each(operations)('$method $path is routed on the unversioned alias too', async ({ path, method }) => {
    const url = `/api${concrete(path)}`;
    const res = await (method === 'get' ? request(app).get(url) : request(app).post(url).send({}));

    expect(isUnrouted(res.status, res.body)).toBe(false);
  });

  it('does not describe the admin surface', () => {
    // Enumerating staff-only endpoints in a document anyone can fetch is free
    // reconnaissance, and they are not a published interface anyway.
    for (const path of Object.keys(openApiDocument.paths)) {
      expect(path).not.toContain('/admin');
    }
  });

  it('names both servers, so a consumer knows which to target', () => {
    expect(openApiDocument.servers.map((s) => s.url)).toEqual(['/api/v1', '/api']);
  });
});
