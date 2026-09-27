-- CreateTable
CREATE TABLE "demo_records" (
    "id" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_records_batch_sequence_idx" ON "demo_records"("batch", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "demo_records_model_record_id_key" ON "demo_records"("model", "record_id");


-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries the grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE demo_records ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY app_full_access ON demo_records FOR ALL TO civitech_app USING (true) WITH CHECK (true)';
END
$$;
