import type { Response } from 'express';
import type { StoredObject } from './storage/index.js';

/**
 * The one place a stored file is written to a response.
 *
 * Every upload comes back out through here, which is what makes "stored
 * outside the web root" mean something: there is no static path, no redirect,
 * and no second code path whose headers somebody forgot to match.
 *
 * Reviewers need to look at what they are approving — an identity document, a
 * CV, a project brief — and forcing a download for that is hostile: it fills
 * the reviewer's disk with copies of other people's personal documents and
 * puts them somewhere our retention rules do not reach. So `inline` is
 * offered, but only for types a browser genuinely renders, and never by
 * widening what may be uploaded.
 */

/**
 * Types that may be shown in place.
 *
 * This is an allow list and it is deliberately short. An HTML or SVG file
 * served inline executes script in OUR origin, which turns an upload form into
 * stored XSS — so neither is uploadable and neither is here, and the two facts
 * are kept independent on purpose. Office formats are absent for a duller
 * reason: a browser cannot render them, so "inline" would mean a blank tab
 * rather than a download, which is worse than the download.
 */
const INLINE_SAFE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

export type Disposition = 'inline' | 'attachment';

/**
 * Reads the caller's preference. Anything other than an explicit `inline`
 * means download — a malformed value should not quietly change how a file is
 * treated.
 */
export function requestedDisposition(value: unknown): Disposition {
  return value === 'inline' ? 'inline' : 'attachment';
}

export interface ServeOptions {
  mimeType: string;
  originalName: string;
  /** What the caller asked for. Downgraded silently when the type is not renderable. */
  disposition?: Disposition;
}

export function serveStoredFile(
  res: Response,
  object: StoredObject,
  { mimeType, originalName, disposition = 'attachment' }: ServeOptions
): void {
  // The request asks; the type decides. A caller cannot talk us into rendering
  // something we do not know how to render safely.
  const actual: Disposition =
    disposition === 'inline' && INLINE_SAFE.has(mimeType) ? 'inline' : 'attachment';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(object.sizeBytes));

  // Without nosniff a browser may decide a file is HTML on the strength of its
  // contents, whatever we called it — which is the whole attack this prevents.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Belt and braces for the inline case: even if something renderable somehow
  // carried script, it has no origin to reach and nothing to load.
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

  // A stored file is somebody's personal document. No shared cache should keep
  // a copy, and the browser should not hand it to the next person at the desk.
  res.setHeader('Cache-Control', 'private, no-store');

  // RFC 5987: the original name is often Persian, and a raw UTF-8 header value
  // is not portable. The ASCII fallback is deliberately generic — the real
  // name rides in the extended form.
  res.setHeader(
    'Content-Disposition',
    `${actual}; filename="file"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  );

  object.stream.pipe(res);
}
