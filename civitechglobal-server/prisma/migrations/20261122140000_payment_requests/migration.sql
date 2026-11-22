-- Staff-issued payment requests (consultations, freelance contracts, any
-- arranged work with a price): the PAYMENT_REQUEST purpose on intents, the
-- payment_requests table, and the purpose check extended to the third arm.
ALTER TYPE "PaymentPurpose" ADD VALUE 'PAYMENT_REQUEST';

CREATE TABLE "payment_requests" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IRT',
  "beneficiary_iban" TEXT,
  "beneficiary_name" TEXT,
  "payer_user_id" TEXT,
  "consultation_request_id" TEXT,
  "award_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_requests_code_key" ON "payment_requests"("code");
CREATE UNIQUE INDEX "payment_requests_consultation_request_id_key" ON "payment_requests"("consultation_request_id");
CREATE UNIQUE INDEX "payment_requests_award_id_key" ON "payment_requests"("award_id");
CREATE INDEX "payment_requests_payer_user_id_idx" ON "payment_requests"("payer_user_id");

ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_payer_user_id_fkey"
  FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_consultation_request_id_fkey"
  FOREIGN KEY ("consultation_request_id") REFERENCES "consultation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_award_id_fkey"
  FOREIGN KEY ("award_id") REFERENCES "marketplace_awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_intents" ADD COLUMN "payment_request_id" TEXT;
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payment_request_id_fkey"
  FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "payment_intents_payment_request_id_idx" ON "payment_intents"("payment_request_id");

-- Each purpose carries the one thing it pays for, and only that one.
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_purpose_check";
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_purpose_check" CHECK (
  ("purpose" = 'ORDER' AND "order_id" IS NOT NULL AND "subscription_id" IS NULL AND "payment_request_id" IS NULL)
  OR ("purpose" = 'SUBSCRIPTION' AND "subscription_id" IS NOT NULL AND "order_id" IS NULL AND "payment_request_id" IS NULL)
  OR ("purpose" = 'PAYMENT_REQUEST' AND "payment_request_id" IS NOT NULL AND "order_id" IS NULL AND "subscription_id" IS NULL)
);
