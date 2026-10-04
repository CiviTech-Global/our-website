import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { slugify } from './trademaster-common.js';

/**
 * Business categories: what kind of business a shop is (the guild list).
 *
 * The same shape and rules as the listing categories next door — two levels,
 * staff-maintained, deactivate rather than delete — because a staff member who
 * has learned one desk should not have to learn the other.
 */

const ADMIN_SELECT = {
  id: true,
  slug: true,
  name: true,
  parentId: true,
  position: true,
  active: true,
  createdAt: true,
} as const;

export interface BusinessCategoryInput {
  name: string;
  slug?: string;
  parentId?: string | null;
  position?: number;
  active?: boolean;
}

/**
 * The public list, with how many public shops are in each branch.
 *
 * A sector counts its trades' shops too, because choosing the sector finds
 * them; "Food (0)" above "Bakery (4)" would be a sector nobody clicks.
 */
export async function listBusinessCategories() {
  const rows = await prisma.businessCategory.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      _count: { select: { businesses: { where: PUBLIC_LISTING_WHERE } } },
    },
  });

  const childTotals = new Map<string, number>();
  for (const row of rows) {
    if (row.parentId) {
      childTotals.set(row.parentId, (childTotals.get(row.parentId) ?? 0) + row._count.businesses);
    }
  }

  return rows.map(({ _count, ...row }) => ({
    ...row,
    shopCount: _count.businesses + (childTotals.get(row.id) ?? 0),
  }));
}

/** A category and its active children, as ids — what filtering by it means. */
export async function businessCategoryScope(categoryId: string): Promise<string[]> {
  const children = await prisma.businessCategory.findMany({
    where: { parentId: categoryId, active: true },
    select: { id: true },
  });
  return [categoryId, ...children.map((child) => child.id)];
}

/** Refuses a category a shop cannot be filed under. */
export async function assertBusinessCategoryUsable(categoryId: string): Promise<void> {
  const category = await prisma.businessCategory.findFirst({
    where: { id: categoryId, active: true },
    select: { id: true },
  });
  if (!category) throw new AppError('صنف انتخاب‌شده معتبر نیست.', 400);
}

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

export async function listBusinessCategoriesForAdmin() {
  const rows = await prisma.businessCategory.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { ...ADMIN_SELECT, _count: { select: { businesses: true, children: true } } },
  });
  return rows.map(({ _count, ...row }) => ({
    ...row,
    shopCount: _count.businesses,
    childCount: _count.children,
  }));
}

export async function createBusinessCategory(input: BusinessCategoryInput) {
  const name = input.name.trim();
  const parentId = await resolveParent(input.parentId ?? null, null);
  return prisma.businessCategory.create({
    data: {
      name,
      slug: await uniqueSlug(input.slug?.trim() || name),
      parentId,
      position: input.position ?? (await nextPosition(parentId)),
      active: input.active ?? true,
    },
    select: ADMIN_SELECT,
  });
}

export async function updateBusinessCategory(id: string, input: Partial<BusinessCategoryInput>) {
  const current = await prisma.businessCategory.findUnique({
    where: { id },
    select: { id: true, name: true, parentId: true },
  });
  if (!current) throw new AppError('صنف یافت نشد.', 404);

  // Absent leaves the parent alone; null moves it to the top level.
  const parentId =
    input.parentId === undefined ? current.parentId : await resolveParent(input.parentId, current.id);

  return prisma.businessCategory.update({
    where: { id: current.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined
        ? { slug: await uniqueSlug(input.slug.trim() || current.name, current.id) }
        : {}),
      ...(input.parentId !== undefined ? { parentId } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    select: ADMIN_SELECT,
  });
}

/**
 * Refused while anything points at it. The foreign keys would accept it and
 * quietly uncategorise every shop in it; deactivating is the answer nearly
 * every time, and keeps those shops' classification.
 */
export async function deleteBusinessCategory(id: string) {
  const category = await prisma.businessCategory.findUnique({
    where: { id },
    select: { id: true, _count: { select: { businesses: true, children: true } } },
  });
  if (!category) throw new AppError('صنف یافت نشد.', 404);

  const { businesses, children } = category._count;
  if (businesses > 0) {
    throw new AppError(`${businesses} فروشگاه در این صنف ثبت شده است. برای پنهان کردن آن، غیرفعالش کنید.`, 409);
  }
  if (children > 0) {
    throw new AppError(`این صنف ${children} زیرشاخه دارد. ابتدا آن‌ها را جابه‌جا یا حذف کنید.`, 409);
  }

  await prisma.businessCategory.delete({ where: { id: category.id } });
  return { id: category.id };
}

/** Two levels at most, no self-parenting, and a parent with children cannot become a child. */
async function resolveParent(parentId: string | null, selfId: string | null): Promise<string | null> {
  if (parentId === null) return null;
  if (selfId !== null && parentId === selfId) {
    throw new AppError('یک صنف نمی‌تواند والد خودش باشد.', 400);
  }
  const parent = await prisma.businessCategory.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  if (!parent) throw new AppError('گروه والد یافت نشد.', 400);
  if (parent.parentId !== null) throw new AppError('اصناف حداکثر در دو سطح تعریف می‌شوند.', 400);
  if (selfId !== null) {
    const children = await prisma.businessCategory.count({ where: { parentId: selfId } });
    if (children > 0) throw new AppError('گروهی که زیرشاخه دارد نمی‌تواند زیرمجموعهٔ گروه دیگری شود.', 400);
  }
  return parent.id;
}

async function nextPosition(parentId: string | null): Promise<number> {
  const last = await prisma.businessCategory.findFirst({
    where: { parentId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

async function uniqueSlug(source: string, excludeId?: string): Promise<string> {
  const base = slugify(source) || 'business';
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.businessCategory.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
