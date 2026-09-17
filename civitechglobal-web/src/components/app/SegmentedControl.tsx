import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown after the label, e.g. how many rows the filter holds. */
  count?: number;
}

/**
 * A small set of mutually exclusive views — "all / waiting / done".
 *
 * Buttons with `aria-pressed` rather than tabs: switching a filter changes the
 * rows of one list, it does not reveal a different panel, and a screen reader
 * announcing "tab 2 of 3" would promise a structure that is not there.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  className,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for assistive technology. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded border border-app-border bg-app-subtle p-0.5',
        className
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[3px] px-2.5 text-body',
              active
                ? 'border border-app-border-light bg-app-panel font-medium text-app-text shadow-[0_1px_2px_rgba(16,24,40,0.05)]'
                : 'border border-transparent text-app-text-3 hover:text-app-text'
            )}
          >
            {segment.label}
            {segment.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-caption font-medium',
                  active ? 'bg-app-fill text-app-text-2' : 'bg-app-fill/70 text-app-text-3'
                )}
              >
                {segment.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A row of filters above a list: controls on one side, a result count or secondary action on the other. */
export function Toolbar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </div>
  );
}
