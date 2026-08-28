import * as Sentry from '@sentry/node';

/**
 * Initializes Sentry only when a DSN is configured. Call once, as early as
 * possible, in each process's entrypoint (API: src/index.ts, bot:
 * src/bot/index.ts) — they are separate processes and each needs its own
 * `Sentry.init` call.
 */
export function initSentry(dsn: string | undefined, environment: string): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
  });
}

export { Sentry };
