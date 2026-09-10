import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The parts of account recovery that are security decisions rather than
 * plumbing: what a reset link reveals, how many times it works, and what it
 * does to sessions opened before it.
 */

const mocks = vi.hoisted(() => {
  interface TokenRow {
    id: string;
    userId: string;
    purpose: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
  }

  const users = new Map<string, any>();
  const tokens = new Map<string, TokenRow>();
  let seq = 0;

  const matches = (row: TokenRow, where: any) =>
    (where.id === undefined || row.id === where.id) &&
    (where.userId === undefined || row.userId === where.userId) &&
    (where.purpose === undefined || row.purpose === where.purpose) &&
    (where.usedAt === undefined || (where.usedAt === null ? row.usedAt === null : false));

  const prisma = {
    user: {
      findFirst: vi.fn(async ({ where }: any) => {
        for (const user of users.values()) {
          if (where.emailHash !== undefined && user.emailHash !== where.emailHash) continue;
          if (where.id !== undefined && user.id !== where.id) continue;
          if (where.deletedAt === null && user.deletedAt) continue;
          return { ...user };
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const user = users.get(where.id);
        for (const [key, value] of Object.entries<any>(data)) {
          user[key] =
            value && typeof value === 'object' && 'increment' in value
              ? user[key] + value.increment
              : value;
        }
        return { ...user };
      }),
    },
    userToken: {
      create: vi.fn(async ({ data }: any) => {
        const row: TokenRow = { id: `t${++seq}`, usedAt: null, ...data };
        tokens.set(row.token, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const row = tokens.get(where.token);
        return row ? { ...row } : null;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of tokens.values()) {
          if (!matches(row, where)) continue;
          Object.assign(row, data);
          count += 1;
        }
        return { count };
      }),
    },
    refreshToken: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    // The service batches the password write and the session revocation; the
    // arguments are already-issued promises, so awaiting them is the whole job.
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const send = vi.fn(async () => {});

  return { users, tokens, prisma, send };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./email/index.js', () => ({ emailProvider: () => ({ name: 'test', send: mocks.send }) }));
vi.mock('../utils/password.js', () => ({
  hashPassword: async (p: string) => `hashed:${p}`,
  comparePassword: async () => true,
}));

import * as recovery from './account-recovery.service.js';
import { emailLookupHash } from './auth.service.js';

const EMAIL = 'someone@example.com';

/** The token only ever exists in the email body, so that is where tests get it. */
function linkTokenFromLastEmail(): string {
  const body = mocks.send.mock.calls.at(-1)![0] as unknown as { text: string };
  const match = body.text.match(/token=([^\s]+)/);
  if (!match) throw new Error('no token in email');
  return decodeURIComponent(match[1]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.users.clear();
  mocks.tokens.clear();
  mocks.users.set('u1', {
    id: 'u1',
    email: EMAIL,
    emailHash: emailLookupHash(EMAIL),
    firstName: 'Sara',
    password: 'hashed:old',
    tokenVersion: 3,
    emailVerified: false,
    deletedAt: null,
  });
});

describe('requestPasswordReset', () => {
  it('emails a link to a known address', async () => {
    await recovery.requestPasswordReset(EMAIL);

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(linkTokenFromLastEmail()).toBeTruthy();
  });

  it('does nothing at all for an unknown address', async () => {
    // The endpoint answers the same either way; the silence has to start here,
    // or the timing and the mail queue give the answer away instead.
    await recovery.requestPasswordReset('nobody@example.com');

    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.tokens.size).toBe(0);
  });

  it('does nothing for a soft-deleted account', async () => {
    mocks.users.get('u1').deletedAt = new Date();

    await recovery.requestPasswordReset(EMAIL);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('stores only a hash of the token', async () => {
    await recovery.requestPasswordReset(EMAIL);
    const raw = linkTokenFromLastEmail();

    // A database dump must not be replayable as a working reset link.
    expect(mocks.tokens.has(raw)).toBe(false);
    expect([...mocks.tokens.keys()][0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('kills the previous link when a second is asked for', async () => {
    await recovery.requestPasswordReset(EMAIL);
    const first = linkTokenFromLastEmail();
    await recovery.requestPasswordReset(EMAIL);
    const second = linkTokenFromLastEmail();

    expect(second).not.toBe(first);
    await expect(recovery.resetPassword(first, 'NewPassw0rd!x')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(recovery.resetPassword(second, 'NewPassw0rd!x')).resolves.toBeUndefined();
  });
});

describe('resetPassword', () => {
  async function issue(): Promise<string> {
    await recovery.requestPasswordReset(EMAIL);
    return linkTokenFromLastEmail();
  }

  it('sets the new password', async () => {
    await recovery.resetPassword(await issue(), 'NewPassw0rd!x');
    expect(mocks.users.get('u1').password).toBe('hashed:NewPassw0rd!x');
  });

  it('invalidates every session opened before it', async () => {
    // Whoever resets may be locking an intruder out, so the intruder's live
    // session has to die with the old password.
    await recovery.resetPassword(await issue(), 'NewPassw0rd!x');

    expect(mocks.users.get('u1').tokenVersion).toBe(4);
    expect(mocks.prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
    );
  });

  it('verifies the address as a side effect', async () => {
    // Only the mailbox holder could have followed the link.
    await recovery.resetPassword(await issue(), 'NewPassw0rd!x');
    expect(mocks.users.get('u1').emailVerified).toBe(true);
  });

  it('refuses a second use of the same link', async () => {
    const token = await issue();
    await recovery.resetPassword(token, 'NewPassw0rd!x');

    await expect(recovery.resetPassword(token, 'Another0ne!xy')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mocks.users.get('u1').password).toBe('hashed:NewPassw0rd!x');
  });

  it('refuses an expired link', async () => {
    const token = await issue();
    for (const row of mocks.tokens.values()) row.expiresAt = new Date(Date.now() - 1000);

    await expect(recovery.resetPassword(token, 'NewPassw0rd!x')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('refuses an unknown token', async () => {
    await expect(recovery.resetPassword('not-a-real-token', 'NewPassw0rd!x')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('refuses a verification token used as a reset token', async () => {
    // Same table, same shape — the purpose is the only thing keeping the
    // weaker link from becoming a password change.
    await recovery.sendVerificationEmail('u1');
    const verificationToken = linkTokenFromLastEmail();

    await expect(
      recovery.resetPassword(verificationToken, 'NewPassw0rd!x')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('says the same thing however it fails', async () => {
    const expired = await issue();
    for (const row of mocks.tokens.values()) row.expiresAt = new Date(Date.now() - 1000);
    const spent = await issue();
    await recovery.resetPassword(spent, 'NewPassw0rd!x');

    const messages: string[] = [];
    for (const token of [expired, spent, 'never-existed']) {
      await recovery.resetPassword(token, 'X').catch((e: Error) => messages.push(e.message));
    }

    // Three different reasons, one message: a probe learns nothing about which
    // guess was close.
    expect(messages).toHaveLength(3);
    expect(new Set(messages).size).toBe(1);
  });
});

describe('email verification', () => {
  it('marks the address verified', async () => {
    await recovery.sendVerificationEmail('u1');
    await recovery.verifyEmail(linkTokenFromLastEmail());

    expect(mocks.users.get('u1').emailVerified).toBe(true);
  });

  it('refuses to re-send once verified', async () => {
    mocks.users.get('u1').emailVerified = true;

    await expect(recovery.sendVerificationEmail('u1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('does not let a verification link change a password', async () => {
    await recovery.sendVerificationEmail('u1');
    await recovery.verifyEmail(linkTokenFromLastEmail());

    expect(mocks.users.get('u1').password).toBe('hashed:old');
    expect(mocks.users.get('u1').tokenVersion).toBe(3);
  });

  it('refuses a reset token used as a verification token', async () => {
    await recovery.requestPasswordReset(EMAIL);
    const resetToken = linkTokenFromLastEmail();

    await expect(recovery.verifyEmail(resetToken)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('delivery failures', () => {
  it('still succeeds when the provider is down', async () => {
    // A provider outage must not turn "we sent you a link" into a 500 — on the
    // reset path that is a 500 for real addresses and a 200 for unknown ones,
    // which is the enumeration leak the generic answer exists to prevent.
    mocks.send.mockRejectedValueOnce(new Error('smtp exploded'));

    await expect(recovery.requestPasswordReset(EMAIL)).resolves.toBeUndefined();
  });
});
