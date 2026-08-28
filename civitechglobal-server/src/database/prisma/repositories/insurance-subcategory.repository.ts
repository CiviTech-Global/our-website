import { prisma } from '../../../config/database.js';

const subcategoryDelegate = prisma.insuranceSubcategory;

export const insuranceSubcategoryRepository = {
  findByCategoryId: (categoryId: string) => {
    return subcategoryDelegate.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    });
  },

  findById: (id: string) => {
    return subcategoryDelegate.findUnique({ where: { id } });
  },
};
