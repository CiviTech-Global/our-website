-- Plans and limits, member-edited expert profiles, company accounts, and
-- payments that can be for something other than an order.
--
-- Additive only: every new column is nullable or has a default, and every
-- existing row keeps behaving as it did. Experts written by staff are
-- APPROVED; existing payments are ORDER payments.

-- Enums ----------------------------------------------------------------------

CREATE TYPE "PlanSubject" AS ENUM ('USER', 'BUSINESS', 'COMPANY');
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'PREMIUM', 'VIP');
CREATE TYPE "PlanLimitKind" AS ENUM ('STOCK', 'MONTHLY', 'LIFETIME');
CREATE TYPE "PlanSubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PlanSubscriptionSource" AS ENUM ('PURCHASE', 'STAFF_GRANT');
CREATE TYPE "PaymentPurpose" AS ENUM ('ORDER', 'SUBSCRIPTION');

-- Users: professional links, company accounts, staff-opened accounts ---------

ALTER TABLE "users"
  ADD COLUMN "github_url" TEXT,
  ADD COLUMN "linkedin_url" TEXT,
  ADD COLUMN "account_kind" "AccountKind" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "staff_vouched_at" TIMESTAMP(3),
  ADD COLUMN "staff_vouched_by_id" TEXT;

-- Companies: the legal entity's national id ----------------------------------

ALTER TABLE "companies" ADD COLUMN "national_id" TEXT;
CREATE UNIQUE INDEX "companies_national_id_key" ON "companies"("national_id");

-- Jobs and projects posted as a shop or a company ----------------------------

ALTER TABLE "job_posts" ADD COLUMN "business_id" TEXT;
CREATE INDEX "job_posts_business_id_idx" ON "job_posts"("business_id");
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "freelance_projects"
  ADD COLUMN "business_id" TEXT,
  ADD COLUMN "company_id" TEXT;
CREATE INDEX "freelance_projects_business_id_idx" ON "freelance_projects"("business_id");
CREATE INDEX "freelance_projects_company_id_idx" ON "freelance_projects"("company_id");
ALTER TABLE "freelance_projects" ADD CONSTRAINT "freelance_projects_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "freelance_projects" ADD CONSTRAINT "freelance_projects_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Experts: the account behind the profile, the fee, self-submission ----------

ALTER TABLE "experts"
  ADD COLUMN "user_id" TEXT,
  ADD COLUMN "hourly_fee" BIGINT,
  ADD COLUMN "fee_currency" TEXT NOT NULL DEFAULT 'IRT',
  ADD COLUMN "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "review_note" TEXT;
CREATE UNIQUE INDEX "experts_user_id_key" ON "experts"("user_id");
ALTER TABLE "experts" ADD CONSTRAINT "experts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "experts" ADD CONSTRAINT "experts_hourly_fee_positive" CHECK ("hourly_fee" IS NULL OR "hourly_fee" > 0);

-- Plan catalogue -------------------------------------------------------------

CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" "PlanSubject" NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_features_key_key" ON "plan_features"("key");
CREATE INDEX "plan_features_subject_sort_order_idx" ON "plan_features"("subject", "sort_order");

CREATE TABLE "plan_feature_levels" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "kind" "PlanLimitKind" NOT NULL,
    "limit" INTEGER,
    "live_days" INTEGER,
    "price_irt" BIGINT,
    "price_usdt" DECIMAL(12,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_levels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plan_feature_levels_limit_check" CHECK ("limit" IS NULL OR "limit" >= 0),
    CONSTRAINT "plan_feature_levels_price_check" CHECK ("price_irt" IS NULL OR "price_irt" >= 0)
);
CREATE UNIQUE INDEX "plan_feature_levels_feature_id_tier_key" ON "plan_feature_levels"("feature_id", "tier");
ALTER TABLE "plan_feature_levels" ADD CONSTRAINT "plan_feature_levels_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "plan_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscriptions --------------------------------------------------------------

