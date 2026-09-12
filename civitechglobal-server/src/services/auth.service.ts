import { randomBytes } from 'node:crypto';
import { sha256Hex } from '../utils/hash.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';
import { refreshTokenRepository } from '../database/prisma/repositories/refresh-token.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '../validators/auth.schema.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deterministic (non-reversible) lookup key for a normalized email. See the
 * comment on `User.emailHash` in prisma/schema.prisma: this keeps every
 * lookup path independent of whether `email` itself is later encrypted.
 */
export function emailLookupHash(email: string): string {
  return sha256Hex(normalizeEmail(email));
}

function jtiHash(jti: string): string {
  return sha256Hex(jti);
}

function lockoutKey(email: string): string {
  return `login:failed:${normalizeEmail(email)}`;
}

async function checkLockout(email: string): Promise<void> {
  const key = lockoutKey(email);
  const countStr = await redis.get(key);
  if (!countStr) return;

  const count = parseInt(countStr, 10);
  if (count >= MAX_FAILED_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      throw new AppError(`Account locked due to too many failed attempts. Try again in ${ttl} seconds.`, 429);
    }
    await redis.del(key);
  }
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = lockoutKey(email);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
  }
}

async function clearFailedAttempts(email: string): Promise<void> {
  await redis.del(lockoutKey(email));
}

function userResponseFields() {
  return {
    id: true,
    email: true,
    username: true,
    firstName: true,
    lastName: true,
    role: true,
    permissions: true,
    tokenVersion: true,
    phone: true,
    emailVerified: true,
    createdAt: true,
  } as const;
}

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/** A user's AdminRole bundle (if any) grants permissions in addition to
 * the ad-hoc ones on the user row itself — see prisma/schema.prisma
 * AdminRole. Fetched separately so callers don't all need to remember to
 * include the relation on every user query. */
async function getAdminRolePermissions(userId: string): Promise<string[]> {
  const user = await userRepository.findUnique({
    where: { id: userId },
    select: { adminRole: { select: { permissions: true } } },
  });
  return user?.adminRole?.permissions ?? [];
}

