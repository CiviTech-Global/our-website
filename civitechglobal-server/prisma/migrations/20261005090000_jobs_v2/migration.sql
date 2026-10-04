-- CreateEnum
CREATE TYPE "JobSeniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "GenderRequirement" AS ENUM ('ANY', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MilitaryServiceRequirement" AS ENUM ('ANY', 'COMPLETED_OR_EXEMPT');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_500', 'SIZE_501_1000', 'SIZE_1000_PLUS');

-- AlterEnum
ALTER TYPE "OfferOutcome" ADD VALUE 'INTERVIEW';

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "employer_note" TEXT,
ADD COLUMN     "employer_seen_at" TIMESTAMP(3),
ADD COLUMN     "outcome_changed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "age_max" INTEGER,
ADD COLUMN     "age_min" INTEGER,
ADD COLUMN     "amrieh_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "disability_friendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "education_level" "EducationLevel",
ADD COLUMN     "field_of_study" TEXT,
ADD COLUMN     "gender_requirement" "GenderRequirement" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "job_category_id" TEXT,
ADD COLUMN     "military_service" "MilitaryServiceRequirement" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "min_experience_years" INTEGER,
ADD COLUMN     "seniority" "JobSeniority",
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "working_hours" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "job_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL DEFAULT '',
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "about" TEXT,
    "industry" TEXT,
    "size" "CompanySize",
    "founded_year" INTEGER,
    "website" TEXT,
    "province" TEXT,
    "city" TEXT,
    "logo_stored_name" TEXT,
    "logo_original_name" TEXT,
    "logo_mime_type" TEXT,
    "cover_stored_name" TEXT,
    "cover_original_name" TEXT,
    "cover_mime_type" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_parent_id_position_idx" ON "job_categories"("parent_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "companies_owner_id_key" ON "companies"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_logo_stored_name_key" ON "companies"("logo_stored_name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cover_stored_name_key" ON "companies"("cover_stored_name");

-- CreateIndex
CREATE INDEX "saved_jobs_user_id_created_at_idx" ON "saved_jobs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_user_id_job_id_key" ON "saved_jobs"("user_id", "job_id");

-- CreateIndex
CREATE INDEX "job_alerts_active_idx" ON "job_alerts"("active");

-- CreateIndex
CREATE INDEX "job_alerts_user_id_idx" ON "job_alerts"("user_id");

-- CreateIndex
CREATE INDEX "job_posts_job_category_id_idx" ON "job_posts"("job_category_id");

-- CreateIndex
CREATE INDEX "job_posts_company_id_idx" ON "job_posts"("company_id");

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_job_category_id_fkey" FOREIGN KEY ("job_category_id") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table the app reaches carries the same policy as the rest; see
-- rls-invariant.test.ts.
ALTER TABLE "job_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "job_categories"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "companies"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);

ALTER TABLE "saved_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "saved_jobs"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);

ALTER TABLE "job_alerts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "job_alerts"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);

