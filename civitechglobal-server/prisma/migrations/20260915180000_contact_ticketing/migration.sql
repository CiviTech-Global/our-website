-- Contact becomes a ticketing system.
--
-- There is no outbound email in this deployment, so a reply cannot be sent —
-- it has to be fetched. That makes the tracking code the only route back to a
-- visitor's own message, and the status the only signal that anything has
-- happened. Both are added here.

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- AlterTable: status first, since it has a default and needs no backfill.
ALTER TABLE "contact_messages"
  ADD COLUMN "status" "TicketStatus" NOT NULL DEFAULT 'OPEN';

-- The tracking code is added nullable, backfilled, and only then made NOT
-- NULL. Adding it NOT NULL in one step is what Prisma's generated diff does
-- and it fails outright on a table that already has rows — every message
-- received before today would have no code and the migration would abort.
ALTER TABLE "contact_messages" ADD COLUMN "tracking_code" TEXT;

-- Backfill, using the same alphabet as the application's generateTrackingCode:
-- digits and uppercase letters minus the ones that are ambiguous read aloud —
-- 0/O, 1/I/L, U (heard as "you") and S/5. A visitor quotes this down a phone
-- line, so legibility beats the two bits of entropy dropped.
--
-- The loop retries on collision rather than assuming uniqueness. At 28^10 a
-- clash is vanishingly unlikely, but "vanishingly unlikely" inside a migration
-- that cannot be re-run is not the same as impossible.
DO $$
DECLARE
  r RECORD;
  candidate TEXT;
  alphabet CONSTANT TEXT := '2346789ABCDEFGHJKMNPQRTVWXYZ';
  i INT;
BEGIN
  FOR r IN SELECT id FROM contact_messages WHERE tracking_code IS NULL LOOP
    LOOP
      candidate := '';
      FOR i IN 1..10 LOOP
        candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM contact_messages WHERE tracking_code = candidate);
    END LOOP;
    UPDATE contact_messages SET tracking_code = candidate WHERE id = r.id;
  END LOOP;
END
$$;

ALTER TABLE "contact_messages" ALTER COLUMN "tracking_code" SET NOT NULL;

-- CreateTable
CREATE TABLE "contact_replies" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_replies_message_id_created_at_idx" ON "contact_replies"("message_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contact_messages_tracking_code_key" ON "contact_messages"("tracking_code");

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_replies" ADD CONSTRAINT "contact_replies_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "contact_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_replies" ADD CONSTRAINT "contact_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries grants forward to a new table but never this, so it has
-- to be restated — and a table holding what staff wrote back to a member of
-- the public is not one to leave open to a bare GRANT.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contact_replies']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;
