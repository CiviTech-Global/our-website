import { prisma } from '../config/database.js';
import { BUSINESS_CATEGORIES, LISTING_CATEGORIES } from '../catalog/marketplace-taxonomy.js';

/**
 * Put the marketplace's two category lists into the database.
 *
 * Additive and idempotent: a category is created only when its slug is not
 * there yet. Nothing that exists is renamed, moved, reordered or reactivated,
 * because once a list is live it belongs to the staff who maintain it from the
 * admin desk, and a deploy quietly undoing their edits would be a deploy
 * nobody could trust. Removing an entry from the source file therefore removes
 * nothing; retiring a category is done from the desk.
 *
 * Children are created under their parent as found by slug, so a parent staff
 * have renamed still receives any new children the file adds.
 */
export async function syncMarketplaceTaxonomy(): Promise<{ business: number; listing: number }> {
  let business = 0;
  let listing = 0;

  for (const [position, node] of BUSINESS_CATEGORIES.entries()) {
    let parent = await prisma.businessCategory.findUnique({ where: { slug: node.slug }, select: { id: true } });
    if (!parent) {
      parent = await prisma.businessCategory.create({
        data: { slug: node.slug, name: node.name, position },
        select: { id: true },
      });
      business += 1;
    }
    for (const [childPosition, child] of (node.children ?? []).entries()) {
      const exists = await prisma.businessCategory.findUnique({ where: { slug: child.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.businessCategory.create({
        data: { slug: child.slug, name: child.name, parentId: parent.id, position: childPosition },
      });
      business += 1;
    }
  }

  for (const [position, node] of LISTING_CATEGORIES.entries()) {
    let parent = await prisma.productCategory.findUnique({
      where: { slug: node.slug },
      select: { id: true, kind: true },
    });
    if (!parent) {
      parent = await prisma.productCategory.create({
        data: { slug: node.slug, name: node.name, kind: node.kind, position },
        select: { id: true, kind: true },
      });
      listing += 1;
    }
    for (const [childPosition, child] of (node.children ?? []).entries()) {
      const exists = await prisma.productCategory.findUnique({ where: { slug: child.slug }, select: { id: true } });
      if (exists) continue;
      await prisma.productCategory.create({
        data: {
          slug: child.slug,
          name: child.name,
          // The parent's kind as it is now, which staff may have changed.
          kind: parent.kind,
          parentId: parent.id,
          position: childPosition,
        },
      });
      listing += 1;
    }
  }

  return { business, listing };
}
