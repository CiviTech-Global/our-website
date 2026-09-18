-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('NEW', 'USED');

-- CreateTable
CREATE TABLE "book_listings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "posted_by_company" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "book_author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publisher" TEXT,
    "isbn" TEXT,
    "publish_year" INTEGER,
    "language" TEXT,
    "page_count" INTEGER,
    "category" TEXT,
    "condition" "BookCondition" NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "province" TEXT,
    "city" TEXT,
    "cover_stored_name" TEXT,
    "cover_original_name" TEXT,
    "cover_mime_type" TEXT,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "state" "ListingState" NOT NULL DEFAULT 'OPEN',
    "published_at" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_listings_code_key" ON "book_listings"("code");

-- CreateIndex
CREATE INDEX "book_listings_moderation_status_idx" ON "book_listings"("moderation_status");

-- CreateIndex
CREATE INDEX "book_listings_state_published_at_idx" ON "book_listings"("state", "published_at");

-- CreateIndex
CREATE INDEX "book_listings_seller_id_idx" ON "book_listings"("seller_id");

-- CreateIndex
CREATE INDEX "book_listings_featured_state_idx" ON "book_listings"("featured", "state");

-- AddForeignKey
ALTER TABLE "book_listings" ADD CONSTRAINT "book_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_listings" ADD CONSTRAINT "book_listings_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Search by name, which is how people actually look for a book: the title they
-- half-remember, or the author. A trigram index rather than a tsvector one —
-- the queries are ILIKE '%...%' over two short columns, where tsquery's word
-- boundaries would miss "Hobb" typed for "Hobbit".
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "book_listings_title_trgm_idx" ON "book_listings" USING gin ("title" gin_trgm_ops);
CREATE INDEX "book_listings_book_author_trgm_idx" ON "book_listings" USING gin ("book_author" gin_trgm_ops);

-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE book_listings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY app_full_access ON book_listings FOR ALL TO civitech_app USING (true) WITH CHECK (true)';
END
$$;
