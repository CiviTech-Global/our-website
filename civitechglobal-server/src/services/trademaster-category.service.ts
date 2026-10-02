import type { ListingKind } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { slugify } from './trademaster-common.js';

/**
 * The catalogue's categories.
 *
 * A small editorial tree, maintained by staff rather than by sellers: a seller
 * who can invent categories invents twelve spellings of "لوازم خانگی" in a
 * month, and the filter on the product board stops being useful. Sellers pick
 * from this list; only the TradeMaster desk changes it.
 *
 * One level of nesting is what the rest of the module is written for — the
 * board shows parents with their children under them — but the schema is a
 * self-relation, so the depth rule lives here rather than in the database. See
 * resolveParent below for what it refuses and why.
 *
 * KIND. Every category is either for products or for services, and a branch is
 * one or the other: the kind is chosen on a top-level category and its children
 * inherit it. A services branch with a "Coats" leaf in it would show coats
 * under the services tab, which is the confusion the split exists to remove.
 */

const ADMIN_SELECT = {
  id: true,
  slug: true,
  name: true,
  kind: true,
  parentId: true,
  position: true,
  active: true,
  createdAt: true,
} as const;

export interface CategoryInput {
  name: string;
  /** Top-level only; a child takes its parent's. */
  kind?: ListingKind;
  slug?: string;
  parentId?: string | null;
  position?: number;
  active?: boolean;
}

/**
 * Everything, including what is switched off.
 *
 * The count is of ALL products, not only the published ones the public list
 * counts. Somebody about to deactivate a category needs to know that thirty
 * products point at it, including the drafts — the public count would say
 * four and make the decision look harmless.
 */
export async function listCategoriesForAdmin() {
  const rows = await prisma.productCategory.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      ...ADMIN_SELECT,
      _count: { select: { products: true, children: true } },
    },
  });

  return rows.map(({ _count, ...row }) => ({
    ...row,
    productCount: _count.products,
    childCount: _count.children,
  }));
}

export async function createCategory(input: CategoryInput) {
  const name = input.name.trim();
  const parent = await resolveParent(input.parentId ?? null, null);

  return prisma.productCategory.create({
    data: {
      name,
      // A child is whatever its parent is; the kind the caller sent is only
      // honoured at the top of a branch.
      kind: parent?.kind ?? input.kind ?? 'PRODUCT',
      slug: await uniqueSlug(input.slug?.trim() || name),
      parentId: parent?.id ?? null,
      position: input.position ?? (await nextPosition(parent?.id ?? null)),
      active: input.active ?? true,
    },
    select: ADMIN_SELECT,
  });
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const current = await byId(id);

  // Only when the caller actually sent one: `parentId: undefined` means "leave
  // it", and `parentId: null` means "move it to the top level". Collapsing
  // those two into one check is how an edit of the name quietly unparents a
  // whole branch.
  const parent =
    input.parentId === undefined ? undefined : await resolveParent(input.parentId, current.id);
  const parentId = parent === undefined ? current.parentId : (parent?.id ?? null);

  // The kind it will have afterwards. A child follows its parent whatever was
  // sent; a top-level category takes the one sent, or keeps its own.
  const kind: ListingKind = parent
    ? parent.kind
    : parent === null || !current.parentId
      ? (input.kind ?? current.kind)
      : current.kind;

  if (kind !== current.kind) await assertKindChangeable(current.id, kind);

  const updated = await prisma.productCategory.update({
    where: { id: current.id },
    data: {
      kind,
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

  // The branch moves together. assertKindChangeable has already checked that
  // nothing filed under the children would end up on the wrong side.
  if (kind !== current.kind) {
    await prisma.productCategory.updateMany({ where: { parentId: current.id }, data: { kind } });
  }

  return updated;
}

/**
 * Whether a category, and its children, may become the other kind.
 *
 * Refused while listings of the old kind are filed there. Converting them as
 * well would turn a seller's coats into services behind their back; leaving
 * them would put coats under a services category. Naming the count lets staff
 * move them first.
 */
async function assertKindChangeable(categoryId: string, kind: ListingKind): Promise<void> {
  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  const mismatched = await prisma.product.count({
    where: {
      categoryId: { in: [categoryId, ...children.map((child) => child.id)] },
      kind: { not: kind },
    },
  });
  if (mismatched > 0) {
    throw new AppError(
      `${mismatched} مورد از نوع دیگر در این شاخه ثبت شده است. ابتدا دستهٔ آن‌ها را تغییر دهید.`,
      409
    );
  }
}

/**
 * Deleting is refused while anything points at the category.
 *
 * The schema says `onDelete: SetNull` for both products and children, so the
 * database would accept this and quietly uncategorise every product and
 * reparent every child to the top level. That is a destructive edit wearing
 * the clothes of a tidy-up, and there is no undo for it, so the service says
 * no and names the count. Deactivating is the answer nearly every time: an
 * inactive category disappears from the public board and from the seller's
 * picker, and the products keep their classification.
 */
export async function deleteCategory(id: string) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true, children: true } } },
  });
  if (!category) throw new AppError('دسته‌بندی یافت نشد.', 404);

  const { products, children } = category._count;
  if (products > 0) {
    throw new AppError(
      `این دسته‌بندی به ${products} کالا متصل است. برای پنهان کردن آن، غیرفعالش کنید.`,
      409
    );
  }
  if (children > 0) {
    throw new AppError(
      `این دسته‌بندی ${children} زیرشاخه دارد. ابتدا آن‌ها را جابه‌جا یا حذف کنید.`,
      409
    );
  }

  await prisma.productCategory.delete({ where: { id: category.id } });
  return { id: category.id };
}

