-- Software project enquiries: brief in, proposal out.
--
-- Four tables. The one that carries the design is client_identities: this flow
-- has no account and no verification code, so the pair (email, phone) IS the
-- identity. Both hashes are unique, which is what enforces the pairing rule at
-- the database level rather than in application logic that can be forgotten:
-- an email seen with one phone number cannot later appear with a different
-- one, and vice versa. Abuse therefore costs a fresh email AND a fresh phone,
-- not a fresh browser session.
--
-- Money is BigInt (whole toman), never a float. Iranian amounts get large and
-- binary floats lose the low digits exactly where invoices care about them.
--
-- Generated with prisma migrate diff against the deployed schema, then
-- annotated. Nothing here is destructive; all four tables are new.

-- CreateEnum
CREATE TYPE "ProjectRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'NEEDS_CLARIFICATION', 'PROPOSAL_SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('NEW_BUILD', 'REBUILD', 'INTEGRATION', 'MOBILE_APP', 'WEB_APP', 'DATA_PLATFORM', 'AUTOMATION', 'MAINTENANCE', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "EngagementModel" AS ENUM ('FIXED_PRICE', 'TIME_AND_MATERIALS', 'RETAINER', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "ProjectUrgency" AS ENUM ('EXPLORING', 'NEXT_QUARTER', 'NEXT_MONTH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "client_identities" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "last_request_at" TIMESTAMP(3),
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_requests" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_role" TEXT,
    "organization_name" TEXT,
    "website" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "project_type" "ProjectType" NOT NULL DEFAULT 'OTHER',
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT,
    "target_users" TEXT,
    "existing_systems" TEXT,
    "constraints" TEXT,
    "out_of_scope" TEXT,
    "urgency" "ProjectUrgency" NOT NULL DEFAULT 'EXPLORING',
    "desired_start_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "deadline_reason" TEXT,
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "suggested_price" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "budget_unknown" BOOLEAN NOT NULL DEFAULT false,
    "engagement_model" "EngagementModel" NOT NULL DEFAULT 'NOT_SURE',
    "status" "ProjectRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "nda_required" BOOLEAN NOT NULL DEFAULT false,
    "client_notes" TEXT,
    "internal_notes" TEXT,
    "assigned_to_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_attachments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_proposals" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "scope_summary" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "milestones" JSONB,
    "engagement_model" "EngagementModel" NOT NULL DEFAULT 'FIXED_PRICE',
    "optimistic_hours" INTEGER,
    "likely_hours" INTEGER,
    "pessimistic_hours" INTEGER,
    "pert_hours" INTEGER,
    "price_min" BIGINT,
    "price_likely" BIGINT,
    "price_max" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "hourly_rate" BIGINT,
    "discovery_required" BOOLEAN NOT NULL DEFAULT false,
    "discovery_price" BIGINT,
    "discovery_days" INTEGER,
    "timeline_weeks_min" INTEGER,
    "timeline_weeks_max" INTEGER,
    "message" TEXT,
    "internal_notes" TEXT,
    "valid_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_identities_email_hash_key" ON "client_identities"("email_hash");

-- CreateIndex
CREATE UNIQUE INDEX "client_identities_phone_hash_key" ON "client_identities"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "project_requests_tracking_code_key" ON "project_requests"("tracking_code");

-- CreateIndex
CREATE INDEX "project_requests_status_idx" ON "project_requests"("status");

-- CreateIndex
CREATE INDEX "project_requests_createdAt_idx" ON "project_requests"("createdAt");

-- CreateIndex
CREATE INDEX "project_requests_identity_id_idx" ON "project_requests"("identity_id");

-- CreateIndex
CREATE INDEX "project_requests_assigned_to_id_idx" ON "project_requests"("assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_attachments_stored_name_key" ON "project_attachments"("stored_name");

-- CreateIndex
CREATE INDEX "project_attachments_request_id_idx" ON "project_attachments"("request_id");

-- CreateIndex
CREATE INDEX "project_proposals_request_id_idx" ON "project_proposals"("request_id");

-- CreateIndex
CREATE INDEX "project_proposals_status_idx" ON "project_proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_proposals_request_id_version_key" ON "project_proposals"("request_id", "version");

-- AddForeignKey
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "client_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

