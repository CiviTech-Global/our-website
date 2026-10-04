-- How many people a role hires. Existing postings hired one, which is what
-- the old behaviour assumed, so the default keeps them exactly as they were.
ALTER TABLE "job_posts" ADD COLUMN "openings" INTEGER NOT NULL DEFAULT 1;
