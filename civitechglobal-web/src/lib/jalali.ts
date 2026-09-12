/**
 * Conversion between the Jalali (Solar Hijri) and Gregorian calendars.
 *
 * Written out rather than pulled from a package: this is a few dozen lines of
 * arithmetic with an exact answer, and the test beside it checks every day
 * across two centuries against the Persian calendar the JS runtime already
 * carries (`Intl`, `en-u-ca-persian`). That is a stronger guarantee than a
 * dependency's own test suite, and it costs nothing at runtime.
 *
 * The algorithm is the standard 33-year-cycle arithmetic form. A Jalali year
 * is leap when the remainder of (year + 38) * 682 / 2816 falls below 682 —
 * which reproduces the observational calendar exactly over the range anybody
 * will enter into a form.
 *
 * Dates here are whole days with no time and no zone. A birth date is a date,
 * not an instant: attaching a timezone to one is how somebody born on the 1st
 * becomes born on the 31st when the page is opened from another country.
 */

export interface JalaliDate {
  /** Solar Hijri year, e.g. 1404. */
  jy: number;
  /** 1-12. */
  jm: number;
  /** 1-31. */
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1751, 1867, 1985, 2075, 2154, 2201,
  2465, 2494, 2523, 2809, 2861, 2989, 3018,
];

interface YearInfo {
  leap: number;
  gy: number;
  march: number;
}

/**
 * Where a Jalali year sits in its cycle: how far it is past the last leap
 * year, which Gregorian year it starts in, and which March day is Farvardin 1.
 */
function jalCal(jy: number): YearInfo {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];

  if (jy < jp || jy >= breaks[breaks.length - 1]) {
    throw new RangeError(`Jalali year out of range: ${jy}`);
  }

  let jump = 0;
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;

  const leapG = Math.floor(gy / 4) - Math.floor((Math.floor(gy / 100) + 1) * 3 / 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/** True when the Jalali year has 366 days — Esfand runs to 30. */
export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** How many days the given Jalali month has: 31, 30, or 29 for a common Esfand. */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/** Days since the Julian day epoch, for a Gregorian date. */
function gregorianToJulianDay(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function julianDayToGregorian(jdn: number): GregorianDate {
  let j = jdn + 32044;
  const g = Math.floor(j / 146097);
  const dg = j % 146097;
  const c = Math.floor(((Math.floor(dg / 36524) + 1) * 3) / 4);
  const dc = dg - c * 36524;
  const b = Math.floor(dc / 1461);
  const db = dc % 1461;
  const a = Math.floor(((Math.floor(db / 365) + 1) * 3) / 4);
  const da = db - a * 365;
  const y = g * 400 + c * 100 + b * 4 + a;
  const m = Math.floor((da * 5 + 308) / 153) - 2;
  const d = da - Math.floor(((m + 4) * 153) / 5) + 122;

  j = 0;
  return {
    gy: y - 4800 + Math.floor((m + 2) / 12),
    gm: ((m + 2) % 12) + 1,
    gd: d + 1,
  };
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  const jdn = gregorianToJulianDay(gy, gm, gd);
  // Start from the Jalali year the Gregorian year most likely maps to, then
  // correct: the two years overlap, so the guess is off by one for dates
  // before Farvardin 1.
  let jy = gy - 621;
  const info = jalCal(jy);
  const farvardin1 = gregorianToJulianDay(info.gy, 3, info.march);
  let k = jdn - farvardin1;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + Math.floor(k / 31), jd: (k % 31) + 1 };
    }
    k -= 186;
  } else {
    // Before Farvardin 1, so the date belongs to the previous Jalali year.
    // The correction uses the leap value of the year we started from, not of
    // the one we are stepping back into — reading it after the decrement puts
    // every date in the last days of Esfand one day out.
    jy -= 1;
    k += 179;
    if (info.leap === 1) k += 1;
  }

  return { jy, jm: 7 + Math.floor(k / 30), jd: (k % 30) + 1 };
}

export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  const info = jalCal(jy);
  return julianDayToGregorian(
    gregorianToJulianDay(info.gy, 3, info.march) +
      (jm - 1) * 31 -
      Math.floor(jm / 7) * (jm - 7) +
      jd -
      1
  );
}

/** Is this a real day in the Jalali calendar, or the 31st of a 30-day month? */
export function isValidJalali(jy: number, jm: number, jd: number): boolean {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return false;
  if (jm < 1 || jm > 12 || jd < 1) return false;
  if (jy < breaks[0] || jy >= breaks[breaks.length - 1]) return false;
  return jd <= jalaliMonthLength(jy, jm);
}

// --- The form's wire format ------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * An ISO yyyy-mm-dd date, which is what every API here expects and what a
 * native `<input type="date">` produces. Gregorian, always — the calendar a
 * person reads is a display choice, and storing dates in two calendars is how
 * a record ends up ambiguous about which one it meant.
 */
export function toIsoDate({ gy, gm, gd }: GregorianDate): string {
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/** Parses yyyy-mm-dd without going through Date, which would apply a zone. */
export function parseIsoDate(value: string): GregorianDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, y, m, d] = match;
  const gy = Number(y);
  const gm = Number(m);
  const gd = Number(d);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;

  // Round-trips only for a real day: 2025-02-30 comes back as March 2nd.
  const jdn = gregorianToJulianDay(gy, gm, gd);
  const back = julianDayToGregorian(jdn);
  if (back.gy !== gy || back.gm !== gm || back.gd !== gd) return null;

  return { gy, gm, gd };
}

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_MONTHS_EN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
];

export const GREGORIAN_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Which weekday a date falls on, as a column index in a week starting Saturday
 * — which is how an Iranian calendar is laid out. 0 is Saturday.
 */
export function jalaliWeekdayIndex({ gy, gm, gd }: GregorianDate): number {
  // JD 0 was a Monday; +2 shifts the origin to Saturday.
  return (gregorianToJulianDay(gy, gm, gd) + 2) % 7;
}

/** Sunday-first, for the Gregorian view. */
export function gregorianWeekdayIndex({ gy, gm, gd }: GregorianDate): number {
  return (gregorianToJulianDay(gy, gm, gd) + 1) % 7;
}

export function todayGregorian(): GregorianDate {
  const now = new Date();
  return { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
}