async function issueTokenPair(user: {
  id: string;
  role: import('@prisma/client').Role;
  permissions: string[];
  tokenVersion: number;
}): Promise<IssuedTokens> {
  const adminRolePermissions = await getAdminRolePermissions(user.id);
  const effectivePermissions = Array.from(new Set([...user.permissions, ...adminRolePermissions]));

  const claims = {
    userId: user.id,
    role: user.role,
    permissions: effectivePermissions,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = generateAccessToken(claims);
  const { token: refreshToken, jti } = generateRefreshToken(claims);

  await refreshTokenRepository.create({
    data: {
      token: jtiHash(jti),
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const emailHash = emailLookupHash(input.email);

  // `emailHash` is unique at the DB level, so a soft-deleted row with the
  // same email still occupies it. Only an *active* conflicting row should
  // block registration; a soft-deleted one is reactivated instead of
  // leaving the address permanently squatted.
  const existing = await userRepository.findFirst({ where: { emailHash } });
  if (existing && !existing.deletedAt) throw new AppError('Email already registered', 409);

  const password = await hashPassword(input.password);

  const user = existing
    ? await userRepository.update({
        where: { id: existing.id },
        data: {
          email: normalizeEmail(input.email),
          password,
          firstName: input.firstName,
          lastName: input.lastName,
          deletedAt: null,
          // Invalidate any tokens issued before this account was
          // soft-deleted / before this reactivation.
          tokenVersion: { increment: 1 },
        },
        select: userResponseFields(),
      })
    : await userRepository.create({
        data: {
          email: normalizeEmail(input.email),
          emailHash,
          password,
          firstName: input.firstName,
          lastName: input.lastName,
        },
        select: userResponseFields(),
      });

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

/**
 * Short-lived proof that a password was accepted, pending a second factor.
 *
 * Kept in Redis rather than issued as a JWT: it must be revocable the instant
 * it is spent, it is worthless after five minutes, and it should never be
 * mistaken by any middleware for an access token — which a JWT signed with the
 * same key eventually would be.
 */
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

function mfaChallengeKey(token: string): string {
  return `mfa:challenge:${sha256Hex(token)}`;
}

export async function issueMfaChallenge(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await redis.set(mfaChallengeKey(token), userId, 'EX', MFA_CHALLENGE_TTL_SECONDS);
  return token;
}

/** How many wrong codes a challenge survives before it is thrown away. */
const MFA_CHALLENGE_MAX_ATTEMPTS = 5;

/**
 * Reads the challenge WITHOUT spending it, and returns whose it is.
 *
 * Deliberately not consumed here. Deleting on read makes a single mistyped
 * digit cost the whole sign-in, password and all, which is hostile enough that
 * people turn the feature off. Replay protection comes from deleting on
 * success instead; brute force is bounded by the attempt counter below.
 */
export async function peekMfaChallenge(token: string): Promise<string | null> {
  return redis.get(mfaChallengeKey(token));
}

/** Called once the second factor is accepted, so the challenge cannot replay. */
export async function spendMfaChallenge(token: string): Promise<void> {
  await redis.del(mfaChallengeKey(token), `${mfaChallengeKey(token)}:attempts`);
}

/**
 * Records a wrong code, and destroys the challenge once there have been too
 * many. Returns how many attempts remain.
 */
export async function recordMfaFailure(token: string): Promise<number> {
  const attemptsKey = `${mfaChallengeKey(token)}:attempts`;
  const attempts = await redis.incr(attemptsKey);
  // Expire alongside the challenge itself; a counter that outlives it would
  // block the next sign-in for no reason.
  if (attempts === 1) await redis.expire(attemptsKey, MFA_CHALLENGE_TTL_SECONDS);

  if (attempts >= MFA_CHALLENGE_MAX_ATTEMPTS) {
    await spendMfaChallenge(token);
    return 0;
  }
  return MFA_CHALLENGE_MAX_ATTEMPTS - attempts;
}

/** Issues the real session for a user who has cleared every check. */
export async function issueSessionFor(userId: string) {
  const user = await userRepository.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const tokens = await issueTokenPair(user);
  const { password: _password, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

export async function login(input: LoginInput) {
  await checkLockout(input.email);

  const emailHash = emailLookupHash(input.email);
  const user = await userRepository.findFirst({ where: { emailHash } });

  // Same generic message and same code path whether the email is unknown,
  // the account is soft-deleted, or the password is wrong, to avoid leaking
  // which case occurred.
  if (!user || user.deletedAt) {
    await recordFailedAttempt(input.email);
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    await recordFailedAttempt(input.email);
    throw new AppError('Invalid credentials', 401);
  }

  await clearFailedAttempts(input.email);

  const tokens = await issueTokenPair(user);
  const { password: _password, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

export async function refreshTokens(oldRefreshToken: string) {
  const payload = verifyRefreshToken(oldRefreshToken);
  const tokenHash = jtiHash(payload.jti);

  const storedToken = await refreshTokenRepository.findUnique({ where: { token: tokenHash } });
  if (!storedToken) throw new AppError('Invalid refresh token', 401);

  if (storedToken.revokedAt) {
    // REUSE DETECTION. Refresh tokens are rotated single-use: the row is
    // revoked at the moment its replacement is issued. So a revoked token
    // being presented again means one of two things — a client raced itself,
    // or someone is replaying a token they should not have. We cannot tell
    // which from here, and only one of them is safe to ignore.
    //
    // The safe response to both is to assume the whole chain is compromised
    // and burn it: revoke every outstanding refresh token for this user and
    // bump tokenVersion, which also invalidates every access token already
    // issued (see middleware/authenticate.ts). The legitimate user logs in
    // again; the attacker's stolen token is now worth nothing.
    logger.warn(
      { userId: storedToken.userId, event: 'refresh_token_reuse' },
      'Revoked refresh token replayed — revoking all sessions for this user',
    );
    await revokeAllUserRefreshTokens(storedToken.userId);
    throw new AppError('Refresh token has already been used or revoked', 401);
  }

  if (storedToken.expiresAt < new Date()) throw new AppError('Refresh token expired', 401);

  const user = await userRepository.findUnique({ where: { id: payload.userId } });
  if (!user || user.deletedAt) throw new AppError('User not found', 404);
  if (user.tokenVersion !== payload.tokenVersion) throw new AppError('Refresh token has been revoked', 401);

  // Rotate: the old token is single-use, so revoke it before issuing a new pair.
  await refreshTokenRepository.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(user);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await refreshTokenRepository.updateMany({
      where: { token: jtiHash(payload.jti) },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Invalid/expired tokens are already unusable; nothing to revoke.
  }
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await refreshTokenRepository.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  await userRepository.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

export async function getMe(userId: string) {
  const user = await userRepository.findUnique({ where: { id: userId }, select: userResponseFields() });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await userRepository.update({
    where: { id: userId },
    data: input,
    select: userResponseFields(),
  });
  return user;
}
