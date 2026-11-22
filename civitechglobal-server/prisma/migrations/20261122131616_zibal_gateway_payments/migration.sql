-- Zibal payment gateway: where each payment's buyer returns to after the
-- gateway callback, the beneficiary shares of a shared (تسهیم) payment, and
-- the payout Sheba of sellers and experts whose share is settled by the
-- gateway at transaction time.
ALTER TABLE "payment_intents" ADD COLUMN "buyer_return_url" TEXT;
ALTER TABLE "payment_intents" ADD COLUMN "splits" JSONB;
ALTER TABLE "businesses" ADD COLUMN "payout_iban" TEXT;
ALTER TABLE "experts" ADD COLUMN "payout_iban" TEXT;
