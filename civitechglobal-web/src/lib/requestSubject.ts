import type { InsuranceRequest } from '@/types/requests';
import type { Locale } from '@/i18n/LocaleProvider';

/**
 * What is this enquiry about?
 *
 * Two eras of data live in one table. A website request names a catalog
 * product; a request collected before the refactor names a category and a
 * subcategory from the taxonomy that preceded it. Rather than let every screen
 * remember to check both, the fallback lives here once.
 */
export function describeRequestSubject(request: InsuranceRequest, locale: Locale): string {
  if (request.product) {
    return locale === 'fa' ? request.product.title : request.product.titleEn;
  }

  const parts = [request.category?.title, request.subcategory?.title].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

/** The category label, from whichever of the two shapes carries it. */
export function describeRequestCategory(request: InsuranceRequest, locale: Locale): string | null {
  if (request.product) {
    return locale === 'fa' ? request.product.category.title : request.product.category.titleEn;
  }
  return request.category?.title ?? null;
}

export function requestCategoryEmoji(request: InsuranceRequest): string | null {
  return request.product?.category.emoji ?? request.category?.emoji ?? null;
}
