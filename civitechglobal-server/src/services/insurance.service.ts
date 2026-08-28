import { insuranceCategoryRepository } from '../database/prisma/repositories/insurance-category.repository.js';

export async function getAllCategories() {
  return insuranceCategoryRepository.findAll();
}
