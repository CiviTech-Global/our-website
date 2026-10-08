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

  /**
   * Buying things: the basket, checkout and orders.
   *
   * OFF EVERYWHERE, matching config/features.ts on the server. The module is a
   * catalogue for now — shops show what they sell and buyers contact them
   * directly — so the basket must not appear in navigation, on a product page,
   * or as a route that loads and then finds every endpoint answering 404.
   *
   * Second argument false, not true: unlike the module flag there is no
   * environment where this should be on by default, including development.
   */
  tradeMasterOrders: flag(import.meta.env.VITE_FEATURE_TRADEMASTER_ORDERS, false),

  /**
   * The job board's second generation: fixed categories, richer postings,
   * company pages, saved jobs, alerts, matching and the hiring pipeline.
   *
   * The board itself is live; this hides only what is new on it, matching
   * FEATURE_JOBS_V2 on the server, which is what actually refuses.
   */
  jobsV2: flag(import.meta.env.VITE_FEATURE_JOBS_V2, true),

  /**
   * The freelance side's second generation: richer projects, the client's
   * pipeline and invitations, NDAs, saved projects and alerts, hourly
   * timesheets, the talent directory and the service catalogue.
   *
   * Matches FEATURE_PROJECTS_V2 on the server, which is what actually refuses.
   */
  projectsV2: flag(import.meta.env.VITE_FEATURE_PROJECTS_V2, true),

  /**
   * The book market's second generation: one page per book with every offer,
   * graded copies with photos, and purchase requests with their threads.
   * Matches FEATURE_BOOKS_V2 on the server.
   */
  booksV2: flag(import.meta.env.VITE_FEATURE_BOOKS_V2, true),

  /**
   * The demo-data panel: fill the site with example records, and empty it again.
   *
   * No environment override, unlike the two above: there is no production where
   * a button that empties the database should appear, and a variable is a way
   * to be wrong about that. The server agrees and answers 404 outside
   * development.
   *
   * This flag governs the navigation link. It does NOT remove the page from the
   * bundle — see the note at the top of this file for why a flag cannot. The
   * route in App.tsx does that separately, by making the component itself null
   * in a production build.
   */
  demoData: !import.meta.env.PROD,
} as const;
