/**
 * Modules that are being built and are not ready to be seen.
 *
 * TradeMaster is the reason this exists. It is a whole marketplace — shops,
 * products, stock, orders — arriving one piece at a time into a site that is
 * already serving real customers, and a half-built shop front is worse than
 * no shop front. It stays reachable in development and invisible in
 * production until it is finished.
 *
 * The default is OFF, and that is the important part. A flag that defaults on
 * is not a gate, it is a comment: somebody forgets one environment variable
 * during a deploy and the unfinished thing is live. Turning TradeMaster on has
 * to be a deliberate act — setting FEATURE_TRADEMASTER=true — rather than the
 * absence of one.
 *
 * `development` gets it for free so nobody has to keep a local .env in sync
 * with a flag they always want set.
 */

/**
 * Reads `process.env` directly rather than going through `config/env.ts`.
 *
 * That module validates the whole environment and throws on anything missing,
 * which is right for the application and wrong for this: whether an unfinished
 * module is visible should not depend on an unrelated variable being present.
 * A gate that can fail to load is a gate that can fail open.
 */
function flag(key: string, enabledByDefaultOutsideProduction: boolean): boolean {
  const raw = process.env[key];
  if (raw !== undefined && raw.trim() !== '') {
    return raw.trim().toLowerCase() === 'true';
  }
  return enabledByDefaultOutsideProduction && process.env.NODE_ENV !== 'production';
}

export const features = {
  /**
   * The TradeMaster module: shops and the product catalogue.
   *
   * On in development and test, off in production unless explicitly set.
   */
  tradeMaster: flag('FEATURE_TRADEMASTER', true),

  /**
   * Buying things: the basket, checkout, orders and payment.
   *
   * OFF EVERYWHERE, including development. TradeMaster is a catalogue for now —
   * shops show what they sell and buyers contact them directly — and the
   * purchase path is deliberately not reachable until that changes.
   *
   * The code behind it is finished and tested rather than deleted: the order
   * lifecycle, the stock holding and the payment seam took real care to get
   * right, and throwing them away to re-derive them later would be the
   * expensive kind of tidiness. A flag that defaults off in every environment
   * is the honest way to say "built, not offered".
   *
   * Turning it on means setting FEATURE_TRADEMASTER_ORDERS=true deliberately,
   * in one place, and the tests for the lifecycle keep passing meanwhile — so
   * it cannot rot quietly while it waits.
   */
  tradeMasterOrders: flag('FEATURE_TRADEMASTER_ORDERS', false),

  /**
   * The job board's second generation: fixed categories, richer postings,
   * company pages, saved jobs, alerts, matching and the hiring pipeline, with
   * applications going straight to the employer.
   *
   * The board itself is live; this gates only what is new on it, so the
   * production board keeps working exactly as it does until this is set.
   */
  jobsV2: flag('FEATURE_JOBS_V2', true),

  /**
   * The freelance side's second generation: fixed categories, fixed and
   * hourly projects with the details the leading boards ask for, invitations,
   * NDAs, saved projects and alerts, bids straight to the client, hourly
   * timesheets, and the service catalogue with its packages and orders.
   *
   * Like jobsV2 it gates only what is new, so the live board keeps working
   * exactly as it does until this is set.
   */
  projectsV2: flag('FEATURE_PROJECTS_V2', true),
} as const;

export type FeatureName = keyof typeof features;
