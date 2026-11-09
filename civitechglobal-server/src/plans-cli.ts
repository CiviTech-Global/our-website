import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { prisma } from './config/database.js';
import { getCatalog, seedPlanCatalog, setPrices, type PriceUpdate } from './services/billing/catalog.service.js';

/**
 * Plan prices from a terminal.
 *
 *   npm run plans:prices -- <file.json>   import prices
 *   npm run plans:show                    print the catalogue with prices
 *
 * The file is a list of { featureKey, tier, priceIrt, priceUsdt? }, in Toman.
 * It lives outside the repository (the repository is public); in production
 * prices are set from the staff Plans page instead.
 */

async function main() {
  const [command, file] = process.argv.slice(2);

  if (command === 'prices') {
    if (!file) throw new Error('usage: plans-cli prices <file.json>');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as PriceUpdate[] | { prices: PriceUpdate[] };
    const updates = Array.isArray(raw) ? raw : raw.prices;
    await seedPlanCatalog();
    const result = await setPrices(updates);
    console.log(`Prices set: ${result.updated}`);
    return;
  }

  if (command === 'show') {
    const catalog = await getCatalog();
    for (const feature of catalog.features) {
      const cells = feature.levels.map((level) => `${level.tier}:${level.limit ?? '∞'}/${level.kind}@${level.priceIrt ?? '-'}`);
      console.log(`${feature.subject.padEnd(8)} ${feature.key.padEnd(24)} ${cells.join('  ')}`);
    }
    console.log(JSON.stringify(catalog.tiers, null, 2));
    return;
  }

  throw new Error('usage: plans-cli prices <file.json> | show');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
