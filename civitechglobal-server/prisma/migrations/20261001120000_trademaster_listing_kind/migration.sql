-- Products and services.
--
-- Every existing row is a product: the module only ever sold goods until now,
-- so PRODUCT is the honest default rather than a guess. New columns on
-- existing tables, so the grants the least-privilege role already holds on
-- them cover these too.

-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('PRODUCT', 'SERVICE');

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "kind" "ListingKind" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kind" "ListingKind" NOT NULL DEFAULT 'PRODUCT';

-- CreateIndex
CREATE INDEX "product_categories_kind_active_idx" ON "product_categories"("kind", "active");

-- CreateIndex
CREATE INDEX "products_kind_moderation_status_idx" ON "products"("kind", "moderation_status");
