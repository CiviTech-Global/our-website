// Before the snapshot below is taken. config/env.ts loads this too, but not
// until a test imports the module — by which time `original` would already
// lack DATABASE_URL, and restoring it between cases would break the next one.
import 'dotenv/config';

import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The guard that stops this being a disaster.
 *
 * Everything else in the demo tooling is a convenience. This one rule — that
 * it cannot run against production — is the difference between a development
 * aid and a script that deletes rows in bulk from a live database.
 *
 * Tested by re-importing the module with NODE_ENV set, because the environment
 * is read at call time and a test that only checked the exported constant would
 * pass while the guard itself was removed.
 */

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
});

async function load(nodeEnv: string) {
  vi.resetModules();
  process.env.NODE_ENV = nodeEnv;
  return import('./manifest.js');
}

describe('the demo data production guard', () => {
  it('refuses to construct a manifest in production', async () => {
    const { DemoManifest } = await load('production');
    expect(() => new DemoManifest()).toThrow(/production/i);
  });

  it('refuses to tear anything down in production', async () => {
    // The most consequential of the three: teardown is a loop of deleteMany.
    const { teardownDemoData } = await load('production');
    await expect(teardownDemoData()).rejects.toThrow(/production/i);
  });

  it('refuses to report in production', async () => {
    // Even reading is refused, so there is no path through this module that
    // touches a production database at all.
    const { demoSummary } = await load('production');
    await expect(demoSummary()).rejects.toThrow(/production/i);
  });

  it('allows a manifest outside production', async () => {
    const { DemoManifest } = await load('development');
    expect(() => new DemoManifest()).not.toThrow();
  });

  it('gives each manifest its own batch', async () => {
    // Two seeds must be separable, so one can be removed without the other.
    const { DemoManifest } = await load('development');
    expect(new DemoManifest().batch).not.toBe(new DemoManifest().batch);
  });

  it('accepts a caller-chosen batch name', async () => {
    const { DemoManifest } = await load('development');
    expect(new DemoManifest('fixed-batch').batch).toBe('fixed-batch');
  });

  it('throws rather than warns, so a caller cannot continue past it', async () => {
    // A warning would be logged into a stream nobody is watching while the
    // script carried on deleting.
    const { assertNotProduction } = await load('production');
    expect(() => assertNotProduction()).toThrow();
  });
});
