-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" BIGINT NOT NULL,
    "shipping" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postal_code" TEXT,
    "buyer_note" TEXT,
    "cancel_reason" TEXT,
    "internal_note" TEXT,
    "tracking_carrier" TEXT,
    "tracking_code" TEXT,
    "paid_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "variant_id" TEXT,
    "title_at_purchase" TEXT NOT NULL,
    "variant_at_purchase" TEXT,
    "unit_price" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "reference" TEXT,
    "redirect_url" TEXT,
    "failure_reason" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_buyer_id_status_idx" ON "orders"("buyer_id", "status");

-- CreateIndex
CREATE INDEX "orders_business_id_status_idx" ON "orders"("business_id", "status");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_reference_key" ON "payment_intents"("reference");

-- CreateIndex
CREATE INDEX "payment_intents_order_id_status_idx" ON "payment_intents"("order_id", "status");

-- CreateIndex
CREATE INDEX "book_listings_title_trgm_idx" ON "book_listings" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "book_listings_book_author_trgm_idx" ON "book_listings" USING GIN ("book_author" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Row-level security, as for every application table. ALTER DEFAULT
-- PRIVILEGES carries the grants forward to a new table but never this, and
-- rls-invariant.test.ts fails the build on any table that misses it.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders', 'order_items', 'payment_intents']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- civitech_readonly is given nothing, and here that matters more than usual:
-- these three tables hold delivery addresses, telephone numbers and payment
-- references. A reporting role has no business reading any of it, and the
-- aggregate figures somebody would actually want can be produced without it.
