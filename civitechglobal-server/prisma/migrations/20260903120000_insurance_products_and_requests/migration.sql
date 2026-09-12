-- Insurance module refactor: a product catalog with per-product forms, and
-- `leads` becomes `insurance_requests`.
--
-- Forward-only and non-destructive. Every existing lead survives, keeps its id,
-- its assignee and its status, and is marked `source = 'TELEGRAM'` — which is
-- what it was. Nothing is dropped; the pre-refactor category taxonomy is kept
-- and merely deactivated so those rows still render a readable label.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "IntakeMode" AS ENUM ('SELF_SERVE', 'CALLBACK');
CREATE TYPE "ProductAudience" AS ENUM ('INDIVIDUAL', 'CORPORATE');
CREATE TYPE "RequestSource" AS ENUM ('WEB', 'TELEGRAM');

-- ---------------------------------------------------------------------------
-- 2. Categories gain a slug, an English title, ordering and an active flag
-- ---------------------------------------------------------------------------

ALTER TABLE "insurance_categories"
  ADD COLUMN "slug"          TEXT,
  ADD COLUMN "title_en"      TEXT,
  ADD COLUMN "icon"          TEXT,
  ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "active"        BOOLEAN NOT NULL DEFAULT true;

-- Existing categories predate slugs. Derive one from the primary key so the
-- NOT NULL + UNIQUE below can be applied, and deactivate them: the seed creates
-- the real nine, and these linger only to label pre-refactor requests.
UPDATE "insurance_categories"
   SET "slug"     = 'legacy-' || "id",
       "title_en" = COALESCE("title_en", "title"),
       "active"   = false
 WHERE "slug" IS NULL;

ALTER TABLE "insurance_categories"
  ALTER COLUMN "slug"     SET NOT NULL,
  ALTER COLUMN "title_en" SET NOT NULL;

CREATE UNIQUE INDEX "insurance_categories_slug_key" ON "insurance_categories"("slug");

-- ---------------------------------------------------------------------------
-- 3. The product catalog
-- ---------------------------------------------------------------------------

