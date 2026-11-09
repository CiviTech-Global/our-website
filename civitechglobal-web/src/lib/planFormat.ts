import type { Locale } from '@/i18n/locales';
import { toPersianDigits } from '@/i18n/utils';
import { formatMoney } from '@/lib/marketplace';
import type { PlanLimitKind } from '@/api/billing';

/** Fills `{name}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** A whole number in the reader's digits. */
export function count(value: number, locale: Locale): string {
  return locale === 'fa' ? toPersianDigits(value) : String(value);
}

/** Toman, grouped the reader's way. */
export function toman(value: string | null | undefined, locale: Locale): string {
  return formatMoney(value ?? '0', locale) ?? count(0, locale);
}

interface LimitWords {
  unlimited: string;
  kinds: Record<PlanLimitKind, string>;
  liveDays: string;
}

/** "20 a month", "10 live at once", "first one only · shown for 45 days". */
export function describeLimit(
  level: { kind: PlanLimitKind; limit: number | null; liveDays: number | null },
  words: LimitWords,
  locale: Locale,
): string {
  if (level.limit === null) return words.unlimited;
  if (level.kind === 'LIFETIME') {
    const days = level.liveDays ? ` · ${fill(words.liveDays, { days: count(level.liveDays, locale) })}` : '';
    return `${words.kinds.LIFETIME}${days}`;
  }
  return `${count(level.limit, locale)} ${words.kinds[level.kind]}`;
}
