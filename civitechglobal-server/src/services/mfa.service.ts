import { timingSafeEqual } from 'node:crypto';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import {
  generateRecoveryCodes,
  generateSecret,
  otpauthUri,
  verifyTotp,
} from '../utils/totp.js';

/**
 * Two-factor authentication.
 *
 * Opt-in per account, because forcing it on a public registration flow would
 * cost more people than it protects. It matters for staff: an admin session
 * can read every CV that arrives and every client attachment, much of it under
 * NDA, so a stolen password should not be the whole story.
 *
 * Enrolment is two steps on purpose. Handing out a secret and switching MFA on
 * in the same call locks out anyone whose authenticator did not actually take
 * it — which is the single most common way self-service MFA goes wrong.
 */

const ISSUER = 'CiviTech Global';

export interface EnrolmentStart {
  secret: string;
  otpauthUri: string;
}

/**
 * Step one: generate a secret and hand it over, without enabling anything.
 *
 * Stored immediately so step two can verify against it, but `mfaEnabledAt`
 * stays null, which is what every other code path reads.
 */
export async function beginEnrolment(userId: string): Promise<EnrolmentStart> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { email: true, mfaEnabledAt: true },
  });

  if (!user) throw new AppError('حساب کاربری پیدا نشد.', 404);
  if (user.mfaEnabledAt) {
    throw new AppError('ورود دومرحله‌ای پیش‌تر فعال شده است.', 409);
  }

  const secret = generateSecret();

  // Overwrites any half-finished attempt. Someone who started, lost the
  // screen and started again should get a working secret, not the old one.
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });

  return { secret, otpauthUri: otpauthUri(secret, user.email, ISSUER) };
}

/**
 * Step two: prove the authenticator holds the secret, then switch it on.
 *
 * Returns the recovery codes, once. They are stored hashed, so this is the
 * only moment they can be shown — which the caller has to make clear.
 */
export async function confirmEnrolment(userId: string, code: string): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { mfaSecret: true, mfaEnabledAt: true },
  });

  if (!user?.mfaSecret) throw new AppError('ابتدا مرحلهٔ اول را انجام دهید.', 409);
  if (user.mfaEnabledAt) throw new AppError('ورود دومرحله‌ای پیش‌تر فعال شده است.', 409);
  if (!verifyTotp(user.mfaSecret, code)) throw new AppError('کد واردشده درست نیست.', 400);

  const codes = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabledAt: new Date(),
      mfaRecoveryCodes: codes.map(sha256Hex),
    },
  });

  return codes;
}

/**
 * Turning it off requires a current code, not just a session.
 *
 * Otherwise anyone who walks up to an unlocked laptop can remove the control
 * that exists for exactly that situation.
 */
export async function disable(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { mfaSecret: true, mfaEnabledAt: true, mfaRecoveryCodes: true },
  });

  if (!user?.mfaEnabledAt || !user.mfaSecret) {
    throw new AppError('ورود دومرحله‌ای فعال نیست.', 409);
  }

  const accepted =
    verifyTotp(user.mfaSecret, code) || consumeRecoveryCode(user.mfaRecoveryCodes, code) !== null;
  if (!accepted) throw new AppError('کد واردشده درست نیست.', 400);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: null, mfaEnabledAt: null, mfaRecoveryCodes: [] },
  });
}

/**
 * Finds a matching recovery code and returns the remaining ones.
 *
 * Compared in constant time, and every stored hash is examined rather than
 * breaking on the first match, so the work does not depend on which code was
 * used. Returns null when nothing matched.
 */
function consumeRecoveryCode(hashes: string[], submitted: string): string[] | null {
  const candidate = Buffer.from(sha256Hex(submitted.trim().toUpperCase()), 'utf8');

  let matchedIndex = -1;
  hashes.forEach((hash, index) => {
    const stored = Buffer.from(hash, 'utf8');
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
      matchedIndex = index;
    }
  });

  return matchedIndex === -1 ? null : hashes.filter((_, index) => index !== matchedIndex);
}

/**
 * Checks a code at sign-in, accepting either a TOTP or a recovery code.
 *
 * A spent recovery code is removed here, which is what makes it single-use.
 */
export async function verifyChallenge(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { mfaSecret: true, mfaEnabledAt: true, mfaRecoveryCodes: true },
  });

  if (!user?.mfaEnabledAt || !user.mfaSecret) {
    throw new AppError('ورود دومرحله‌ای فعال نیست.', 409);
  }

  if (verifyTotp(user.mfaSecret, code)) return;

  const remaining = consumeRecoveryCode(user.mfaRecoveryCodes, code);
  if (remaining === null) throw new AppError('کد واردشده درست نیست.', 401);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaRecoveryCodes: remaining },
  });
}

/** Whether sign-in must ask for a second factor. */
export async function isEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { mfaEnabledAt: true },
  });
  return Boolean(user?.mfaEnabledAt);
}

/** How many recovery codes are left, for the profile page to warn on. */
export async function status(userId: string): Promise<{ enabled: boolean; recoveryCodesLeft: number }> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { mfaEnabledAt: true, mfaRecoveryCodes: true },
  });

  return {
    enabled: Boolean(user?.mfaEnabledAt),
    recoveryCodesLeft: user?.mfaRecoveryCodes.length ?? 0,
  };
}
