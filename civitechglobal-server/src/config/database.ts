import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient across module reloads in dev (tsx watch) to
// avoid exhausting the Postgres connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The pool the driver opens, from the address.
 *
 * Deployments set connection_limit and pool_timeout (seconds) on DATABASE_URL,
 * which were Prisma's own engine's parameters. The node-postgres driver behind
 * Prisma 7 ignores them, so a production pool would quietly fall back to its
 * defaults, and a query waiting on a full pool would wait forever.
 */
export function poolConfig(url: string | undefined) {
  if (!url) return { connectionString: url };
  try {
    const parsed = new URL(url);
    const limit = Number(parsed.searchParams.get('connection_limit'));
    const timeout = Number(parsed.searchParams.get('pool_timeout'));
    parsed.searchParams.delete('connection_limit');
    parsed.searchParams.delete('pool_timeout');
    return {
      connectionString: parsed.toString(),
      ...(limit > 0 ? { max: limit } : {}),
      ...(timeout > 0 ? { connectionTimeoutMillis: timeout * 1000 } : {}),
    };
  } catch {
    return { connectionString: url };
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL)) });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Establishes the pool up front.
 *
 * Called from the entrypoint so the first real request — or the first
 * readiness probe — is not the one paying to open connections.
 */
export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}
