
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfa_enabled_at" TIMESTAMP(3),
ADD COLUMN     "mfa_recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfa_secret" TEXT;

