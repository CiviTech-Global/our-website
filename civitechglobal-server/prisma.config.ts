import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Where the Prisma CLI finds the database and the migrations.
 *
 * Since Prisma 7 the address lives here rather than in schema.prisma, and the
 * CLI no longer reads .env on its own. Read from process.env directly, not
 * through Prisma's env(), which throws when the variable is unset: `prisma
 * generate` runs in the image build, where there is no database to name.
 *
 * The runtime image copies this file, because the migrate service runs the CLI
 * from there (see the Dockerfile).
 */
config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
