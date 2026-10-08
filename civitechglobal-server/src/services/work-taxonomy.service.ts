import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { WORK_CATEGORIES } from '../catalog/work-taxonomy.js';

/**
 * The freelance work categories: seeding them, reading them, checking a choice.
 *
 * The same rules as the job categories: additive and idempotent, a category is
 * created only when its slug is missing, and nothing staff have renamed,
 * reordered or switched off is touched.
 */
export async function syncWorkTaxonomy(): Promise<number> {
  let created = 0;

  for (const [position, node] of WORK_CATEGORIES.entries()) {
    let parent = await prisma.workCategory.findUnique({ where: { slug: node.slug }, select: { id: true } });
    if (!parent) {
      parent = await prisma.workCategory.create({
        data: { slug: node.slug, name: node.name, nameEn: node.nameEn, position },
        select: { id: true },
      });
      created += 1;
    }
    for (const [childPosition, child] of (node.children ?? []).entries()) {
      const exists = await prisma.workCategory.findUnique({ where: { slug: child.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.workCategory.create({
        data: { slug: child.slug, name: child.name, nameEn: child.nameEn, parentId: parent.id, position: childPosition },
      });
      created += 1;
    }
  }

  return created;
}

/**
 * The active categories as a flat list, parents before their children, with
 * how many open projects and live services each holds — the board's category
 * menu shows the counts, as Fiverr's and Freelancer's do.
 */
export async function listWorkCategories() {
  const rows = await prisma.workCategory.findMany({
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
          projects: { where: { moderationStatus: 'APPROVED', state: 'OPEN', visibility: 'PUBLIC' } },
          services: { where: { moderationStatus: 'APPROVED', state: 'ACTIVE' } },
        },
      },
    },
  });

  const parents = rows.filter((row) => row.parentId === null);
  return parents.flatMap((parent) => {
    const children = rows.filter((row) => row.parentId === parent.id);
    // A group's count is its own plus everything filed under it.
    const total = (key: 'projects' | 'services') =>
      parent._count[key] + children.reduce((sum, child) => sum + child._count[key], 0);
    return [
      { ...parent, projectCount: total('projects'), serviceCount: total('services') },
      ...children.map((child) => ({
        ...child,
        projectCount: child._count.projects,
        serviceCount: child._count.services,
      })),
    ].map(({ _count, ...row }) => row);
  });
}

/**
 * A category id to filter on, with everything under it. An unknown id
 * matches nothing rather than everything, as for jobs.
 */
export async function workCategoryScope(id: string): Promise<string[]> {
  const category = await prisma.workCategory.findUnique({
    where: { id },
    select: { id: true, children: { where: { active: true }, select: { id: true } } },
  });
  if (!category) return ['__none__'];
  return [category.id, ...category.children.map((child) => child.id)];
}

export async function assertWorkCategoryUsable(id: string): Promise<void> {
  const category = await prisma.workCategory.findUnique({ where: { id }, select: { active: true } });
  if (!category?.active) throw new AppError('این دسته‌بندی پیدا نشد.', 400);
}

export async function findWorkCategoryBySlug(slug: string) {
  return prisma.workCategory.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, name: true, nameEn: true, parentId: true },
  });
}
