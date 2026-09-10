import type { NextFunction, Request, Response } from 'express';

/**
 * Cache-Control for responses that are the same for everyone.
 *
 * Express already emits an ETag for every JSON body, so a repeat request
 * conditionally revalidates and gets a 304. That saves the bytes but still
 * costs a round trip, a database read and a serialisation on every page view.
 * A max-age lets the browser — and any CDN later put in front — answer without
 * asking at all.
 *
 * Only ever applied to endpoints with no per-user variation. Anything
 * authenticated, anything reflecting one person's data, and anything a
 * tracking code unlocks must stay uncached, or a shared cache will hand one
 * visitor another's response.
 */

export interface PublicCacheOptions {
  /** How long a browser may reuse the response without asking. */
  maxAgeSeconds: number;
  /**
   * How long a shared cache may keep serving a stale copy while it refreshes
   * in the background. This is what makes a catalog change propagate without
   * a thundering herd on the origin.
   */
  staleWhileRevalidateSeconds?: number;
}

/**
 * The insurance catalog changes a few times a year and is identical for every
 * visitor, which makes it the one genuinely cacheable thing the API serves.
 */
export function publicCache({
  maxAgeSeconds,
  staleWhileRevalidateSeconds = 0,
}: PublicCacheOptions) {
  const directives = [`public`, `max-age=${maxAgeSeconds}`];
  if (staleWhileRevalidateSeconds > 0) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidateSeconds}`);
  }
  const value = directives.join(', ');

  return (req: Request, res: Response, next: NextFunction): void => {
    // A signed-in visitor may see the same catalog, but a shared cache must not
    // be allowed to learn that from a request carrying credentials — the safe
    // reading of "public" depends on the response never varying by identity,
    // and the cheapest way to guarantee that is to skip authenticated calls.
    if (req.user || req.get('authorization') || req.get('cookie')) {
      res.setHeader('Cache-Control', 'no-store');
      next();
      return;
    }

    res.setHeader('Cache-Control', value);
    // Responses differ by nothing except encoding, which nginx handles. Stating
    // it stops a cache keying on something it should not.
    res.setHeader('Vary', 'Accept-Encoding');
    next();
  };
}

/**
 * The default for everything else.
 *
 * Applied broadly so that a new endpoint is uncacheable until somebody decides
 * otherwise. The failure mode of forgetting this is a shared cache serving one
 * person's request to another, which is worse than any latency it would save.
 */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
