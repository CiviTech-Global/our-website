import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Staff control over a client identity's trust flags.
 *
 * `trusted` and `blocked` already gated real behaviour in three services —
 * trusted skips the rate limits entirely, blocked refuses every submission —
 * and were displayed on the project detail page. Nothing could set them. A
 * serial abuser could not be stopped and a known client could not be exempted,
 * which made both flags decoration.
 *
 * Deliberately not two booleans that can both be true. "Trusted and blocked"
 * has no meaning, and leaving it representable means somebody eventually has
 * to decide which wins at the point it matters least.
 */

export type IdentityStanding = 'normal' | 'trusted' | 'blocked';

export interface IdentitySummary {
  id: string;
  email: string;
  phone: string;
  standing: IdentityStanding;
  requestCount: number;
  createdAt: Date;
  projectRequests: number;
  resumes: number;
}

function standingOf(identity: { trusted: boolean; blocked: boolean }): IdentityStanding {
  if (identity.blocked) return 'blocked';
  if (identity.trusted) return 'trusted';
  return 'normal';
}

/**
 * Everything staff need to judge one identity before changing its standing.
 *
 * Counts both intakes, because the point of a shared identity is that somebody
 * who commissions work and somebody who applies for a job may be one person,
 * and a decision about them should see both.
 */
export async function getIdentity(id: string): Promise<IdentitySummary> {
  const identity = await prisma.clientIdentity.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      trusted: true,
      blocked: true,
      requestCount: true,
      createdAt: true,
      _count: { select: { requests: true, resumes: true } },
    },
  });

  if (!identity) throw new AppError('این شناسه پیدا نشد.', 404);

  return {
    id: identity.id,
    email: identity.email,
    phone: identity.phone,
    standing: standingOf(identity),
    requestCount: identity.requestCount,
    createdAt: identity.createdAt,
    projectRequests: identity._count.requests,
    resumes: identity._count.resumes,
  };
}

/**
 * Sets standing, and says who did it.
 *
 * Blocking someone stops them submitting anything at all, and trusting them
 * removes every rate limit. Both are decisions somebody should be able to
 * account for later, so the actor and the previous value go to the log — there
 * is no audit table yet, and a decision nobody can trace is how "who blocked
 * this client?" becomes unanswerable.
 */
export async function setStanding(
  id: string,
  standing: IdentityStanding,
  actor: { userId: string },
): Promise<IdentitySummary> {
  const before = await prisma.clientIdentity.findUnique({
    where: { id },
    select: { trusted: true, blocked: true },
  });
  if (!before) throw new AppError('این شناسه پیدا نشد.', 404);

  await prisma.clientIdentity.update({
    where: { id },
    data: {
      trusted: standing === 'trusted',
      blocked: standing === 'blocked',
    },
  });

  logger.info(
    { identityId: id, from: standingOf(before), to: standing, actorId: actor.userId },
    'Client identity standing changed',
  );

  return getIdentity(id);
}