CREATE TABLE "insurance_products" (
    "id"                 TEXT             NOT NULL,
    "slug"               TEXT             NOT NULL,
    "category_id"        TEXT             NOT NULL,
    "title"              TEXT             NOT NULL,
    "title_en"           TEXT             NOT NULL,
    "summary"            TEXT             NOT NULL,
    "summary_en"         TEXT             NOT NULL,
    "description"        TEXT             NOT NULL,
    "description_en"     TEXT             NOT NULL,
    -- Nullable on purpose: Prisma emits scalar lists as nullable columns even
    -- when the model field is required, so NOT NULL here would read as drift.
    "coverages"          TEXT[]                    DEFAULT ARRAY[]::TEXT[],
    "optional_coverages" TEXT[]                    DEFAULT ARRAY[]::TEXT[],
    "notes"              TEXT[]                    DEFAULT ARRAY[]::TEXT[],
    "source_url"         TEXT,
    "intake_mode"        "IntakeMode"      NOT NULL DEFAULT 'SELF_SERVE',
    "audience"           "ProductAudience" NOT NULL DEFAULT 'INDIVIDUAL',
    "icon"               TEXT,
    "display_order"      INTEGER          NOT NULL DEFAULT 0,
    "active"             BOOLEAN          NOT NULL DEFAULT true,
    "form_schema"        JSONB            NOT NULL,
    "catalog_version"    INTEGER          NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "insurance_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_products_slug_key" ON "insurance_products"("slug");
CREATE INDEX "insurance_products_category_id_idx" ON "insurance_products"("category_id");
CREATE INDEX "insurance_products_active_idx" ON "insurance_products"("active");

ALTER TABLE "insurance_products"
  ADD CONSTRAINT "insurance_products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "insurance_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. leads -> insurance_requests
--
-- Renaming the table leaves every constraint and index carrying its old name,
-- which Prisma then reports as drift on the next diff. Rename them too, so the
-- database matches what the schema would generate from scratch.
-- ---------------------------------------------------------------------------

ALTER TABLE "leads" RENAME TO "insurance_requests";

ALTER TABLE "insurance_requests" RENAME CONSTRAINT "leads_pkey" TO "insurance_requests_pkey";
ALTER TABLE "insurance_requests" RENAME CONSTRAINT "leads_category_id_fkey" TO "insurance_requests_category_id_fkey";
ALTER TABLE "insurance_requests" RENAME CONSTRAINT "leads_subcategory_id_fkey" TO "insurance_requests_subcategory_id_fkey";
ALTER TABLE "insurance_requests" RENAME CONSTRAINT "leads_assigned_to_id_fkey" TO "insurance_requests_assigned_to_id_fkey";

ALTER INDEX "leads_status_idx"            RENAME TO "insurance_requests_status_idx";
ALTER INDEX "leads_createdAt_idx"         RENAME TO "insurance_requests_createdAt_idx";
ALTER INDEX "leads_phone_number_hash_idx" RENAME TO "insurance_requests_phone_number_hash_idx";
ALTER INDEX "leads_assigned_to_id_idx"    RENAME TO "insurance_requests_assigned_to_id_idx";

-- ---------------------------------------------------------------------------
-- 5. New columns
-- ---------------------------------------------------------------------------

ALTER TABLE "insurance_requests"
  ADD COLUMN "tracking_code"          TEXT,
  ADD COLUMN "source"                 "RequestSource" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "product_id"             TEXT,
  ADD COLUMN "answers"                JSONB,
  ADD COLUMN "catalog_version"        INTEGER,
  ADD COLUMN "phone_verified"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email"                  TEXT,
  ADD COLUMN "organization_name"      TEXT,
  ADD COLUMN "province"               TEXT,
  ADD COLUMN "callback_scheduled_at"  TIMESTAMP(3);

-- The Telegram identity and the old two-level taxonomy were mandatory because
-- the bot was the only way in. A website submission has none of them.
ALTER TABLE "insurance_requests"
  ALTER COLUMN "telegram_user_id" DROP NOT NULL,
  ALTER COLUMN "category_id"      DROP NOT NULL,
  ALTER COLUMN "subcategory_id"   DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Backfill
-- ---------------------------------------------------------------------------

-- Every pre-existing row came from the bot. The column default is 'WEB' for the
-- rows written from here on, so the existing ones must be corrected explicitly.
UPDATE "insurance_requests" SET "source" = 'TELEGRAM';

-- Tracking codes for rows that predate them. This code gets read down a phone
-- line, so it uses the same ambiguity-free alphabet as the application
-- (services/insurance-request.service.ts): no 0/O, 1/I/L, 5/S or U.
--
-- gen_random_uuid() gives 10 hex characters of entropy; TRANSLATE maps the 16
-- hex symbols onto the first 16 of that alphabet, which is order-preserving and
-- collision-free, so the result is 16^10 (~1.1e12) equally likely codes. The
-- unique index below is what guarantees distinctness — at this table's size a
-- collision is not expected, and if one occurred the migration would fail
-- loudly rather than hand two people the same code.
UPDATE "insurance_requests"
   SET "tracking_code" = TRANSLATE(
         SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10),
         '0123456789abcdef',
         '2346789ABCDEFGHJ'
       )
 WHERE "tracking_code" IS NULL;

ALTER TABLE "insurance_requests" ALTER COLUMN "tracking_code" SET NOT NULL;
CREATE UNIQUE INDEX "insurance_requests_tracking_code_key" ON "insurance_requests"("tracking_code");

-- ---------------------------------------------------------------------------
-- 7. New indexes and the product foreign key
-- ---------------------------------------------------------------------------

CREATE INDEX "insurance_requests_product_id_idx" ON "insurance_requests"("product_id");
CREATE INDEX "insurance_requests_source_idx" ON "insurance_requests"("source");

ALTER TABLE "insurance_requests"
  ADD CONSTRAINT "insurance_requests_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "insurance_products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
