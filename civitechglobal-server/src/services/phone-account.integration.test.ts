// The database, from the development .env locally; CI sets DATABASE_URL itself.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Verifying a member's phone and resetting a password by SMS, against the real
 * database and Redis. The text itself is captured instead of sent, so the test
 * can read the code the way the member would.
 */

const sent = vi.hoisted(() => ({ codes: [] as Array<{ phone: string; code: string }>, alerts: [] as string[] }));

vi.mock('./sms/index.js', () => ({ canSendSms: () => true, smsProvider: () => ({ name: 'kavenegar' }) }));
vi.mock('./sms/dispatch.js', () => ({
  sendSms: vi.fn(async (_kind: string, target: { phone: string }, tokens: { token: string }) => {
    sent.codes.push({ phone: target.phone, code: tokens.token });
    return { status: 'SENT' };
  }),
  smsMemberSafely: vi.fn((userId: string) => sent.alerts.push(userId)),
  sendSmsSafely: vi.fn(),
  memberPhone: vi.fn(),
}));

const { prisma } = await import('../config/database.js');
const { redis } = await import('../config/redis.js');
const { comparePassword } = await import('../utils/password.js');
const phone = await import('./phone-account.service.js');

const RUN = randomUUID().slice(0, 8);
const created: string[] = [];

async function member(withVerifiedPhone: string | null) {
  const email = `phone-${RUN}-${created.length}@test.invalid`;
  const { emailLookupHash } = await import('./auth.service.js');
  const user = await prisma.user.create({
    data: {
      email,
      emailHash: emailLookupHash(email),
      password: 'x',
      firstName: 'T',
      lastName: 'P',
      username: `phone${RUN}${created.length}`,
      phone: withVerifiedPhone,
      phoneVerifiedAt: withVerifiedPhone ? new Date() : null,
    },
    select: { id: true, email: true, username: true },
  });
  created.push(user.id);
  return user;
}

const lastCode = () => sent.codes.at(-1)!.code;

beforeEach(async () => {
  sent.codes.length = 0;
  sent.alerts.length = 0;
  // Cooldowns from an earlier case would answer 429.
  const keys = await redis.keys('acct-code*');
  if (keys.length) await redis.del(...keys);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: created } } });
});

describe('verifying the account phone', () => {
  it('texts a code to the number and marks it verified once the code comes back', async () => {
    const user = await member(null);
    await phone.requestPhoneCode(user.id, '+989120001122');
    expect(sent.codes.at(-1)!.phone).toBe('09120001122');

    const result = await phone.confirmPhoneCode(user.id, lastCode());
    expect(result.phone).toBe('09120001122');
    expect(result.phoneVerifiedAt).toBeInstanceOf(Date);
  });

  it('refuses a wrong code, and burns the code after too many guesses', async () => {
    const user = await member(null);
    await phone.requestPhoneCode(user.id, '09120001133');
    const right = lastCode();
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await expect(phone.confirmPhoneCode(user.id, wrong)).rejects.toMatchObject({ statusCode: 400 });
    }
    // Even the right code is useless now.
    await expect(phone.confirmPhoneCode(user.id, right)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('makes a second request wait for the cooldown', async () => {
    const user = await member(null);
    await phone.requestPhoneCode(user.id, '09120001144');
    await expect(phone.requestPhoneCode(user.id, '09120001144')).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe('resetting a password by SMS', () => {
  it('answers the same for an unknown account and sends nothing', async () => {
    await expect(phone.requestPasswordResetSms('nobody-here@test.invalid')).resolves.toEqual({ sent: true });
    expect(sent.codes).toHaveLength(0);
  });

  it('sends nothing to an account without a verified phone', async () => {
    const user = await member(null);
    await phone.requestPasswordResetSms(user.email);
    expect(sent.codes).toHaveLength(0);
  });

  it('resets with the code, ends every session and raises a security alert', async () => {
    const user = await member('09120001155');
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { tokenVersion: true } });

    await phone.requestPasswordResetSms(user.username!);
    expect(sent.codes.at(-1)!.phone).toBe('09120001155');

    await phone.resetPasswordWithSms(user.email, lastCode(), 'N3w!Password-2026');
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { password: true, tokenVersion: true } });
    expect(await comparePassword('N3w!Password-2026', after.password)).toBe(true);
    expect(after.tokenVersion).toBe(before.tokenVersion + 1);
    expect(sent.alerts).toContain(user.id);
  });

  it('gives one generic answer for a wrong code or a wrong account', async () => {
    const user = await member('09120001166');
    await phone.requestPasswordResetSms(user.email);
    const wrong = lastCode() === '000000' ? '111111' : '000000';
    await expect(phone.resetPasswordWithSms(user.email, wrong, 'N3w!Password-2026')).rejects.toMatchObject({ statusCode: 400 });
    await expect(phone.resetPasswordWithSms('nobody@test.invalid', lastCode(), 'N3w!Password-2026')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
