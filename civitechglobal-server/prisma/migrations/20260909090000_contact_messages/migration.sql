-- Persist contact-form messages.
--
-- The form used to open a mailto: link and store nothing, so an enquiry
-- survived only if the visitor had a mail client configured and actually sent
-- it. Everything else vanished without a trace on either side.
--
-- No status enum: two nullable timestamps (read, handled) answer the only two
-- questions anyone asks of an inbox, and a workflow beyond that should be a
-- deliberate later decision rather than something an enum invited early.

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "handled_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_email_hash_idx" ON "contact_messages"("email_hash");

