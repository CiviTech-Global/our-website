import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The catalogue as an owner runs it, and as a buyer searches it.
 *
 * Pinned here: an owner of an approved shop publishes and edits their own
 * listings directly; the desk's "changes requested" cannot be routed around;
 * products and services are told apart and filed consistently; and the empty
 * values that used to slip through as zeros, trues and blanks are refused or
 * cleared deliberately.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    business: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      update: vi.fn(async () => ({ id: 's1', code: 'SH1', moderationStatus: 'APPROVED' })),
    },
    product: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: 'p1', code: 'PR1', slug: 'p', moderationStatus: 'DRAFT' })),
      update: vi.fn(async () => ({ id: 'p1', code: 'PR1', moderationStatus: 'APPROVED' })),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    productImage: { findFirst: vi.fn(), delete: vi.fn() },
    productVariant: { updateMany: vi.fn() },
    productCategory: { findFirst: vi.fn(), findMany: vi.fn(async () => []) },
    user: { findUnique: vi.fn(async () => ({ marketplacePaused: false })) },
    userVerification: { findUnique: vi.fn(async () => ({ status: 'APPROVED' })) },
  },
  removeFile: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./notifications.service.js', () => ({ notifySafely: mocks.notify }));
vi.mock('./profile.service.js', () => ({
  authorProfileSummaries: vi.fn(async () => new Map()),
  authorProfileSummary: vi.fn(async () => null),
}));
vi.mock('./attachment.service.js', () => ({
  IMAGE_EXTENSIONS: ['.png'],
  removeFile: mocks.removeFile,
  storeFiles: vi.fn(async () => []),
}));

const products = await import('./trademaster-product.service.js');
const shops = await import('./trademaster-shop.service.js');
const { productSchema, productBoardSchema, shopBoardSchema, shopSchema, shopUpdateSchema, variantSchema } =
  await import('../validators/trademaster.schema.js');

const OWNED = {
  id: 'p1',
  code: 'PR1',
  kind: 'PRODUCT',
  categoryId: null,
  businessId: 's1',
  moderationStatus: 'DRAFT',
  state: 'OPEN',
  publishedAt: null,
  reviewNote: null,
  business: { moderationStatus: 'APPROVED', state: 'OPEN' },
  _count: { images: 1, variants: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.userVerification.findUnique.mockResolvedValue({ status: 'APPROVED' });
  mocks.prisma.user.findUnique.mockResolvedValue({ marketplacePaused: false });
});

describe('publishing a listing', () => {
  it('goes straight onto the site for a verified owner of an approved shop', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(OWNED);

    await products.submitProduct('u1', 'p1');

    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.moderationStatus).toBe('APPROVED');
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it('keeps the first publication date when republished', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, publishedAt: new Date('2026-01-01') });

    await products.submitProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).not.toHaveProperty('publishedAt');
  });

  it('goes back to the desk when the desk asked for changes', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      ...OWNED,
      moderationStatus: 'CHANGES_REQUESTED',
      reviewNote: 'عکس واضح‌تر لازم است',
    });

    await products.submitProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toEqual({
      moderationStatus: 'PENDING_REVIEW',
    });
  });

  it('needs a picture', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, _count: { images: 0, variants: 0 } });

    await expect(products.submitProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('needs the shop to be approved and open', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      ...OWNED,
      business: { moderationStatus: 'APPROVED', state: 'CLOSED' },
    });

    await expect(products.submitProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('needs the owner to be verified', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(OWNED);
    mocks.prisma.userVerification.findUnique.mockResolvedValue({ status: 'PENDING' });

    await expect(products.submitProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });
});

describe('withdrawing a resubmission', () => {
  it('returns it to "changes requested", so it cannot then be published past the desk', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      ...OWNED,
      moderationStatus: 'PENDING_REVIEW',
      reviewNote: 'قیمت را اصلاح کنید',
    });

    await products.withdrawProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toEqual({
      moderationStatus: 'CHANGES_REQUESTED',
    });
  });
});

