import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every application table must have row-level security enabled with a policy.
 *
 * This is checked against the migration SQL rather than against a live
 * database on purpose: it has to fail while somebody is writing the migration,
 * not after it reaches an environment. ALTER DEFAULT PRIVILEGES carries GRANTs
 * forward to tables a later migration creates, but it does not carry row-level
 * security — so a new table is silently one where a GRANT alone is sufficient,
 * which is the precise hole the invariant exists to close.
 *
 * It has been missed twice. The marketplace migration caught it in review; the
 * expansion migration shipped five tables without it.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/** Prisma's own bookkeeping. Not application data, and not ours to police. */
const EXEMPT = new Set(['_prisma_migrations']);

function migrationSql(): string {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    // Prisma names directories with a leading timestamp, so sorting by name is
    // chronological — which is what makes the rename tracking above correct.
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => readFileSync(path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');
}

/**
 * Tables the migrations leave behind: created, minus dropped, following
 * renames.
 *
 * Renames have to be followed or the check reports a table that has not
 * existed for months — `leads` became `insurance_requests`, and without this
 * the guard fails on a name nothing can secure.
 *
 * One ordered pass, so create/rename/drop compose in the order they ran.
 */
function tablesFromMigrations(sql: string): string[] {
  const live = new Set<string>();

  const statement =
    /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([a-zA-Z0-9_]+)"|DROP TABLE(?:\s+IF EXISTS)?\s+"([a-zA-Z0-9_]+)"|ALTER TABLE\s+"([a-zA-Z0-9_]+)"\s+RENAME TO\s+"([a-zA-Z0-9_]+)"/gi;

  for (const match of sql.matchAll(statement)) {
    const [, created, dropped, renamedFrom, renamedTo] = match;
    if (created) live.add(created);
    else if (dropped) live.delete(dropped);
    else if (renamedFrom && renamedTo) {
      live.delete(renamedFrom);
      live.add(renamedTo);
    }
  }

  return [...live].filter((table) => !EXEMPT.has(table)).sort();
}

/**
 * Tables named inside an ENABLE ROW LEVEL SECURITY statement — either directly
 * or in one of the DO-block arrays the migrations use to apply it in bulk.
 */
function tablesWithRls(sql: string): Set<string> {
  const secured = new Set<string>();

  for (const match of sql.matchAll(/ALTER TABLE\s+"?([a-zA-Z0-9_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi)) {
    secured.add(match[1]);
  }

  // The bulk form: FOREACH t IN ARRAY ARRAY[ 'a', 'b', ... ] LOOP ... EXECUTE
  // format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t)
  for (const block of sql.matchAll(/FOREACH\s+\w+\s+IN\s+ARRAY\s+ARRAY\[([^\]]+)\]/gi)) {
    for (const name of block[1].matchAll(/'([a-zA-Z0-9_]+)'/g)) secured.add(name[1]);
  }

  return secured;
}

describe('row-level security invariant', () => {
  const sql = migrationSql();
  const tables = tablesFromMigrations(sql);
  const secured = tablesWithRls(sql);

  it('finds the migrations at all', () => {
    // Guards against the whole check quietly passing over nothing, which is the
    // failure mode of every "assert each item" test.
    expect(tables.length).toBeGreaterThan(15);
  });

  it('enables row-level security on every application table', () => {
    const missing = tables.filter((table) => !secured.has(table));

    expect(missing, `tables created without ENABLE ROW LEVEL SECURITY: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  /**
   * RLS with no policy denies everything, which would take the application
   * down rather than leave it exposed — a safe failure, but still a failure.
   * Every secured table needs a policy for the role the app connects as.
   */
  it('gives every secured table a policy', () => {
    const policied = new Set<string>();
    for (const match of sql.matchAll(/CREATE POLICY\s+\w+\s+ON\s+"?([a-zA-Z0-9_]+)"?/gi)) {
      policied.add(match[1]);
    }
    // The bulk form creates the policy inside the same loop as the ALTER, so a
    // table in a DO-block array has both.
    for (const block of sql.matchAll(/FOREACH\s+\w+\s+IN\s+ARRAY\s+ARRAY\[([^\]]+)\]/gi)) {
      for (const name of block[1].matchAll(/'([a-zA-Z0-9_]+)'/g)) policied.add(name[1]);
    }

    const missing = tables.filter((table) => secured.has(table) && !policied.has(table));

    expect(missing, `secured tables with no policy: ${missing.join(', ')}`).toEqual([]);
  });
});
