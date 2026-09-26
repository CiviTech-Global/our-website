import { useCallback, useEffect, useState } from 'react';
import type { CartLine } from '@/types/trademaster';

/**
 * The basket, in the browser.
 *
 * There is no server-side cart, and that is a decision rather than an omission.
 * A basket is a draft intention; the order is the durable record, and it is
 * created the moment the buyer commits. Storing drafts server-side would mean a
 * table of abandoned baskets nobody reads, plus a synchronisation problem
 * between it and this, for the sole benefit of a basket surviving a change of
 * device — which nobody shopping for a mug asks for.
 *
 * Every read and write is wrapped, because localStorage throws rather than
 * returning null in a private window and can come back empty after cleared
 * site data. A basket that fails to load is an empty basket, never a crash.
 *
 * PRICES HERE ARE FOR DISPLAY ONLY. They are copied when an item is added so
 * the cart can be drawn without a request per line, and they go stale the
 * moment a seller edits one. The server reads the real price at checkout, so a
 * stale cart shows an old figure and then charges the correct one — which is
 * the right way round, and the reason the checkout page says the total is
 * confirmed on submission.
 */

const STORAGE_KEY = 'civitech-cart';

/** One line per product-and-variant pair. */
function keyOf(line: Pick<CartLine, 'productId' | 'variantId'>): string {
  return `${line.productId}:${line.variantId ?? ''}`;
}

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Shape-checked rather than trusted: this string is editable by hand, and
    // a malformed line would otherwise reach the cart UI and throw there.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).productId === 'string' &&
        typeof (line as CartLine).quantity === 'number' &&
        (line as CartLine).quantity > 0
    );
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // A browser refusing storage is not a reason to fail the click. The cart
    // then lives for this page only, which is worse than remembering it and
    // better than an error.
  }
}

/**
 * Told when the cart changes anywhere.
 *
 * The header's badge and the cart page are separate components reading the same
 * store, and `storage` only fires for *other* tabs. Without a same-tab signal
 * the badge would go stale the moment somebody added something.
 */
const CHANGED = 'civitech-cart-changed';

function announce(): void {
  window.dispatchEvent(new Event(CHANGED));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(readCart);

  useEffect(() => {
    const sync = () => setLines(readCart());
    window.addEventListener(CHANGED, sync);
    // Another tab.
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((line: CartLine) => {
    const next = readCart();
    const existing = next.find((candidate) => keyOf(candidate) === keyOf(line));
    if (existing) {
      existing.quantity = Math.min(100, existing.quantity + line.quantity);
    } else {
      next.push({ ...line, quantity: Math.min(100, line.quantity) });
    }
    write(next);
    announce();
  }, []);

  const setQuantity = useCallback((line: Pick<CartLine, 'productId' | 'variantId'>, quantity: number) => {
    const next = readCart()
      .map((candidate) =>
        keyOf(candidate) === keyOf(line)
          ? { ...candidate, quantity: Math.max(0, Math.min(100, quantity)) }
          : candidate
      )
      // Zero means remove, so a quantity stepper can reach empty without a
      // separate delete button.
      .filter((candidate) => candidate.quantity > 0);
    write(next);
    announce();
  }, []);

  const remove = useCallback((line: Pick<CartLine, 'productId' | 'variantId'>) => {
    write(readCart().filter((candidate) => keyOf(candidate) !== keyOf(line)));
    announce();
  }, []);

  const clear = useCallback(() => {
    write([]);
    announce();
  }, []);

  /**
   * Grouped by shop, because that is how it will be ordered.
   *
   * One order per shop is the server's rule; showing the basket any other way
   * would make the three confirmations that follow a surprise.
   */
  const byShop = groupByShop(lines);

  return {
    lines,
    byShop,
    add,
    setQuantity,
    remove,
    clear,
    count: lines.reduce((total, line) => total + line.quantity, 0),
    /** Display only. See the note at the top of this file. */
    subtotal: lines.reduce((total, line) => total + BigInt(line.unitPrice) * BigInt(line.quantity), 0n),
  };
}

export function groupByShop(lines: CartLine[]): Array<{ slug: string; name: string; lines: CartLine[] }> {
  const shops = new Map<string, { slug: string; name: string; lines: CartLine[] }>();
  for (const line of lines) {
    const shop = shops.get(line.shopSlug) ?? {
      slug: line.shopSlug,
      name: line.shopName,
      lines: [],
    };
    shop.lines.push(line);
    shops.set(line.shopSlug, shop);
  }
  return [...shops.values()];
}

/** What checkout sends: the identifiers and the quantity, never the price. */
export function toBasket(lines: CartLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
  }));
}