describe('editing a listing', () => {
  it('is allowed on a live listing', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, moderationStatus: 'APPROVED' });

    await products.updateProduct('u1', 'p1', { stock: 12, price: 90_000n });

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toMatchObject({ stock: 12, price: 90_000n });
  });

  it('is refused on one the desk rejected', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, moderationStatus: 'REJECTED' });

    await expect(products.updateProduct('u1', 'p1', { title: 'تازه' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('clears the description and the category on null', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, categoryId: 'c1' });

    await products.updateProduct('u1', 'p1', { description: null, categoryId: null });

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toMatchObject({
      description: null,
      categoryId: null,
    });
  });

  it('refuses a category of the other kind', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(OWNED);
    mocks.prisma.productCategory.findFirst.mockResolvedValue({ kind: 'SERVICE' });

    await expect(products.updateProduct('u1', 'p1', { categoryId: 'barbers' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('refuses turning a listing into a service while it is filed under a products category', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...OWNED, categoryId: 'coats' });
    mocks.prisma.productCategory.findFirst.mockResolvedValue({ kind: 'PRODUCT' });

    await expect(products.updateProduct('u1', 'p1', { kind: 'SERVICE' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('zeroes stock when a listing becomes a service', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(OWNED);

    await products.updateProduct('u1', 'p1', { kind: 'SERVICE', stock: 5 });

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toMatchObject({ kind: 'SERVICE', stock: 0 });
    expect(mocks.prisma.productVariant.updateMany).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { stock: 0 },
    });
  });
});

describe('pictures on a live listing', () => {
  it('cannot remove the last one', async () => {
    mocks.prisma.productImage.findFirst.mockResolvedValue({
      id: 'i1',
      storedName: 'a.png',
      product: { moderationStatus: 'APPROVED', _count: { images: 1 } },
    });

    await expect(products.removeImage('u1', 'i1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.productImage.delete).not.toHaveBeenCalled();
  });

  it('can remove one of several', async () => {
    mocks.prisma.productImage.findFirst.mockResolvedValue({
      id: 'i1',
      storedName: 'a.png',
      product: { moderationStatus: 'APPROVED', _count: { images: 2 } },
    });

    await products.removeImage('u1', 'i1');

    expect(mocks.prisma.productImage.delete).toHaveBeenCalled();
    expect(mocks.removeFile).toHaveBeenCalledWith('a.png');
  });
});

describe('deleting a listing', () => {
  it('removes the row and then its files', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      images: [{ storedName: 'a.png' }, { storedName: 'b.png' }],
    });

    await products.deleteProduct('u1', 'p1');

    expect(mocks.prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(mocks.removeFile.mock.calls.map((call) => call[0])).toEqual(['a.png', 'b.png']);
  });

  it('is a 404 for somebody else’s listing', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(null);

    await expect(products.deleteProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.prisma.product.delete).not.toHaveBeenCalled();
  });
});

describe('availability', () => {
  it('a service is always available', () => {
    expect(products.isAvailable('SERVICE', 0, [])).toBe(true);
  });

  it('a product with options is available when any option has stock, whatever its own says', () => {
    expect(products.isAvailable('PRODUCT', 50, [{ stock: 0 }, { stock: 0 }])).toBe(false);
    expect(products.isAvailable('PRODUCT', 0, [{ stock: 0 }, { stock: 2 }])).toBe(true);
  });

  it('a product without options goes by its own stock', () => {
    expect(products.isAvailable('PRODUCT', 0, [])).toBe(false);
    expect(products.isAvailable('PRODUCT', 1, [])).toBe(true);
  });
});

