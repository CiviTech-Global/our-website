-- Two more pieces of the product catalog.
--
-- `key_facts` is the spec strip: the handful of numbers someone scans before
-- reading a word of prose — compulsory or not, policy term, waiting period,
-- excess, how long they have to report a claim. Buried in a paragraph these
-- get missed; in a grid at the top of the page they get read.
--
-- `claim_steps` is what to do after something goes wrong, in order. A policy is
-- bought once and claimed on under stress, so the procedure belongs on the
-- product page rather than in a PDF nobody opens until the worst day.
--
-- Both default to empty and the seed fills them, so existing rows stay valid.

ALTER TABLE "insurance_products"
  -- [{ label, value }]. Shape enforced by the TypeScript catalog that writes
  -- it, for the same reason form_schema and faq are JSONB.
  ADD COLUMN "key_facts"   JSONB,
  ADD COLUMN "claim_steps" TEXT[] DEFAULT ARRAY[]::TEXT[];