// ---------------------------------------------------------------------------

async function byId(id: string) {
  const row = await prisma.productCategory.findUnique({
    where: { id },
    select: { id: true, name: true, parentId: true, kind: true },
  });
  if (!row) throw new AppError('دسته‌بندی یافت نشد.', 404);
  return row;
}

/**
 * Validates a proposed parent, and returns it.
 *
 * Three ways this goes wrong, and all three are refused rather than corrected:
 * a parent that does not exist, a category made its own parent, and a parent
 * that is itself a child. The last one is the depth rule — without it the tree
 * grows a third level that no screen renders, so the category becomes
 * invisible rather than merely misplaced.
 *
 * The depth cap is also what makes a cycle impossible: a cycle needs every
 * node in it to have a parent, and the cap means the top of any chain does
 * not. So there is no walk up the ancestors here. If the cap is ever lifted,
 * that walk becomes necessary, and this comment is where to start.
 */
async function resolveParent(
  parentId: string | null,
  selfId: string | null
): Promise<{ id: string; kind: ListingKind } | null> {
  if (parentId === null) return null;

  if (selfId !== null && parentId === selfId) {
    throw new AppError('یک دسته‌بندی نمی‌تواند والد خودش باشد.', 400);
  }

  const parent = await prisma.productCategory.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true, kind: true },
  });
  if (!parent) throw new AppError('دستهٔ والد یافت نشد.', 400);

  if (parent.parentId !== null) {
    throw new AppError('دسته‌بندی حداکثر در دو سطح تعریف می‌شود.', 400);
  }

  // A category that has children cannot become a child itself: that would be
  // the third level the depth rule forbids, reached from the other end.
  if (selfId !== null) {
    const children = await prisma.productCategory.count({ where: { parentId: selfId } });
    if (children > 0) {
      throw new AppError('دسته‌ای که زیرشاخه دارد نمی‌تواند زیرمجموعهٔ دستهٔ دیگری شود.', 400);
    }
  }

  return { id: parent.id, kind: parent.kind };
}

/** At the end of its siblings, so a new category does not jump the order. */
async function nextPosition(parentId: string | null): Promise<number> {
  const last = await prisma.productCategory.findFirst({
    where: { parentId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

/**
 * Unique globally, because the slug is the whole address of a category page.
 *
 * Suffixed rather than refused, like every other slug in this codebase: the
 * staff member typed a name, not an identifier, and "that name is taken" is a
 * poor answer when a numbered variant is free.
 */
async function uniqueSlug(source: string, excludeId?: string): Promise<string> {
  const base = slugify(source) || 'category';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.productCategory.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
