import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALE_TAGS } from '@/i18n/locales';
import { pageWindow } from '@/lib/pageWindow';
import { cn } from '@/lib/utils';
import { Select } from './Select';
import { useSurface } from './surface';

/**
 * The foot of a list: where the reader is, how to move, and how much to show.
 *
 * Three parts, each optional by circumstance rather than by flag: the range
 * ("21–40 of 87") whenever there is anything to count, numbered pages when
 * there is more than one, and the page-size choice when the list offers one.
 *
 * Numbered rather than previous/next alone. Baymard and NN/g both find that a
 * reader paging through results wants to jump — back to page 2 where the good
 * one was, or straight to the end — and "next, next, next" is the slowest way
 * to get anywhere.
 */

export interface ListPagerProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Offer a page-size choice. Omitted or empty, none is shown. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function ListPager({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  pageSizeOptions = [],
  onPageSizeChange,
  className,
}: ListPagerProps) {
  const { t, locale } = useLocale();
  const number = (n: number) => new Intl.NumberFormat(LOCALE_TAGS[locale]).format(n);
  // In a dashboard the pages are keys, like every other control there.
  const app = useSurface() === 'app';

  // Nothing to say about an empty list; the page shows its own empty state.
  if (total <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  // A size choice is only a choice when it could change what is shown.
  const showSizes = pageSizeOptions.length > 1 && onPageSizeChange && total > Math.min(...pageSizeOptions);
  const rtl = locale === 'fa';

  const pageButton = app
    ? 'inline-flex h-8 min-w-8 items-center justify-center px-2 text-body app-tabular disabled:pointer-events-none disabled:opacity-40'
    : 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition disabled:pointer-events-none disabled:opacity-40';
  const quiet = app ? 'app-key-flat text-app-text-3' : 'text-text-secondary hover:bg-surface-muted';
  const text = app ? 'text-body text-app-text-3' : 'text-sm text-text-secondary';

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className={text} aria-live="polite">
        {t.list.showingRange
          .replace('{from}', number(from))
          .replace('{to}', number(to))
          .replace('{total}', number(total))}
      </p>

      {totalPages > 1 && (
        <nav aria-label={t.list.pagination} className="flex items-center gap-1">
          <button
            type="button"
            className={cn(pageButton, quiet)}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t.common.previous}
          >
            {rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {pageWindow(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className={app ? 'px-1 text-app-text-4' : 'px-1 text-text-tertiary'} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={t.list.goToPage.replace('{page}', number(item))}
                className={cn(
                  pageButton,
                  item === page
                    ? app
                      ? 'app-key font-semibold'
                      : 'bg-surface-inverse font-semibold text-text-inverse'
                    : app
                      ? 'app-key-flat'
                      : 'text-text-primary hover:bg-surface-muted'
                )}
              >
                {number(item)}
              </button>
            )
          )}

          <button
            type="button"
            className={cn(pageButton, quiet)}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t.common.next}
          >
            {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </nav>
      )}

      {showSizes && (
        <label className={cn('flex items-center gap-2', text)}>
          {t.list.perPage}
          <Select
            className="w-24"
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {number(size)}
              </option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );
}
