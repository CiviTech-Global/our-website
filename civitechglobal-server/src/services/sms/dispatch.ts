import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { redis } from '../../config/redis.js';
import { sha256Hex } from '../../utils/hash.js';
import { normalizeIranMobile } from '../../utils/persian.js';
import { canSendSms, smsProvider } from './index.js';
import { SMS_TEMPLATES, SmsLinkError, assertNoLink, type SmsKind, type SmsTokens } from './templates.js';

/**
 * The one way a text leaves this site.
 *
 * Every SMS — a code, a security alert, a visitor's tracking code — goes
 * through sendSms, which:
 *   1. refuses a link anywhere in the text or its tokens (the owner's rule),
 *   2. caps how many texts one phone receives in a day,
 *   3. sends through the configured gateway's approved template,
 *   4. writes one row to sms_messages — sent, failed or skipped, and why —
 *      with Kavenegar's cost, so spending is visible from the first text.
 *
 * Codes are sent and awaited by their callers (a failed code must say so in
 * the form). Everything else goes through sendSmsSafely: in the background,
 * never failing the request that caused it.
 */

export interface SmsTarget {
  phone: string;
  /** The account it concerns, when there is one; for the log only. */
  userId?: string;
}

export type SmsOutcome =
  | { status: 'SENT'; messageId?: string; cost?: number }
  | { status: 'SKIPPED'; reason: string }
  | { status: 'FAILED'; reason: string };

const DAY_SECONDS = 24 * 60 * 60;

/**
 * The panel name for a kind. The code template honours SMS_OTP_TEMPLATE, the
 * setting the deploy already requires, so an existing approved template keeps
 * working under whatever name it was approved as.
 */
export function templateName(kind: SmsKind): string {
  return kind === 'otp' && env.SMS_OTP_TEMPLATE.trim() ? env.SMS_OTP_TEMPLATE.trim() : SMS_TEMPLATES[kind].name;
}

/** yyyymmdd in Tehran, so the cap resets at Iranian midnight rather than UTC. */
function tehranDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .replace(/-/g, '');
}

async function record(kind: SmsKind, phoneHash: string, userId: string | undefined, outcome: SmsOutcome) {
  try {
    await prisma.smsMessage.create({
      data: {
        kind,
        phoneHash,
        userId: userId ?? null,
        status: outcome.status,
        reason: outcome.status === 'SENT' ? null : outcome.reason.slice(0, 300),
        providerMessageId: outcome.status === 'SENT' ? (outcome.messageId ?? null) : null,
        cost: outcome.status === 'SENT' ? (outcome.cost ?? null) : null,
      },
    });
  } catch (error) {
    // The log is for accounting; losing a row must not lose the text.
    logger.error({ err: error, kind }, 'Failed to record SMS');
  }
}

/**
 * Takes one unit of today's allowance for this phone. Returns false when the
 * phone has had its fill. Taken before sending; given back if the send fails.
 */
async function takeAllowance(phoneHash: string): Promise<{ ok: boolean; key: string }> {
  const key = `sms:cap:${phoneHash}:${tehranDay()}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 2 * DAY_SECONDS);
  return { ok: used <= env.SMS_DAILY_CAP, key };
}

export async function sendSms(kind: SmsKind, target: SmsTarget, tokens: SmsTokens): Promise<SmsOutcome> {
  const phone = normalizeIranMobile(target.phone);
  const phoneHash = sha256Hex(phone ?? target.phone);

  const skip = async (reason: string): Promise<SmsOutcome> => {
    const outcome: SmsOutcome = { status: 'SKIPPED', reason };
    await record(kind, phoneHash, target.userId, outcome);
    return outcome;
  };

  if (!phone) return skip('not an Iranian mobile number');

  try {
    assertNoLink(kind, tokens);
  } catch (error) {
    if (error instanceof SmsLinkError) {
      logger.error({ kind }, error.message);
      return skip(error.message);
    }
    throw error;
  }

  if (!canSendSms()) {
    // Development prints instead; production with SMS_PROVIDER=none sends nothing.
    if (smsProvider().name === 'console') await smsProvider().sendTemplate(phone, templateName(kind), tokens);
    return skip(`no gateway (${smsProvider().name})`);
  }

  const allowance = await takeAllowance(phoneHash);
  if (!allowance.ok) return skip(`daily cap of ${env.SMS_DAILY_CAP} reached`);

  try {
    const sent = await smsProvider().sendTemplate(phone, templateName(kind), tokens);
    const outcome: SmsOutcome = { status: 'SENT', ...sent };
    await record(kind, phoneHash, target.userId, outcome);
    return outcome;
  } catch (error) {
    await redis.decr(allowance.key);
    const outcome: SmsOutcome = { status: 'FAILED', reason: error instanceof Error ? error.message : 'send failed' };
    logger.error({ kind, reason: outcome.reason }, 'SMS send failed');
    await record(kind, phoneHash, target.userId, outcome);
    return outcome;
  }
}

/** Background send: never throws, never delays the caller. */
export function sendSmsSafely(kind: SmsKind, target: SmsTarget, tokens: SmsTokens): void {
  sendSms(kind, target, tokens).catch((error) => {
    logger.error({ err: error, kind }, 'SMS dispatch crashed');
  });
}

/**
 * The verified phone of an account that wants this kind of text, or null.
 *
 * `security` and `otp` ignore the opt-out: they protect the account. Member
 * alerts additionally need SMS_MEMBER_ALERTS, off until the owner turns it on.
 */
export async function memberPhone(userId: string, purpose: 'security' | 'alert'): Promise<string | null> {
  if (purpose === 'alert' && !env.SMS_MEMBER_ALERTS) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { phone: true, phoneVerifiedAt: true, smsOptOut: true },
  });
  if (!user?.phone || !user.phoneVerifiedAt) return null;
  if (purpose === 'alert' && user.smsOptOut) return null;
  return user.phone;
}

/** Texts a member's verified phone, if they have one and want this kind. */
export function smsMemberSafely(
  userId: string,
  kind: SmsKind,
  purpose: 'security' | 'alert',
  tokens: SmsTokens,
): void {
  memberPhone(userId, purpose)
    .then((phone) => {
      if (phone) sendSmsSafely(kind, { phone, userId }, tokens);
    })
    .catch((error) => logger.error({ err: error, kind }, 'SMS member lookup failed'));
}

/** Date and time in Tehran for a token: 1405/08/25 and 14:30, Latin digits, no spaces. */
export function smsDateTime(when: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(when)
    .reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }).format(when);
  return { date: `${date.year}/${date.month}/${date.day}`, time };
}
