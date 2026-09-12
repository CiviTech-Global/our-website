
-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingState" AS ENUM ('OPEN', 'AWARDED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobWorkArrangement" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "OfferOutcome" AS ENUM ('PENDING', 'SHORTLISTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "VerificationDocumentKind" AS ENUM ('NATIONAL_ID_CARD', 'PASSPORT', 'COMPANY_REGISTRATION', 'AUTHORITY_LETTER', 'OTHER');

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "AccountKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "legal_first_name" TEXT NOT NULL,
    "legal_last_name" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "address_line" TEXT,
    "company_name" TEXT,
    "company_registration_no" TEXT,
    "company_economic_code" TEXT,
    "company_role" TEXT,
    "company_website" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "verification_id" TEXT NOT NULL,
    "kind" "VerificationDocumentKind" NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_name" TEXT,
    "employmentType" "JobEmploymentType" NOT NULL,
    "workArrangement" "JobWorkArrangement" NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "salary_min" BIGINT,
    "salary_max" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "salary_undisclosed" BOOLEAN NOT NULL DEFAULT false,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "state" "ListingState" NOT NULL DEFAULT 'OPEN',
    "published_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "cover_letter" TEXT,
    "expected_salary" BIGINT,
    "cv_original_name" TEXT,
    "cv_stored_name" TEXT,
    "cv_mime_type" TEXT,
    "cv_size_bytes" INTEGER,
    "cv_checksum" TEXT,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "outcome" "OfferOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance_projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_name" TEXT,
    "category" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "budget_unknown" BOOLEAN NOT NULL DEFAULT false,
    "deliver_by" TIMESTAMP(3),
    "open_to_company_offer" BOOLEAN NOT NULL DEFAULT true,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "state" "ListingState" NOT NULL DEFAULT 'OPEN',
    "published_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelance_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance_attachments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_bids" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "bidder_id" TEXT,
    "is_company_offer" BOOLEAN NOT NULL DEFAULT false,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "delivery_days" INTEGER,
    "message" TEXT NOT NULL,
    "attachment_original_name" TEXT,
    "attachment_stored_name" TEXT,
    "attachment_mime_type" TEXT,
    "attachment_size_bytes" INTEGER,
    "attachment_checksum" TEXT,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "internal_note" TEXT,
    "suggested_amount" BIGINT,
    "outcome" "OfferOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_awards" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT,
    "project_bid_id" TEXT,
    "agreed_amount" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "awarded_by_id" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_verifications_user_id_key" ON "user_verifications"("user_id");

-- CreateIndex
CREATE INDEX "user_verifications_status_idx" ON "user_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "verification_documents_stored_name_key" ON "verification_documents"("stored_name");

-- CreateIndex
CREATE INDEX "verification_documents_verification_id_idx" ON "verification_documents"("verification_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_posts_code_key" ON "job_posts"("code");

-- CreateIndex
CREATE INDEX "job_posts_moderation_status_idx" ON "job_posts"("moderation_status");

-- CreateIndex
CREATE INDEX "job_posts_state_published_at_idx" ON "job_posts"("state", "published_at");

-- CreateIndex
CREATE INDEX "job_posts_author_id_idx" ON "job_posts"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_cv_stored_name_key" ON "job_applications"("cv_stored_name");

-- CreateIndex
CREATE INDEX "job_applications_job_id_moderation_status_idx" ON "job_applications"("job_id", "moderation_status");

-- CreateIndex
CREATE INDEX "job_applications_applicant_id_idx" ON "job_applications"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_job_id_applicant_id_key" ON "job_applications"("job_id", "applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "freelance_projects_code_key" ON "freelance_projects"("code");

-- CreateIndex
CREATE INDEX "freelance_projects_moderation_status_idx" ON "freelance_projects"("moderation_status");

-- CreateIndex
CREATE INDEX "freelance_projects_state_published_at_idx" ON "freelance_projects"("state", "published_at");

-- CreateIndex
CREATE INDEX "freelance_projects_author_id_idx" ON "freelance_projects"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "freelance_attachments_stored_name_key" ON "freelance_attachments"("stored_name");

-- CreateIndex
CREATE INDEX "freelance_attachments_project_id_idx" ON "freelance_attachments"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_bids_attachment_stored_name_key" ON "project_bids"("attachment_stored_name");

-- CreateIndex
CREATE INDEX "project_bids_project_id_moderation_status_idx" ON "project_bids"("project_id", "moderation_status");

-- CreateIndex
CREATE INDEX "project_bids_bidder_id_idx" ON "project_bids"("bidder_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_bids_project_id_bidder_id_key" ON "project_bids"("project_id", "bidder_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_awards_job_application_id_key" ON "marketplace_awards"("job_application_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_awards_project_bid_id_key" ON "marketplace_awards"("project_bid_id");

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "user_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_projects" ADD CONSTRAINT "freelance_projects_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_projects" ADD CONSTRAINT "freelance_projects_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_attachments" ADD CONSTRAINT "freelance_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "freelance_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bids" ADD CONSTRAINT "project_bids_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "freelance_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bids" ADD CONSTRAINT "project_bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bids" ADD CONSTRAINT "project_bids_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_awards" ADD CONSTRAINT "marketplace_awards_awarded_by_id_fkey" FOREIGN KEY ("awarded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-level security for the new tables.
--
-- Grants reach them on their own: the 20260910180000 migration set ALTER
-- DEFAULT PRIVILEGES, so anything a later migration creates is already
-- readable and writable by civitech_app. Row-level security is not covered by
-- that, and a table with RLS off is a table where a GRANT is sufficient on its
-- own — which is precisely the invariant that migration established. Without
-- these statements the marketplace would be the hole in it.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_verifications', 'verification_documents',
    'job_posts', 'job_applications',
    'freelance_projects', 'freelance_attachments',
    'project_bids', 'marketplace_awards'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- civitech_readonly is deliberately given nothing here. A reporting role has
-- no business reading identity documents, cover letters or sealed bids, and
-- with RLS on and no policy it sees nothing even if somebody adds a GRANT.
