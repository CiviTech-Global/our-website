-- Jobs beyond Iran: a country on postings and company pages, the period a
-- salary is quoted per, and remote roles open worldwide. Every default keeps
-- what existing rows meant: Iran, monthly, remote within the country.
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'MONTH', 'YEAR');

ALTER TABLE "job_posts"
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IR',
  ADD COLUMN "remote_worldwide" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "salary_period" "SalaryPeriod" NOT NULL DEFAULT 'MONTH';

CREATE INDEX "job_posts_country_idx" ON "job_posts"("country");

ALTER TABLE "companies" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IR';
