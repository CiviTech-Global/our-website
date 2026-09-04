import { insuranceProductRepository } from '../database/prisma/repositories/insurance-product.repository.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Read side of the catalog.
 *
 * These endpoints are public and hit on every visit to the insurance section,
 * so they serve the seeded database rows rather than importing the catalog
 * module — the rows carry the same content, and going through Prisma keeps the
 * `active` filtering in one place instead of duplicating it here.
 */

export async function getCatalog() {
  return insuranceProductRepository.findCatalog();
}

export async function getAllProducts() {
  return insuranceProductRepository.findAllActive();
}

export async function getProductBySlug(slug: string) {
  const product = await insuranceProductRepository.findBySlug(slug);
  if (!product) throw new AppError('Insurance product not found', 404);
  return product;
}
