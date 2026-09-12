import { describe, expect, it } from 'vitest';
import {
  isLeapJalaliYear,
  isValidJalali,
  jalaliMonthLength,
  jalaliWeekdayIndex,
  parseIsoDate,
  toGregorian,
  toIsoDate,
  toJalali,
} from './jalali';

/**
 * The runtime already carries the Persian calendar, so it is the reference
 * rather than a table of dates copied from somewhere. Anything this disagrees
 * with Intl about is wrong.
 */
const persian = new Intl.DateTimeFormat('en-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function intlJalali(gy: number, gm: number, gd: number) {
  const parts = persian.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { jy: get('year'), jm: get('month'), jd: get('day') };
}

describe('toJalali', () => {
  it('agrees with the runtime on the epoch and a few landmarks', () => {
    // Farvardin 1, 1 — the calendar's own origin.
    expect(toJalali(622, 3, 22)).toEqual({ jy: 1, jm: 1, jd: 1 });
    expect(toJalali(2026, 3, 21)).toEqual(intlJalali(2026, 3, 21));
    // Nowruz, and the day before it, which belongs to the previous year.
    expect(toJalali(2025, 3, 21)).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(toJalali(2025, 3, 20)).toEqual({ jy: 1403, jm: 12, jd: 30 });
  });

  /**
   * Every day from 1925 to 2100 — well beyond anything a birth date or a
   * delivery date will hold. This is what makes writing the arithmetic out
   * safer than trusting a package.
   *
   * The upper bound is deliberate, not arbitrary: see the divergence test
   * below.
   */
  it('agrees with the runtime on every day from 1925 to 2100', () => {
    const start = Date.UTC(1925, 0, 1);
    const end = Date.UTC(2100, 0, 1);
    const day = 86400000;
    let checked = 0;

    for (let t = start; t < end; t += day) {
      const d = new Date(t);
      const gy = d.getUTCFullYear();
      const gm = d.getUTCMonth() + 1;
      const gd = d.getUTCDate();

      const ours = toJalali(gy, gm, gd);
      const theirs = intlJalali(gy, gm, gd);
      if (ours.jy !== theirs.jy || ours.jm !== theirs.jm || ours.jd !== theirs.jd) {
        throw new Error(
          `${gy}-${gm}-${gd}: got ${ours.jy}/${ours.jm}/${ours.jd}, Intl says ${theirs.jy}/${theirs.jm}/${theirs.jd}`
        );
      }
      checked += 1;
    }

    // Guards against the loop silently doing nothing.
    expect(checked).toBeGreaterThan(60000);
  });

  /**
   * Recorded rather than hidden.
   *
   * This and ICU agree on every day up to Esfand 1502 and part company at
   * Farvardin 1, 1503 — March 2124. The two are answering slightly different
   * questions that far out: the Iranian civil calendar is fixed by the vernal
   * equinox observed at Tehran, and every arithmetic rule is an approximation
   * of that which drifts eventually. Which of the two is right about 1503 is
   * not settled by anything available here, and it is a century away.
   *
   * The test exists so the boundary is a known, checked fact rather than a
   * surprise — if a future runtime moves it, this fails and says so.
   */
  it('parts company with the runtime only from Farvardin 1503, a century out', () => {
    expect(toJalali(2124, 3, 19)).toEqual(intlJalali(2124, 3, 19));
    expect(toJalali(2124, 3, 20)).not.toEqual(intlJalali(2124, 3, 20));
  });
});

describe('toGregorian', () => {
  it('is the exact inverse of toJalali, every day for two centuries', () => {
    const start = Date.UTC(1925, 0, 1);
    const end = Date.UTC(2125, 0, 1);
    // Note the wider range: the inverse holds even past the point where this
    // and ICU disagree, because it is an internal consistency property.
    const day = 86400000;

    for (let t = start; t < end; t += day) {
      const d = new Date(t);
      const gy = d.getUTCFullYear();
      const gm = d.getUTCMonth() + 1;
      const gd = d.getUTCDate();

      const { jy, jm, jd } = toJalali(gy, gm, gd);
      expect(toGregorian(jy, jm, jd)).toEqual({ gy, gm, gd });
    }
  });
});

