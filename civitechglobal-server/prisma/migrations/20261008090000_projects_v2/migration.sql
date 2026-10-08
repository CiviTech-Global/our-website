-- Freelance, second generation (FEATURE_PROJECTS_V2): richer projects, invitations,
-- saved projects and alerts, NDAs, hourly timesheets, and the service catalogue.

-- CreateEnum
CREATE TYPE "ProjectPricing" AS ENUM ('FIXED', 'HOURLY');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'SIGNED_IN', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'QUERIED');

-- CreateEnum
CREATE TYPE "ServiceState" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "freelance_projects" ADD COLUMN     "city" TEXT,
ADD COLUMN     "client_viewed_at" TIMESTAMP(3),
ADD COLUMN     "contract_to_hire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "experience_level" TEXT,
ADD COLUMN     "freelancers_needed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nda" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onsite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pricing_type" "ProjectPricing" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "province" TEXT,
ADD COLUMN     "screening_questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sealed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "weekly_hours" TEXT,
ADD COLUMN     "work_category_id" TEXT;

-- AlterTable
ALTER TABLE "marketplace_awards" ADD COLUMN     "hourly_rate" BIGINT,
ADD COLUMN     "pricing_type" "ProjectPricing" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "service_order_id" TEXT,
ADD COLUMN     "weekly_hour_limit" INTEGER;

-- AlterTable
ALTER TABLE "project_bids" ADD COLUMN     "client_note" TEXT,
ADD COLUMN     "client_seen_at" TIMESTAMP(3),
ADD COLUMN     "invited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "milestones" JSONB,
ADD COLUMN     "outcome_changed_at" TIMESTAMP(3),
ADD COLUMN     "screening_answers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "work_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL DEFAULT '',
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_invites" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "freelancer_id" TEXT NOT NULL,
    "message" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_nda_signatures" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signed_name" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_nda_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_timesheets" (
    "id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "memo" TEXT NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'SUBMITTED',
    "client_note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "marketplace_timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "work_category_id" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "state" "ServiceState" NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "delivery_days" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 1,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_extras" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "extra_days" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_images" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "delivery_days" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL,
    "extras" JSONB NOT NULL DEFAULT '[]',
    "requirement_answers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "responded_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_categories_slug_key" ON "work_categories"("slug");

-- CreateIndex
CREATE INDEX "work_categories_parent_id_position_idx" ON "work_categories"("parent_id", "position");

-- CreateIndex
CREATE INDEX "project_invites_freelancer_id_status_idx" ON "project_invites"("freelancer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_invites_project_id_freelancer_id_key" ON "project_invites"("project_id", "freelancer_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_projects_user_id_project_id_key" ON "saved_projects"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "project_alerts_user_id_idx" ON "project_alerts"("user_id");

-- CreateIndex
CREATE INDEX "project_alerts_active_idx" ON "project_alerts"("active");

-- CreateIndex
CREATE UNIQUE INDEX "project_nda_signatures_project_id_user_id_key" ON "project_nda_signatures"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_timesheets_award_id_week_start_key" ON "marketplace_timesheets"("award_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "services_moderation_status_idx" ON "services"("moderation_status");

-- CreateIndex
CREATE INDEX "services_owner_id_idx" ON "services"("owner_id");

-- CreateIndex
CREATE INDEX "services_work_category_id_idx" ON "services"("work_category_id");

-- CreateIndex
CREATE INDEX "services_featured_state_idx" ON "services"("featured", "state");

-- CreateIndex
CREATE UNIQUE INDEX "service_packages_service_id_tier_key" ON "service_packages"("service_id", "tier");

-- CreateIndex
CREATE INDEX "service_extras_service_id_idx" ON "service_extras"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_images_stored_name_key" ON "service_images"("stored_name");

-- CreateIndex
CREATE INDEX "service_images_service_id_idx" ON "service_images"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_code_key" ON "service_orders"("code");

-- CreateIndex
CREATE INDEX "service_orders_buyer_id_idx" ON "service_orders"("buyer_id");

-- CreateIndex
CREATE INDEX "service_orders_seller_id_status_idx" ON "service_orders"("seller_id", "status");

-- CreateIndex
CREATE INDEX "service_orders_service_id_idx" ON "service_orders"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_awards_service_order_id_key" ON "marketplace_awards"("service_order_id");

-- AddForeignKey
ALTER TABLE "freelance_projects" ADD CONSTRAINT "freelance_projects_work_category_id_fkey" FOREIGN KEY ("work_category_id") REFERENCES "work_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_awards" ADD CONSTRAINT "marketplace_awards_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_categories" ADD CONSTRAINT "work_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "freelance_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_projects" ADD CONSTRAINT "saved_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_projects" ADD CONSTRAINT "saved_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "freelance_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_alerts" ADD CONSTRAINT "project_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_nda_signatures" ADD CONSTRAINT "project_nda_signatures_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "freelance_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_nda_signatures" ADD CONSTRAINT "project_nda_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_timesheets" ADD CONSTRAINT "marketplace_timesheets_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "marketplace_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_work_category_id_fkey" FOREIGN KEY ("work_category_id") REFERENCES "work_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_extras" ADD CONSTRAINT "service_extras_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "work_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "work_categories"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "project_invites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "project_invites"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "saved_projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "saved_projects"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "project_alerts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "project_alerts"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "project_nda_signatures" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "project_nda_signatures"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "marketplace_timesheets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "marketplace_timesheets"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "services"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "service_packages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "service_packages"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "service_extras" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "service_extras"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "service_images" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "service_images"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "service_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "service_orders"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
