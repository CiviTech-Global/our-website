-- SMS through Kavenegar: verified member phones, an opt-out for informational
-- texts, and a log of every text for cost and support. Additive only.

ALTER TABLE "users"
  ADD COLUMN "phone_verified_at" TIMESTAMP(3),
  ADD COLUMN "sms_opt_out" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "SmsStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "SmsStatus" NOT NULL,
    "reason" TEXT,
    "provider_message_id" TEXT,
    "cost" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sms_messages_created_at_idx" ON "sms_messages"("created_at");
CREATE INDEX "sms_messages_kind_status_created_at_idx" ON "sms_messages"("kind", "status", "created_at");
CREATE INDEX "sms_messages_phone_hash_created_at_idx" ON "sms_messages"("phone_hash", "created_at");

-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "sms_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "sms_messages" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
