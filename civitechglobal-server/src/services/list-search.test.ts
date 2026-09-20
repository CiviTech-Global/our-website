import { describe, expect, it } from 'vitest';
import { searchWhere } from './list-search.js';

describe('searchWhere', () => {
  it('matches any of the given columns, case-insensitively', () => {
    expect(searchWhere('acme', ['title', 'code'])).toEqual({
      OR: [
        { title: { contains: 'acme', mode: 'insensitive' } },
        { code: { contains: 'acme', mode: 'insensitive' } },
      ],
    });
  });

  it('nests a path through a relation', () => {
    expect(searchWhere('ali@example.com', [['seller', 'email']])).toEqual({
      OR: [{ seller: { email: { contains: 'ali@example.com', mode: 'insensitive' } } }],
    });
  });

  it('trims the term before searching', () => {
    expect(searchWhere('  شاهنامه  ', ['title'])).toEqual({
      OR: [{ title: { contains: 'شاهنامه', mode: 'insensitive' } }],
    });
  });

  /**
   * The one that matters. Prisma reads `{ OR: [] }` as "match no rows", so a
   * box holding a single space would empty the queue and look like a database
   * fault rather than a filter.
   */
  it('narrows nothing when there is no term', () => {
    for (const term of [undefined, null, '', '   ']) {
      expect(searchWhere(term, ['title'])).toEqual({});
    }
  });

  it('narrows nothing when there are no columns to search', () => {
    expect(searchWhere('acme', [])).toEqual({});
  });
});
