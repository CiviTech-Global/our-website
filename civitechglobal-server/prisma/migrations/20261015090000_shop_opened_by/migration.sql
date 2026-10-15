-- Who on the market desk opened a shop, when its owner did not. Null for every
-- shop that exists today: all of them were opened by their owners.

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "opened_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
