import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

/** Generic, RTL-aware data table. Uses logical text-start alignment throughout. */
export function Table<T>({ columns, data, rowKey, emptyMessage, isLoading, onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default">
      {/*
       * min-w ensures columns keep a readable width instead of being squeezed/wrapped
       * on narrow viewports — that forces this wrapper's overflow-x-auto to actually
       * kick in (a horizontal scroll confined to the table) rather than the table
       * silently shrinking to fit and mangling cell content.
       */}
      <table className="w-full min-w-[640px] text-start text-sm">
        <thead className="bg-surface-200/60 text-text-secondary">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('whitespace-nowrap px-4 py-3 text-start font-medium', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-full max-w-32 animate-pulse rounded bg-surface-300" />
                  </td>
                ))}
              </tr>
            ))}
          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                {emptyMessage ?? 'No results'}
              </td>
            </tr>
          )}
          {!isLoading &&
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'text-text-primary',
                  onRowClick && 'cursor-pointer transition-colors hover:bg-surface-200/50'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('whitespace-nowrap px-4 py-3', col.className)}>
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
