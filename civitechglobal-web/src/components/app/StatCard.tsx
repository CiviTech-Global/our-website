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

/* The icon's tile, in the tone of the figure: turquoise by default, saffron
   for what is waiting, pomegranate for what has gone wrong. */
const TILE_TONES: Record<StatTone, string> = {
  neutral: 'bg-app-primary-soft text-app-primary ring-brand-green-200 dark:ring-brand-green-400/25',
  attention: 'bg-app-accent-soft text-status-warning ring-brand-amber-200 dark:ring-brand-amber-400/25',
  positive: 'bg-app-primary-soft text-status-success ring-brand-green-200 dark:ring-brand-green-400/25',
  critical: 'bg-status-error-bg text-status-error ring-brand-red-200 dark:ring-brand-red-400/25',
};

const HINT_TONES: Record<StatTone, string> = {
  neutral: 'text-app-text-3',
  attention: 'text-status-warning',
  positive: 'text-status-success',
  critical: 'text-status-error',
};

/**
 * One figure, labelled.
 *
 * The public site's feature card at working size: the icon in a small tinted
 * tile, the label, and the figure large and bold — the number is what the
 * card is for, so it is the biggest thing on it.
 * A card that summarises a queue is a link to it: seeing that five things are
 * waiting is only useful if opening them is the next click.
 */
export function StatCard({ label, value, icon: Icon, hint, tone = 'neutral', to, loading }: StatCardProps) {
  const { locale } = useLocale();
  const display =
    typeof value === 'number' ? (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en')) : value;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="app-label truncate pt-1">{label}</p>
        {Icon && (
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl ring-1', TILE_TONES[tone])}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>
      {loading || value === undefined ? (
        <span className="mt-1 block h-9 w-20 animate-pulse rounded-lg bg-app-fill" aria-hidden="true" />
      ) : (
        <p className="app-tabular mt-1 text-metric font-extrabold text-app-text">{display}</p>
      )}
      {hint && <p className={cn('mt-1 truncate text-label font-semibold', HINT_TONES[tone])}>{hint}</p>}
    </>
  );

  const frame = 'app-raised group relative block min-h-[120px] overflow-hidden p-4 sm:p-5';

  return to ? (
    <Link
      to={to}
      className={cn(
        frame,
        'transition-[transform,border-color,box-shadow] duration-(--dur-enter) ease-(--ease) hover:-translate-y-0.5 hover:border-app-primary hover:shadow-[0_14px_28px_-18px_oklch(35%_0.064_182/0.5)] active:translate-y-0'
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
