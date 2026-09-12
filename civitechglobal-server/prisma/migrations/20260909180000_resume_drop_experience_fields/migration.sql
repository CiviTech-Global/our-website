-- AlterTable
ALTER TABLE "resume_submissions" DROP COLUMN "available_from",
DROP COLUMN "desired_role",
DROP COLUMN "employment_type",
DROP COLUMN "expected_salary",
DROP COLUMN "github_url",
DROP COLUMN "headline",
DROP COLUMN "linkedin_url",
DROP COLUMN "portfolio_url",
DROP COLUMN "skills",
DROP COLUMN "work_arrangement",
DROP COLUMN "years_of_experience";
-- DropEnum
DROP TYPE "EmploymentType";
-- DropEnum
DROP TYPE "WorkArrangement";
