import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Right-aligned in LTR, left in RTL — for numbers and row actions. */
  align?: 'start' | 'end';
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  /** Describes a clickable row to assistive technology, e.g. "Open request". */
  rowLabel?: (row: T) => string;
}

/**
 * The dashboards' data table. RTL-aware, with logical alignment throughout.
 *
 * Styled for scanning a long list: an uppercase 12px header on a faint band,
 * 13px cells, hairline row dividers and a hover tint. Only used inside the
 * application, so it does not switch on surface.
 *
 * A clickable row is also a keyboard target — Enter or Space opens it — because
 * a row that only responds to a mouse is a list a keyboard user cannot open.
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage,
  isLoading,
  onRowClick,
  rowLabel,
}: TableProps<T>) {
  const alignClass = (col: TableColumn<T>) => (col.align === 'end' ? 'text-end' : 'text-start');

  return (
    <div className="overflow-x-auto rounded border border-app-border bg-app-panel">
      {/*
       * min-w keeps columns at a readable width instead of squeezing them on a
       * narrow screen, so the wrapper scrolls horizontally rather than the
       * cells wrapping into illegibility.
       */}
      <table className="w-full min-w-[640px] border-collapse text-body">
        <thead>
          <tr className="border-b border-app-border bg-app-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2.5 text-label font-medium uppercase tracking-wide text-app-text-3',
                  alignClass(col),
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-app-border-light last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3">
                    <div className="h-3.5 w-full max-w-32 animate-pulse rounded bg-app-fill" />
                  </td>
                ))}
              </tr>
            ))}
          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-12 text-center text-app-text-3">
                {emptyMessage ?? 'No results'}
              </td>
            </tr>
          )}
          {!isLoading &&
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                className={cn(
                  'border-b border-app-border-light text-app-text-2 last:border-b-0',
                  onRowClick &&
                    'cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-primary/40'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('whitespace-nowrap px-3 py-3', alignClass(col), col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
