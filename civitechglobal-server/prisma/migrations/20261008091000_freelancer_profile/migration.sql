-- Freelancer profile fields (FEATURE_PROJECTS_V2): languages, rate, availability, country.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'IR',
ADD COLUMN     "hourly_currency" TEXT NOT NULL DEFAULT 'IRT',
ADD COLUMN     "hourly_rate" BIGINT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "last_active_at" TIMESTAMP(3);

