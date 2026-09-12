/**
 * Reports uncaught browser errors to our own API.
 *
 * Not Sentry. The browser SDK is around thirty kilobytes gzipped on a bundle
 * whose whole initial payload is a hundred, and what it buys over this is
 * breadcrumbs and release tracking we do not use yet. This is the part that
 * matters: knowing a page broke at all, rather than waiting for somebody to
 * mention it — and most people do not mention it, they leave.
 *
 * Swap in a real SDK the day the extra detail is worth the weight. The report
 * shape is deliberately close to what one would send.
 */

export type ClientErrorKind = 'error' | 'unhandledrejection' | 'boundary';

interface ClientErrorReport {
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  route?: string;
  kind: ClientErrorKind;
}

/** The endpoint is rate limited server-side; this stops us reaching it at all. */
const MAX_PER_SESSION = 10;
let sent = 0;

/**
 * The same broken render fires on every paint, so identical reports are
 * collapsed. Without this a render loop empties the session budget in a frame
 * and the one interesting error afterwards never gets sent.
 */
const seen = new Set<string>();

function post(report: ClientErrorReport): void {
  const fingerprint = `${report.kind}:${report.message}:${report.line ?? ''}`;
  if (seen.has(fingerprint) || sent >= MAX_PER_SESSION) return;
  seen.add(fingerprint);
  sent += 1;

  const body = JSON.stringify({
    ...report,
    // The pathname only. A query string here would carry tracking codes and
    // reset tokens into the log.
    route: window.location.pathname,
  });

  // sendBeacon survives the page being closed, which is exactly when a fatal
  // error tends to be followed by the tab going away. It refuses bodies over
  // ~64 KB, so fetch is the fallback rather than the primary.
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/client-errors', blob)) return;
  } catch {
    // Fall through to fetch.
  }

  void fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    // A failed error report must never produce another error report.
  }).catch(() => {});
}

/** Trims a stack to something the endpoint will accept and a human will read. */
function trimStack(stack: string | undefined): string | undefined {
  return stack?.split('\n').slice(0, 20).join('\n').slice(0, 4000);
}

export function reportError(error: unknown, kind: ClientErrorKind = 'error'): void {
  const err = error instanceof Error ? error : undefined;
  post({
    message: (err?.message ?? String(error)).slice(0, 500),
    stack: trimStack(err?.stack),
    kind,
  });
}

/** Call once, as early as possible. Safe to call more than once. */
let installed = false;

export function installErrorReporter(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    // A failed <img> or <script> also fires this, with no error object and
    // nothing useful to say. Those are not application errors.
    if (!event.error && !event.message) return;
    post({
      message: String(event.message ?? 'Unknown error').slice(0, 500),
      stack: trimStack(event.error?.stack),
      source: event.filename?.slice(0, 500),
      line: event.lineno,
      column: event.colno,
      kind: 'error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    const err = reason instanceof Error ? reason : undefined;
    post({
      message: (err?.message ?? String(reason)).slice(0, 500),
      stack: trimStack(err?.stack),
      kind: 'unhandledrejection',
    });
  });
}
