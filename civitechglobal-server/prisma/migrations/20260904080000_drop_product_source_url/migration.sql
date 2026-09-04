-- Drop `insurance_products.source_url`.
--
-- The column held the page each product's facts were researched from. It was
-- written by the seed and read by nothing — not the public catalog, not the
-- product page, not the admin panel — so all it did was keep another company's
-- URL in our database. Provenance belongs in the research guide
-- (guides/insurance-catalog-research.md), which is internal, versioned and can
-- explain itself; a bare column cannot.

ALTER TABLE "insurance_products" DROP COLUMN "source_url";
