import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Standing is a security control: trusted removes every rate limit and blocked
 * refuses every submission. The parts worth pinning are that the two can never
 * be true at once, and that a change is attributable.
 */

const mocks = vi.hoisted(() => {
  const identities = new Map<string, any>();
  const prisma = {
    clientIdentity: {
      findUnique: vi.fn(async ({ where }: any) => {
        const row = identities.get(where.id);
        if (!row) return null;
        return { ...row, _count: { requests: row.requests ?? 0, resumes: row.resumes ?? 0 } };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        Object.assign(identities.get(where.id), data);
        return identities.get(where.id);
      }),
    },
  };
  const loggerInfo = vi.fn();
  return { identities, prisma, loggerInfo };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('../config/logger.js', () => ({
  logger: { info: mocks.loggerInfo, warn: vi.fn(), error: vi.fn() },
}));

import * as identityAdmin from './identity-admin.service.js';

const ACTOR = { userId: 'staff-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identities.clear();
  mocks.identities.set('i1', {
    id: 'i1',
    email: 'client@example.com',
    phone: '09120000000',
    trusted: false,
    blocked: false,
    requestCount: 4,
    createdAt: new Date('2026-01-01'),
    requests: 3,
    resumes: 1,
  });
});

describe('getIdentity', () => {
  it('reports both intakes, because one person may use both', () => {
    return expect(identityAdmin.getIdentity('i1')).resolves.toMatchObject({
      standing: 'normal',
      projectRequests: 3,
      resumes: 1,
    });
  });

  it('is a 404 for an identity that does not exist', async () => {
    await expect(identityAdmin.getIdentity('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('setStanding', () => {
  it('blocks', async () => {
    await identityAdmin.setStanding('i1', 'blocked', ACTOR);
    expect(mocks.identities.get('i1')).toMatchObject({ trusted: false, blocked: true });
  });

  it('trusts', async () => {
    await identityAdmin.setStanding('i1', 'trusted', ACTOR);
    expect(mocks.identities.get('i1')).toMatchObject({ trusted: true, blocked: false });
  });

  it('clears the other flag rather than leaving both set', async () => {
    // "Trusted and blocked" has no meaning, and if it were representable
    // somebody would have to decide which wins at the point it matters least.
    await identityAdmin.setStanding('i1', 'blocked', ACTOR);
    await identityAdmin.setStanding('i1', 'trusted', ACTOR);

    expect(mocks.identities.get('i1')).toMatchObject({ trusted: true, blocked: false });
  });

  it('returns to normal with neither flag set', async () => {
    await identityAdmin.setStanding('i1', 'trusted', ACTOR);
    const after = await identityAdmin.setStanding('i1', 'normal', ACTOR);

    expect(mocks.identities.get('i1')).toMatchObject({ trusted: false, blocked: false });
    expect(after.standing).toBe('normal');
  });

  it('records who changed it, and what it was before', async () => {
    // There is no audit table yet, so the log is the only trace. Without the
    // actor and the previous value, "who blocked this client?" is unanswerable.
    await identityAdmin.setStanding('i1', 'blocked', ACTOR);

    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        identityId: 'i1',
        from: 'normal',
        to: 'blocked',
        actorId: 'staff-1',
      }),
      expect.stringContaining('standing changed'),
    );
  });

  it('refuses to change an identity that does not exist', async () => {
    await expect(identityAdmin.setStanding('nope', 'blocked', ACTOR)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mocks.prisma.clientIdentity.update).not.toHaveBeenCalled();
  });
});