CREATE TABLE "plan_subscriptions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject" "PlanSubject" NOT NULL,
    "user_id" TEXT,
    "company_id" TEXT,
    "status" "PlanSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "source" "PlanSubscriptionSource" NOT NULL,
    "tier" "PlanTier",
    "months" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "total" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "granted_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_subscriptions_pkey" PRIMARY KEY ("id"),
    -- Exactly the holder the subject names: an account for USER and BUSINESS,
    -- a company for COMPANY.
    CONSTRAINT "plan_subscriptions_holder_check" CHECK (
      ("subject" = 'COMPANY' AND "company_id" IS NOT NULL AND "user_id" IS NULL)
      OR ("subject" <> 'COMPANY' AND "user_id" IS NOT NULL AND "company_id" IS NULL)
    ),
    CONSTRAINT "plan_subscriptions_months_check" CHECK ("months" BETWEEN 1 AND 24),
    CONSTRAINT "plan_subscriptions_total_check" CHECK ("total" >= 0)
);
CREATE UNIQUE INDEX "plan_subscriptions_code_key" ON "plan_subscriptions"("code");
CREATE INDEX "plan_subscriptions_user_id_subject_status_ends_at_idx" ON "plan_subscriptions"("user_id", "subject", "status", "ends_at");
CREATE INDEX "plan_subscriptions_company_id_status_ends_at_idx" ON "plan_subscriptions"("company_id", "status", "ends_at");
CREATE INDEX "plan_subscriptions_status_created_at_idx" ON "plan_subscriptions"("status", "created_at");
ALTER TABLE "plan_subscriptions" ADD CONSTRAINT "plan_subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_subscriptions" ADD CONSTRAINT "plan_subscriptions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "plan_subscription_items" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "kind" "PlanLimitKind" NOT NULL,
    "limit" INTEGER,
    "live_days" INTEGER,
    "monthly_price" BIGINT NOT NULL,

    CONSTRAINT "plan_subscription_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_subscription_items_subscription_id_feature_key_key" ON "plan_subscription_items"("subscription_id", "feature_key");
ALTER TABLE "plan_subscription_items" ADD CONSTRAINT "plan_subscription_items_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "plan_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Usage and limit-hit events -------------------------------------------------

CREATE TABLE "plan_usage" (
    "id" TEXT NOT NULL,
    "holder_key" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "live_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "plan_usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_usage_feature_key_subject_id_key" ON "plan_usage"("feature_key", "subject_id");
CREATE INDEX "plan_usage_holder_key_feature_key_created_at_idx" ON "plan_usage"("holder_key", "feature_key", "created_at");

CREATE TABLE "plan_quota_events" (
    "id" TEXT NOT NULL,
    "holder_key" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "limit" INTEGER,
    "used" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_quota_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plan_quota_events_feature_key_outcome_created_at_idx" ON "plan_quota_events"("feature_key", "outcome", "created_at");
CREATE INDEX "plan_quota_events_holder_key_created_at_idx" ON "plan_quota_events"("holder_key", "created_at");

-- Payments for something other than an order ---------------------------------

ALTER TABLE "payment_intents"
  ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'ORDER',
  ADD COLUMN "subscription_id" TEXT,
  ADD COLUMN "payer_user_id" TEXT,
  ALTER COLUMN "order_id" DROP NOT NULL;
CREATE INDEX "payment_intents_subscription_id_idx" ON "payment_intents"("subscription_id");
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "plan_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Each purpose carries the one thing it pays for.
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_purpose_check" CHECK (
  ("purpose" = 'ORDER' AND "order_id" IS NOT NULL AND "subscription_id" IS NULL)
  OR ("purpose" = 'SUBSCRIPTION' AND "subscription_id" IS NOT NULL AND "order_id" IS NULL)
);

-- Row-level security, as for every application table; see rls-invariant.test.ts.
ALTER TABLE "plan_features" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_features" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "plan_feature_levels" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_feature_levels" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "plan_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_subscriptions" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "plan_subscription_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_subscription_items" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "plan_usage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_usage" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
ALTER TABLE "plan_quota_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_full_access ON "plan_quota_events" FOR ALL TO civitech_app USING (true) WITH CHECK (true);
