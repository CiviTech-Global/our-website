import { useMemo } from 'react';
import type { ListControls } from './useListControls';

export interface ClientListOptions<T> {
  /** The text of a row that a search should look at. Nulls are ignored. */
  searchFields?: (row: T) => (string | null | undefined)[];
  /**
   * One predicate per named filter, called only when that filter is set.
   * The value is whatever the URL holds, so the page decides what it means.
   */
  filters?: Record<string, (row: T, value: string) => boolean>;
  /** Comparators by sort name. Absent means "leave the server's order alone". */
  sorts?: Record<string, (a: T, b: T) => number>;
  /** Rows per page. The pager hides itself when everything fits on one. */
  pageSize?: number;
}

export interface ClientList<T> {
  /** The rows this page should render. */
  items: T[];
  /** How many matched in total, which is what the count above the list means. */
  total: number;
  totalPages: number;
}

/**
 * Search, filter, sort and page a list the browser already holds.
 *
 * Most of this application's lists are not paged by the server, and for good
 * reason: a curated team page, the club of experts, one person's own listings
 * are tens of rows with an explicit order, and asking the server for a slice of
 * them would cost a round trip per keystroke to filter something already in
 * memory.
 *
 * The distinction that matters is honesty about what was searched. Filtering a
 * page of a larger result set silently misses matches on every other page,
 * which is why the long lists (the boards, the queues) filter on the server
 * instead. Here the browser holds every row, so a search over them is exact —
 * and the count this returns is the count of everything that matched, not of
 * what happens to be on screen.
 */
export function useClientList<T>(
  rows: T[] | undefined,
  controls: ListControls,
  options: ClientListOptions<T> = {}
): ClientList<T> {
  const { searchFields, filters = {}, sorts = {}, pageSize = controls.pageSize } = options;
  const { search, filters: values, sort, page } = controls;

  return useMemo(() => {
    let matched = rows ?? [];

    if (search) {
      const needle = search.toLowerCase();
      matched = matched.filter((row) =>
        (searchFields?.(row) ?? [])
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(needle))
      );
    }

    for (const [name, predicate] of Object.entries(filters)) {
      const value = values[name];
      // An unset filter is not a filter. The page decides what its own "all"
      // looks like by leaving the default empty.
      if (!value) continue;
      matched = matched.filter((row) => predicate(row, value));
    }

    const comparator = sorts[sort];
    // Copied before sorting: the array belongs to the query cache, and sorting
    // it where it lies would reorder what every other reader sees.
    if (comparator) matched = [...matched].sort(comparator);

    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // A page beyond the end shows nothing and reads as "no results", so the
    // last page stands in for it — the same correction the server makes.
    const safePage = Math.min(page, totalPages);
    const items = matched.slice((safePage - 1) * pageSize, safePage * pageSize);

    return { items, total, totalPages };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, JSON.stringify(values), sort, page, pageSize]);
}
