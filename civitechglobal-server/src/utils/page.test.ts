import { describe, expect, it } from 'vitest';
import { toPage } from './page.js';

describe('toPage', () => {
  it('carries the rows and the counts a pager needs', () => {
    expect(toPage(['a', 'b'], 42, 2, 20)).toEqual({
      items: ['a', 'b'],
      page: 2,
      pageSize: 20,
      total: 42,
      totalPages: 3,
    });
  });

  it('rounds a partial last page up', () => {
    // 41 rows at 20 a page is three pages, not two. Truncating here is a pager
    // that stops with a row still behind it.
    expect(toPage([], 41, 1, 20).totalPages).toBe(3);
  });

  it('counts an empty list as one page', () => {
    // "Page 1 of 0" asserts something impossible about where the reader is.
    expect(toPage([], 0, 1, 20).totalPages).toBe(1);
  });

  it('counts an exactly full page once', () => {
    expect(toPage([], 40, 1, 20).totalPages).toBe(2);
  });
});
