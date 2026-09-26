import { z } from 'zod';

/**
 * Wire formats for the TradeMaster module.
 *
 * Money is a digit string on the wire and BigInt in the database, for the same
 * reason it is everywhere else here: an Iranian amount in toman outgrows what
 * a JSON number carries without silently losing its low digits.
 *
 * Every write schema is `.strict()`. A shop body carrying `featured` or
 * `moderationStatus` is either a client bug or somebody trying to promote
 * their own listing, and both are better answered with a 400 than silently
 * dropped — the services also order their spreads defensively, so this is the
 * outer of two guards rather than the only one.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const required = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);

const money = z
  .string()
  .trim()
  .regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد')
  .transform((value) => BigInt(value));

/**
 * A URL we are willing to put in an anchor.
 *
 * http and https only: a `javascript:` or `data:` URL in a seller-supplied
 * field is a stored cross-site scripting hole the moment a template renders it
 * as a link, and Zod's `.url()` accepts both.
 */
const webUrl = z
  .string()
  .trim()
  .max(200)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'نشانی وب نامعتبر است');

const latitude = z.coerce.number().min(-90, 'عرض جغرافیایی نامعتبر است').max(90, 'عرض جغرافیایی نامعتبر است');
const longitude = z.coerce
  .number()
  .min(-180, 'طول جغرافیایی نامعتبر است')
  .max(180, 'طول جغرافیایی نامعتبر است');

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

const shopFields = {
  name: required(2, 120, 'نام فروشگاه الزامی است'),
  summary: required(10, 300, 'معرفی کوتاه الزامی است'),
  description: trimmed(5000).optional(),
  industry: trimmed(80).optional(),
  province: trimmed(60).optional(),
  city: trimmed(60).optional(),
  address: trimmed(300).optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  phone: trimmed(30).optional(),
  email: z.string().trim().email('نشانی ایمیل نامعتبر است').max(160).optional(),
  website: webUrl.optional(),
};

export const shopSchema = z.object(shopFields).strict();

/**
 * Every field optional, but not an empty body.
 *
 * A PATCH with nothing in it is a request that cannot be satisfied and
 * usually means the client serialised the form wrong; answering 400 is more
 * useful than a 200 that changed nothing.
 */
export const shopUpdateSchema = z
  .object(shopFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'هیچ تغییری ارسال نشده است');

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const productFields = {
  title: required(2, 160, 'عنوان کالا الزامی است'),
  summary: required(10, 300, 'معرفی کوتاه الزامی است'),
  description: trimmed(5000).optional(),
  categoryId: trimmed(40).optional(),
  price: money,
  stock: z.coerce.number().int().min(0, 'موجودی نمی‌تواند منفی باشد').max(1_000_000).optional(),
  negotiable: z.coerce.boolean().optional(),
};

export const productSchema = z.object(productFields).strict();

export const productUpdateSchema = z
  .object({ ...productFields, price: money.optional() })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'هیچ تغییری ارسال نشده است');

export const variantSchema = z
  .object({
    label: required(1, 60, 'عنوان تنوع الزامی است'),
    sku: trimmed(60).optional(),
    price: money.optional(),
    stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();

export const imageCaptionSchema = z.object({ caption: trimmed(160).optional() }).strict();

// ---------------------------------------------------------------------------
// Browsing
// ---------------------------------------------------------------------------

const page = z.coerce.number().int().min(1).default(1);
/**
 * Capped at 60. An uncapped page size is a way to ask the server to serialise
 * the whole catalogue in one request.
 */
const pageSize = z.coerce.number().int().min(1).max(60).default(20);

export const shopBoardSchema = z.object({
  search: trimmed(120).optional(),
  province: trimmed(60).optional(),
  industry: trimmed(80).optional(),
  sort: z.enum(['newest', 'name']).optional(),
  page,
  pageSize,
});

export const productBoardSchema = z.object({
  search: trimmed(120).optional(),
  categoryId: trimmed(40).optional(),
  shopSlug: trimmed(80).optional(),
  province: trimmed(60).optional(),
  priceMin: money.optional(),
  priceMax: money.optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'priceAsc', 'priceDesc']).optional(),
  page,
  pageSize,
});

export const reviewQueueSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']).optional(),
  search: trimmed(120).optional(),
  page,
  pageSize,
});

/**
 * A reviewer's decision.
 *
 * The note is required for anything that is not an approval, and that rule
 * lives in `moderation.ts` rather than here — it is the same rule for every
 * queue on the site, and a second copy is a second thing to drift.
 */
export const reviewDecisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
    reviewNote: trimmed(2000).optional(),
    internalNote: trimmed(2000).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * One basket line.
 *
 * No price field, deliberately. The service reads the price from the database,
 * so accepting one here would create a field that looks authoritative, is
 * ignored, and eventually gets trusted by somebody.
 */
const basketLine = z
  .object({
    productId: required(1, 40, 'کالا مشخص نشده است'),
    variantId: trimmed(40).optional(),
    quantity: z.coerce.number().int().min(1, 'تعداد باید حداقل ۱ باشد').max(100),
  })
  .strict();

export const checkoutSchema = z
  .object({
    lines: z.array(basketLine).min(1, 'سبد خرید خالی است').max(50),
    recipientName: required(2, 120, 'نام گیرنده الزامی است'),
    recipientPhone: required(6, 30, 'شمارهٔ تماس گیرنده الزامی است'),
    province: required(2, 60, 'استان الزامی است'),
    city: required(2, 60, 'شهر الزامی است'),
    address: required(10, 400, 'نشانی الزامی است'),
    postalCode: trimmed(20).optional(),
    buyerNote: trimmed(1000).optional(),
  })
  .strict();

/**
 * Where the gateway should send the buyer back to.
 *
 * A path, not a URL. Accepting a full URL would let a caller choose where the
 * payment flow lands, which is an open redirect with a payment reference
 * attached; the route turns this into an absolute URL against our own origin.
 */
export const startPaymentSchema = z
  .object({
    returnPath: z
      .string()
      .trim()
      .max(200)
      /**
       * One leading slash, and not two.
       *
       * `//evil.test/steal` is a protocol-relative URL: it satisfies "starts
       * with a slash" and contains nothing but permitted characters, and a
       * browser resolves it to https://evil.test/steal. The first version of
       * this pattern allowed it, which made the whole restriction decorative —
       * a test caught it, not a review.
       */
      .regex(/^\/(?!\/)[A-Za-z0-9\-._~/]*$/, 'مسیر بازگشت نامعتبر است')
      .optional(),
  })
  .strict();

export const paymentReturnSchema = z.object({
  reference: required(1, 200, 'شناسهٔ پرداخت ارسال نشده است'),
});

/**
 * Moving an order.
 *
 * Which transitions are legal, and who may perform them, is decided by the
 * table in trademaster-order.service.ts rather than here — one place, so the
 * wire format cannot come to disagree with the rule.
 */
export const orderMoveSchema = z
  .object({
    to: z.enum(['AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    note: trimmed(1000).optional(),
    shipping: money.optional(),
    trackingCarrier: trimmed(80).optional(),
    trackingCode: trimmed(80).optional(),
  })
  .strict();

export const orderListSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'AWAITING_PAYMENT',
      'PAID',
      'CONFIRMED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
  page,
  pageSize,
});
