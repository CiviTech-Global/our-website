import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOrderedList } from './useOrderedList';

const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const ids = (list: Array<{ id: string }>) => list.map((row) => row.id);

describe('useOrderedList', () => {
  it('shows a move immediately and sends the whole new order', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrderedList(rows, save, vi.fn()));
    await waitFor(() => expect(ids(result.current.order)).toEqual(['a', 'b', 'c']));

    await act(() => result.current.move(2, -1));

    expect(ids(result.current.order)).toEqual(['a', 'c', 'b']);
    // The whole list, not "move c up one": two editors reordering at once
    // would otherwise interleave into an order neither of them chose.
    expect(save).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('puts the row back when the server refuses', async () => {
    const failure = new Error('nope');
    const save = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();
    const { result } = renderHook(() => useOrderedList(rows, save, onError));
    await waitFor(() => expect(result.current.order).toHaveLength(3));

    await act(() => result.current.move(0, 1));

    // Leaving the optimistic order on screen would show an arrangement the
    // public page does not actually have.
    expect(ids(result.current.order)).toEqual(['a', 'b', 'c']);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('ignores a move off either end', async () => {
    const save = vi.fn();
    const { result } = renderHook(() => useOrderedList(rows, save, vi.fn()));
    await waitFor(() => expect(result.current.order).toHaveLength(3));

    await act(() => result.current.move(0, -1));
    await act(() => result.current.move(2, 1));

    expect(save).not.toHaveBeenCalled();
    expect(ids(result.current.order)).toEqual(['a', 'b', 'c']);
  });
});
