-- Phones that receive an account's notifications as pushes; see services/push.
CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "app_version" TEXT,
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_devices_provider_token_key" ON "push_devices"("provider", "token");
CREATE INDEX "push_devices_user_id_idx" ON "push_devices"("user_id");

ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "push_devices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "push_devices"
  FOR ALL TO civitech_app USING (true) WITH CHECK (true);
