import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { useClientList } from './clientList';
import { useListControls } from './useListControls';

interface Row {
  name: string;
  kind: string;
  order: number;
}

const ROWS: Row[] = [
  { name: 'زهرا کریمی', kind: 'staff', order: 3 },
  { name: 'Ali Rezaei', kind: 'guest', order: 1 },
  { name: 'Sara Ahmadi', kind: 'staff', order: 2 },
];

function setup(url: string, options?: Parameters<typeof useClientList<Row>>[2], rows: Row[] | undefined = ROWS) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const controls = useListControls({ filters: { kind: '' }, pageSize: 2 });
      return useClientList(rows, controls, options);
    },
    { wrapper }
  );
}

const byName = { searchFields: (row: Row) => [row.name] };

describe('useClientList', () => {
  it('returns every row when nothing is filtering', () => {
    const { result } = setup('/x', { searchFields: (row: Row) => [row.name], pageSize: 10 });
    expect(result.current.total).toBe(3);
    expect(result.current.totalPages).toBe(1);
  });

  it('searches without regard to case', () => {
    const { result } = setup('/x?q=ALI', { ...byName, pageSize: 10 });
    expect(result.current.items.map((row) => row.name)).toEqual(['Ali Rezaei']);
  });

  it('searches Persian text', () => {
    const { result } = setup('/x?q=کریمی', { ...byName, pageSize: 10 });
    expect(result.current.total).toBe(1);
  });

  it('applies a named filter only when it is set', () => {
    const filters = { kind: (row: Row, value: string) => row.kind === value };

    expect(setup('/x', { filters, pageSize: 10 }).result.current.total).toBe(3);
    expect(setup('/x?kind=staff', { filters, pageSize: 10 }).result.current.total).toBe(2);
  });

  it('sorts by the named comparator', () => {
    const sorts = { order: (a: Row, b: Row) => a.order - b.order };
    const { result } = setup('/x?sort=order', { sorts, pageSize: 10 });
    expect(result.current.items.map((row) => row.order)).toEqual([1, 2, 3]);
  });

  /**
   * The rows belong to the query cache, so sorting them where they lie would
   * reorder what every other reader of that cache sees.
   */
  it('does not reorder the array it was given', () => {
    const rows = [...ROWS];
    const before = [...rows];
    setup('/x?sort=order', { sorts: { order: (a: Row, b: Row) => a.order - b.order } }, rows);
    expect(rows).toEqual(before);
  });

  it('pages the matches, counting all of them', () => {
    const { result } = setup('/x', { pageSize: 2 });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(3);
    expect(result.current.totalPages).toBe(2);
  });

  // A page past the end is an empty screen that reads as "no results".
  it('falls back to the last page when the URL asks for one past the end', () => {
    const { result } = setup('/x?page=9', { pageSize: 2 });
    expect(result.current.items).toHaveLength(1);
  });

  it('survives rows that have not arrived yet', () => {
    const { result } = renderHook(
      () => useClientList<Row>(undefined, useListControls({ pageSize: 2 }), byName),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={['/x']}>{children}</MemoryRouter>
        ),
      }
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPages).toBe(1);
  });
});
