import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import {
  GREGORIAN_MONTHS_EN,
  JALALI_MONTHS_EN,
  JALALI_MONTHS_FA,
  gregorianWeekdayIndex,
  jalaliMonthLength,
  jalaliWeekdayIndex,
  parseIsoDate,
  toGregorian,
  toIsoDate,
  toJalali,
  todayGregorian,
  type GregorianDate,
} from '@/lib/jalali';

export type CalendarSystem = 'jalali' | 'gregorian';

export interface DateFieldProps {
  /** ISO yyyy-mm-dd, Gregorian. Empty string means no date chosen. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Draws the field as failing validation, the way Input and Select do. */
  invalid?: boolean;
  /** ISO bounds, inclusive. */
  min?: string;
  max?: string;
  /**
   * Which calendar to show first. Jalali unless a caller says otherwise —
   * this is an Iranian product, and a date field that opens on a Gregorian
   * grid asks every user to do the conversion in their head.
   */
  defaultCalendar?: CalendarSystem;
  /** Set false to pin the field to one calendar with no way to switch. */
  allowCalendarToggle?: boolean;
  'aria-describedby'?: string;
}

const GREGORIAN_WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const JALALI_WEEKDAYS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const JALALI_WEEKDAYS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function gregorianMonthLength(gy: number, gm: number): number {
  return new Date(Date.UTC(gy, gm, 0)).getUTCDate();
}

/** Compares ISO dates as strings, which is exactly what the format is for. */
const withinBounds = (iso: string, min?: string, max?: string) =>
  (!min || iso >= min) && (!max || iso <= max);

/**
 * A date field on the Iranian calendar.
 *
 * Two things make this worth having over `<input type="date">`. The native
 * control renders in whatever calendar the browser's locale dictates, which
 * for most of our users is the wrong one and cannot be overridden. And its
 * value is Gregorian ISO regardless, so somebody reading a Jalali date off a
 * document had to convert it themselves before typing — which is precisely
 * where the mistakes were.
 *
 * The value this emits stays Gregorian ISO. Which calendar is displayed is a
 * reading preference; storing dates in two calendars is how a record ends up
 * ambiguous about which one it meant.
 */
