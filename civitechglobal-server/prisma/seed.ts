/**
 * Prisma's seed hook.
 *
 * The seed itself lives in src/seed.ts so that `tsc` compiles it into dist
 * along with everything else it imports. That matters in production: the
 * runtime image installs with --omit=dev, so tsx is not there, and a seed that
 * only existed as TypeScript under prisma/ could not be run on the server at
 * all — which is exactly how the first deployment ended up with an empty
 * users table and nobody able to log in.
 *
 * This file stays because `prisma db seed` and `npm run seed` point at it, and
 * because keeping the seed where Prisma expects to find it is less surprising
 * than moving the hook.
 */
import './../src/seed.js';
