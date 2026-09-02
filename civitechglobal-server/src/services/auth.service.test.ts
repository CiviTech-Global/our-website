import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const redisStore = new Map<string, string>();

  const redis = {
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    incr: vi.fn(async (key: string) => {
      const next = parseInt(redisStore.get(key) ?? '0', 10) + 1;
      redisStore.set(key, String(next));
      return next;
    }),
    expire: vi.fn(async () => 1),
    ttl: vi.fn(async () => 900),
    del: vi.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
  };

  const usersById = new Map<string, any>();
  const usersByEmailHash = new Map<string, any>();
  let nextUserId = 1;

  function project(user: any, select?: Record<string, unknown>) {
    if (!select) return user;
    const projected: Record<string, unknown> = {};
    for (const key of Object.keys(select)) projected[key] = user[key];
    return projected;
  }

  const userRepository = {
    findFirst: vi.fn(async ({ where }: any) => usersByEmailHash.get(where.emailHash) ?? null),
    findUnique: vi.fn(async ({ where, select }: any) => {
      const user = usersById.get(where.id);
      return user ? project(user, select) : null;
    }),
    create: vi.fn(async ({ data, select }: any) => {
      const user = {
        id: `user_${nextUserId++}`,
        tokenVersion: 0,
        permissions: [],
        role: 'USER',
        username: null,
        phone: null,
        emailVerified: false,
        deletedAt: null,
        createdAt: new Date(),
        ...data,
      };
      usersById.set(user.id, user);
      usersByEmailHash.set(user.emailHash, user);
      return project(user, select);
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const user = usersById.get(where.id);
      // Mirror Prisma's atomic-number syntax, e.g. { tokenVersion: { increment: 1 } }.
      for (const [key, value] of Object.entries<any>(data)) {
        user[key] = value && typeof value === 'object' && 'increment' in value
          ? (user[key] ?? 0) + value.increment
          : value;
      }
      return user;
    }),
    updateMany: vi.fn(async () => ({ count: 0 })),
  };

  const refreshTokens: any[] = [];
  let nextTokenId = 1;

  const refreshTokenRepository = {
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `rt_${nextTokenId++}`, revokedAt: null, createdAt: new Date(), ...data };
      refreshTokens.push(row);
      return row;
    }),
    findUnique: vi.fn(async ({ where }: any) => refreshTokens.find((t) => t.token === where.token) ?? null),
    update: vi.fn(async ({ where, data }: any) => {
      const row = refreshTokens.find((t) => t.id === where.id);
      Object.assign(row, data);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const matched = refreshTokens.filter(
        (t) =>
          (where.userId === undefined || t.userId === where.userId) &&
          (where.token === undefined || t.token === where.token),
      );
      matched.forEach((row) => Object.assign(row, data));
      return { count: matched.length };
    }),
    all: () => refreshTokens,
  };

  function reset() {
    redisStore.clear();
    usersById.clear();
    usersByEmailHash.clear();
    refreshTokens.length = 0;
  }

  return { redis, userRepository, refreshTokenRepository, reset };
});

vi.mock('../config/redis.js', () => ({ redis: mocks.redis }));
vi.mock('../database/prisma/repositories/user.repository.js', () => ({ userRepository: mocks.userRepository }));
vi.mock('../database/prisma/repositories/refresh-token.repository.js', () => ({
  refreshTokenRepository: mocks.refreshTokenRepository,
}));
vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-32-chars',
    LOG_LEVEL: 'silent',
    isProduction: false,
    NODE_ENV: 'test',
  },
}));

vi.mock('../config/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { register, login, refreshTokens: rotateRefreshToken } = await import('./auth.service.js');

const STRONG_PASSWORD = 'Correct-Horse9!';

describe('auth.service', () => {
  beforeEach(() => {
    mocks.reset();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('creates a user and returns a token pair', async () => {
      const result = await register({
        email: 'new.user@example.com',
        password: STRONG_PASSWORD,
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user.email).toBe('new.user@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('rejects registering the same email twice', async () => {
      await register({ email: 'dup@example.com', password: STRONG_PASSWORD, firstName: 'A', lastName: 'B' });

      await expect(
        register({ email: 'dup@example.com', password: STRONG_PASSWORD, firstName: 'C', lastName: 'D' }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      await register({ email: 'login.user@example.com', password: STRONG_PASSWORD, firstName: 'Log', lastName: 'In' });

      const result = await login({ email: 'login.user@example.com', password: STRONG_PASSWORD });
      expect(result.user.email).toBe('login.user@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
    });

    it('rejects an unknown email with a generic message', async () => {
      await expect(login({ email: 'nobody@example.com', password: STRONG_PASSWORD })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('rejects a wrong password with the same generic message as an unknown email', async () => {
      await register({ email: 'wrongpass@example.com', password: STRONG_PASSWORD, firstName: 'A', lastName: 'B' });

      await expect(login({ email: 'wrongpass@example.com', password: 'Totally-Wrong9!' })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('locks the account after 5 failed attempts', async () => {
      await register({ email: 'lockout@example.com', password: STRONG_PASSWORD, firstName: 'A', lastName: 'B' });

      for (let i = 0; i < 5; i++) {
        await expect(login({ email: 'lockout@example.com', password: 'Totally-Wrong9!' })).rejects.toThrow();
      }

      await expect(login({ email: 'lockout@example.com', password: STRONG_PASSWORD })).rejects.toThrow(
        'Account locked',
      );
    });
  });

  describe('refreshTokens', () => {
    async function registeredUser(email: string) {
      return register({ email, password: STRONG_PASSWORD, firstName: 'A', lastName: 'B' });
    }

    it('rotates the pair and single-uses the old token', async () => {
      const { refreshToken } = await registeredUser('rotate@example.com');

      const rotated = await rotateRefreshToken(refreshToken);

      expect(rotated.refreshToken).not.toBe(refreshToken);
      expect(mocks.refreshTokenRepository.all().filter((t: any) => t.revokedAt)).toHaveLength(1);
    });

    it('revokes every session when a revoked token is replayed', async () => {
      const { refreshToken } = await registeredUser('replay@example.com');
      const rotated = await rotateRefreshToken(refreshToken);

      // The attacker replays the token the legitimate client already spent.
      await expect(rotateRefreshToken(refreshToken)).rejects.toThrow('already been used or revoked');

      // Every outstanding token is dead, including the one the legitimate
      // client is holding — it has to log in again, and so does the attacker.
      expect(mocks.refreshTokenRepository.all().every((t: any) => t.revokedAt)).toBe(true);
      await expect(rotateRefreshToken(rotated.refreshToken)).rejects.toThrow();
    });

    it('bumps tokenVersion on reuse so outstanding access tokens stop being trusted', async () => {
      const { user, refreshToken } = await registeredUser('bump@example.com');
      await rotateRefreshToken(refreshToken);

      await expect(rotateRefreshToken(refreshToken)).rejects.toThrow();

      const after = await mocks.userRepository.findUnique({
        where: { id: user.id },
        select: { tokenVersion: true },
      });
      expect(after.tokenVersion).toBeGreaterThan(0);
    });
  });
});
