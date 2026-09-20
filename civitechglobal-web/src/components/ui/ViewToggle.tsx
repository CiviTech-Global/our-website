import { LayoutGrid, Rows3 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { ListView } from '@/lib/useListControls';
import { useSurface } from './surface';

export interface ViewToggleProps {
  value: ListView;
  onChange: (view: ListView) => void;
  className?: string;
}

/**
 * Cards or rows, for a list that reads well either way.
 *
 * A segmented control rather than two independent buttons: the two are one
 * choice, and only one of them is ever true. It is a radiogroup for the same
 * reason — a screen reader should announce "cards, selected, 1 of 2", not two
 * unrelated buttons whose relationship is only visual.
 *
 * Offered where the choice is real. A book market is browsed by its covers and
 * audited as a table; a queue of thirty pending requests is worked as a table
 * and glanced at as cards. Where the data has no picture and no second useful
 * shape, the page shows one view and no toggle, because a toggle that switches
 * between a list and the same list is furniture.
 */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const { t } = useLocale();
  const app = useSurface() === 'app';

  const options: { view: ListView; label: string; Icon: typeof LayoutGrid }[] = [
    { view: 'cards', label: t.list.viewCards, Icon: LayoutGrid },
    { view: 'table', label: t.list.viewTable, Icon: Rows3 },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t.list.viewLabel}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 p-0.5',
        app ? 'rounded border border-app-border bg-app-subtle' : 'rounded-xl border border-border-default bg-surface-100',
        className
      )}
    >
      {options.map(({ view, label, Icon }) => {
        const selected = value === view;
        return (
          <button
            key={view}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(view)}
            className={cn(
              'flex items-center justify-center transition-colors focus-visible:outline-none',
              app
                ? 'size-7 rounded focus-visible:ring-2 focus-visible:ring-app-primary/40'
                : 'size-9 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-green-500/40',
              selected
                ? app
                  ? 'bg-app-panel text-app-text ring-1 ring-app-border'
                  : 'bg-surface-50 text-text-primary shadow-soft'
                : app
                  ? 'text-app-icon hover:text-app-text'
                  : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Icon className={app ? 'size-4' : 'size-4'} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
