import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The rules the category desk enforces.
 *
 * Three of them matter enough to pin: a category is never deleted out from
 * under the products filed in it, the tree never grows a level no screen can
 * render, and "leave the parent alone" is not the same instruction as "move
 * this to the top level". The last one has no visible symptom until somebody
 * renames a parent and its whole branch quietly detaches.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    productCategory: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(),
      create: vi.fn(async () => ({ id: 'new' })),
      update: vi.fn(async () => ({ id: 'c1' })),
      delete: vi.fn(async () => ({ id: 'c1' })),
    },
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));

const { createCategory, deleteCategory, listCategoriesForAdmin, updateCategory } = await import(
  './trademaster-category.service.js'
);

/** What findUnique returns for a category that exists. */
function category(over: Record<string, unknown> = {}) {
  return { id: 'c1', name: 'خانه و آشپزخانه', parentId: null, ...over };
}

/** What findUnique returns when the delete path asks for the counts. */
function counted(products: number, children: number) {
  return { id: 'c1', _count: { products, children } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.productCategory.findFirst.mockResolvedValue(null);
});

describe('creating a category', () => {
  it('derives a slug from the name, so the desk types a name and not an identifier', async () => {
    await createCategory({ name: '  Home and Kitchen  ' });

    const { data } = mocks.prisma.productCategory.create.mock.calls[0][0];
    expect(data.name).toBe('Home and Kitchen');
    expect(data.slug).toBe('home-and-kitchen');
  });

  it('suffixes a slug somebody already holds rather than refusing the name', async () => {
    // Free only on the second attempt.
    mocks.prisma.productCategory.findFirst
      .mockResolvedValueOnce({ id: 'taken' })
      .mockResolvedValueOnce(null);

    await createCategory({ name: 'Home' });

    expect(mocks.prisma.productCategory.create.mock.calls[0][0].data.slug).toBe('home-2');
  });

  it('lands at the end of its siblings', async () => {
    // findFirst is asked twice: once for the slug, once for the last position.
    mocks.prisma.productCategory.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ position: 4 });

    await createCategory({ name: 'Garden' });

    expect(mocks.prisma.productCategory.create.mock.calls[0][0].data.position).toBe(5);
  });

  it('refuses a parent that is itself a child, because nothing renders a third level', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue({ id: 'p1', parentId: 'grandparent' });

    await expect(createCategory({ name: 'Knives', parentId: 'p1' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mocks.prisma.productCategory.create).not.toHaveBeenCalled();
  });

  it('refuses a parent that does not exist', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(null);

    await expect(createCategory({ name: 'Knives', parentId: 'ghost' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('editing a category', () => {
  it('leaves the parent alone when the caller did not send one', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(category({ parentId: 'p1' }));

    await updateCategory('c1', { name: 'Kitchen' });

    // Not merely "the right value": the key is absent, so the update cannot
    // write a parent at all. A rename must not be able to move anything.
    const { data } = mocks.prisma.productCategory.update.mock.calls[0][0];
    expect(data).not.toHaveProperty('parentId');
    expect(data.name).toBe('Kitchen');
  });

  it('moves a category to the top level when the caller sends null', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(category({ parentId: 'p1' }));

    await updateCategory('c1', { parentId: null });

    expect(mocks.prisma.productCategory.update.mock.calls[0][0].data.parentId).toBeNull();
  });

  it('refuses to make a category its own parent', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(category());

    await expect(updateCategory('c1', { parentId: 'c1' })).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.prisma.productCategory.update).not.toHaveBeenCalled();
  });

  it('is a 404 for a category that is not there', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(null);

    await expect(updateCategory('ghost', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('keeps the current name when an empty slug is sent, rather than writing an empty one', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(category({ name: 'Garden' }));

    await updateCategory('c1', { slug: '   ' });

    expect(mocks.prisma.productCategory.update.mock.calls[0][0].data.slug).toBe('garden');
  });
});

describe('deleting a category', () => {
  it('refuses while products are filed in it, and says how many', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(counted(30, 0));

    // The database would accept this — the relation is onDelete: SetNull — and
    // silently uncategorise all thirty. That is why the service checks.
    await expect(deleteCategory('c1')).rejects.toMatchObject({ statusCode: 409 });
    await expect(deleteCategory('c1')).rejects.toThrow(/30/);
    expect(mocks.prisma.productCategory.delete).not.toHaveBeenCalled();
  });

  it('refuses while it has children, which would otherwise be reparented to the root', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(counted(0, 3));

    await expect(deleteCategory('c1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.productCategory.delete).not.toHaveBeenCalled();
  });

  it('goes ahead when nothing points at it', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(counted(0, 0));

    await expect(deleteCategory('c1')).resolves.toEqual({ id: 'c1' });
    expect(mocks.prisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('is a 404 for a category that is not there', async () => {
    mocks.prisma.productCategory.findUnique.mockResolvedValue(null);

    await expect(deleteCategory('ghost')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('the desk listing', () => {
  it('counts every product, not only the published ones', async () => {
    mocks.prisma.productCategory.findMany.mockResolvedValue([
      { id: 'c1', name: 'Home', _count: { products: 30, children: 2 } },
    ]);

    const [row] = await listCategoriesForAdmin();

    // The public list counts what a visitor can see; somebody deciding whether
    // to deactivate needs the drafts in the number too.
    expect(row.productCount).toBe(30);
    expect(row.childCount).toBe(2);
    expect(mocks.prisma.productCategory.findMany.mock.calls[0][0].select._count).toEqual({
      select: { products: true, children: true },
    });
  });

  it('includes categories that are switched off', async () => {
    await listCategoriesForAdmin();

    // No `where` at all — an `active: true` filter here would hide exactly the
    // rows the desk opened this screen to turn back on.
    expect(mocks.prisma.productCategory.findMany.mock.calls[0][0]).not.toHaveProperty('where');
  });
});
