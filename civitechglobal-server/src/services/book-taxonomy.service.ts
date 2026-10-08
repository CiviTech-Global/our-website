import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { BOOK_CATEGORIES } from '../catalog/book-taxonomy.js';

/**
 * The book shelves: seeding them, reading them, checking a choice.
 *
 * The same rules as the job and work categories: additive and idempotent, a
 * shelf is created only when its slug is missing, and nothing staff have
 * renamed, reordered or switched off is touched.
 */
export async function syncBookTaxonomy(): Promise<number> {
  let created = 0;

  for (const [position, node] of BOOK_CATEGORIES.entries()) {
    let parent = await prisma.bookCategory.findUnique({ where: { slug: node.slug }, select: { id: true } });
    if (!parent) {
      parent = await prisma.bookCategory.create({
        data: { slug: node.slug, name: node.name, nameEn: node.nameEn, position },
        select: { id: true },
      });
      created += 1;
    }
    for (const [childPosition, child] of (node.children ?? []).entries()) {
      const exists = await prisma.bookCategory.findUnique({ where: { slug: child.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.bookCategory.create({
        data: { slug: child.slug, name: child.name, nameEn: child.nameEn, parentId: parent.id, position: childPosition },
      });
      created += 1;
    }
  }

  return created;
}

/**
 * The active shelves as a flat list, parents before their children, each with
 * how many books on it have a copy for sale — the board's menu shows it.
 */
export async function listBookCategories() {
  const rows = await prisma.bookCategory.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      parentId: true,
      position: true,
      _count: {
        select: {
          books: { where: { listings: { some: { moderationStatus: 'APPROVED', state: 'OPEN' } } } },
        },
      },
    },
  });

  const parents = rows.filter((row) => row.parentId === null);
  return parents.flatMap((parent) => {
    const children = rows.filter((row) => row.parentId === parent.id);
    const total = parent._count.books + children.reduce((sum, child) => sum + child._count.books, 0);
    return [
      { ...parent, bookCount: total },
      ...children.map((child) => ({ ...child, bookCount: child._count.books })),
    ].map(({ _count, ...row }) => row);
  });
}

/** A shelf id to filter on, with everything under it. An unknown id matches nothing. */
export async function bookCategoryScope(id: string): Promise<string[]> {
  const category = await prisma.bookCategory.findUnique({
    where: { id },
    select: { id: true, children: { where: { active: true }, select: { id: true } } },
  });
  if (!category) return ['__none__'];
  return [category.id, ...category.children.map((child) => child.id)];
}

export async function assertBookCategoryUsable(id: string): Promise<void> {
  const category = await prisma.bookCategory.findUnique({ where: { id }, select: { active: true } });
  if (!category?.active) throw new AppError('این دسته‌بندی پیدا نشد.', 400);
}

export async function findBookCategoryBySlug(slug: string) {
  return prisma.bookCategory.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, name: true, nameEn: true, parentId: true },
  });
}
