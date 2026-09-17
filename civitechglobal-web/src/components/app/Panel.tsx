import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  title: ReactNode;
  description?: ReactNode;
  /** Controls in the header: a filter, a small button. */
  actions?: ReactNode;
  /** A "view all" link in the header, to the screen this panel previews. */
  viewAll?: { to: string; label: string };
  children: ReactNode;
  /** Removes body padding, for a list or table that runs edge to edge. */
  flush?: boolean;
  className?: string;
}

/**
 * A titled section of a screen.
 *
 * A 14px heading and its actions on a header row separated by a hairline, then
 * the content. Used for every block on an overview so the blocks read as one
 * family, and on detail pages for each group of related fields.
 */
export function Panel({ title, description, actions, viewAll, children, flush, className }: PanelProps) {
  return (
    <section className={cn('flex flex-col rounded border border-app-border bg-app-panel', className)}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-app-border-light px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-body-lg font-semibold text-app-text">{title}</h2>
          {description && <p className="text-label text-app-text-3">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {viewAll && (
            <Link
              to={viewAll.to}
              className="inline-flex items-center gap-0.5 text-label font-medium text-app-primary hover:text-app-primary-hover hover:underline"
            >
              {viewAll.label}
              <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <div className={cn('min-w-0 flex-1', !flush && 'p-4')}>{children}</div>
    </section>
  );
}

/** Label/value pairs in a responsive grid — the body of most detail panels. */
export function DetailList({
  items,
  columns = 3,
}: {
  items: Array<{ label: string; value: ReactNode; wide?: boolean }>;
  columns?: 2 | 3 | 4;
}) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns];
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', grid)}>
      {items.map((item) => (
        <div key={item.label} className={cn('min-w-0', item.wide && 'sm:col-span-full')}>
          <dt className="text-label text-app-text-3">{item.label}</dt>
          <dd className="mt-0.5 break-words text-body text-app-text">
            {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
