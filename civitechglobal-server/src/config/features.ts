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
   * The TradeMaster module: businesses, product catalogue, orders.
   *
   * On in development and test, off in production unless explicitly set.
   */
  tradeMaster: flag('FEATURE_TRADEMASTER', true),
} as const;

export type FeatureName = keyof typeof features;
