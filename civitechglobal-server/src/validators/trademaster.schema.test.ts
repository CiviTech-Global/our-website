import { describe, expect, it } from 'vitest';
import {
  productBoardSchema,
  productSchema,
  shopSchema,
  shopUpdateSchema,
  variantSchema,
  checkoutSchema,
  startPaymentSchema,
  orderMoveSchema,
} from './trademaster.schema.js';

const validShop = {
  name: 'Tehran Ceramics',
  summary: 'Hand-thrown tableware made in the workshop since 2014.',
};

describe('shop input', () => {
  it('accepts the minimum a shop needs', () => {
    expect(shopSchema.parse(validShop)).toMatchObject({ name: 'Tehran Ceramics' });
  });

  it('refuses a body that tries to award itself a badge', () => {
    // The service also orders its spreads defensively, so this is the outer of
    // two guards. Both exist because either alone is one edit away from being
    // the only one.
    for (const extra of [{ featured: true }, { moderationStatus: 'APPROVED' }, { ownerId: 'x' }]) {
      expect(() => shopSchema.parse({ ...validShop, ...extra })).toThrow();
    }
  });

  it('rejects a website that is not http or https', () => {
    // Zod's own .url() accepts javascript: and data:, which become stored
    // cross-site scripting the moment a template renders the value as a link.
    for (const website of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ]) {
      expect(() => shopSchema.parse({ ...validShop, website })).toThrow();
    }
  });

  it('accepts an ordinary website', () => {
    const parsed = shopSchema.parse({ ...validShop, website: 'https://example.ir/shop' });
    expect(parsed.website).toBe('https://example.ir/shop');
  });

  it('rejects a coordinate that is not on Earth', () => {
    expect(() => shopSchema.parse({ ...validShop, latitude: 91, longitude: 0 })).toThrow();
    expect(() => shopSchema.parse({ ...validShop, latitude: 0, longitude: 181 })).toThrow();
  });

  it('rejects an empty update rather than accepting a no-op', () => {
    // A PATCH with nothing in it usually means the client serialised the form
    // wrong; answering 400 is more useful than a 200 that changed nothing.
    expect(() => shopUpdateSchema.parse({})).toThrow();
  });

  it('accepts a one-field update', () => {
    expect(shopUpdateSchema.parse({ city: 'Isfahan' })).toEqual({ city: 'Isfahan' });
  });
});

describe('product input', () => {
  const validProduct = {
    title: 'Blue ceramic mug',
    summary: 'Stoneware, 350ml, dishwasher safe.',
    price: '450000',
  };

  it('carries money as a digit string and parses it to BigInt', () => {
    // An Iranian amount in toman outgrows what a JSON number carries without
    // silently losing its low digits.
    const parsed = productSchema.parse(validProduct);
    expect(parsed.price).toBe(450000n);
  });

  it('refuses a price that is not a plain digit string', () => {
    for (const price of ['45.5', '-450000', '4e5', '450,000', '']) {
      expect(() => productSchema.parse({ ...validProduct, price })).toThrow();
    }
  });

  it('refuses negative stock', () => {
    expect(() => productSchema.parse({ ...validProduct, stock: -1 })).toThrow();
  });

  it('refuses unknown fields', () => {
    expect(() => productSchema.parse({ ...validProduct, featured: true })).toThrow();
  });
});

describe('variant input', () => {
  it('allows a variant with no price, meaning "same as the product"', () => {
    const parsed = variantSchema.parse({ label: 'Large' });
    expect(parsed.price).toBeUndefined();
  });

  it('parses an overriding price', () => {
    expect(variantSchema.parse({ label: 'Large', price: '520000' }).price).toBe(520000n);
  });

  it('requires a label', () => {
    expect(() => variantSchema.parse({ sku: 'MUG-L' })).toThrow();
  });
});