describe('jalaliMonthLength', () => {
  it('gives 31 to the first six months and 30 to the next five', () => {
    for (let m = 1; m <= 6; m += 1) expect(jalaliMonthLength(1404, m)).toBe(31);
    for (let m = 7; m <= 11; m += 1) expect(jalaliMonthLength(1404, m)).toBe(30);
  });

  /** Esfand is the only month whose length depends on the year. */
  it('gives Esfand 30 days in a leap year and 29 otherwise', () => {
    expect(isLeapJalaliYear(1403)).toBe(true);
    expect(jalaliMonthLength(1403, 12)).toBe(30);

    expect(isLeapJalaliYear(1404)).toBe(false);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
  });

  it('matches the runtime on which years are leap, across a full cycle', () => {
    for (let jy = 1390; jy <= 1430; jy += 1) {
      // Esfand 30 exists exactly when the year is leap, so ask the calendar.
      const g = toGregorian(jy, 12, isLeapJalaliYear(jy) ? 30 : 29);
      const back = intlJalali(g.gy, g.gm, g.gd);
      expect(back).toEqual({ jy, jm: 12, jd: isLeapJalaliYear(jy) ? 30 : 29 });
    }
  });
});

describe('isValidJalali', () => {
  it('refuses a day the month does not have', () => {
    expect(isValidJalali(1404, 7, 31)).toBe(false);
    expect(isValidJalali(1404, 7, 30)).toBe(true);
    expect(isValidJalali(1404, 12, 30)).toBe(false);
    expect(isValidJalali(1403, 12, 30)).toBe(true);
  });

  it('refuses nonsense outright', () => {
    expect(isValidJalali(1404, 0, 1)).toBe(false);
    expect(isValidJalali(1404, 13, 1)).toBe(false);
    expect(isValidJalali(1404, 1, 0)).toBe(false);
    expect(isValidJalali(1404.5, 1, 1)).toBe(false);
  });
});

describe('parseIsoDate', () => {
  /**
   * Parsed by hand rather than through Date, because `new Date('2025-03-21')`
   * is midnight UTC and reading it back with local getters moves it a day in
   * half the world. A birth date has no timezone.
   */
  it('reads a date without letting a timezone move it', () => {
    expect(parseIsoDate('2025-03-21')).toEqual({ gy: 2025, gm: 3, gd: 21 });
  });

  it('refuses a day that does not exist', () => {
    expect(parseIsoDate('2025-02-30')).toBeNull();
    expect(parseIsoDate('2025-13-01')).toBeNull();
    expect(parseIsoDate('not a date')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('round-trips through the ISO form', () => {
    expect(toIsoDate(parseIsoDate('1999-01-05')!)).toBe('1999-01-05');
  });
});

describe('jalaliWeekdayIndex', () => {
  /** Column 0 is Saturday, which is how an Iranian calendar is laid out. */
  it('puts Saturday in the first column', () => {
    // 2025-03-22 was a Saturday.
    expect(jalaliWeekdayIndex({ gy: 2025, gm: 3, gd: 22 })).toBe(0);
    expect(jalaliWeekdayIndex({ gy: 2025, gm: 3, gd: 23 })).toBe(1);
    expect(jalaliWeekdayIndex({ gy: 2025, gm: 3, gd: 28 })).toBe(6);
  });

  it('agrees with the runtime for a spread of dates', () => {
    const names = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });

    for (const [gy, gm, gd] of [
      [2025, 3, 21],
      [2024, 1, 1],
      [2030, 12, 31],
      [1999, 7, 15],
    ] as const) {
      const expected = fmt.format(new Date(Date.UTC(gy, gm - 1, gd)));
      expect(names[jalaliWeekdayIndex({ gy, gm, gd })]).toBe(expected);
    }
  });
});
