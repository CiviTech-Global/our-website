import { randomBytes } from 'node:crypto';
import type { UserTokenPurpose } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailProvider } from './email/index.js';
import { hashPassword } from '../utils/password.js';
import { sha256Hex } from '../utils/hash.js';
import { emailLookupHash } from './auth.service.js';

/**
 * Password reset and email verification.
 *
 * Both are the same mechanism — mail a single-use link, redeem it once — so
 * they share issuing, hashing and expiry, and differ only in what redeeming
 * does. What they must NOT share is what they reveal: a reset request answers
 * the same way whether or not the address belongs to an account, because the
 * endpoint is public and would otherwise be a way to enumerate our users.
 */

/**
 * 32 bytes from the CSPRNG, base64url.
 *
 * Long enough that guessing is not a threat model, and URL-safe so the link
 * survives being copied out of an email client that helpfully "fixes" it.
 */
function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

async function issueToken(userId: string, purpose: UserTokenPurpose, ttlMs: number) {
  const token = generateToken();

  // Any outstanding link of the same kind is spent the moment a new one is
  // issued. Otherwise asking for a second reset because the first email did not
  // arrive would leave two working links, and the older one lives in whatever
  // inbox or log the first send touched.
  await prisma.userToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.userToken.create({
    data: {
      userId,
      purpose,
      token: sha256Hex(token),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  return token;
}

/**
 * Finds a live token and marks it spent, in one step.
 *
 * The update is the guard: `usedAt: null` in the WHERE means two simultaneous
 * redemptions cannot both succeed, however close together they arrive. Checking
 * first and updating after would leave exactly that gap.
 */
async function redeemToken(rawToken: string, purpose: UserTokenPurpose) {
  const token = await prisma.userToken.findUnique({
    where: { token: sha256Hex(rawToken) },
    select: { id: true, userId: true, purpose: true, expiresAt: true, usedAt: true },
  });

  // One message for every failure — wrong token, wrong kind, already spent,
  // expired. Distinguishing them tells whoever is probing which guess was warm.
  const invalid = new AppError('این پیوند معتبر نیست یا منقضی شده است.', 400);

  if (!token || token.purpose !== purpose || token.usedAt) throw invalid;
  if (token.expiresAt.getTime() <= Date.now()) throw invalid;

  const claimed = await prisma.userToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid;

  return token.userId;
}

/**
 * Sending must never decide the outcome of the request.
 *
 * A provider outage would otherwise turn "we sent you a link" into a 500, and
 * on the reset path a 500 for a real address and a 200 for an unknown one is
 * the enumeration leak the generic response exists to prevent.
 */
async function sendQuietly(to: string, subject: string, text: string): Promise<void> {
  try {
    await emailProvider().send({ to, subject, text });
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Email delivery failed');
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { emailHash: emailLookupHash(rawEmail), deletedAt: null },
    select: { id: true, email: true, firstName: true },
  });

  // Deliberately silent. The caller answers 200 either way; see the route.
  if (!user) return;

  const token = await issueToken(
    user.id,
    'PASSWORD_RESET',
    env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  );
  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await sendQuietly(
    user.email,
    'بازنشانی رمز عبور — رایان تمدن جهان گستر',
    [
      `${user.firstName} عزیز،`,
      '',
      'برای انتخاب رمز عبور تازه روی پیوند زیر بزنید:',
      link,
      '',
      `این پیوند تا ${env.PASSWORD_RESET_TTL_MINUTES} دقیقهٔ دیگر معتبر است و تنها یک بار کار می‌کند.`,
      'اگر شما این درخواست را نداده‌اید، نیازی به هیچ کاری نیست؛ رمز عبور فعلی شما بدون تغییر می‌ماند.',
    ].join('\n'),
  );
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const userId = await redeemToken(rawToken, 'PASSWORD_RESET');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: await hashPassword(newPassword),
        // Whoever asked for this may be locking an intruder out. Bumping the
        // version invalidates every access and refresh token already issued,
        // so any session opened with the old password dies here.
        tokenVersion: { increment: 1 },
        // Only the address holder can have followed the link, which is exactly
        // what verification proves.
        emailVerified: true,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, firstName: true, emailVerified: true },
  });

  if (!user) throw new AppError('حساب کاربری پیدا نشد.', 404);
  if (user.emailVerified) throw new AppError('این نشانی پیش‌تر تأیید شده است.', 409);

  const token = await issueToken(
    user.id,
    'EMAIL_VERIFICATION',
    env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
  );
  const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  await sendQuietly(
    user.email,
    'تأیید نشانی ایمیل — رایان تمدن جهان گستر',
    [
      `${user.firstName} عزیز،`,
      '',
      'برای تأیید نشانی ایمیل خود روی پیوند زیر بزنید:',
      link,
      '',
      `این پیوند تا ${env.EMAIL_VERIFICATION_TTL_HOURS} ساعت دیگر معتبر است.`,
    ].join('\n'),
  );
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const userId = await redeemToken(rawToken, 'EMAIL_VERIFICATION');
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
}
