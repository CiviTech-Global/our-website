-- CreateEnum
CREATE TYPE "OrganizationKind" AS ENUM ('CUSTOMER', 'PARTNER');

-- CreateEnum
CREATE TYPE "PartnershipType" AS ENUM ('TECHNOLOGY', 'STRATEGIC', 'ACADEMIC', 'RESELLER', 'COMMUNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ShowcaseProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'LAUNCHED', 'MAINTAINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TalentTrack" AS ENUM ('JOB', 'VOLUNTEER', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "TalentDiscipline" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA', 'QA', 'UI_UX', 'OTHER');

-- AlterTable
ALTER TABLE "resume_submissions" ADD COLUMN     "arrangement" "JobWorkArrangement",
ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "discipline" "TalentDiscipline",
ADD COLUMN     "duration_months" INTEGER,
ADD COLUMN     "field_of_study" TEXT,
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "hours_per_week" INTEGER,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "portfolio_url" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "track" "TalentTrack" NOT NULL DEFAULT 'JOB',
ADD COLUMN     "university" TEXT;

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "section_id" TEXT;

-- CreateTable
CREATE TABLE "team_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_sections_pkey" PRIMARY KEY ("id")
);

-- Team sections: move the free-text labels into rows before the column goes.
--
-- One section per distinct label, trimmed, so "Engineering" and "Engineering "
-- become the one department they always meant. Sections are ordered by where
-- their first member already sat on the page, so the page reads the same the
-- morning after this runs as it did the night before.
INSERT INTO "team_sections" ("id", "name", "display_order", "created_at", "updated_at")
SELECT
  'sec_' || md5(label),
  label,
  (row_number() OVER (ORDER BY first_order, label))::int,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT btrim("team") AS label, min("display_order") AS first_order
  FROM "team_members"
  WHERE "team" IS NOT NULL AND btrim("team") <> ''
  GROUP BY btrim("team")
) AS labels;

UPDATE "team_members" AS m
SET "section_id" = s."id"
FROM "team_sections" AS s
WHERE btrim(m."team") = s."name";

ALTER TABLE "team_members" DROP COLUMN "team";

-- CreateTable
CREATE TABLE "showcase_organizations" (
    "id" TEXT NOT NULL,
    "kind" "OrganizationKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "logo_stored_name" TEXT,
    "logo_original_name" TEXT,
    "logo_mime_type" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "since_year" INTEGER,
    "partnership_type" "PartnershipType",
    "testimonial_quote" TEXT,
    "testimonial_author" TEXT,
    "testimonial_role" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "ShowcaseProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_stored_name" TEXT,
    "cover_original_name" TEXT,
    "cover_mime_type" TEXT,
    "project_url" TEXT,
    "repository_url" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "client_id" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_sections_display_order_idx" ON "team_sections"("display_order");

-- CreateIndex
CREATE INDEX "showcase_organizations_kind_published_display_order_idx" ON "showcase_organizations"("kind", "published", "display_order");

-- CreateIndex
CREATE INDEX "showcase_projects_published_status_display_order_idx" ON "showcase_projects"("published", "status", "display_order");

-- CreateIndex
CREATE INDEX "showcase_projects_client_id_idx" ON "showcase_projects"("client_id");

-- CreateIndex
CREATE INDEX "resume_submissions_track_status_idx" ON "resume_submissions"("track", "status");

-- CreateIndex
CREATE INDEX "team_members_section_id_idx" ON "team_members"("section_id");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "team_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_projects" ADD CONSTRAINT "showcase_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "showcase_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['team_sections', 'showcase_organizations', 'showcase_projects']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;
