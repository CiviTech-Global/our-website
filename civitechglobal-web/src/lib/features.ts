/**
 * Modules that are being built and are not ready to be seen.
 *
 * Mirrors `config/features.ts` on the server, and is deliberately the weaker
 * of the two. The server's gate is what actually refuses the request; anybody
 * can edit what a browser believes, so this is tidiness, never a security
 * boundary.
 *
 * WHAT IT DOES AND DOES NOT DO. At runtime the routes are not registered, so
 * the paths do not match and nothing in the app can navigate to them. It does
 * NOT remove them from the bundle: `flag()` is a function call, so Rollup
 * cannot fold `features.tradeMaster` to a constant, the `<Route>` branch
 * survives and the lazy chunks are still emitted. Checked, rather than
 * assumed — the route paths are in the production bundle today.
 *
 * That is acceptable: the chunks are lazy and never fetched, and a URL pattern
 * is not a secret. It is recorded here because the opposite was written first
 * and was wrong.
 *
 * Default OFF in production, like the server's. `import.meta.env.PROD` is what
 * Vite sets for a production build, so a deploy that forgets the variable gets
 * the safe answer rather than the unfinished module.
 */

function flag(value: unknown, enabledByDefaultOutsideProduction: boolean): boolean {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim().toLowerCase() === 'true';
  }
  return enabledByDefaultOutsideProduction && !import.meta.env.PROD;
}

export const features = {
  /** The TradeMaster module: shops and the product catalogue. */
  tradeMaster: flag(import.meta.env.VITE_FEATURE_TRADEMASTER, true),
} as const;
