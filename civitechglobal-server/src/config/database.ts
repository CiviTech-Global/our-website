import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient across module reloads in dev (tsx watch) to
// avoid exhausting the Postgres connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

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
