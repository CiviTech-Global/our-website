import { prisma } from '../../../config/database.js';

const categoryDelegate = prisma.insuranceCategory;

export const insuranceCategoryRepository = {
  findAll: () => {
    return categoryDelegate.findMany({
      include: { subcategories: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  findById: (id: string) => {
    return categoryDelegate.findUnique({
      where: { id },
      include: { subcategories: { orderBy: { createdAt: 'asc' } } },
    });
  },
};
