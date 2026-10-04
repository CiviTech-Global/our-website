-- Tracking codes a member keeps on their account; see tracking.service.ts.
CREATE TABLE "tracked_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracked_requests_user_id_code_key" ON "tracked_requests"("user_id", "code");
CREATE INDEX "tracked_requests_user_id_created_at_idx" ON "tracked_requests"("user_id", "created_at");

ALTER TABLE "tracked_requests" ADD CONSTRAINT "tracked_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "tracked_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "tracked_requests"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
