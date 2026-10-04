import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { JOB_CATEGORIES } from '../catalog/job-taxonomy.js';

/**
 * The job categories: seeding them, reading them, and checking a choice.
 *
 * Seeding follows the marketplace lists exactly — additive and idempotent, a
 * category is created only when its slug is missing, and nothing staff have
 * renamed, reordered or switched off is touched.
 */
export async function syncJobTaxonomy(): Promise<number> {
  let created = 0;

  for (const [position, node] of JOB_CATEGORIES.entries()) {
    let parent = await prisma.jobCategory.findUnique({ where: { slug: node.slug }, select: { id: true } });
    if (!parent) {
      parent = await prisma.jobCategory.create({
        data: { slug: node.slug, name: node.name, nameEn: node.nameEn, position },
        select: { id: true },
      });
      created += 1;
    }
    for (const [childPosition, child] of (node.children ?? []).entries()) {
      const exists = await prisma.jobCategory.findUnique({ where: { slug: child.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.jobCategory.create({
        data: {
          slug: child.slug,
          name: child.name,
          nameEn: child.nameEn,
          parentId: parent.id,
          position: childPosition,
        },
      });
      created += 1;
    }
  }

  return created;
}

/**
 * The active categories as a flat list, parents before their children.
 *
 * Flat with parentId rather than nested: every screen that uses it either
 * renders a grouped <select> or looks one up by id, and both are simpler
 * from a flat list. A child whose parent is switched off is left out with it.
 */
export async function listJobCategories() {
  const rows = await prisma.jobCategory.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      parentId: true,
      position: true,
      _count: { select: { jobs: true } },
    },
  });

  const activeIds = new Set(rows.map((row) => row.id));
  const parents = rows.filter((row) => row.parentId === null);
  return parents.flatMap((parent) => [
    parent,
    ...rows.filter((row) => row.parentId === parent.id && activeIds.has(parent.id)),
  ]);
}

/**
 * A category id to filter on, with everything under it.
 *
 * Choosing "IT & software" should find a web developer, filed under its child.
 * An unknown id matches nothing rather than everything — a stale link should
 * say "no results", not quietly show the whole board as if it were filtered.
 */
export async function jobCategoryScope(id: string): Promise<string[]> {
  const category = await prisma.jobCategory.findUnique({
    where: { id },
    select: { id: true, children: { where: { active: true }, select: { id: true } } },
  });
  if (!category) return ['__none__'];
  return [category.id, ...category.children.map((child) => child.id)];
}

/** A posting may be filed under any active category, at either level. */
export async function assertJobCategoryUsable(id: string): Promise<void> {
  const category = await prisma.jobCategory.findUnique({ where: { id }, select: { active: true } });
  if (!category?.active) throw new AppError('این دسته‌بندی شغلی پیدا نشد.', 400);
}

export async function findJobCategoryBySlug(slug: string) {
  return prisma.jobCategory.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, name: true, nameEn: true, parentId: true },
  });
}
