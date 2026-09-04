import { CATEGORIES } from './categories.js';
import { CONTACT_FIELD_NAMES, contactFields } from './fields.js';
import type { CategoryDef, ChoiceField, FieldDef, ProductDef } from './types.js';
import { autoProducts } from './products/auto.js';
import { propertyProducts } from './products/property.js';
import { healthProducts } from './products/health.js';
import { lifeProducts } from './products/life.js';
import { accidentProducts } from './products/accident.js';
import { travelProducts } from './products/travel.js';
import { liabilityProducts } from './products/liability.js';
import { deviceProducts } from './products/device.js';
import { corporateProducts } from './products/corporate.js';

export * from './types.js';
export { CATEGORIES } from './categories.js';
export { PROVINCES, PREFERRED_CONTACT_TIMES } from './fields.js';

/**
 * Bump whenever any product's field list changes in a way that alters the
 * meaning of a stored answer — a field renamed or removed, an option value
 * changed. Every submitted request records the version it was filled under, so
 * the admin panel can say «this form has changed since submission» instead of
 * silently mislabelling an old answer.
 *
 * Adding a brand-new optional field does not require a bump: old rows simply
 * have no value for it, which renders correctly either way.
 */
export const CATALOG_VERSION = 1;

const ALL_PRODUCTS: ProductDef[] = [
  ...autoProducts,
  ...propertyProducts,
  ...healthProducts,
  ...lifeProducts,
  ...accidentProducts,
  ...travelProducts,
  ...liabilityProducts,
  ...deviceProducts,
  ...corporateProducts,
];

/**
 * A product with its full question list resolved: the product's own fields
 * followed by the shared contact block. This is what gets seeded into
 * `InsuranceProduct.formSchema`, served to the web app, and compiled into the
 * Zod validator — one list, three consumers, no chance of drift.
 */
export interface ResolvedProduct extends ProductDef {
  allFields: FieldDef[];
}

function resolve(product: ProductDef): ResolvedProduct {
  return { ...product, allFields: [...product.fields, ...contactFields(product.audience)] };
}

export const CATALOG: ResolvedProduct[] = ALL_PRODUCTS.map(resolve);

const BY_SLUG = new Map(CATALOG.map((p) => [p.slug, p]));

export function getProduct(slug: string): ResolvedProduct | undefined {
  return BY_SLUG.get(slug);
}

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function productsInCategory(categorySlug: string): ResolvedProduct[] {
  return CATALOG.filter((p) => p.categorySlug === categorySlug).sort((a, b) => a.order - b.order);
}

// --- Integrity ------------------------------------------------------------

function isChoice(field: FieldDef): field is ChoiceField {
  return field.type === 'select' || field.type === 'multiselect';
}

/**
 * Structural checks that a type system cannot express, run once at import.
 *
 * These are the mistakes that are cheap to make while editing 34 products and
 * expensive to find later: a duplicated slug quietly shadows a product in the
 * lookup map, a `showWhen` pointing at a renamed field hides an input forever,
 * a product field colliding with a contact-block name overwrites the applicant's
 * own city with a property's. Failing at startup beats debugging any of them in
 * production.
 */
export function assertCatalogIntegrity(): void {
  const problems: string[] = [];
  const categorySlugs = new Set(CATEGORIES.map((c) => c.slug));
  const seenSlugs = new Set<string>();

  for (const product of CATALOG) {
    if (seenSlugs.has(product.slug)) problems.push(`duplicate product slug: ${product.slug}`);
    seenSlugs.add(product.slug);

    if (!categorySlugs.has(product.categorySlug)) {
      problems.push(`${product.slug}: unknown categorySlug "${product.categorySlug}"`);
    }

    const names = new Set<string>();
    for (const field of product.fields) {
      if (names.has(field.name)) problems.push(`${product.slug}: duplicate field "${field.name}"`);
      names.add(field.name);

      if (CONTACT_FIELD_NAMES.has(field.name)) {
        problems.push(
          `${product.slug}: field "${field.name}" collides with the shared contact block — rename it`,
        );
      }

      if (isChoice(field)) {
        if (field.options.length === 0) problems.push(`${product.slug}.${field.name}: no options`);
        const values = new Set<string>();
        for (const option of field.options) {
          if (values.has(option.value)) {
            problems.push(`${product.slug}.${field.name}: duplicate option value "${option.value}"`);
          }
          values.add(option.value);
        }
      }
    }

    // showWhen must point at a field that exists on the same product, and at
    // values that field can actually take — otherwise the input is unreachable.
    for (const field of product.fields) {
      if (!field.showWhen) continue;
      const target = product.fields.find((f) => f.name === field.showWhen!.field);
      if (!target) {
        problems.push(`${product.slug}.${field.name}: showWhen references unknown field "${field.showWhen.field}"`);
        continue;
      }
      if (isChoice(target)) {
        const allowed = new Set(target.options.map((o) => o.value));
        for (const value of field.showWhen.equals) {
          if (!allowed.has(value)) {
            problems.push(
              `${product.slug}.${field.name}: showWhen value "${value}" is not an option of "${target.name}"`,
            );
          }
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Insurance catalog is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

assertCatalogIntegrity();
