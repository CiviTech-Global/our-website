import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pushing a member's notifications to their phones.
 *
 * What matters: nothing is looked up or sent while no provider is configured
 * (the default until a Pushe account exists); a configured provider reaches
 * only the devices registered for it; a phone belongs to one account at a
 * time; and an account keeps a bounded number of phones.
 */

const db = vi.hoisted(() => ({
  findMany: vi.fn(async (_args: unknown): Promise<unknown[]> => []),
  upsert: vi.fn(async (_args: unknown) => ({})),
  deleteMany: vi.fn(async (_args: unknown) => ({ count: 0 })),
}));

const push = vi.hoisted(() => ({
  provider: { name: 'none', send: vi.fn(async (_tokens: string[], _message: unknown) => {}) },
}));

vi.mock('../config/database.js', () => ({ prisma: { pushDevice: db } }));
vi.mock('./push/index.js', () => ({ pushProvider: () => push.provider }));

const { pushToUser, registerDevice, unregisterDevice } = await import('./push-devices.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  push.provider.name = 'none';
});

describe('pushing to a member', () => {
  it('neither looks up nor sends anything while no provider is configured', async () => {
    await pushToUser('u1', { title: 't', body: 'b' });

    expect(db.findMany).not.toHaveBeenCalled();
    expect(push.provider.send).not.toHaveBeenCalled();
  });

  it("reaches only the devices registered with the configured provider", async () => {
    push.provider.name = 'pushe';
    db.findMany.mockResolvedValueOnce([{ token: 'pid_1' }, { token: 'pid_2' }]);

    await pushToUser('u1', { title: 't', body: 'b', link: '/inbox' });

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', provider: 'pushe' } }),
    );
    expect(push.provider.send).toHaveBeenCalledWith(['pid_1', 'pid_2'], { title: 't', body: 'b', link: '/inbox' });
  });

  it('lets the development console stand in for every provider', async () => {
    push.provider.name = 'console';
    db.findMany.mockResolvedValueOnce([{ token: 'pid_1' }]);

    await pushToUser('u1', { title: 't', body: 'b' });

    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    expect(push.provider.send).toHaveBeenCalledWith(['pid_1'], { title: 't', body: 'b' });
  });

  it('sends nothing to a member with no phones', async () => {
    push.provider.name = 'pushe';

    await pushToUser('u1', { title: 't', body: 'b' });

    expect(push.provider.send).not.toHaveBeenCalled();
  });
});

describe('registering a phone', () => {
  it('moves a token to whoever signs in on that phone', async () => {
    await registerDevice('u2', { provider: 'pushe', token: 'pid_1', platform: 'android' });

    const args = db.upsert.mock.calls[0]![0] as {
      where: unknown;
      update: { userId: string };
    };
    expect(args.where).toEqual({ provider_token: { provider: 'pushe', token: 'pid_1' } });
    expect(args.update.userId).toBe('u2');
  });

  it('keeps at most ten phones, dropping the longest unseen', async () => {
    db.findMany.mockResolvedValueOnce([{ id: 'old1' }, { id: 'old2' }]);

    await registerDevice('u1', { provider: 'pushe', token: 'pid_11', platform: 'android' });

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, orderBy: { lastSeenAt: 'desc' }, skip: 10 }),
    );
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old1', 'old2'] } } });
  });

  it('signs a phone out only for its own account', async () => {
    await unregisterDevice('u1', 'pid_1');

    expect(db.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', token: 'pid_1' } });
  });
});
