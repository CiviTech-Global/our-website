-- Richer product detail: what a policy does not pay for, what to bring, what
-- moves the price, and the questions people ask before they ask them.
--
-- Coverages alone describe only the good half of a policy. The exclusion list
-- is where disappointment lives, and someone who discovers an exclusion at
-- claim time discovers it in the worst possible circumstances. We quote no
-- prices, so `premium_factors` is the honest substitute: the variables a
-- specialist will ask about.
--
-- All four default to empty, so existing rows stay valid and the seed fills
-- them on its next run. Scalar lists are nullable because that is what Prisma
-- emits for them; see the note in the products table migration.

ALTER TABLE "insurance_products"
  ADD COLUMN "exclusions"         TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "required_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "premium_factors"    TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- [{ question, answer }]. Shape is enforced by the TypeScript catalog that
  -- writes it, not by the database, for the same reason form_schema is JSONB.
  ADD COLUMN "faq"                JSONB;
