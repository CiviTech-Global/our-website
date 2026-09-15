/**
 * One shape for every list this API returns.
 *
 * Three descriptions of the same thing had grown up side by side: rows under
 * `data` with the counts in a sibling `meta` object, a `Paged<T>` living in the
 * marketplace types, and a handful of object literals spelled out inline at the
 * call site. All three describe one server response, and having three means a
 * screen has to know which endpoint it is talking to before it can read the
 * result — the knowledge an API exists to make unnecessary.
 *
 * `totalPages` comes from the server. Fourteen screens each wrote
 * `Math.ceil(total / PAGE_SIZE)`, which is right until one of them names a page
 * size the server did not agree to — and then it is a pager that stops a page
 * early with rows still behind it.
 */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
