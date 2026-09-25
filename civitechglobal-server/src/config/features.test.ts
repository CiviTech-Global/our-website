import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The gate that keeps an unfinished module out of production.
 *
 * Worth testing properly rather than trusting by inspection: the failure mode
 * is not a broken page, it is customers finding a half-built shop front on the
 * company's own site, and nobody noticing until they do.
 */
describe('feature flags', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  async function loadWith(overrides: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return (await import('./features.js')).features;
  }

  it('keeps TradeMaster off in production when nobody says otherwise', async () => {
    const features = await loadWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: undefined });
    expect(features.tradeMaster).toBe(false);
  });

  it('keeps TradeMaster off in production when the variable is blank', async () => {
    // A deploy that sets the variable to an empty string is the same as not
    // setting it. Treating blank as "true" would be the exact accident this
    // flag exists to prevent.
    const features = await loadWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: '   ' });
    expect(features.tradeMaster).toBe(false);
  });

  it('keeps TradeMaster off in production for anything that is not exactly true', async () => {
    for (const value of ['1', 'yes', 'on', 'TRUE!', 'enabled']) {
      vi.resetModules();
      const features = await loadWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: value });
      expect(features.tradeMaster, `${value} should not enable the module`).toBe(false);
    }
  });

  it('turns TradeMaster on in production only when explicitly set', async () => {
    const features = await loadWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: 'true' });
    expect(features.tradeMaster).toBe(true);
  });

  it('accepts the flag case-insensitively, since env files are hand-written', async () => {
    const features = await loadWith({ NODE_ENV: 'production', FEATURE_TRADEMASTER: 'True' });
    expect(features.tradeMaster).toBe(true);
  });

  it('gives development the module without needing a flag', async () => {
    const features = await loadWith({ NODE_ENV: 'development', FEATURE_TRADEMASTER: undefined });
    expect(features.tradeMaster).toBe(true);
  });

  it('lets development switch it off explicitly', async () => {
    const features = await loadWith({ NODE_ENV: 'development', FEATURE_TRADEMASTER: 'false' });
    expect(features.tradeMaster).toBe(false);
  });
});
