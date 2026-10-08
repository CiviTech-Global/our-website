import 'dotenv/config';
import { prisma } from './config/database.js';
import { demoSummary, seedDemoData, teardownDemoData } from './services/demo/index.js';

/**
 * Demo data, from the command line.
 *
 *   npm run demo:seed     fill the site
 *   npm run demo:clear    remove everything a seed created
 *   npm run demo:status   what is currently seeded
 *
 * A command-line tool rather than only an admin button, because the first thing
 * somebody wants after a confusing demo is to wipe it and start again, and that
 * should not require being able to sign in to the thing that is confusing them.
 *
 * Every path goes through assertNotProduction, so pointing this at a live
 * DATABASE_URL fails rather than doing something memorable.
 */

const command = process.argv[2];

function report(lines: string[]): void {
  // Written to stdout rather than through the logger: this is a person at a
  // terminal waiting for an answer, not a service emitting events.
  for (const line of lines) process.stdout.write(`${line}\n`);
}

async function main(): Promise<void> {
  switch (command) {
    case 'seed': {
      const result = await seedDemoData();
      report([
        '',
        `Demo data created. Batch ${result.batch}`,
        '',
        `  shops            ${result.tradeMaster.shops}  (Qazvin, one pending review)`,
        `  products         ${result.tradeMaster.products}`,
        `  categories       ${result.tradeMaster.categories}`,
        `  contact messages ${result.site.contactMessages}`,
        `  insurance        ${result.site.insuranceRequests}`,
        `  consultations    ${result.site.consultations}`,
        `  experts          ${result.site.experts}`,
        `  team             ${result.site.team}`,
        `  showcase         ${result.site.showcase}`,
        `  companies        ${result.jobs.companies}  (Iran, Germany, UAE, Canada, Turkey; one hidden)`,
        `  job posts        ${result.jobs.jobs}  (drafts, review queue and a closed one among them)`,
        `  applications     ${result.jobs.applications}  (every pipeline stage)`,
        `  saved / alerts   ${result.jobs.saved} / ${result.jobs.alerts}`,
        `  projects         ${result.work.projects}  (fixed and hourly, NDA, invite-only, drafts and review)`,
        `  proposals        ${result.work.bids}  (every stage)  ·  invitations ${result.work.invites}`,
        `  services         ${result.work.services}  ·  orders ${result.work.orders}`,
        `  contracts        ${result.work.contracts}  (fixed, hourly with ${result.work.timesheets} timesheets, service orders)`,
        '',
        '  Seller accounts: seller1@demo.invalid … seller5@demo.invalid',
        '  Employers:       employer.rayan@demo.invalid, employer.nordlicht@demo.invalid, …',
        '  Job-seekers:     candidate.sara@demo.invalid, candidate.reza@demo.invalid, …',
        '  Password:        demo-password',
        '',
        '  Remove it all with: npm run demo:clear',
        '',
      ]);
      break;
    }

    case 'clear': {
      const result = await teardownDemoData();
      report([
        '',
        `Removed ${result.deleted} rows from ${result.batches} batch(es).`,
        result.missing > 0
          ? `  ${result.missing} were already gone, which is fine.`
          : '  Nothing was missing.',
        '',
      ]);
      break;
    }

    case 'status': {
      const batches = await demoSummary();
      if (batches.length === 0) {
        report(['', 'No demo data.', '']);
        break;
      }

      report([
        '',
        ...batches.flatMap((batch) => [
          `Batch ${batch.batch} — ${batch.total} rows`,
          ...Object.entries(batch.models)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([model, count]) => `  ${model.padEnd(22)} ${count}`),
          '',
        ]),
      ]);
      break;
    }

    default:
      report([
        '',
        'Usage: demo-cli <seed|clear|status>',
        '',
        '  seed    fill the site with demonstration data',
        '  clear   remove every row a seed created, and nothing else',
        '  status  show what is currently seeded',
        '',
      ]);
      process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
