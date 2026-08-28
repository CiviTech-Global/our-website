// The bot re-uses the same repository layer as the REST API — a single
// source of truth for how insurance categories/subcategories are fetched.
import { insuranceCategoryRepository } from '../../database/prisma/repositories/insurance-category.repository.js';
import { insuranceSubcategoryRepository } from '../../database/prisma/repositories/insurance-subcategory.repository.js';

export const insuranceService = {
  getAllCategories: () => insuranceCategoryRepository.findAll(),
  getCategoryById: (id: string) => insuranceCategoryRepository.findById(id),
  getSubcategoriesByCategoryId: (categoryId: string) => insuranceSubcategoryRepository.findByCategoryId(categoryId),
  getSubcategoryById: (id: string) => insuranceSubcategoryRepository.findById(id),
};
