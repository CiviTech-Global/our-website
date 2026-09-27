import { logger } from '../../config/logger.js';
import { DemoManifest, assertNotProduction, demoSummary, teardownDemoData } from './manifest.js';
import { seedTradeMaster } from './seed-trademaster.js';
import { seedSite } from './seed-site.js';

export { demoSummary, teardownDemoData, assertNotProduction };

export interface SeedResult {
  batch: string;
  tradeMaster: Awaited<ReturnType<typeof seedTradeMaster>>;
  site: Awaited<ReturnType<typeof seedSite>>;
}

/**
 * Fill the site with something to look at.
 *
 * Not wrapped in a single transaction, deliberately. The seeder writes image
 * files to storage as well as rows, and a rolled-back transaction would leave
 * those files behind with nothing referencing them — an orphan that no teardown
 * knows about. Each step records what it created as it goes, so a run that
 * fails halfway leaves a manifest describing exactly what got in, and the
 * teardown removes it.
 *
 * That is the right trade for a development tool: a partial seed that can be
 * cleaned up beats an all-or-nothing one that leaks files.
 */
export async function seedDemoData(): Promise<SeedResult> {
  assertNotProduction();

  const manifest = new DemoManifest();
  logger.info({ batch: manifest.batch }, 'demo seed: starting');

  const tradeMaster = await seedTradeMaster(manifest);
  const site = await seedSite(manifest);

  logger.info({ batch: manifest.batch, tradeMaster, site }, 'demo seed: done');

  return { batch: manifest.batch, tradeMaster, site };
}
