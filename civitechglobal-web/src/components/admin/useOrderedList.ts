import { useEffect, useState } from 'react';

/**
 * A list an editor puts in order, shown in that order immediately.
 *
 * Shared by every editorial admin screen — team members, team sections,
 * customers, partners, projects — because each had the same three needs: move
 * a row, see it moved before the server answers, and put it back if the server
 * refuses. Written once, the "put it back" part cannot be forgotten on the
 * fifth screen.
 *
 * Arrows rather than drag and drop: these lists are short and edited rarely,
 * and a drag target that must also work on a phone and from a keyboard is a
 * great deal of machinery for moving something up one place.
 */
export function useOrderedList<T extends { id: string }>(
  source: T[] | undefined,
  save: (ids: string[]) => Promise<unknown>,
  onError: (error: unknown) => void
) {
  const [order, setOrder] = useState<T[]>([]);

  // Follows the server whenever the server speaks.
  useEffect(() => {
    if (source) setOrder(source);
  }, [source]);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const previous = order;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);

    try {
      await save(next.map((item) => item.id));
    } catch (error) {
      // Leaving the optimistic order on screen would show an arrangement the
      // page does not actually have.
      setOrder(previous);
      onError(error);
    }
  }

  return { order, move };
}
