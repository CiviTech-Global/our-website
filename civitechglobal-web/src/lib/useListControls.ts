import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

export type ListView = 'cards' | 'table';

export interface ListControlsOptions {
  /** Which view the page opens in: cards for public, table for staff. */
  defaultView?: ListView;
  /** Named filters this list understands, with the value that means "all". */
  filters?: Record<string, string>;
  /** The sort chosen when the URL says nothing. */
  defaultSort?: string;
  /** Rows per page. Sent to the server, so it belongs with the rest. */
  pageSize?: number;
  /**
   * How long typing settles before it becomes a request. 300ms is the usual
   * compromise: long enough that a word is one query rather than six, short
   * enough that the list feels like it is answering the keystroke.
   */
  debounceMs?: number;
}

export interface ListControls {
  /** Debounced — what the query should ask the server for. */
  search: string;
  /** Immediate — what the text box should show. */
  searchInput: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (name: string, value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  view: ListView;
  setView: (value: ListView) => void;
  /** How many filters (search included) are narrowing the list right now. */
  activeCount: number;
  clear: () => void;
}

/**
 * The state behind a list screen: search, filters, sort, page and view.
 *
 * It lives in the query string rather than in component state, which is what
 * makes a filtered list a place rather than a mood. A colleague can be sent
 * "the pending books from Tehran", the back button returns to the page you
 * came from instead of the top of an unfiltered list, and a reload does not
 * throw the work away. None of that is possible while the state is a useState
 * that resets the moment the route unmounts.
 *
 * Two things are deliberately not in the URL. The debounce means `search` (for
 * the query) lags `searchInput` (for the box), so that typing does not fire a
 * request per keystroke or push a history entry per character. And every
 * change except paging resets to page 1 — staying on page 7 of a list that now
 * has two pages shows an empty screen and reads as "no results".
 */
export function useListControls(options: ListControlsOptions = {}): ListControls {
  const {
    defaultView = 'cards',
    filters: filterDefaults = {},
    defaultSort = '',
    pageSize = 20,
    debounceMs = 300,
  } = options;

  const [params, setParams] = useSearchParams();

  const urlSearch = params.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);

  // The URL is the source of truth, so a change that did not come from the box
  // — landing on a shared link, going back, clearing the filters — has to
  // reach the box. Comparing first keeps this from fighting the debounce.
  const lastPushed = useRef(urlSearch);
  useEffect(() => {
    if (urlSearch !== lastPushed.current) {
      lastPushed.current = urlSearch;
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  /**
   * Writes the query string.
   *
   * Defaults are removed rather than spelled out, so the common case has a
   * clean URL and only what was actually chosen appears in it. `replace` is
   * for the debounced search: pushing a history entry per keystroke turns one
   * back-press into thirty.
   */
  const write = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace }
      );
    },
    [setParams]
  );

  const setSearch = useCallback((value: string) => setSearchInput(value), []);

  // Typing settles into the URL. The timer is cleared on every keystroke, so
  // only the pause at the end of a word costs a request.
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = window.setTimeout(() => {
      lastPushed.current = searchInput;
      write({ q: searchInput || null, page: null }, true);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [searchInput, urlSearch, write, debounceMs]);

  const filters = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [name, fallback] of Object.entries(filterDefaults)) {
      result[name] = params.get(name) ?? fallback;
    }
    return result;
    // The defaults are written inline at every call site, so a new object
    // arrives on each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, JSON.stringify(filterDefaults)]);

  const setFilter = useCallback(
    (name: string, value: string) => {
      write({ [name]: value === (filterDefaults[name] ?? '') ? null : value, page: null });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, JSON.stringify(filterDefaults)]
  );

  const sort = params.get('sort') ?? defaultSort;
  const setSort = useCallback(
    (value: string) => write({ sort: value === defaultSort ? null : value, page: null }),
    [write, defaultSort]
  );

  // A page number out of a URL is whatever somebody typed there.
  const parsed = Number(params.get('page'));
  const page = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  const setPage = useCallback((value: number) => write({ page: value <= 1 ? null : String(value) }), [write]);

  const viewParam = params.get('view');
  const view: ListView = viewParam === 'cards' || viewParam === 'table' ? viewParam : defaultView;
  const setView = useCallback(
    (value: ListView) => write({ view: value === defaultView ? null : value }),
    [write, defaultView]
  );

  const activeCount =
    (urlSearch.trim() ? 1 : 0) +
    Object.entries(filters).filter(([name, value]) => value !== (filterDefaults[name] ?? '')).length;

  const clear = useCallback(() => {
    lastPushed.current = '';
    setSearchInput('');
    write({
      q: null,
      page: null,
      sort: null,
      ...Object.fromEntries(Object.keys(filterDefaults).map((name) => [name, null])),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [write, JSON.stringify(filterDefaults)]);

  return {
    search: urlSearch.trim(),
    searchInput,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    view,
    setView,
    activeCount,
    clear,
  };
}
