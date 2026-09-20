import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import type { ListControls, ListView } from '@/lib/useListControls';
import { Button } from './Button';
import { Input } from './Input';
import { ViewToggle } from './ViewToggle';
import { useSurface } from './surface';

export interface ListToolbarProps {
  controls: ListControls;
  /** Placeholder for the box — say what is searched, not just "Search". */
  searchPlaceholder: string;
  searchLabel?: string;
  /** The page's own Selects and range fields, laid out beside the search box. */
  filters?: ReactNode;
  /** Omitted where only one view makes sense for the data. */
  views?: ListView[];
  /** Matches across the whole result set, not just this page. */
  total?: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * The controls above a list: search, filters, view, and what they found.
 *
 * One component because these four were being rewritten per page, and they had
 * drifted — three different placeholder styles, two different ideas of whether
 * changing a filter returns you to page 1, and a result count on some pages
 * and not others. The count matters most on the ones that lacked it: "۳ نتیجه"
 * is the difference between a filter that found almost nothing and a filter
 * that is silently broken.
 *
 * The reset only appears once something is filtering. A list nobody has
 * touched has nothing to reset, and a button that does nothing still has to be
 * read before it can be dismissed.
 */
export function ListToolbar({
  controls,
  searchPlaceholder,
  searchLabel,
  filters,
  views,
  total,
  isLoading,
  className,
}: ListToolbarProps) {
  const { t, locale } = useLocale();
  const app = useSurface() === 'app';

  const number = (value: number) =>
    locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className={cn(
              'pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2',
              app ? 'text-app-icon' : 'text-text-muted'
            )}
            aria-hidden="true"
          />
          <Input
            type="search"
            className="ps-9"
            value={controls.searchInput}
            placeholder={searchPlaceholder}
            aria-label={searchLabel ?? searchPlaceholder}
            onChange={(event) => controls.setSearch(event.target.value)}
          />
        </div>

        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}

        {views && views.length > 1 && (
          <ViewToggle value={controls.view} onChange={controls.setView} className="ms-auto lg:ms-0" />
        )}
      </div>

      {/*
       * The count and the reset share a row so that neither reserves space
       * when it has nothing to say, and the row disappears entirely on a list
       * nobody has filtered.
       */}
      {(controls.activeCount > 0 || (total !== undefined && !isLoading)) && (
        <div className="flex flex-wrap items-center gap-3">
          {total !== undefined && !isLoading && (
            <p className={app ? 'text-label text-app-text-3' : 'text-sm text-text-muted'}>
              {total === 1 ? t.list.resultOne : t.list.resultCount.replace('{count}', number(total))}
            </p>
          )}

          {controls.activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={controls.clear} className="ms-auto">
              <X className="size-3.5" aria-hidden="true" />
              {t.list.clearFilters}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
