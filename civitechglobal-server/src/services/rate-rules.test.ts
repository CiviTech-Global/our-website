import { describe, expect, it } from 'vitest';
import {
  PROJECT_RULES,
  RESUME_RULES,
  assertRate,
  localDayKey,
} from './client-identity.service.js';

/**
 * The rate policy, as a pure decision over timestamps.
 *
 * The resume rules are the interesting ones: twice a day, an hour apart, on at
 * most two distinct days EVER. The lifetime cap is the part a rolling window
 * cannot express, and the part most likely to be got wrong.
 */

// Tehran is UTC+3:30, so 20:30Z is already the next day locally. Every fixture
// below is written in UTC and reasoned about in Tehran, on purpose.
const at = (iso: string) => new Date(iso);

describe('localDayKey', () => {
  it('uses Tehran days, not UTC days', () => {
    // 21:00Z on the 1st is 00:30 on the 2nd in Tehran.
    expect(localDayKey(at('2026-09-01T21:00:00Z'))).toBe('2026-09-02');
    expect(localDayKey(at('2026-09-01T19:00:00Z'))).toBe('2026-09-01');
  });

  it('treats a late night and the small hours after it as one day', () => {
    // 20:30Z = 00:00 Tehran, and 01:00 Tehran is the same date. Counting in UTC
    // would call these two different days and cost someone an application.
    const midnight = at('2026-09-01T20:30:00Z');
    const oneAm = at('2026-09-01T21:30:00Z');
    expect(localDayKey(midnight)).toBe(localDayKey(oneAm));
  });
});

describe('resume rules', () => {
  const now = at('2026-09-09T09:00:00Z'); // 12:30 Tehran
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);

  it('lets a first-time applicant through', () => {
    expect(() => assertRate([], RESUME_RULES, now)).not.toThrow();
  });

  it('enforces an hour between two submissions on the same day', () => {
    expect(() => assertRate([hoursAgo(0.5)], RESUME_RULES, now)).toThrow(/یک ساعت فاصله/);
  });

  it('allows the second submission once the hour has passed', () => {
    expect(() => assertRate([hoursAgo(1.5)], RESUME_RULES, now)).not.toThrow();
  });

  it('allows two in a day and refuses the third', () => {
    expect(() => assertRate([hoursAgo(2), hoursAgo(4)], RESUME_RULES, now)).toThrow(
      /شبانه‌روز/
    );
  });

  it('allows a second DAY of submissions', () => {
    // One yesterday. Today is the second distinct day, which is still allowed.
    expect(() => assertRate([daysAgo(1)], RESUME_RULES, now)).not.toThrow();
  });

  it('refuses a third distinct day, permanently', () => {
    const history = [daysAgo(1), daysAgo(3)];
    // Not "come back later" — there is no later. The message must say the team
    // will make contact instead of naming a time that will never arrive.
    expect(() => assertRate(history, RESUME_RULES, now)).toThrow(/تماس می‌گیرد/);
    expect(() => assertRate(history, RESUME_RULES, now)).not.toThrow(/دقیقه|ساعت دیگر/);
  });

  it('still allows a second submission on the second day itself', () => {
    // Two days used, but one of them is TODAY — so the day cap is not spent,
    // and only the per-day and cooldown rules apply.
    const history = [daysAgo(2), hoursAgo(3)];
    expect(() => assertRate(history, RESUME_RULES, now)).not.toThrow();
  });

  it('refuses a third submission on the second day', () => {
    const history = [daysAgo(2), hoursAgo(3), hoursAgo(5)];
    expect(() => assertRate(history, RESUME_RULES, now)).toThrow(/شبانه‌روز/);
  });

  it('caps a full history at four submissions across two days', () => {
    const history = [daysAgo(5), daysAgo(5.1), daysAgo(1), daysAgo(1.1)];
    expect(() => assertRate(history, RESUME_RULES, now)).toThrow(/تماس می‌گیرد/);
  });

  it('measures the daily cap from the oldest entry, so a refusal cannot extend it', () => {
    // Both of today's submissions are ~23h old, so the window clears in about
    // an hour. A naive implementation would say 24h from now, every time.
    const history = [hoursAgo(23), hoursAgo(23.5)];
    expect(() => assertRate(history, RESUME_RULES, now)).toThrow(/1 ساعت|دقیقه/);
  });

  it('states the policy it documents', () => {
    expect(RESUME_RULES.perWindow).toBe(2);
    expect(RESUME_RULES.maxDistinctDays).toBe(2);
    expect(RESUME_RULES.cooldownMs).toBe(60 * 60 * 1000);
  });
});

describe('project rules', () => {
  const now = at('2026-09-09T09:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);

  it('allows three a day', () => {
    expect(() => assertRate([hoursAgo(2), hoursAgo(4)], PROJECT_RULES, now)).not.toThrow();
    expect(() => assertRate([hoursAgo(2), hoursAgo(4), hoursAgo(6)], PROJECT_RULES, now)).toThrow(
      /شبانه‌روز/
    );
  });

  it('has no lifetime day cap — a client may keep coming back', () => {
    const manyDays = [daysAgo(1), daysAgo(5), daysAgo(20), daysAgo(60)];
    expect(() => assertRate(manyDays, PROJECT_RULES, now)).not.toThrow();
    expect(PROJECT_RULES.maxDistinctDays).toBeUndefined();
  });
});
