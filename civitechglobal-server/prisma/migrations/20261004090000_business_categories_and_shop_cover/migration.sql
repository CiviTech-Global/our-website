-- Business categories (the guild list) and a cover photo for each shop.
--
-- New table and new nullable columns only; nothing existing is rewritten. The
-- list itself is seeded by the application from
-- src/catalog/marketplace-taxonomy.ts, and only while the marketplace is
-- switched on, so production gets no rows until it is.

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "business_category_id" TEXT,
ADD COLUMN     "cover_mime_type" TEXT,
ADD COLUMN     "cover_original_name" TEXT,
ADD COLUMN     "cover_stored_name" TEXT;

-- CreateTable
CREATE TABLE "business_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_categories_slug_key" ON "business_categories"("slug");

-- CreateIndex
CREATE INDEX "business_categories_parent_id_position_idx" ON "business_categories"("parent_id", "position");

-- CreateIndex
CREATE INDEX "businesses_business_category_id_idx" ON "businesses"("business_category_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_business_category_id_fkey" FOREIGN KEY ("business_category_id") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries the grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
ALTER TABLE "business_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "business_categories"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
