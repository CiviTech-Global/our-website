-- CreateEnum
CREATE TYPE "ConsultationTopic" AS ENUM ('CAREER', 'TECHNICAL', 'STARTING_OUT', 'HIRING', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('ONLINE', 'PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "DayPart" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'NO_ANSWER', 'CANCELLED');

-- DropIndex
DROP INDEX "book_listings_book_author_trgm_idx";

-- DropIndex
DROP INDEX "book_listings_title_trgm_idx";

-- CreateTable
CREATE TABLE "showcase_project_shots" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_project_shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT,
    "specialities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "years_experience" INTEGER,
    "photo_stored_name" TEXT,
    "photo_original_name" TEXT,
    "photo_mime_type" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "website_url" TEXT,
    "accepts_consultations" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_number_hash" TEXT,
    "email" TEXT,
    "topic" "ConsultationTopic" NOT NULL,
    "goal" TEXT,
    "background" TEXT,
    "preferredMode" "ConsultationMode" NOT NULL DEFAULT 'ONLINE',
    "expert_id" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'NEW',
    "staff_note" TEXT,
    "assigned_to_id" TEXT,
    "contacted_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_availability" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "part" "DayPart" NOT NULL,

    CONSTRAINT "consultation_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "showcase_project_shots_project_id_display_order_idx" ON "showcase_project_shots"("project_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "experts_slug_key" ON "experts"("slug");

-- CreateIndex
CREATE INDEX "experts_published_display_order_idx" ON "experts"("published", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_requests_tracking_code_key" ON "consultation_requests"("tracking_code");

-- CreateIndex
CREATE INDEX "consultation_requests_status_created_at_idx" ON "consultation_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "consultation_requests_expert_id_idx" ON "consultation_requests"("expert_id");

-- CreateIndex
CREATE INDEX "consultation_availability_day_part_idx" ON "consultation_availability"("day", "part");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_availability_request_id_day_part_key" ON "consultation_availability"("request_id", "day", "part");

-- AddForeignKey
ALTER TABLE "showcase_project_shots" ADD CONSTRAINT "showcase_project_shots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "showcase_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_availability" ADD CONSTRAINT "consultation_availability_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "consultation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'showcase_project_shots',
    'experts',
    'consultation_requests',
    'consultation_availability'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;
