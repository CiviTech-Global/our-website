-- Talent intake: a CV, the person behind it, and how to reach them.
--
-- The identity is the SAME client_identities row the project intake uses, not a
-- parallel table. Somebody who both commissions work and applies for a job is
-- one person, so the (email, phone) pairing rule already enforced by the unique
-- indexes on that table covers this intake too, without being written twice.
--
-- Exactly one file per submission, stored the way project attachments are:
-- outside any served directory, under a generated name, with its type decided
-- by the file's own leading bytes rather than by its extension.
--
-- Nothing here is destructive: the table and its three enums are all new.

-- CreateEnum
CREATE TYPE "ResumeStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'SHORTLISTED', 'MATCHED', 'ON_HOLD', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE', 'ANY');

-- CreateTable
CREATE TABLE "resume_submissions" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "birth_year" INTEGER,
    "headline" TEXT,
    "years_of_experience" INTEGER,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desired_role" TEXT,
    "employment_type" "EmploymentType",
    "work_arrangement" "WorkArrangement",
    "expected_salary" BIGINT,
    "available_from" TIMESTAMP(3),
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "portfolio_url" TEXT,
    "cover_note" TEXT,
    "resume_original_name" TEXT NOT NULL,
    "resume_stored_name" TEXT NOT NULL,
    "resume_mime_type" TEXT NOT NULL,
    "resume_size_bytes" INTEGER NOT NULL,
    "resume_checksum" TEXT NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'RECEIVED',
    "internal_notes" TEXT,
    "matched_role" TEXT,
    "assigned_to_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_submissions_tracking_code_key" ON "resume_submissions"("tracking_code");

-- CreateIndex
CREATE UNIQUE INDEX "resume_submissions_resume_stored_name_key" ON "resume_submissions"("resume_stored_name");

-- CreateIndex
CREATE INDEX "resume_submissions_status_idx" ON "resume_submissions"("status");

-- CreateIndex
CREATE INDEX "resume_submissions_createdAt_idx" ON "resume_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "resume_submissions_identity_id_idx" ON "resume_submissions"("identity_id");

-- CreateIndex
CREATE INDEX "resume_submissions_assigned_to_id_idx" ON "resume_submissions"("assigned_to_id");

-- AddForeignKey
ALTER TABLE "resume_submissions" ADD CONSTRAINT "resume_submissions_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "client_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_submissions" ADD CONSTRAINT "resume_submissions_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
