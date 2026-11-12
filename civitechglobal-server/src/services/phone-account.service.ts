import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import { hashPassword } from '../utils/password.js';
import { normalizeIranMobile } from '../utils/persian.js';
import { emailLookupHash } from './auth.service.js';
import { canSendSms } from './sms/index.js';
import { sendSms, smsMemberSafely } from './sms/dispatch.js';
import { tokenWords } from './sms/templates.js';

/**
 * A member's phone, proved by a code, and what it unlocks: resetting a
 * password by SMS, and security alerts.
 *
 * Email is off in this deployment, so before this the only way back into a
 * forgotten account was asking staff. A verified phone is now that way back.
 * Only a verified number is ever used: a reset code sent to a typo is a code
 * handed to a stranger.
 *
 * Codes live in Redis like the insurance codes do (services/otp.service.ts):
 * keyed by purpose and account, stored as a keyed hash, burned after
 * OTP_MAX_ATTEMPTS wrong guesses, expiring after OTP_TTL_SECONDS.
 */

type Purpose = 'phone' | 'reset';
const CODE_LENGTH = 6;

interface StoredCode {
  hash: string;
  attempts: number;
  /** For 'phone': the number being proved, which the code is bound to. */
  phone: string;
}

const codeKey = (purpose: Purpose, userId: string) => `acct-code:${purpose}:${userId}`;
const cooldownKey = (purpose: Purpose, userId: string) => `acct-code-cd:${purpose}:${userId}`;

function hashCode(userId: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Issues and texts a code. Throws 429 inside the cooldown, 502 if the text fails. */
async function issueCode(purpose: Purpose, userId: string, phone: string): Promise<void> {
  const acquired = await redis.set(cooldownKey(purpose, userId), '1', 'EX', env.OTP_RESEND_COOLDOWN_SECONDS, 'NX');
  if (acquired === null) {
    const ttl = await redis.ttl(cooldownKey(purpose, userId));
    throw new AppError(`کد قبلی هنوز معتبر است. ${Math.max(ttl, 1)} ثانیه دیگر تلاش کنید.`, 429);
  }

  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
  const stored: StoredCode = { hash: hashCode(userId, code), attempts: 0, phone };
  await redis.set(codeKey(purpose, userId), JSON.stringify(stored), 'EX', env.OTP_TTL_SECONDS);

  const sent = await sendSms('otp', { phone, userId }, { token: code });
  if (sent.status !== 'SENT') {
    await redis.del(codeKey(purpose, userId), cooldownKey(purpose, userId));
    throw new AppError('ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید.', 502);
  }
}

/** Checks a code; returns the stored record when it matches, and spends it. */
async function spendCode(purpose: Purpose, userId: string, code: string): Promise<StoredCode | null> {
  const key = codeKey(purpose, userId);
  const raw = await redis.get(key);
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredCode;

  if (!sameHash(stored.hash, hashCode(userId, code.trim()))) {
    stored.attempts += 1;
    if (stored.attempts >= env.OTP_MAX_ATTEMPTS) await redis.del(key);
    else await redis.set(key, JSON.stringify(stored), 'KEEPTTL');
    return null;
  }
  await redis.del(key, cooldownKey(purpose, userId));
  return stored;
}

function assertSmsAvailable() {
  if (!canSendSms()) throw new AppError('ارسال پیامک در این سایت فعال نیست.', 501);
}

// ---------------------------------------------------------------------------
// Verifying the account's phone
// ---------------------------------------------------------------------------

export async function requestPhoneCode(userId: string, rawPhone: string): Promise<{ expiresInSeconds: number }> {
  assertSmsAvailable();
  const phone = normalizeIranMobile(rawPhone);
  if (!phone) throw new AppError('شمارهٔ همراه معتبر نیست. به شکل ۰۹xxxxxxxxx وارد کنید.', 400);
  await issueCode('phone', userId, phone);
  return { expiresInSeconds: env.OTP_TTL_SECONDS };
}

export async function confirmPhoneCode(userId: string, code: string) {
  const stored = await spendCode('phone', userId, code);
  if (!stored) throw new AppError('کد واردشده درست نیست یا منقضی شده است.', 400);

  return prisma.user.update({
    where: { id: userId },
    data: { phone: stored.phone, phoneVerifiedAt: new Date() },
    select: { phone: true, phoneVerifiedAt: true, smsOptOut: true },
  });
}

export async function getPhoneSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      phoneVerifiedAt: true,
      smsOptOut: true,
      // Offered as the number to verify: the one given at identity verification.
      verification: { select: { phone: true } },
    },
  });
  return {
    phone: user?.phone ?? null,
    phoneVerifiedAt: user?.phoneVerifiedAt ?? null,
    smsOptOut: user?.smsOptOut ?? false,
    suggestedPhone: user?.verification?.phone ?? null,
    smsAvailable: canSendSms(),
  };
}

export async function setSmsOptOut(userId: string, optOut: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { smsOptOut: optOut },
    select: { smsOptOut: true },
  });
}

// ---------------------------------------------------------------------------
// Resetting a password by SMS
// ---------------------------------------------------------------------------

/** The account an email address or a username names, active only. */
async function findByIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;
  return prisma.user.findFirst({
    where: value.includes('@') ? { emailHash: emailLookupHash(value), deletedAt: null } : { username: value, deletedAt: null },
    select: { id: true, phone: true, phoneVerifiedAt: true },
  });
}

/**
 * Sends a reset code to the account's verified phone.
 *
 * Answers the same whether or not the account exists, has a verified phone, or
 * is inside the cooldown: the endpoint is public and must not tell a stranger
 * which addresses have accounts. The masked number goes back only as a hint
 * the caller already holds the account's identifier for.
 */
export async function requestPasswordResetSms(identifier: string): Promise<{ sent: true }> {
  assertSmsAvailable();
  const user = await findByIdentifier(identifier);
  if (user?.phone && user.phoneVerifiedAt) {
    try {
      await issueCode('reset', user.id, user.phone);
    } catch (error) {
      // A cooldown or a failed send must look the same as "no such account".
      if (!(error instanceof AppError)) throw error;
    }
  }
  return { sent: true };
}

export async function resetPasswordWithSms(identifier: string, code: string, newPassword: string): Promise<void> {
  const generic = new AppError('کد یا شناسهٔ حساب درست نیست، یا کد منقضی شده است.', 400);
  const user = await findByIdentifier(identifier);
  if (!user) throw generic;
  const stored = await spendCode('reset', user.id, code);
  if (!stored) throw generic;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Whoever reset it may be locking an intruder out: every session ends.
      data: { password: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  smsMemberSafely(user.id, 'security', 'security', { token: tokenWords('بازیابی', 'رمز', 'عبور') });
}

/** For tests and the log: the hash the dispatcher records for a phone. */
export const phoneHashFor = (phone: string) => sha256Hex(normalizeIranMobile(phone) ?? phone);
