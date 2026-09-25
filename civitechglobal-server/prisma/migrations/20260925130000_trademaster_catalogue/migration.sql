-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_stored_name" TEXT,
    "logo_original_name" TEXT,
    "logo_mime_type" TEXT,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "review_note" TEXT,
    "internal_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "state" "ListingState" NOT NULL DEFAULT 'OPEN',
    "published_at" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "review_note" TEXT,
    "internal_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "state" "ListingState" NOT NULL DEFAULT 'OPEN',
    "published_at" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "price" BIGINT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_code_key" ON "businesses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- CreateIndex
CREATE INDEX "businesses_moderation_status_idx" ON "businesses"("moderation_status");

-- CreateIndex
CREATE INDEX "businesses_state_published_at_idx" ON "businesses"("state", "published_at");

-- CreateIndex
CREATE INDEX "businesses_province_city_idx" ON "businesses"("province", "city");

-- CreateIndex
CREATE INDEX "businesses_latitude_longitude_idx" ON "businesses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "businesses_featured_created_at_idx" ON "businesses"("featured", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_position_idx" ON "product_categories"("parent_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_business_id_moderation_status_idx" ON "products"("business_id", "moderation_status");

-- CreateIndex
CREATE INDEX "products_moderation_status_idx" ON "products"("moderation_status");

-- CreateIndex
CREATE INDEX "products_state_published_at_idx" ON "products"("state", "published_at");

-- CreateIndex
CREATE INDEX "products_category_id_moderation_status_idx" ON "products"("category_id", "moderation_status");

-- CreateIndex
CREATE INDEX "products_featured_created_at_idx" ON "products"("featured", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_business_id_slug_key" ON "products"("business_id", "slug");

-- CreateIndex
CREATE INDEX "product_images_product_id_position_idx" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE INDEX "product_variants_product_id_position_idx" ON "product_variants"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_label_key" ON "product_variants"("product_id", "label");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Search by name, the way buyers actually look: a half-remembered product
-- title or a shop name. Trigram rather than tsvector, matching the book
-- market — the queries are ILIKE '%...%' over short columns, where tsquery's
-- word boundaries would miss "ceram" typed for "ceramic".
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "businesses_name_trgm_idx" ON "businesses" USING gin ("name" gin_trgm_ops);
CREATE INDEX "products_title_trgm_idx" ON "products" USING gin ("title" gin_trgm_ops);

-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries the grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
--
-- This matters more than it did a week ago: the application now connects as
-- civitech_app rather than the owner, so these policies are what the module
-- actually runs under rather than something the owner bypasses.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'businesses', 'product_categories', 'products', 'product_images', 'product_variants'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- civitech_readonly is given nothing. A reporting role has no business
-- reading a seller's contact details or an unpublished draft, and the
-- catalogue it might legitimately want is public on the website anyway.


-- Search by name, the way buyers actually look: a half-remembered product
-- title or a shop name. Trigram rather than tsvector, matching the book
-- market — the queries are ILIKE '%...%' over short columns, where tsquery's
-- word boundaries would miss "ceram" typed for "ceramic".
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "businesses_name_trgm_idx" ON "businesses" USING gin ("name" gin_trgm_ops);
CREATE INDEX "products_title_trgm_idx" ON "products" USING gin ("title" gin_trgm_ops);

-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries the grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
--
-- This matters more than it did a week ago: the application now connects as
-- civitech_app rather than the owner, so these policies are what the module
-- actually runs under rather than something the owner bypasses.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'businesses', 'product_categories', 'products', 'product_images', 'product_variants'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- civitech_readonly is given nothing. A reporting role has no business
-- reading a seller's contact details or an unpublished draft, and the
-- catalogue it might legitimately want is public on the website anyway.
