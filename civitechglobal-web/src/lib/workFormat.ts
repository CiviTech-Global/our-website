import type { Locale } from '@/i18n/locales';
import type fa from '@/i18n/fa';
import { formatMoneyIn } from '@/lib/geo';
import { fill, formatNumber } from '@/lib/jobFormat';
import type { ProjectPricing, WorkCategory } from '@/types/work';

/**
 * Plain helpers the freelance pages share: budgets and rates in the reader's
 * language and currency, durations, and the category tree.
 */

type Dictionary = typeof fa;

export function money(value: string | null | undefined, currency: string, locale: Locale, t: Dictionary): string | null {
  return formatMoneyIn(value, currency, locale, t.market.currency);
}

/**
 * A project's budget as a card shows it: "€500 to €900", "From 20,000,000
 * toman", "$25 to $40 / hr", or "open to offers".
 */
export function budgetText(
  project: {
    budgetMin: string | null;
    budgetMax: string | null;
    budgetUnknown: boolean;
    currency: string;
    pricingType?: ProjectPricing;
  },
  locale: Locale,
  t: Dictionary,
): string {
  if (project.budgetUnknown || (!project.budgetMin && !project.budgetMax)) return t.work.budgetUnknown;
  const low = money(project.budgetMin, project.currency, locale, t);
  const high = money(project.budgetMax, project.currency, locale, t);
  const range =
    low && high && low !== high
      ? `${low} ${t.market.to} ${high}`
      : low && high
        ? low
        : low
          ? fill(t.work.budgetFrom, { amount: low })
          : fill(t.work.budgetUpTo, { amount: high! });
  return project.pricingType === 'HOURLY' ? fill(t.work.hourlyRange, { range }) : range;
}

/** One amount, with "/ hr" when it is a rate. */
export function amountText(
  amount: string | null | undefined,
  currency: string,
  pricingType: ProjectPricing | undefined,
  locale: Locale,
  t: Dictionary,
): string {
  const text = money(amount, currency, locale, t) ?? '—';
  return pricingType === 'HOURLY' ? `${text} ${t.work.perHour}` : text;
}

/** A percentage in the reader's digits. */
export function percent(value: number | null | undefined, locale: Locale): string {
  return value == null ? '—' : `${formatNumber(value, locale)}%`;
}

/** Hours and minutes from whole minutes: "12:30". */
export function hoursText(minutes: number, locale: Locale): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${formatNumber(hours, locale)}:${formatNumber(rest, locale).padStart(2, formatNumber(0, locale))}`;
}

/** "3 months ago", "today" — from an ISO date, in the reader's language. */
export function agoText(iso: string | null | undefined, locale: Locale, t: Dictionary): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t.jobs.today;
  const format = new Intl.RelativeTimeFormat(locale === 'fa' ? 'fa-IR' : locale, { numeric: 'auto' });
  if (days < 30) return format.format(-days, 'day');
  if (days < 365) return format.format(-Math.floor(days / 30), 'month');
  return format.format(-Math.floor(days / 365), 'year');
}

/** A language code in the reader's own language: "fa" → "Persian" / "فارسی". */
export function languageName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale === 'fa' ? 'fa-IR' : locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** The tree as groups, for a grouped <select>. */
export function groupWorkCategories(categories: WorkCategory[] | undefined) {
  if (!categories) return [];
  return categories
    .filter((category) => category.parentId === null)
    .map((parent) => ({ parent, children: categories.filter((category) => category.parentId === parent.id) }));
}

/** The Saturday a date's week starts on, as YYYY-MM-DD — the week a timesheet is keyed by. */
export function weekStartIso(date: Date): string {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 1) % 7));
  return day.toISOString().slice(0, 10);
}
