// The bot re-uses the same repository layer as the REST API — a single
// source of truth for how the insurance catalog is fetched.
import { insuranceProductRepository } from '../../database/prisma/repositories/insurance-product.repository.js';

export const insuranceService = {
  /** Active categories, each with its active products, ordered for display. */
  getCatalog: () => insuranceProductRepository.findCatalog(),
  getProductBySlug: (slug: string) => insuranceProductRepository.findBySlug(slug),
};
