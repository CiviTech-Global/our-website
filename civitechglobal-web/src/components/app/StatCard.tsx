import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';

export type StatTone = 'neutral' | 'attention' | 'positive' | 'critical';

export interface StatCardProps {
  label: string;
  value: number | string | undefined;
  icon?: LucideIcon;
  /** A second line: "3 waiting on us", "of 12". */
  hint?: ReactNode;
  /** Colours the hint, not the number: the number stays neutral and legible. */
  tone?: StatTone;
  /** Makes the whole card a link to the screen the figure summarises. */
  to?: string;
  /** Shown while the value is still loading. */
  loading?: boolean;
}

const HINT_TONES: Record<StatTone, string> = {
  neutral: 'text-app-text-3',
  attention: 'text-status-warning',
  positive: 'text-status-success',
  critical: 'text-status-error',
};

/**
 * One figure, labelled.
 *
 * Label in 11px uppercase above a 24px value, with the icon as a faint
 * watermark rather than a coloured blob — the number is what the card is for.
 * A card that summarises a queue is a link to it: seeing that five things are
 * waiting is only useful if opening them is the next click.
 */
export function StatCard({ label, value, icon: Icon, hint, tone = 'neutral', to, loading }: StatCardProps) {
  const { locale } = useLocale();
  const display =
    typeof value === 'number' ? (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en')) : value;

  const body = (
    <>
      {Icon && (
        <Icon
          className="pointer-events-none absolute -bottom-3 end-[-10px] size-16 text-app-text opacity-[0.04] transition-opacity group-hover:opacity-[0.08]"
          aria-hidden="true"
        />
      )}
      <p className="relative truncate text-caption font-medium uppercase tracking-wide text-app-text-3">{label}</p>
      {loading || value === undefined ? (
        <span className="relative mt-2 block h-7 w-16 animate-pulse rounded bg-app-fill" aria-hidden="true" />
      ) : (
        <p className="relative mt-1 text-metric font-semibold text-app-text">{display}</p>
      )}
      {hint && <p className={cn('relative mt-0.5 truncate text-label font-medium', HINT_TONES[tone])}>{hint}</p>}
    </>
  );

  const frame =
    'group relative block min-h-[92px] overflow-hidden rounded border border-app-border bg-app-panel px-4 py-3.5';

  return to ? (
    <Link
      to={to}
      className={cn(
        frame,
        'hover:border-app-text-4 hover:bg-app-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40'
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

/** A responsive row of stat cards: two across on a phone, up to `columns` on a wide screen. */
export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 | 5 | 6 }) {
  const wide = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }[columns];
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4',
        // An odd card out on the two-column phone layout spans the row rather
        // than sitting half-width beside nothing.
        '[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1',
        wide
      )}
    >
      {children}
    </div>
  );
}
