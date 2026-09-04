import jwt from 'jsonwebtoken';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { redis } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import { smsProvider } from './sms/index.js';

/**
 * Phone verification for insurance requests.
 *
 * Anyone can fill in a form, so the phone number is the only field that has to
 * be true — it is the thing we call back on, and an unverified public endpoint
 * is otherwise an invitation to fill the pipeline with junk. Proving the number
 * receives a code costs the applicant ten seconds and removes both problems.
 *
 * State lives in Redis rather than Postgres: a one-time code is worthless five
 * minutes after it is issued, and a TTL expresses that better than a cleanup
 * job over a table of dead rows. Losing Redis loses in-flight verifications,
 * which is an acceptable failure — the applicant requests another code.
 */

const CODE_LENGTH = 6;
const PHONE_TOKEN_PURPOSE = 'insurance-phone-verification';

interface OtpRecord {
  codeHash: string;
  attempts: number;
  issuedAt: number;
}

/** Phone numbers are PII; Redis keys are not the place for them in the clear. */
function keyFor(phone: string): string {
  return `otp:code:${sha256Hex(phone)}`;
}

function cooldownKeyFor(phone: string): string {
  return `otp:cooldown:${sha256Hex(phone)}`;
}

/**
 * Keyed, not plain, so a Redis dump cannot be brute-forced back into live codes
 * — a 6-digit space falls to a rainbow table in seconds otherwise.
 */
function hashCode(phone: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function generateCode(): string {
  // randomInt is CSPRNG-backed; Math.random would make codes guessable.
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  /** Present only outside production, so the dev UI can skip the SMS round-trip. */
  devCode?: string;
}

export async function requestCode(phone: string): Promise<OtpRequestResult> {
  const cooldownKey = cooldownKeyFor(phone);

  // NX+EX in one command: two concurrent requests cannot both win the check.
  const acquired = await redis.set(cooldownKey, '1', 'EX', env.OTP_RESEND_COOLDOWN_SECONDS, 'NX');
  if (acquired === null) {
    const ttl = await redis.ttl(cooldownKey);
    throw new AppError(
      `کد قبلی هنوز معتبر است. ${Math.max(ttl, 1)} ثانیه دیگر تلاش کنید.`,
      429,
    );
  }

  const code = generateCode();
  const record: OtpRecord = { codeHash: hashCode(phone, code), attempts: 0, issuedAt: Date.now() };

  await redis.set(keyFor(phone), JSON.stringify(record), 'EX', env.OTP_TTL_SECONDS);

  try {
    await smsProvider().sendOtp(phone, code);
  } catch (error) {
    // Delivery failed, so the applicant has no code and must not be made to sit
    // out the cooldown for a message that never arrived.
    await redis.del(cooldownKey, keyFor(phone));
    logger.error({ err: error, provider: env.SMS_PROVIDER }, 'Failed to send OTP');
    throw new AppError('ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید.', 502);
  }

  return {
    expiresInSeconds: env.OTP_TTL_SECONDS,
    ...(env.isProduction ? {} : { devCode: code }),
  };
}

export interface PhoneTokenPayload {
  phone: string;
  purpose: typeof PHONE_TOKEN_PURPOSE;
}

/**
 * Signed with JWT_SECRET but carrying a distinct `purpose`, which
 * `verifyPhoneToken` requires — so this token can never be presented as an
 * access token, nor an access token as this. That is cheaper to operate than a
 * fourth secret to generate, rotate and keep in Vault.
 */
function issuePhoneToken(phone: string): string {
  const payload: PhoneTokenPayload = { phone, purpose: PHONE_TOKEN_PURPOSE };
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.PHONE_TOKEN_TTL_SECONDS,
  });
}

export function verifyPhoneToken(token: string): string {
  let decoded: PhoneTokenPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as PhoneTokenPayload;
  } catch {
    throw new AppError('تأیید شماره تماس منقضی شده است. لطفاً دوباره تأیید کنید.', 401);
  }

  if (decoded.purpose !== PHONE_TOKEN_PURPOSE || typeof decoded.phone !== 'string') {
    throw new AppError('توکن تأیید نامعتبر است.', 401);
  }

  return decoded.phone;
}

export interface OtpVerifyResult {
  phoneToken: string;
  expiresInSeconds: number;
}

export async function verifyCode(phone: string, code: string): Promise<OtpVerifyResult> {
  const key = keyFor(phone);
  const raw = await redis.get(key);

  if (!raw) {
    throw new AppError('کد منقضی شده یا یافت نشد. لطفاً کد جدیدی درخواست کنید.', 400);
  }

  const record = JSON.parse(raw) as OtpRecord;

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError('تعداد تلاش‌های نادرست بیش از حد مجاز است. کد جدیدی درخواست کنید.', 429);
  }

  if (!constantTimeEquals(record.codeHash, hashCode(phone, code))) {
    // Preserve the original TTL: a wrong guess must not extend the window the
    // attacker has to keep guessing in.
    const ttl = await redis.ttl(key);
    const next: OtpRecord = { ...record, attempts: record.attempts + 1 };
    if (ttl > 0) await redis.set(key, JSON.stringify(next), 'EX', ttl);

    const remaining = env.OTP_MAX_ATTEMPTS - next.attempts;
    throw new AppError(
      remaining > 0 ? `کد وارد شده نادرست است. ${remaining} تلاش باقی مانده.` : 'کد وارد شده نادرست است.',
      400,
    );
  }

  // Single use: consumed the moment it succeeds.
  await redis.del(key, cooldownKeyFor(phone));

  return {
    phoneToken: issuePhoneToken(phone),
    expiresInSeconds: env.PHONE_TOKEN_TTL_SECONDS,
  };
}
