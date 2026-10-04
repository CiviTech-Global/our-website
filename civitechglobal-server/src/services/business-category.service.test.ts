import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The guild list, how it is seeded, and what a shop needs from it.
 *
 * Pinned here: the seed only ever adds (staff edits survive every deploy); the
 * list stays two levels deep; a category in use is deactivated, not deleted;
 * a shop must have a category before it is submitted; and a shop card's one
 * picture is chosen in a fixed order — its cover, its newest listing's
 * picture, its logo.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    businessCategory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      create: vi.fn(async (args: { data: { slug: string } }) => ({ id: `id-${args.data.slug}` })),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productCategory: {
      findUnique: vi.fn(),
      create: vi.fn(async (args: { data: { slug: string; kind: string } }) => ({
        id: `id-${args.data.slug}`,
        kind: args.data.kind,
      })),
    },
    business: { findFirst: vi.fn(), findMany: vi.fn(async () => []), update: vi.fn() },
    product: { findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./profile.service.js', () => ({
  authorProfileSummaries: vi.fn(async () => new Map()),
  authorProfileSummary: vi.fn(async () => null),
}));

const taxonomy = await import('./marketplace-taxonomy.service.js');
const guilds = await import('./business-category.service.js');
const shops = await import('./trademaster-shop.service.js');
const { BUSINESS_CATEGORIES, LISTING_CATEGORIES } = await import('../catalog/marketplace-taxonomy.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the category lists', () => {
  it('have unique, ASCII slugs, two levels deep', () => {
    for (const list of [BUSINESS_CATEGORIES, LISTING_CATEGORIES]) {
      const slugs = list.flatMap((node) => [node.slug, ...(node.children ?? []).map((child) => child.slug)]);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.every((slug) => /^[a-z0-9-]+$/.test(slug))).toBe(true);
    }
  });

  it('give every listing branch a kind, and cover both products and services', () => {
    expect(new Set(LISTING_CATEGORIES.map((node) => node.kind))).toEqual(new Set(['PRODUCT', 'SERVICE']));
  });
});

describe('seeding the lists', () => {
  it('creates everything on an empty database', async () => {
    mocks.prisma.businessCategory.findUnique.mockResolvedValue(null);
    mocks.prisma.productCategory.findUnique.mockResolvedValue(null);

    const created = await taxonomy.syncMarketplaceTaxonomy();

    const businessTotal = BUSINESS_CATEGORIES.reduce((n, node) => n + 1 + (node.children?.length ?? 0), 0);
    expect(created.business).toBe(businessTotal);
    expect(created.listing).toBeGreaterThan(0);
  });

  it('touches nothing that already exists, so staff edits survive a deploy', async () => {
    mocks.prisma.businessCategory.findUnique.mockResolvedValue({ id: 'exists' });
    mocks.prisma.productCategory.findUnique.mockResolvedValue({ id: 'exists', kind: 'SERVICE' });

    const created = await taxonomy.syncMarketplaceTaxonomy();

    expect(created).toEqual({ business: 0, listing: 0 });
    expect(mocks.prisma.businessCategory.create).not.toHaveBeenCalled();
    expect(mocks.prisma.businessCategory.update).not.toHaveBeenCalled();
  });

  it('files a new child under its parent with the parent’s current kind', async () => {
    // The parent exists and staff have changed its kind; the new child follows it.
    mocks.prisma.productCategory.findUnique.mockImplementation(async (args: { where: { slug: string } }) =>
      args.where.slug === LISTING_CATEGORIES[0].slug ? { id: 'parent', kind: 'SERVICE' } : null
    );
    mocks.prisma.businessCategory.findUnique.mockResolvedValue({ id: 'exists' });

    await taxonomy.syncMarketplaceTaxonomy();

    const child = mocks.prisma.productCategory.create.mock.calls
      .map((call) => call[0].data as { slug: string; kind: string; parentId?: string })
      .find((data) => data.parentId === 'parent');
    expect(child?.kind).toBe('SERVICE');
  });
});

describe('the guild desk', () => {
  it('refuses deleting a category shops are filed under', async () => {
    mocks.prisma.businessCategory.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { businesses: 3, children: 0 },
    });

    await expect(guilds.deleteBusinessCategory('c1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.businessCategory.delete).not.toHaveBeenCalled();
  });

  it('refuses a third level', async () => {
    mocks.prisma.businessCategory.findUnique.mockResolvedValue({ id: 'child', parentId: 'top' });

    await expect(
      guilds.createBusinessCategory({ name: 'نوه', parentId: 'child' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('a sector counts its trades’ shops', async () => {
    mocks.prisma.businessCategory.findMany.mockResolvedValue([
      { id: 'food', slug: 'grocery', name: 'خواربار', parentId: null, _count: { businesses: 0 } },
      { id: 'bakery', slug: 'bakery', name: 'نانوایی', parentId: 'food', _count: { businesses: 4 } },
    ]);

    const rows = await guilds.listBusinessCategories();

    expect(rows.find((row) => row.id === 'food')?.shopCount).toBe(4);
  });
});

describe('a shop and its category', () => {
  const owned = {
    id: 's1',
    code: 'SH1',
    slug: 's',
    moderationStatus: 'DRAFT',
    state: 'OPEN',
    publishedAt: null,
    logoStoredName: 'logo.png',
    coverStoredName: null,
    businessCategoryId: null,
  };

  it('cannot be submitted without a business category', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(owned);

    await expect(shops.submitShop('u1', 's1')).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });

  it('refuses a category that is switched off', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(owned);
    mocks.prisma.businessCategory.findFirst.mockResolvedValue(null);

    await expect(
      shops.updateShop('u1', 's1', { businessCategoryId: 'retired' }, { logo: null, cover: null })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('the one picture on a shop card', () => {
  const row = (id: string, cover: string | null, logo: string | null) => ({
    id,
    code: id,
    slug: id,
    name: id,
    summary: 's',
    industry: null,
    province: null,
    city: null,
    latitude: 36,
    longitude: 50,
    address: null,
    phone: null,
    website: null,
    featured: false,
    publishedAt: new Date(),
    logoStoredName: logo,
    coverStoredName: cover,
    businessCategory: null,
    ownerId: 'o',
    _count: { products: 1 },
  });

  it('is the cover, else the newest listing’s picture, else the logo', async () => {
    mocks.prisma.business.findMany.mockResolvedValueOnce([
      row('with-cover', 'c.png', 'l.png'),
      row('with-products', null, 'l.png'),
      row('logo-only', null, 'l.png'),
    ]);
    mocks.prisma.product.findMany.mockResolvedValueOnce([
      { businessId: 'with-products', images: [{ id: 'img1' }] },
    ]);
    (mocks.prisma.business as Record<string, unknown>).count = vi.fn(async () => 3);

    const page = await shops.listPublicShops({ page: 1, pageSize: 20 });
    const byId = new Map(page.items.map((item) => [item.id, item]));

    expect(byId.get('with-cover')).toMatchObject({ coverUrl: '/trademaster/shops/with-cover/cover', hasCover: true });
    expect(byId.get('with-products')).toMatchObject({ coverUrl: '/trademaster/products/images/img1', hasCover: false });
    expect(byId.get('logo-only')).toMatchObject({ coverUrl: '/trademaster/shops/logo-only/logo', hasCover: false });
  });
});
