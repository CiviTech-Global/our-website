import { afterEach, describe, expect, it } from 'vitest';
import { groupByShop, readCart, toBasket } from './cart';
import type { CartLine } from '@/types/trademaster';

/**
 * The basket.
 *
 * The pure parts are tested directly; the hook's storage handling is tested
 * through the behaviour that actually bites — a private window where
 * localStorage throws, and a hand-edited value that is not the shape the cart
 * expects. Both have to produce an empty basket rather than a crash, because
 * this runs on the first paint of the cart page.
 */

function line(over: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    quantity: 1,
    title: 'Blue mug',
    unitPrice: '450000',
    currency: 'IRT',
    coverUrl: null,
    shopSlug: 'tehran-ceramics',
    shopName: 'Tehran Ceramics',
    ...over,
  };
}

describe('grouping a basket by shop', () => {
  it('puts lines from one shop together', () => {
    const grouped = groupByShop([line(), line({ productId: 'p2' })]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].lines).toHaveLength(2);
  });

  it('separates shops, because each becomes its own order', () => {
    const grouped = groupByShop([
      line(),
      line({ productId: 'p9', shopSlug: 'other-shop', shopName: 'Other Shop' }),
    ]);

    expect(grouped.map((shop) => shop.slug)).toEqual(['tehran-ceramics', 'other-shop']);
  });

  it('keeps the order shops were first seen in, so the basket does not reshuffle', () => {
    const grouped = groupByShop([
      line({ shopSlug: 'b', shopName: 'B' }),
      line({ productId: 'p2', shopSlug: 'a', shopName: 'A' }),
      line({ productId: 'p3', shopSlug: 'b', shopName: 'B' }),
    ]);

    expect(grouped.map((shop) => shop.slug)).toEqual(['b', 'a']);
  });

  it('is empty for an empty basket rather than throwing', () => {
    expect(groupByShop([])).toEqual([]);
  });
});

describe('what checkout sends', () => {
  it('carries identifiers and quantity only', () => {
    const basket = toBasket([line({ variantId: 'v1', quantity: 3 })]);

    expect(basket).toEqual([{ productId: 'p1', variantId: 'v1', quantity: 3 }]);
  });

  it('never carries a price', () => {
    // The server reads prices from the database. A price on the wire would look
    // authoritative, be ignored, and eventually be trusted.
    const [sent] = toBasket([line()]);
    expect(sent).not.toHaveProperty('unitPrice');
    expect(JSON.stringify(sent)).not.toContain('450000');
  });
});

describe('reading the basket from a hostile localStorage', () => {
  const original = window.localStorage;

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
  });

  function stubStorage(getItem: () => string | null) {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem, setItem: () => {}, removeItem: () => {} },
      configurable: true,
    });
  }

  it('returns an empty basket when getItem throws', () => {
    // Safari in a private window, and any browser with site data blocked. This
    // runs during useState's initialiser, so a throw here is a blank page.
    stubStorage(() => {
      throw new Error('SecurityError');
    });

    expect(readCart()).toEqual([]);
  });

  it('returns an empty basket for unparseable JSON', () => {
    stubStorage(() => '{not json');
    expect(readCart()).toEqual([]);
  });

  it('returns an empty basket when the stored value is not an array', () => {
    stubStorage(() => '{"productId":"p1"}');
    expect(readCart()).toEqual([]);
  });

  it('drops malformed lines and keeps the good ones', () => {
    // Hand-edited, or written by an older version of the app. A line with no
    // productId would reach the cart page and throw on render.
    stubStorage(() =>
      JSON.stringify([
        line({ quantity: 2 }),
        { quantity: 1 },
        { productId: 'p3', quantity: 0 },
        null,
        'nonsense',
        42,
      ])
    );

    const basket = readCart();
    expect(basket).toHaveLength(1);
    expect(basket[0].productId).toBe('p1');
  });

  it('drops a line whose quantity is not a number', () => {
    stubStorage(() => JSON.stringify([{ ...line(), quantity: '3' }]));
    expect(readCart()).toEqual([]);
  });
});
