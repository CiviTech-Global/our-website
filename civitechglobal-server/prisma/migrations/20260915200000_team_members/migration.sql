
-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "team" TEXT,
    "photo_stored_name" TEXT,
    "photo_original_name" TEXT,
    "photo_mime_type" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "website" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_published_display_order_idx" ON "team_members"("published", "display_order");


-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries grants forward to a new table but never this.
--
-- The page is public, so the rows are not secret — but the invariant is not
-- "secure the secret tables", it is "no table where a GRANT alone is enough".
-- An exception granted on the grounds that this one is harmless is how the
-- rule stops being a rule.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['team_members']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;
