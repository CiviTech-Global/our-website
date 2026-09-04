import { prisma } from '../../../config/database.js';
import type { Prisma } from '@prisma/client';

const productDelegate = prisma.insuranceProduct;
const categoryDelegate = prisma.insuranceCategory;

/** Everything the public catalog page needs, and nothing it does not. */
const publicProductSelect = {
  id: true,
  slug: true,
  title: true,
  titleEn: true,
  summary: true,
  summaryEn: true,
  intakeMode: true,
  audience: true,
  icon: true,
  displayOrder: true,
} satisfies Prisma.InsuranceProductSelect;

export const insuranceProductRepository = {
  /**
   * Active categories with their active products, ordered for display.
   *
   * Inactive rows are the pre-refactor categories and any withdrawn product:
   * both still exist so old requests render, neither should be offered for sale.
   */
  findCatalog: () => {
    return categoryDelegate.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        emoji: true,
        icon: true,
        displayOrder: true,
        products: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
          select: publicProductSelect,
        },
      },
    });
  },

  findAllActive: () => {
    return productDelegate.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }],
      select: { ...publicProductSelect, category: { select: { slug: true, title: true, titleEn: true } } },
    });
  },

  /** Full detail including the form schema — the product page and the form. */
  findBySlug: (slug: string) => {
    return productDelegate.findFirst({
      where: { slug, active: true },
      include: { category: { select: { id: true, slug: true, title: true, titleEn: true, emoji: true } } },
    });
  },

  /** By id, ignoring `active`, for rendering a request against a withdrawn product. */
  findById: (id: string) => {
    return productDelegate.findUnique({ where: { id } });
  },
};
