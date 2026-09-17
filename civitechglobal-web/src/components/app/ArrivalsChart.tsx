import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALE_TAGS } from '@/i18n/locales';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import { niceCeiling } from './chart-scale';

export interface ArrivalsPoint {
  /** yyyy-mm-dd, UTC. */
  day: string;
  count: number;
}

/**
 * Submissions per day, as columns.
 *
 * One series, so no legend: the panel title says what is plotted. Columns
 * rather than a line because each day is a separate count, not a continuous
 * measure, and a quiet day should read as a gap in the row of columns rather
 * than as a line dipping between two busy ones.
 *
 * Marks follow the data-visualisation spec: columns capped at 24px with a 4px
 * rounded top and a square base, a hairline baseline and two hairline guides,
 * the colour validated against both surfaces (the deep brand green in light,
 * a step lighter in dark). Every column is focusable and shows its day and
 * count on hover and on focus, and the same figures are in a table for screen
 * readers — the tooltip enhances, it never gates.
 */
export function ArrivalsChart({ points, label }: { points: ArrivalsPoint[]; label: string }) {
  const { locale } = useLocale();
  const [active, setActive] = useState<number | null>(null);

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));
  const dayFormat = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));

  const ceiling = niceCeiling(Math.max(0, ...points.map((point) => point.count)));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  // Three labels on the day axis — first, middle, today. Fourteen would collide.
  const labelled = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <figure className="m-0">
      <div className="flex gap-3">
        {/* Value axis: a clean ceiling, its half, and zero. */}
        <div
          className="flex h-40 shrink-0 flex-col justify-between py-0 text-end text-caption tabular-nums text-app-text-4"
          aria-hidden="true"
        >
          <span className="-translate-y-1/2">{number(ceiling)}</span>
          <span>{number(ceiling / 2)}</span>
          <span className="translate-y-1/2">{number(0)}</span>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Guides: hairline, solid, recessive. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 border-t border-app-border-light" />
            <div className="absolute inset-x-0 top-1/2 border-t border-app-border-light" />
            <div className="absolute inset-x-0 bottom-0 border-t border-app-border" />
          </div>

          <ol className="relative flex h-40 items-end" aria-label={label}>
            {points.map((point, index) => {
              const height = (point.count / ceiling) * 100;
              const isActive = active === index;
              return (
                <li key={point.day} className="relative flex h-full flex-1 items-end justify-center">
                  {/* The hit target is the whole slot, not the painted column. */}
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={`${formatDay(point.day)}: ${number(point.count)}`}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive((current) => (current === index ? null : current))}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="absolute inset-0 cursor-default rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
                  />
                  <span
                    className={cn(
                      'pointer-events-none w-full max-w-6 rounded-t bg-app-primary transition-opacity',
                      // Two pixels of air between neighbours at any width.
                      'mx-px',
                      active !== null && !isActive && 'opacity-45'
                    )}
                    // A zero day still shows a sliver on the baseline, so the
                    // row reads as fourteen days rather than as missing data.
                    style={{ height: point.count > 0 ? `${Math.max(height, 2)}%` : '2px' }}
                  />
                  {isActive && (
                    <span
                      role="presentation"
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded border border-app-border bg-app-panel px-2 py-1 text-center shadow-app-float"
                      style={{ bottom: `calc(${Math.max(height, 2)}% + 6px)` }}
                    >
                      <span className="block text-body font-semibold text-app-text">{number(point.count)}</span>
                      <span className="block text-caption text-app-text-3">{formatDay(point.day)}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Positioned rather than placed in the column slots: a slot is narrower
              than a date, and the edge labels are anchored to the chart's own
              edges so neither is cut off. */}
          <div className="relative mt-1.5 h-4 text-caption text-app-text-4" aria-hidden="true">
            {points.map((point, index) => {
              if (!labelled.has(index)) return null;
              const first = index === 0;
              const last = index === points.length - 1;
              const centre = ((index + 0.5) / points.length) * 100;
              return (
                <span
                  key={point.day}
                  className={cn(
                    'absolute top-0 whitespace-nowrap',
                    !first && !last && '-translate-x-1/2 rtl:translate-x-1/2'
                  )}
                  style={first ? { insetInlineStart: 0 } : last ? { insetInlineEnd: 0 } : { insetInlineStart: `${centre}%` }}
                >
                  {formatDay(point.day)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        {label}: {number(total)}
      </figcaption>
      {/* The table view: the same figures without hovering anything. */}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.day}>
              <th scope="row">{formatDay(point.day)}</th>
              <td>{number(point.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
