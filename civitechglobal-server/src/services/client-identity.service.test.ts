import { describe, expect, it } from 'vitest';
import type { ClientIdentity, Prisma } from '@prisma/client';
import {
  COOLDOWN_MS,
  DAILY_LIMIT,
  WINDOW_MS,
  assertWithinRateLimits,
  normalizeEmail,
  normalizePhone,
  resolveIdentity,
} from './client-identity.service.js';

/**
 * The service takes the transaction client as a parameter, so these run
 * against a hand-built stub rather than a mocked module. The rules under test
 * are pure decisions over what the database returned.
 */

function identity(over: Partial<ClientIdentity> = {}): ClientIdentity {
  return {
    id: 'id-1',
    email: 'a@example.com',
    emailHash: 'eh',
    phone: '09121234567',
    phoneHash: 'ph',
    requestCount: 0,
    lastRequestAt: null,
    trusted: false,
    blocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

/** A stub transaction exposing only what the service actually calls. */
function tx(opts: {
  byEmail?: ClientIdentity | null;
  byPhone?: ClientIdentity | null;
  recent?: Date[];
  onCreate?: (data: unknown) => void;
}): Prisma.TransactionClient {
  return {
    clientIdentity: {
      findUnique: async ({ where }: { where: { emailHash?: string; phoneHash?: string } }) =>
        where.emailHash !== undefined ? (opts.byEmail ?? null) : (opts.byPhone ?? null),
      create: async ({ data }: { data: unknown }) => {
        opts.onCreate?.(data);
        return identity(data as Partial<ClientIdentity>);
      },
    },
    projectRequest: {
      findMany: async () => (opts.recent ?? []).map((createdAt) => ({ createdAt })),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('normalisation', () => {
  it('lowercases and trims the email so casing cannot fork an identity', () => {
    expect(normalizeEmail('  Ali@Example.COM ')).toBe('ali@example.com');
  });

  it('normalises every spelling of a mobile number to one form', () => {
    // Without this, adding a space would be enough to defeat the pairing rule.
    expect(normalizePhone('09121234567')).toBe('09121234567');
    expect(normalizePhone('+989121234567')).toBe('09121234567');
    expect(normalizePhone('0098 912 123 4567')).toBe('09121234567');
    expect(normalizePhone('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
  });

  it('rejects something that is not a mobile number', () => {
    expect(() => normalizePhone('02112345678')).toThrow();
    expect(() => normalizePhone('hello')).toThrow();
  });
});

describe('resolveIdentity — the pairing rule', () => {
  const input = { email: 'a@example.com', phone: '09121234567' };

  it('creates a binding the first time a pair is seen', async () => {
    let created: Record<string, unknown> | null = null;
    const result = await resolveIdentity(
      tx({ byEmail: null, byPhone: null, onCreate: (d) => (created = d as Record<string, unknown>) }),
      input
    );
    expect(result).toBeTruthy();
    expect(created).toBeTruthy();
    // Stored normalised, and hashed for the unique lookup.
    expect(created!.email).toBe('a@example.com');
    expect(created!.phone).toBe('09121234567');
    expect(created!.emailHash).toEqual(expect.any(String));
    expect(created!.phoneHash).toEqual(expect.any(String));
  });

  it('returns the existing binding when the same pair comes back', async () => {
    const known = identity();
    const result = await resolveIdentity(tx({ byEmail: known, byPhone: known }), input);
    expect(result.id).toBe('id-1');
  });

  it('refuses a known email with a new phone number', async () => {
    await expect(
      resolveIdentity(tx({ byEmail: identity(), byPhone: null }), input)
    ).rejects.toThrow(/شمارهٔ تماس دیگری/);
  });

  it('refuses a known phone number with a new email', async () => {
    await expect(
      resolveIdentity(tx({ byEmail: null, byPhone: identity() }), input)
    ).rejects.toThrow(/ایمیل دیگری/);
  });

  it('refuses halves borrowed from two different identities', async () => {
    await expect(
      resolveIdentity(
        tx({ byEmail: identity({ id: 'one' }), byPhone: identity({ id: 'two' }) }),
        input
      )
    ).rejects.toThrow(/اطلاعات دیگری/);
  });
});

describe('assertWithinRateLimits', () => {
  const now = new Date('2026-09-05T12:00:00Z');
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it('allows the first request', async () => {
    await expect(assertWithinRateLimits(tx({ recent: [] }), identity(), now)).resolves.toBeTruthy();
  });

  it('enforces one hour between requests', async () => {
    await expect(
      assertWithinRateLimits(tx({ recent: [minutesAgo(30)] }), identity(), now)
    ).rejects.toThrow(/یک ساعت فاصله/);
  });

  it('allows the next request once the hour has passed', async () => {
    await expect(
      assertWithinRateLimits(tx({ recent: [minutesAgo(61)] }), identity(), now)
    ).resolves.toBeTruthy();
  });

  it(`caps the day at ${DAILY_LIMIT} requests`, async () => {
    const three = [minutesAgo(70), minutesAgo(200), minutesAgo(400)];
    await expect(assertWithinRateLimits(tx({ recent: three }), identity(), now)).rejects.toThrow(
      /شبانه‌روز/
    );
  });

  it('measures the cap from the oldest request, so a refusal does not extend the ban', async () => {
    // Three requests, the oldest 23h ago. The cap must lift in about an hour,
    // not 24 hours from this rejected attempt.
    const oldest = new Date(now.getTime() - (WINDOW_MS - 60 * 60 * 1000));
    const recent = [minutesAgo(70), minutesAgo(200), oldest];
    await expect(
      assertWithinRateLimits(tx({ recent }), identity(), now)
    ).rejects.toThrow(/۱ ساعت|1 ساعت|دقیقه/);
  });

  it('lets a request through once the oldest of three ages out of the window', async () => {
    const recent = [minutesAgo(70), minutesAgo(200)]; // the third has aged out
    await expect(assertWithinRateLimits(tx({ recent }), identity(), now)).resolves.toBeTruthy();
  });

  it('exempts a trusted client from both rules', async () => {
    const busy = [minutesAgo(1), minutesAgo(2), minutesAgo(3), minutesAgo(4)];
    await expect(
      assertWithinRateLimits(tx({ recent: busy }), identity({ trusted: true }), now)
    ).resolves.toBeTruthy();
  });

  it('refuses a blocked client outright', async () => {
    await expect(
      assertWithinRateLimits(tx({ recent: [] }), identity({ blocked: true }), now)
    ).rejects.toThrow();
  });

  it('reports the cooldown in minutes a person can act on', async () => {
    await expect(
      assertWithinRateLimits(tx({ recent: [minutesAgo(26)] }), identity(), now)
    ).rejects.toThrow(/34 دقیقه/);
  });

  it('uses the cooldown constant it documents', () => {
    expect(COOLDOWN_MS).toBe(60 * 60 * 1000);
    expect(WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});
