import type { Locale } from '@/i18n/locales';
import { LOCALE_TAGS } from '@/i18n/locales';
import type fa from '@/i18n/fa';
import { formatRange } from '@/lib/marketplace';
import { displayProvince } from '@/lib/iranProvinces';
import type { JobCategory } from '@/types/jobs';

/**
 * Plain helpers the job pages share. A module of its own, not beside the
 * components: a file exporting both loses fast refresh.
 */

type Dictionary = typeof fa;

/** A category in the reader's language: Persian for Persian, English otherwise. */
export function categoryName(
  category: { name: string; nameEn: string } | null | undefined,
  locale: Locale,
): string {
  if (!category) return '';
  return locale === 'fa' || !category.nameEn ? category.name : category.nameEn;
}

/**
 * The flat list, grouped for a <select>: each parent with its children under
 * it. A child whose parent is missing is dropped rather than shown at the top
 * level, where it would read as a group of its own.
 */
export function groupCategories(categories: JobCategory[] | undefined) {
  if (!categories) return [];
  const parents = categories.filter((category) => category.parentId === null);
  return parents.map((parent) => ({
    parent,
    children: categories.filter((category) => category.parentId === parent.id),
  }));
}

/** The pay line: the range, "negotiable", or nothing when it was not given. */
export function salaryText(
  job: { salaryMin: string | null; salaryMax: string | null; salaryUndisclosed: boolean },
  locale: Locale,
  t: Dictionary,
): string | null {
  return job.salaryUndisclosed ? t.market.salaryUndisclosed : formatRange(job.salaryMin, job.salaryMax, locale, t);
}

/** City and province, in the reader's language where we know the province. */
export function placeText(job: { city: string | null; province: string | null }, locale: Locale): string {
  const province = displayProvince(job.province, locale);
  // A provincial capital named after its province — Tehran, Tehran — says it once.
  const same = job.city && province && job.city.trim().toLowerCase() === province.trim().toLowerCase();
  const sameStored = job.city && job.province && job.city.trim() === job.province.trim();
  return (same || sameStored ? [province] : [job.city, province])
    .filter(Boolean)
    .join(locale === 'fa' ? '، ' : ', ');
}

/**
 * Calendar days until a deadline: 0 on its last day, 1 the day before, null
 * once it has passed or when there is none. Counted by date, not by elapsed
 * hours, so a deadline the day after tomorrow never reads as "tomorrow".
 */
export function daysUntil(closesAt: string | null | undefined, now = new Date()): number | null {
  if (!closesAt) return null;
  const end = new Date(closesAt);
  if (end.getTime() < now.getTime()) return null;
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(end) - startOfDay(now)) / 86_400_000);
}

/**
 * How long ago, the way boards say it: "Today", "3 days ago", "2 weeks ago".
 *
 * Coarse on purpose. "Posted 14 hours ago" invites a reader to compare hours
 * between two postings that went up the same day, which tells them nothing.
 */
export function postedAgo(iso: string | null | undefined, locale: Locale, t: Dictionary): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t.jobs.today;
  const format = new Intl.RelativeTimeFormat(LOCALE_TAGS[locale], { numeric: 'auto' });
  if (days < 7) return format.format(-days, 'day');
  if (days < 30) return format.format(-Math.floor(days / 7), 'week');
  return format.format(-Math.floor(days / 30), 'month');
}

/** A number in the reader's own numerals. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);
}

/** "{n}" and friends, filled. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
