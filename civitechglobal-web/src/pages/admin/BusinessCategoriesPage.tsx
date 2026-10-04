import { CategoryDesk } from './ProductCategoriesPage';

/**
 * The guild list (اصناف): what kind of business each shop is.
 *
 * The same desk as the listing categories, in its other mode — see
 * ProductCategoriesPage for why it is one screen rather than two.
 */
export default function BusinessCategoriesPage() {
  return <CategoryDesk mode="business" />;
}
