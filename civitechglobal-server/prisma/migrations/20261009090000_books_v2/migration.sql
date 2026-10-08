-- Book market, second generation (FEATURE_BOOKS_V2): a shared book catalogue,
-- offers with grades and photos, and purchase requests with their threads.

-- CreateEnum
CREATE TYPE "BookRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "book_listings" ADD COLUMN     "book_id" TEXT,
ADD COLUMN     "condition_notes" TEXT,
ADD COLUMN     "delivery_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shipping_cost" BIGINT,
ADD COLUMN     "sold_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "marketplace_awards" ADD COLUMN     "book_request_id" TEXT;

-- AlterTable
ALTER TABLE "marketplace_messages" ADD COLUMN     "book_request_id" TEXT;

-- CreateTable
CREATE TABLE "book_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL DEFAULT '',
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "translators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publisher" TEXT,
    "isbn" TEXT,
    "publish_year" INTEGER,
    "year_calendar" TEXT NOT NULL DEFAULT 'SOLAR',
    "edition" INTEGER,
    "print_run" INTEGER,
    "page_count" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'fa',
    "original_title" TEXT,
    "original_language" TEXT,
    "series" TEXT,
    "series_number" INTEGER,
    "binding" TEXT,
    "trim_size" TEXT,
    "weight_grams" INTEGER,
    "list_price" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" TEXT,
    "cover_stored_name" TEXT,
    "cover_original_name" TEXT,
    "cover_mime_type" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_listing_photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "delivery_method" TEXT NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "shipping_cost" BIGINT,
    "offered_price" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "note" TEXT,
    "status" "BookRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "responded_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_categories_slug_key" ON "book_categories"("slug");

-- CreateIndex
CREATE INDEX "book_categories_parent_id_position_idx" ON "book_categories"("parent_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "books_code_key" ON "books"("code");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_category_id_idx" ON "books"("category_id");

-- CreateIndex
CREATE INDEX "books_title_trgm_idx" ON "books" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "book_listing_photos_stored_name_key" ON "book_listing_photos"("stored_name");

-- CreateIndex
CREATE INDEX "book_listing_photos_listing_id_idx" ON "book_listing_photos"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_requests_code_key" ON "book_requests"("code");

-- CreateIndex
CREATE INDEX "book_requests_buyer_id_idx" ON "book_requests"("buyer_id");

-- CreateIndex
CREATE INDEX "book_requests_seller_id_status_idx" ON "book_requests"("seller_id", "status");

-- CreateIndex
CREATE INDEX "book_requests_listing_id_idx" ON "book_requests"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_awards_book_request_id_key" ON "marketplace_awards"("book_request_id");

-- CreateIndex
CREATE INDEX "marketplace_messages_book_request_id_createdAt_idx" ON "marketplace_messages"("book_request_id", "createdAt");

-- AddForeignKey
ALTER TABLE "marketplace_awards" ADD CONSTRAINT "marketplace_awards_book_request_id_fkey" FOREIGN KEY ("book_request_id") REFERENCES "book_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_book_request_id_fkey" FOREIGN KEY ("book_request_id") REFERENCES "book_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_listings" ADD CONSTRAINT "book_listings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "book_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "book_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_listing_photos" ADD CONSTRAINT "book_listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "book_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "book_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Backfill: every existing listing becomes an offer of a catalogue book.
--
-- Listings that share an ISBN share one book (the earliest listing's facts
-- win); a listing without an ISBN gets a book of its own. Covers are not
-- copied: the book page falls back to an offer's cover, and a stored file
-- shared by two rows would be deleted out from under one of them.
-- ---------------------------------------------------------------------------

ALTER TABLE "books" ADD COLUMN "legacy_listing_id" TEXT;

INSERT INTO "books" (
  "id", "code", "title", "authors", "publisher", "isbn", "publish_year", "year_calendar",
  "page_count", "language", "description", "tags", "currency", "created_by_id",
  "created_at", "updated_at", "legacy_listing_id"
)
SELECT
  'bk' || substr(md5(random()::text || l."id"), 1, 23),
  upper(substr(md5(random()::text || l."id" || 'code'), 1, 10)),
  l."title",
  ARRAY[l."book_author"],
  l."publisher",
  l."isbn",
  l."publish_year",
  -- A year after 1500 is Gregorian; Iranian books print 13xx and 14xx.
  CASE WHEN l."publish_year" IS NOT NULL AND l."publish_year" > 1500 THEN 'GREGORIAN' ELSE 'SOLAR' END,
  l."page_count",
  COALESCE(NULLIF(l."language", ''), 'fa'),
  l."description",
  CASE WHEN l."category" IS NOT NULL AND l."category" <> '' THEN ARRAY[l."category"] ELSE ARRAY[]::TEXT[] END,
  l."currency",
  l."seller_id",
  l."createdAt",
  l."updatedAt",
  l."id"
FROM (
  SELECT DISTINCT ON (COALESCE("isbn", "id")) *
  FROM "book_listings"
  ORDER BY COALESCE("isbn", "id"), "createdAt"
) AS l;

UPDATE "book_listings" AS l
SET "book_id" = b."id"
FROM "books" AS b
WHERE (l."isbn" IS NOT NULL AND b."isbn" = l."isbn")
   OR (l."isbn" IS NULL AND b."legacy_listing_id" = l."id");

UPDATE "book_listings"
SET "grade" = CASE WHEN "condition" = 'NEW' THEN 'NEW' ELSE 'GOOD' END,
    "delivery_options" = ARRAY['IN_PERSON']::TEXT[]
WHERE "grade" IS NULL;

ALTER TABLE "books" DROP COLUMN "legacy_listing_id";

-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "book_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "book_categories"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "books" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "books"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "book_listing_photos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "book_listing_photos"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "book_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "book_requests"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
