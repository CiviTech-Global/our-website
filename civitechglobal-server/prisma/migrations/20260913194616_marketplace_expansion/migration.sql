-- CreateEnum
CREATE TYPE "AwardStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED');

-- AlterTable
ALTER TABLE "freelance_projects" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featured_at" TIMESTAMP(3),
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "category" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featured_at" TIMESTAMP(3),
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "marketplace_awards" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "dispute_opened_at" TIMESTAMP(3),
ADD COLUMN     "dispute_reason" TEXT,
ADD COLUMN     "dispute_resolution_note" TEXT,
ADD COLUMN     "dispute_resolved_at" TIMESTAMP(3),
ADD COLUMN     "dispute_status" "DisputeStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "status" "AwardStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "marketplace_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "paused_reason" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "marketplace_messages" (
    "id" TEXT NOT NULL,
    "application_id" TEXT,
    "bid_id" TEXT,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "rater_id" TEXT NOT NULL,
    "ratee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_milestones" (
    "id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "delivery_note" TEXT,
    "delivered_at" TIMESTAMP(3),
    "delivery_original_name" TEXT,
    "delivery_stored_name" TEXT,
    "delivery_mime_type" TEXT,
    "delivery_size_bytes" INTEGER,
    "delivery_checksum" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_audit" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_messages_application_id_createdAt_idx" ON "marketplace_messages"("application_id", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_messages_bid_id_createdAt_idx" ON "marketplace_messages"("bid_id", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_messages_sender_id_idx" ON "marketplace_messages"("sender_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_createdAt_idx" ON "notifications"("user_id", "read_at", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_reviews_ratee_id_idx" ON "marketplace_reviews"("ratee_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_award_id_rater_id_key" ON "marketplace_reviews"("award_id", "rater_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_milestones_delivery_stored_name_key" ON "marketplace_milestones"("delivery_stored_name");

-- CreateIndex
CREATE INDEX "marketplace_milestones_award_id_status_idx" ON "marketplace_milestones"("award_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_milestones_award_id_order_key" ON "marketplace_milestones"("award_id", "order");

-- CreateIndex
CREATE INDEX "marketplace_audit_target_type_target_id_idx" ON "marketplace_audit"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "marketplace_audit_createdAt_idx" ON "marketplace_audit"("createdAt");

-- CreateIndex
CREATE INDEX "freelance_projects_featured_state_idx" ON "freelance_projects"("featured", "state");

-- CreateIndex
CREATE INDEX "job_posts_featured_state_idx" ON "job_posts"("featured", "state");

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "project_bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "marketplace_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_ratee_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_milestones" ADD CONSTRAINT "marketplace_milestones_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "marketplace_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security for the tables this migration adds.
--
-- The same invariant the 20260910180000 and 20260911200000 migrations set up,
-- and the same reason it has to be restated: ALTER DEFAULT PRIVILEGES carries
-- grants forward to new tables, but never row-level security. A table created
-- without these statements is one where a GRANT alone is sufficient — which is
-- exactly the hole the invariant exists to close.
--
-- It matters most for what these five tables hold. marketplace_messages is
-- private correspondence between two parties, notifications quote it back,
-- marketplace_reviews carries unpublished ratings, and marketplace_audit is
-- the record of what staff did — the one table whose integrity everything else
-- is checked against.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'marketplace_messages',
    'notifications',
    'marketplace_reviews',
    'marketplace_milestones',
    'marketplace_audit'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- civitech_readonly is again given nothing. Private messages and an audit
-- trail are not reporting data, and with RLS on and no policy the role sees
-- nothing even if a GRANT is added later by mistake.