describe('the public catalogue', () => {
  it('keeps the shop filter and the province filter together', async () => {
    await products.listPublicProducts({ shopSlug: 'Barber', province: 'قزوین', page: 1, pageSize: 20 });

    // They used to be two spreads writing the same `business` key, and the
    // province silently replaced the shop.
    const where = JSON.stringify(mocks.prisma.product.findMany.mock.calls[0][0].where);
    expect(where).toContain('"slug":"barber"');
    expect(where).toContain('"province":"قزوین"');
  });

  it('finds a parent category’s children too', async () => {
    mocks.prisma.productCategory.findMany.mockResolvedValue([{ id: 'coats' }, { id: 'shirts' }]);

    await products.listPublicProducts({ categoryId: 'clothing', page: 1, pageSize: 20 });

    const where = JSON.stringify(mocks.prisma.product.findMany.mock.calls[0][0].where);
    expect(where).toContain('"categoryId":{"in":["clothing","coats","shirts"]}');
  });

  it('filters by kind', async () => {
    await products.listPublicProducts({ kind: 'SERVICE', page: 1, pageSize: 20 });

    const where = JSON.stringify(mocks.prisma.product.findMany.mock.calls[0][0].where);
    expect(where).toContain('"kind":"SERVICE"');
  });
});

describe('a shop near me', () => {
  const shopRow = (id: string, latitude: number, longitude: number) => ({
    id,
    code: id,
    slug: id,
    name: id,
    summary: 's',
    industry: null,
    province: null,
    city: null,
    latitude,
    longitude,
    featured: id === 'far',
    publishedAt: new Date(),
    logoStoredName: null,
    ownerId: 'o',
    _count: { products: 1 },
  });

  it('lists the nearest first, even ahead of a featured shop further away', async () => {
    const near = shopRow('near', 36.27, 50.005);
    const far = shopRow('far', 36.3, 50.05);
    mocks.prisma.business.findMany
      .mockResolvedValueOnce([far, near]) // the bounding-box candidates
      .mockResolvedValueOnce([far, near]); // the page itself

    const page = await shops.listPublicShops({
      latitude: 36.2688,
      longitude: 50.0041,
      radiusKm: 25,
      page: 1,
      pageSize: 20,
    });

    expect(page.items.map((shop) => shop.id)).toEqual(['near', 'far']);
    expect(page.items[0].distanceKm).toBeLessThan(page.items[1].distanceKm as number);
  });

  it('says how far the nearest shop is when the radius holds none', async () => {
    mocks.prisma.business.findMany
      .mockResolvedValueOnce([]) // nothing in the box
      .mockResolvedValueOnce([]) // the empty page
      .mockResolvedValueOnce([{ latitude: 36.2688, longitude: 50.0041 }]); // every shop

    // Tehran, about 140 km from Qazvin.
    const page = await shops.listPublicShops({
      latitude: 35.6892,
      longitude: 51.389,
      radiusKm: 10,
      page: 1,
      pageSize: 20,
    });

    expect(page.total).toBe(0);
    expect('nearestKm' in page && page.nearestKm).toBeGreaterThan(100);
  });

  it('refuses half a location', async () => {
    await expect(
      shops.listPublicShops({ latitude: 36, page: 1, pageSize: 20 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('a shop review', () => {
  it('leaves the shop’s products alone, and links the owner to their own shops', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: 's1',
      code: 'SH1',
      name: 'n',
      ownerId: 'o',
      moderationStatus: 'APPROVED',
      publishedAt: new Date(),
    });

    await shops.reviewShop('r1', 's1', 'CHANGES_REQUESTED', { reviewNote: 'نشانی کامل نیست' });

    expect(mocks.prisma.product.updateMany).not.toHaveBeenCalled();
    expect(mocks.notify.mock.calls[0][1].link).toBe('/dashboard/shops');
  });
});

describe('editing a shop', () => {
  it('clears a field sent as null', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue({
      id: 's1',
      moderationStatus: 'DRAFT',
      logoStoredName: null,
    });

    await shops.updateShop('u1', 's1', { phone: null, website: null, latitude: null, longitude: null }, { logo: null, cover: null });

    expect(mocks.prisma.business.update.mock.calls[0][0].data).toMatchObject({
      phone: null,
      website: null,
      latitude: null,
      longitude: null,
    });
  });

  it('stores a blank as null rather than an empty string', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue({
      id: 's1',
      moderationStatus: 'DRAFT',
      logoStoredName: null,
    });

    await shops.updateShop('u1', 's1', { city: '   ' }, { logo: null, cover: null });

    expect(mocks.prisma.business.update.mock.calls[0][0].data).toMatchObject({ city: null });
  });
});

describe('what the forms and the boards may send', () => {
  const product = { title: 'کت', summary: 'کت زمستانی پشمی', price: '1200000' };
  const shop = { name: 'آرایشگاه نگین', summary: 'اصلاح موی آقایان، با نوبت' };

  it('a blank query value is absent, not zero and not true', () => {
    const query = productBoardSchema.parse({ latitude: '', longitude: '', inStock: '', priceMin: '' });
    expect(query.latitude).toBeUndefined();
    expect(query.longitude).toBeUndefined();
    expect(query.inStock).toBeUndefined();
    expect(query.priceMin).toBeUndefined();
  });

  it('inStock=false means false', () => {
    expect(productBoardSchema.parse({ inStock: 'false' }).inStock).toBe(false);
    expect(productBoardSchema.parse({ inStock: 'true' }).inStock).toBe(true);
  });

  it('a radius in kilometres, Persian digits included', () => {
    expect(shopBoardSchema.parse({ latitude: '36.2', longitude: '50', radiusKm: '۲۵' }).radiusKm).toBe(25);
    expect(() => shopBoardSchema.parse({ radiusKm: '500' })).toThrow();
    expect(() => shopBoardSchema.parse({ latitude: 'north' })).toThrow();
  });

  it('a listing is a product unless it says it is a service', () => {
    expect(productSchema.parse(product).kind).toBe('PRODUCT');
    expect(productSchema.parse({ ...product, kind: 'SERVICE' }).kind).toBe('SERVICE');
    expect(() => productSchema.parse({ ...product, kind: 'BOTH' })).toThrow();
  });

  it('refuses a zero price, an empty stock and a "false" that is a string', () => {
    expect(() => productSchema.parse({ ...product, price: '0' })).toThrow();
    expect(() => productSchema.parse({ ...product, stock: '' })).toThrow();
    expect(() => productSchema.parse({ ...product, negotiable: 'false' })).toThrow();
  });

  it('reads a stock count typed in Persian digits', () => {
    expect(productSchema.parse({ ...product, stock: '۱۲' }).stock).toBe(12);
  });

  it('an emptied option price means "same as the listing"', () => {
    expect(variantSchema.parse({ label: 'بزرگ', price: '' }).price).toBeNull();
  });

  it('refuses a location given by half', () => {
    expect(() => shopSchema.parse({ ...shop, latitude: 36.2 })).toThrow();
    expect(() => shopUpdateSchema.parse({ latitude: null, longitude: 50 })).toThrow();
  });

  it('refuses a location that is not a number, rather than reading it as 0', () => {
    // NaN in the browser is null once it is JSON; null is "clear" only when
    // both halves say so, and a string is never a coordinate.
    expect(() => shopSchema.parse({ ...shop, latitude: '36.2', longitude: '50' })).toThrow();
  });

  it('an emptied optional field on an edit is a request to remove it', () => {
    const body = shopUpdateSchema.parse({ phone: '', email: '  ', website: '' });
    expect(body).toEqual({ phone: null, email: null, website: null });
  });

  it('a phone number in Persian digits is a phone number', () => {
    expect(shopSchema.parse({ ...shop, phone: '۰۲۸-۳۳۲۲۱۱۰۰' }).phone).toBe('028-33221100');
    expect(() => shopSchema.parse({ ...shop, phone: 'call me' })).toThrow();
  });
});
