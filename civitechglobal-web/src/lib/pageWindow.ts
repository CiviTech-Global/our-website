/**
 * The page numbers to show: always the first and last, the current one and its
 * neighbours, and a gap marker wherever numbers are skipped. Seven slots at
 * most, so the row fits a phone.
 */
export function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  // Near either end, show a little more of it rather than a gap of one.
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => wanted.add(n));

  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  for (const [index, n] of pages.entries()) {
    if (index > 0 && n - pages[index - 1] > 1) result.push('gap');
    result.push(n);
  }
  return result;
}
