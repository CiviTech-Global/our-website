/**
 * One shape for every list this API returns.
 *
 * Two grew up side by side: the older endpoints answered with the rows under
 * `data` and the counts in a sibling `meta` object, while everything written
 * since answered with `{ items, total, page, pageSize }` inside `data`. Both
 * work, and having both means each client has to know which endpoint it is
 * talking to before it can read the result — which is exactly the knowledge an
 * API exists to make unnecessary.
 *
 * `totalPages` is computed here rather than by each caller. Ten screens were
 * each writing `Math.ceil(total / PAGE_SIZE)`, which is correct until one of
 * them uses a page size the server did not agree to, and then it is a pager
 * that stops one page early with rows behind it.
 */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function toPage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return {
    items,
    page,
    pageSize,
    total,
    // An empty list is one page, not zero: a pager reading "page 1 of 0" is
    // asserting something impossible about where the reader is.
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