export function DateField({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  invalid,
  min,
  max,
  defaultCalendar = 'jalali',
  allowCalendarToggle = true,
  'aria-describedby': describedBy,
}: DateFieldProps) {
  const { t, locale } = useLocale();
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const [calendar, setCalendar] = useState<CalendarSystem>(defaultCalendar);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = parseIsoDate(value);

  // Which month the grid is showing. Follows the selection when there is one,
  // and otherwise starts at today — not at some fixed epoch, which would make
  // picking a recent date a long scroll.
  const [view, setView] = useState<GregorianDate>(() => selected ?? todayGregorian());

  useEffect(() => {
    if (selected) setView(selected);
    // Only when the value itself changes: following `view` here would fight
    // the month arrows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * Dismissed on pointerdown outside, never on mouseleave. A menu that closes
   * because the cursor moved is one the user cannot reach the far end of.
   */
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  const digits = (n: number | string) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  const monthNames =
    calendar === 'jalali'
      ? locale === 'fa'
        ? JALALI_MONTHS_FA
        : JALALI_MONTHS_EN
      : GREGORIAN_MONTHS_EN;

  const weekdayNames =
    calendar === 'jalali'
      ? locale === 'fa'
        ? JALALI_WEEKDAYS_FA
        : JALALI_WEEKDAYS_EN
      : GREGORIAN_WEEKDAYS_EN;

  /** The visible month, expressed in whichever calendar is on show. */
  const head =
    calendar === 'jalali'
      ? (() => {
          const { jy, jm } = toJalali(view.gy, view.gm, view.gd);
          return { year: jy, month: jm };
        })()
      : { year: view.gy, month: view.gm };

  function shiftMonth(delta: number) {
    if (calendar === 'jalali') {
      const { jy, jm } = toJalali(view.gy, view.gm, view.gd);
      let year = jy;
      let month = jm + delta;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      // The view is a month, not a day — it always lands on the 1st, so
      // stepping from a 31-day month into a 30-day one cannot overflow.
      setView(toGregorian(year, month, 1));
      return;
    }

    let year = view.gy;
    let month = view.gm + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setView({ gy: year, gm: month, gd: 1 });
  }

  /** Every cell of the grid: leading blanks, then the days of the month. */
  function buildDays(): Array<{ label: number; iso: string } | null> {
    if (calendar === 'jalali') {
      const { year, month } = head;
      const first = toGregorian(year, month, 1);
      const lead = jalaliWeekdayIndex(first);
      const length = jalaliMonthLength(year, month);

      return [
        ...Array.from({ length: lead }, () => null),
        ...Array.from({ length }, (_unused, i) => ({
          label: i + 1,
          iso: toIsoDate(toGregorian(year, month, i + 1)),
        })),
      ];
    }

    const lead = gregorianWeekdayIndex({ gy: view.gy, gm: view.gm, gd: 1 });
    const length = gregorianMonthLength(view.gy, view.gm);

    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length }, (_unused, i) => ({
        label: i + 1,
        iso: toIsoDate({ gy: view.gy, gm: view.gm, gd: i + 1 }),
      })),
    ];
  }

  /** What the closed field reads, in the calendar currently chosen. */
  function displayValue(): string {
    if (!selected) return '';
    if (calendar === 'jalali') {
      const { jy, jm, jd } = toJalali(selected.gy, selected.gm, selected.gd);
      return `${digits(jd)} ${monthNames[jm - 1]} ${digits(jy)}`;
    }
    return `${digits(selected.gd)} ${GREGORIAN_MONTHS_EN[selected.gm - 1]} ${digits(selected.gy)}`;
  }

  const todayIso = toIsoDate(todayGregorian());

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <button
          ref={triggerRef}
          type="button"
          id={fieldId}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          // aria-invalid is not a permitted attribute on role=button, so the
          // failure is carried by the border and by FormField's error text.
          aria-describedby={describedBy}
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            'flex h-11 flex-1 items-center justify-between gap-2 rounded-lg border bg-surface-100 px-3 text-start text-sm text-text-primary',
            invalid ? 'border-brand-red-500' : 'border-border-strong',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-500',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <span className={cn(!selected && 'text-text-muted')}>
            {displayValue() || t.common.date.choose}
          </span>
          <Calendar className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>

        {selected && !required && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t.common.date.clear}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* The real value, so a native form submission and validation see it. */}
      <input type="hidden" name={name} value={value} />

      {isOpen && (
        <div
          role="dialog"
          aria-label={t.common.date.choose}
          className="absolute z-30 mt-2 w-72 rounded-xl border border-border-default bg-surface-100 p-3 shadow-lg start-0"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={t.common.previous}
              onClick={() => shiftMonth(-1)}
              className="flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-200"
            >
              <ChevronRight className="size-4 ltr:hidden" aria-hidden="true" />
              <ChevronLeft className="size-4 rtl:hidden" aria-hidden="true" />
            </button>

            <span className="text-sm font-medium text-text-primary">
              {monthNames[head.month - 1]} {digits(head.year)}
            </span>

            <button
              type="button"
              aria-label={t.common.next}
              onClick={() => shiftMonth(1)}
              className="flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-200"
            >
              <ChevronLeft className="size-4 ltr:hidden" aria-hidden="true" />
              <ChevronRight className="size-4 rtl:hidden" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdayNames.map((day) => (
              <span key={day} className="py-1 text-center text-xs text-text-muted">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {buildDays().map((cell, index) =>
              cell === null ? (
                <span key={`blank-${index}`} />
              ) : (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!withinBounds(cell.iso, min, max)}
                  aria-current={cell.iso === todayIso ? 'date' : undefined}
                  aria-pressed={cell.iso === value}
                  onClick={() => {
                    onChange(cell.iso);
                    close();
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg text-sm',
                    cell.iso === value
                      ? 'bg-brand-green-500 font-medium text-white'
                      : 'text-text-primary hover:bg-surface-200',
                    cell.iso === todayIso && cell.iso !== value && 'ring-1 ring-brand-green-500/50',
                    !withinBounds(cell.iso, min, max) && 'cursor-not-allowed opacity-30 hover:bg-transparent'
                  )}
                >
                  {digits(cell.label)}
                </button>
              )
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-default pt-2">
            <button
              type="button"
              disabled={!withinBounds(todayIso, min, max)}
              onClick={() => {
                onChange(todayIso);
                close();
              }}
              className="rounded-lg px-2 py-1 text-xs text-brand-green-600 hover:bg-surface-200 disabled:opacity-40"
            >
              {t.common.date.today}
            </button>

            {allowCalendarToggle && (
              <button
                type="button"
                onClick={() => setCalendar(calendar === 'jalali' ? 'gregorian' : 'jalali')}
                className="rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-200"
              >
                {calendar === 'jalali' ? t.common.date.gregorian : t.common.date.jalali}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
