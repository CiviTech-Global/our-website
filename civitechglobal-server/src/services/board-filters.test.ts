import { describe, expect, it } from 'vitest';
import { jobSort, salaryRangeWhere } from './jobs.service.js';
import { budgetRangeWhere, projectSort } from './freelance.service.js';

/**
 * The board filter grammar, as pure Prisma-input builders.
 *
 * These are the decisions a reviewer would otherwise have to re-derive from
 * the query code: that a range filter means overlap and excludes undisclosed
 * rows, that featured always sorts first, and that a pay sort parks nulls at
 * the bottom whichever direction it runs. The builders are exported for
 * exactly this — the service is the only caller, but the rules deserve tests
 * of their own.
 */

describe('salaryRangeWhere', () => {
  it('is empty when no range is given', () => {
    expect(salaryRangeWhere({ page: 1, pageSize: 20 })).toEqual({});
  });

  it('excludes undisclosed salaries from any range filter', () => {
    const where = salaryRangeWhere({ page: 1, pageSize: 20, salaryMin: BigInt(1000) });

    expect(where.salaryUndisclosed).toBe(false);
  });

  it('treats a missing listing endpoint as unbounded on the max side', () => {
    const where = salaryRangeWhere({ page: 1, pageSize: 20, salaryMax: BigInt(5000) });

    expect(where.AND).toEqual([{ OR: [{ salaryMin: null }, { salaryMin: { lte: BigInt(5000) } }] }]);
  });

  it('treats a missing listing endpoint as unbounded on the min side', () => {
    const where = salaryRangeWhere({ page: 1, pageSize: 20, salaryMin: BigInt(1000) });

    expect(where.AND).toEqual([{ OR: [{ salaryMax: null }, { salaryMax: { gte: BigInt(1000) } }] }]);
  });

  it('requires overlap from both ends when both bounds are given', () => {
    const where = salaryRangeWhere({
      page: 1,
      pageSize: 20,
      salaryMin: BigInt(1000),
      salaryMax: BigInt(5000),
    });

    expect(where.AND).toHaveLength(2);
  });
});

describe('budgetRangeWhere', () => {
  it('is empty when no range is given', () => {
    expect(budgetRangeWhere({ page: 1, pageSize: 20 })).toEqual({});
  });

  it('excludes undisclosed budgets from any range filter', () => {
    const where = budgetRangeWhere({ page: 1, pageSize: 20, budgetMin: BigInt(1) });

    expect(where.budgetUnknown).toBe(false);
  });
});

describe('jobSort', () => {
  it('puts featured first for every sort, newest by default', () => {
    const sorted = jobSort({ page: 1, pageSize: 20, sort: 'newest' });

    expect(sorted[0]).toEqual({ featured: 'desc' });
    expect(sorted[1]).toEqual({ publishedAt: 'desc' });
  });

  it('parks null salaries last on an ascending pay sort', () => {
    const sorted = jobSort({ page: 1, pageSize: 20, sort: 'salaryAsc' });

    expect(sorted[1]).toEqual({ salaryMin: { sort: 'asc', nulls: 'last' } });
  });

  it('parks null salaries last on a descending pay sort too', () => {
    const sorted = jobSort({ page: 1, pageSize: 20, sort: 'salaryDesc' });

    expect(sorted[1]).toEqual({ salaryMax: { sort: 'desc', nulls: 'last' } });
  });

  it('orders by closing date with open-ended listings last', () => {
    const sorted = jobSort({ page: 1, pageSize: 20, sort: 'closingSoon' });

    expect(sorted[1]).toEqual({ closesAt: { sort: 'asc', nulls: 'last' } });
  });
});

describe('projectSort', () => {
  it('defaults to featured first, then newest', () => {
    expect(projectSort({ page: 1, pageSize: 20, sort: 'newest' })).toEqual([
      { featured: 'desc' },
      { publishedAt: 'desc' },
    ]);
  });

  it('sorts by budget with nulls last in both directions', () => {
    expect(projectSort({ page: 1, pageSize: 20, sort: 'budgetAsc' })[1]).toEqual({
      budgetMin: { sort: 'asc', nulls: 'last' },
    });
    expect(projectSort({ page: 1, pageSize: 20, sort: 'budgetDesc' })[1]).toEqual({
      budgetMax: { sort: 'desc', nulls: 'last' },
    });
  });
});