describe('the product board query', () => {
  it('defaults to the first page at a sane size', () => {
    const parsed = productBoardSchema.parse({});
    expect(parsed).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('caps the page size', () => {
    // An uncapped page size is a way to ask the server to serialise the whole
    // catalogue in one request.
    expect(() => productBoardSchema.parse({ pageSize: '5000' })).toThrow();
  });

  it('rejects a page below one', () => {
    expect(() => productBoardSchema.parse({ page: '0' })).toThrow();
  });

  it('coerces the numbers a query string actually carries', () => {
    const parsed = productBoardSchema.parse({ page: '3', pageSize: '40' });
    expect(parsed).toMatchObject({ page: 3, pageSize: 40 });
  });
});

describe('checkout input', () => {
  const valid = {
    lines: [{ productId: 'p1', quantity: 2 }],
    recipientName: 'Sara Ahmadi',
    recipientPhone: '09120000000',
    province: 'Tehran',
    city: 'Tehran',
    address: 'Somewhere long enough to be a real address',
  };

  it('accepts a basket with delivery details', () => {
    expect(checkoutSchema.parse(valid).lines).toHaveLength(1);
  });

  it('refuses a line carrying its own price', () => {
    // The service reads the price from the database. A field here that looks
    // authoritative and is ignored is one somebody eventually trusts.
    expect(() =>
      checkoutSchema.parse({ ...valid, lines: [{ productId: 'p1', quantity: 1, price: '1' }] })
    ).toThrow();
  });

  it('refuses an empty basket', () => {
    expect(() => checkoutSchema.parse({ ...valid, lines: [] })).toThrow();
  });

  it('refuses a quantity of zero or below', () => {
    for (const quantity of [0, -1]) {
      expect(() =>
        checkoutSchema.parse({ ...valid, lines: [{ productId: 'p1', quantity }] })
      ).toThrow();
    }
  });

  it('caps the quantity and the number of lines', () => {
    expect(() =>
      checkoutSchema.parse({ ...valid, lines: [{ productId: 'p1', quantity: 101 }] })
    ).toThrow();
    expect(() =>
      checkoutSchema.parse({
        ...valid,
        lines: Array.from({ length: 51 }, () => ({ productId: 'p1', quantity: 1 })),
      })
    ).toThrow();
  });

  it('requires an address long enough to deliver to', () => {
    expect(() => checkoutSchema.parse({ ...valid, address: 'no 1' })).toThrow();
  });
});

describe('the payment return path', () => {
  it('accepts an ordinary in-site path', () => {
    expect(startPaymentSchema.parse({ returnPath: '/dashboard/orders' }).returnPath).toBe(
      '/dashboard/orders'
    );
  });

  it('is optional', () => {
    expect(startPaymentSchema.parse({}).returnPath).toBeUndefined();
  });

  it('refuses an absolute URL', () => {
    // The route builds the return URL from our own origin. Accepting a whole
    // URL here would be an open redirect with a live payment reference on it.
    for (const returnPath of [
      'https://evil.test/steal',
      '//evil.test/steal',
      'http://localhost:5173/ok',
      '/\\evil.test/steal',
    ]) {
      expect(() => startPaymentSchema.parse({ returnPath })).toThrow();
    }
  });

  it('refuses a path that is not a path', () => {
    for (const returnPath of ['dashboard/orders', 'javascript:alert(1)', '/a?b=c', '/a#b']) {
      expect(() => startPaymentSchema.parse({ returnPath })).toThrow();
    }
  });
});

describe('order moves', () => {
  it('accepts a seller confirming with a shipping cost', () => {
    const parsed = orderMoveSchema.parse({ to: 'CONFIRMED', shipping: '50000' });
    expect(parsed.shipping).toBe(50000n);
  });

  it('refuses PAID, which only the gateway may cause', () => {
    // Not in the enum at all: a request that could ask for PAID would be a free
    // order, and the transition table refusing it later is one layer too deep
    // for something this consequential.
    expect(() => orderMoveSchema.parse({ to: 'PAID' })).toThrow();
  });

  it('refuses PENDING, which is only ever the starting state', () => {
    expect(() => orderMoveSchema.parse({ to: 'PENDING' })).toThrow();
  });

  it('refuses unknown fields', () => {
    expect(() => orderMoveSchema.parse({ to: 'SHIPPED', status: 'DELIVERED' })).toThrow();
  });
});
