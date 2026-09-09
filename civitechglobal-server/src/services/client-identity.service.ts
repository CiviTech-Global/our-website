import type { ClientIdentity, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import { normalizeIranMobile } from '../utils/persian.js';

/**
 * Identity and abuse control for the project-enquiry form.
 *
 * This flow deliberately has no account and no one-time code: a company asking
 * for a quote should not have to verify a phone before it can describe its
 * problem. The pair (email, phone) stands in for an identity instead, and three
 * rules keep that from being worthless:
 *
 *   1. The pair is sticky. Once an email has been seen with a phone number,
 *      that email may only ever be used with that number, and that number only
 *      with that email. Both hashes carry a UNIQUE index, so the binding is
 *      enforced by the database rather than by remembering to check.
 *   2. At most `DAILY_LIMIT` requests from one identity in a rolling 24 hours.
 *   3. At least `COOLDOWN_MS` between two requests from one identity.
 *
 * The point of (1) is cost. Without it, rules (2) and (3) are defeated by
 * typing a different address; with it, getting past them costs a working email
 * AND a working phone number, because we will call the number and mail the
 * address to deliver the proposal.
 */

export const DAILY_LIMIT = 3;
export const COOLDOWN_MS = 60 * 60 * 1000; // one hour
export const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The rules one intake applies to one identity.
 *
 * Kept as data rather than hard-coded per service, because the two intakes want
 * genuinely different numbers: a project brief is a considered thing somebody
 * files a few of, while a CV is sent once and then, at most, corrected.
 */
export interface RateRules {
  /** Most submissions allowed inside `windowMs`. */
  perWindow: number;
  windowMs: number;
  /** Minimum gap between two consecutive submissions. */
  cooldownMs: number;
  /**
   * Most DISTINCT calendar days an identity may ever submit on. Absent means
   * no lifetime cap. When it is reached the door is closed for good, so the
   * message has to say so rather than name a time to come back.
   */
  maxDistinctDays?: number;
  /** Shown when `maxDistinctDays` is spent. */
  exhaustedMessage?: string;
}

/**
 * Calendar days are counted in Iran's timezone, not UTC.
 *
 * UTC would roll over at 03:30 local, so an application sent at midnight and
 * another at 04:00 the same night would look like two different days to the
 * limiter and one night to the person — and the argument that follows is one we
 * would lose.
 */
const DAY_TZ = 'Asia/Tehran';
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DAY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' as lived in Tehran. */
export function localDayKey(date: Date): string {
  return dayFormatter.format(date);
}

/**
 * The rate decision, as a pure function over timestamps.
 *
 * No database, no identity, no clock of its own — which is what makes every
 * rule below testable without either. Callers pass every submission this
 * identity has ever made, newest first; the window is applied here.
 */
export function assertRate(history: Date[], rules: RateRules, now: Date = new Date()): void {
  if (rules.maxDistinctDays !== undefined) {
    const days = new Set(history.map(localDayKey));
    // Already spent the allowance, and today is not one of the days already
    // used. A third day never opens, so this is terminal.
    if (days.size >= rules.maxDistinctDays && !days.has(localDayKey(now))) {
      throw new AppError(
        rules.exhaustedMessage ??
          'تعداد دفعات مجاز ارسال به پایان رسیده است. تیم ما در صورت تطابق با شما تماس می‌گیرد.',
        429
      );
    }
  }

  const windowStart = now.getTime() - rules.windowMs;
  const recent = history
    .filter((d) => d.getTime() >= windowStart)
    .sort((a, b) => b.getTime() - a.getTime());

  if (recent.length >= rules.perWindow) {
    // The cap lifts when the OLDEST entry in the window ages out, not
    // `windowMs` from now — otherwise every rejected attempt would extend the
    // penalty, and a person retrying could never get back in.
    const oldest = recent[recent.length - 1]!;
    throw new AppError(
      `در هر شبانه‌روز حداکثر ${rules.perWindow} بار می‌توانید ارسال کنید. ${describeWait(new Date(oldest.getTime() + rules.windowMs), now)}`,
      429
    );
  }

  const last = recent[0];
  if (last) {
    const readyAt = new Date(last.getTime() + rules.cooldownMs);
    if (readyAt > now) {
      throw new AppError(
        `بین دو ارسال باید یک ساعت فاصله باشد. ${describeWait(readyAt, now)}`,
        429
      );
    }
  }
}

/** The project intake's numbers. */
export const PROJECT_RULES: RateRules = {
  perWindow: DAILY_LIMIT,
  windowMs: WINDOW_MS,
  cooldownMs: COOLDOWN_MS,
};

/**
 * The resume intake's numbers: twice a day, an hour apart, on at most two days
 * ever. A CV does not improve by being sent a fifth time, and the cap is what
 * stops the queue filling with the same person.
 */
export const RESUME_RULES: RateRules = {
  perWindow: 2,
  windowMs: WINDOW_MS,
  cooldownMs: COOLDOWN_MS,
  maxDistinctDays: 2,
  exhaustedMessage:
    'شما پیش‌تر رزومهٔ خود را ارسال کرده‌اید و امکان ارسال دوباره وجود ندارد. تیم ما رزومهٔ شما را بررسی می‌کند و در صورت تطابق با موقعیت شغلی مناسب با شما تماس می‌گیرد.',
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalises to 09xxxxxxxxx before hashing.
 *
 * Without this, `0912 345 6789`, `+989123456789` and `09123456789` would hash
 * to three different identities and the pairing rule would be trivially
 * sidestepped by adding a space.
 */
export function normalizePhone(phone: string): string {
  const normalized = normalizeIranMobile(phone);
  if (!normalized) {
    throw new AppError('شمارهٔ تماس باید یک شمارهٔ همراه معتبر ایران باشد (۰۹xxxxxxxxx).', 400);
  }
  return normalized;
}

export interface IdentityInput {
  email: string;
  phone: string;
}

export interface RateState {
  /** Requests inside the rolling 24-hour window, before this one. */
  recentCount: number;
  /** When the caller may submit again, if they may not submit now. */
  retryAt: Date | null;
}

/**
 * Resolves the pair to an identity, enforcing the pairing rule.
 *
 * Runs inside the caller's transaction so that the lookup and the create cannot
 * interleave with a competing submission from the same pair.
 */
export async function resolveIdentity(
  tx: Prisma.TransactionClient,
  input: IdentityInput
): Promise<ClientIdentity> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const emailHash = sha256Hex(email);
  const phoneHash = sha256Hex(phone);

  const [byEmail, byPhone] = await Promise.all([
    tx.clientIdentity.findUnique({ where: { emailHash } }),
    tx.clientIdentity.findUnique({ where: { phoneHash } }),
  ]);

  if (byEmail && byPhone) {
    // Both known. They must be the same row, or the caller is mixing halves of
    // two different identities.
    if (byEmail.id !== byPhone.id) {
      throw new AppError(
        'این ایمیل و شمارهٔ تماس پیش‌تر با اطلاعات دیگری ثبت شده‌اند. لطفاً همان ایمیل و شماره‌ای را وارد کنید که بار اول با هم استفاده کرده‌اید.',
        409
      );
    }
    return byEmail;
  }

  if (byEmail) {
    throw new AppError(
      'این ایمیل پیش‌تر با شمارهٔ تماس دیگری ثبت شده است. لطفاً همان شمارهٔ قبلی را وارد کنید.',
      409
    );
  }

  if (byPhone) {
    throw new AppError(
      'این شمارهٔ تماس پیش‌تر با ایمیل دیگری ثبت شده است. لطفاً همان ایمیل قبلی را وارد کنید.',
      409
    );
  }

  return tx.clientIdentity.create({
    data: { email, emailHash, phone, phoneHash },
  });
}

/**
 * Applies the daily cap and the cooldown.
 *
 * Counts rows rather than trusting the denormalised counter on the identity:
 * `requestCount` is lifetime and drifts if a request is ever deleted, while the
 * rolling window has to be computed from real timestamps anyway.
 */
export async function assertWithinRateLimits(
  tx: Prisma.TransactionClient,
  identity: ClientIdentity,
  now: Date = new Date()
): Promise<RateState> {
  if (identity.blocked) {
    throw new AppError('امکان ثبت درخواست با این اطلاعات وجود ندارد. با ما تماس بگیرید.', 403);
  }

  // A known client we have chosen to trust is exempt from both rules. The
  // rules exist to make anonymous abuse expensive, not to ration real clients.
  if (identity.trusted) {
    return { recentCount: 0, retryAt: null };
  }

  const history = await tx.projectRequest.findMany({
    where: { identityId: identity.id, createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
    select: { createdAt: true },
  });

  assertRate(
    history.map((row) => row.createdAt),
    PROJECT_RULES,
    now
  );

  return { recentCount: history.length, retryAt: null };
}

/** «۳۴ دقیقهٔ دیگر تلاش کنید.» — a wait a person can act on. */
function describeWait(readyAt: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((readyAt.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} دقیقهٔ دیگر دوباره تلاش کنید.`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ساعت دیگر دوباره تلاش کنید.`;
}

/** Bookkeeping after a request is accepted. */
export async function recordRequest(
  tx: Prisma.TransactionClient,
  identityId: string,
  now: Date = new Date()
): Promise<void> {
  await tx.clientIdentity.update({
    where: { id: identityId },
    data: { requestCount: { increment: 1 }, lastRequestAt: now },
  });
}

/** Read-only view for the public form, so it can warn before anything is typed. */
export async function describeLimitsFor(input: IdentityInput): Promise<{
  known: boolean;
  remainingToday: number;
  retryAt: Date | null;
}> {
  const emailHash = sha256Hex(normalizeEmail(input.email));
  const identity = await prisma.clientIdentity.findUnique({ where: { emailHash } });
  if (!identity) return { known: false, remainingToday: DAILY_LIMIT, retryAt: null };

  const now = new Date();
  const recent = await prisma.projectRequest.count({
    where: { identityId: identity.id, createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
  });
  const last = identity.lastRequestAt;
  const readyAt = last ? new Date(last.getTime() + COOLDOWN_MS) : null;

  return {
    known: true,
    remainingToday: Math.max(0, DAILY_LIMIT - recent),
    retryAt: readyAt && readyAt > now ? readyAt : null,
  };
}
