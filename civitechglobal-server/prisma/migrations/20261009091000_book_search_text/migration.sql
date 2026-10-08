-- One lower-cased search column per book, so part of an author or translator
-- name finds it, with a trigram index; filled for the books already there.

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "search_text" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "books_search_text_trgm_idx" ON "books" USING GIN ("search_text" gin_trgm_ops);


UPDATE "books" SET "search_text" = lower(concat_ws(' ', "title", "subtitle", array_to_string("authors", ' '), array_to_string("translators", ' '), "publisher", "series", "original_title", array_to_string("tags", ' '), "isbn"));
