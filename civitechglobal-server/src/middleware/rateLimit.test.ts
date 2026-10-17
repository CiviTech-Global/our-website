import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

/**
 * The refresh bucket belongs to the account, not to the address.
 *
 * Mobile carriers in Iran share one public address among thousands of phones,
 * and every app launch refreshes a token. Keyed by address, one busy carrier
 * address would lock every customer on it out of their session.
 */
vi.mock('../config/redis.js', () => ({ redis: { call: vi.fn() } }));
vi.mock('../utils/jwt.js', () => ({
  verifyRefreshToken: (token: string) => {
    if (token !== 'valid-token') throw new Error('invalid signature');
    return { userId: 'user-1', jti: 'j' };
  },
}));

const { refreshKey } = await import('./rateLimit.js');

const request = (fields: Partial<Request>) => ({ ip: '5.160.0.1', ...fields }) as Request;

describe('the refresh rate-limit key', () => {
  it('is the account for a browser presenting its cookie', () => {
    expect(refreshKey(request({ cookies: { refreshToken: 'valid-token' } }))).toBe('user:user-1');
  });

  it('is the account for the app presenting its token in the body', () => {
    expect(refreshKey(request({ body: { refreshToken: 'valid-token' } }))).toBe('user:user-1');
  });

  it('falls back to the address for a token that is not ours, so junk stays bounded', () => {
    const key = refreshKey(request({ body: { refreshToken: 'forged' } }));

    expect(key).not.toContain('user:');
    expect(key).toContain('5.160.0.1');
  });

  it('falls back to the address when nothing is presented', () => {
    expect(refreshKey(request({}))).toContain('5.160.0.1');
  });
});
