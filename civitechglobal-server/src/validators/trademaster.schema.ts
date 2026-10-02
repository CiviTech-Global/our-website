import { z } from 'zod';
import { toLatinDigits } from '../services/trademaster-common.js';

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
 *
 * EMPTY VALUES. Nothing here uses `z.coerce` on input a person can leave blank.
 * It turns '' into 0 for numbers and into true for booleans, which is how an
 * emptied latitude became a search centred on the Gulf of Guinea and
 * `inStock=false` came to mean "in stock". Blank is handled explicitly instead:
 * absent on a query or a new record, "remove it" on an edit.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const required = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);

/**
 * Text with its Persian and Arabic-Indic digits made ASCII, before any rule
 * looks at it. An Iranian keyboard types ۰۹۱۲ and ۱۲۰۰۰۰; both are valid.
 */
const latinDigits = (value: unknown) => (typeof value === 'string' ? toLatinDigits(value) : value);

/** Blank means absent — on a query string, where an emptied filter arrives as ''. */
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Blank means "remove it", on an edit.
 *
 * The edit form sends an emptied field as '' or null, and both mean the same
 * thing to the person who emptied it. Normalised to null, which the services
 * read as "clear", as opposed to an absent key, which they read as "leave".
 */
const blankToNull = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '') ? null : value;

/** Optional, and emptiable: absent leaves it, blank or null removes it. */
const clearable = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(blankToNull, schema.nullable()).optional();

const money = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    // Thousands separators are what people type into a price box, and the
    // number they meant is unambiguous without them.
    .transform((value) => value.replace(/[,،٬\s]/g, ''))
    .pipe(z.string().regex(/^\d{1,15}$/, 'مبلغ باید عددی صحیح باشد'))
    .transform((value) => BigInt(value))
);

/** A price somebody means. Zero reads as "free", which no seller intends. */
const price = money.refine((value) => value > 0n, 'قیمت باید بیشتر از صفر باشد');

/**
 * A whole number of things in stock, from JSON or a form.
 *
 * A number, or a digit string. '' and stray letters are refused rather than
 * read as 0 or NaN — both used to reach the column.
 */
const count = z
  .preprocess(
    (value) => (typeof value === 'string' ? toLatinDigits(value).trim() : value),
    z.union([
      z.number(),
      z.string().regex(/^\d+$/, 'تعداد باید عددی صحیح باشد').transform(Number),
    ])
  )
  .pipe(
    z
      .number()
      .int('تعداد باید عددی صحیح باشد')
      .min(0, 'تعداد نمی‌تواند منفی باشد')
      .max(1_000_000, 'تعداد بیش از حد مجاز است')
  );

/** A true/false from a query string, where every value arrives as text. */
const queryBoolean = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}, z.boolean().optional());

/** A phone number as people write it: digits, an optional +, spaces and dashes. */
const phone = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[0-9][0-9\s-]{5,24}$/, 'شمارهٔ تماس معتبر نیست')
);

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

/**
 * A coordinate in a JSON body: a finite number.
 *
 * Not coerced. A form that computed NaN sends null once it is JSON, and
 * `z.coerce.number()` turned that null into 0 — a valid latitude, and a shop
 * pinned to the equator.
 */
const latitude = z
  .number({ invalid_type_error: 'عرض جغرافیایی نامعتبر است' })
  .finite('عرض جغرافیایی نامعتبر است')
  .min(-90, 'عرض جغرافیایی نامعتبر است')
  .max(90, 'عرض جغرافیایی نامعتبر است');
const longitude = z
  .number({ invalid_type_error: 'طول جغرافیایی نامعتبر است' })
  .finite('طول جغرافیایی نامعتبر است')
  .min(-180, 'طول جغرافیایی نامعتبر است')
  .max(180, 'طول جغرافیایی نامعتبر است');

/**
 * A number from a query string: text that must parse, and blank is absent.
 *
 * Persian digits are accepted, so a location typed by hand is not refused for
 * its script.
 */
const queryNumber = (inner: z.ZodNumber) =>
  z.preprocess((value) => {
    const blank = blankToUndefined(value);
    if (typeof blank !== 'string') return blank;
    const parsed = Number(toLatinDigits(blank.trim()));
    return Number.isFinite(parsed) ? parsed : blank;
  }, inner.optional());

/** An optional query string value; blank is absent. */
const queryText = (max: number) => z.preprocess(blankToUndefined, trimmed(max).optional());

const kind = z.enum(['PRODUCT', 'SERVICE'], { message: 'نوع مورد را انتخاب کنید' });

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

const shopFields = {
  name: required(2, 120, 'نام فروشگاه باید دست‌کم ۲ نویسه باشد'),
  summary: required(10, 300, 'معرفی کوتاه باید دست‌کم ۱۰ نویسه باشد'),
  description: clearable(trimmed(5000)),
  industry: clearable(trimmed(80)),
  province: clearable(trimmed(60)),
  city: clearable(trimmed(60)),
  address: clearable(trimmed(300)),
  // Null clears the location; both halves move together — see locationIsWhole.
  latitude: z.preprocess(blankToNull, latitude.nullable()).optional(),
  longitude: z.preprocess(blankToNull, longitude.nullable()).optional(),
  phone: clearable(phone),
  email: clearable(z.string().trim().email('نشانی ایمیل نامعتبر است').max(160)),
  website: clearable(webUrl),
};

/**
 * Both halves of a location, or neither.
 *
 * Half a coordinate puts a pin at (0, 0), and a cleared latitude beside a kept
 * longitude is half a coordinate. Refused here, with the field named, so the
 * form can say which box is wrong.
 */
function locationIsWhole(body: { latitude?: number | null; longitude?: number | null }): boolean {
  const lat = body.latitude;
  const lng = body.longitude;
  if (lat === undefined && lng === undefined) return true;
  if (lat === null && lng === null) return true;
  return typeof lat === 'number' && typeof lng === 'number';
}

const LOCATION_HALF = {
  message: 'برای ثبت موقعیت، هر دو مقدار طول و عرض جغرافیایی لازم است',
  path: ['latitude'],
};

export const shopSchema = z.object(shopFields).strict().refine(locationIsWhole, LOCATION_HALF);

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
  .refine((body) => Object.keys(body).length > 0, 'هیچ تغییری ارسال نشده است')
  .refine(locationIsWhole, LOCATION_HALF);

// ---------------------------------------------------------------------------
// Products and services
// ---------------------------------------------------------------------------

const productFields = {
  /** Products or a service. Optional on create for older clients; PRODUCT then. */
  kind: kind.default('PRODUCT'),
  title: required(2, 160, 'عنوان باید دست‌کم ۲ نویسه باشد'),
  summary: required(10, 300, 'معرفی کوتاه باید دست‌کم ۱۰ نویسه باشد'),
  description: clearable(trimmed(5000)),
  categoryId: clearable(trimmed(40)),
  price,
  stock: count.optional(),
  /** A real boolean. `z.coerce.boolean()` read the string "false" as true. */
  negotiable: z.boolean().optional(),
};

export const productSchema = z.object(productFields).strict();

export const productUpdateSchema = z
  .object({ ...productFields, kind: kind.optional() })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'هیچ تغییری ارسال نشده است');

/**
 * One option of a listing — "Large", "Red", "With beard trim" — with its own
 * price if it needs one.
 *
 * `price` is nullable as well as optional, and the two are different
 * instructions on an edit: absent leaves the override alone, null (or a blank
 * box) removes it so the option costs whatever the listing costs.
 */
export const variantSchema = z
  .object({
    label: required(1, 60, 'عنوان تنوع الزامی است'),
    sku: clearable(trimmed(60)),
    price: z.preprocess(blankToNull, price.nullable()).optional(),
    stock: count.optional(),
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

/** The location half of a board query. Kilometres for the radius. */
const nearFields = {
  /**
   * A coordinate pair turns the board into a proximity search.
   *
   * Both or neither: the service refuses half a pair rather than ignoring it,
   * because ignoring it would answer a different question than the one asked
   * and look like the feature is broken.
   */
  latitude: queryNumber(
    z.number().min(-90, 'عرض جغرافیایی نامعتبر است').max(90, 'عرض جغرافیایی نامعتبر است')
  ),
  longitude: queryNumber(
    z.number().min(-180, 'طول جغرافیایی نامعتبر است').max(180, 'طول جغرافیایی نامعتبر است')
  ),
  /** Capped in the service at MAX_RADIUS_KM; capped here so the number is sane. */
  radiusKm: queryNumber(
    z.number().min(0.1, 'شعاع نامعتبر است').max(200, 'شعاع حداکثر ۲۰۰ کیلومتر است')
  ),
};

export const shopBoardSchema = z.object({
  search: queryText(120),
  province: queryText(60),
  industry: queryText(80),
  /** Shops that offer products, or services. */
  kind: z.preprocess(blankToUndefined, kind.optional()),
  /** Shops with something in this category, or in one of its children. */
  categoryId: queryText(40),
  sort: z.preprocess(blankToUndefined, z.enum(['newest', 'name', 'nearest']).optional()),
  ...nearFields,
  page,
  pageSize,
});

/** The map takes the board's filters, without paging or a sort. */
export const shopMapSchema = shopBoardSchema.omit({ page: true, pageSize: true, sort: true });

export const productBoardSchema = z.object({
  search: queryText(120),
  kind: z.preprocess(blankToUndefined, kind.optional()),
  categoryId: queryText(40),
  shopSlug: queryText(80),
  province: queryText(60),
  priceMin: z.preprocess(blankToUndefined, money.optional()),
  priceMax: z.preprocess(blankToUndefined, money.optional()),
  inStock: queryBoolean,
  sort: z.preprocess(
    blankToUndefined,
    z.enum(['newest', 'priceAsc', 'priceDesc', 'nearest']).optional()
  ),
  ...nearFields,
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
    recipientPhone: phone,
    province: required(2, 60, 'استان الزامی است'),
    city: required(2, 60, 'شهر الزامی است'),
    address: required(10, 400, 'نشانی الزامی است'),
    postalCode: z.preprocess(latinDigits, trimmed(20)).optional(),
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

/**
 * A category, as the desk sends it.
 *
 * `parentId` is nullable on purpose and the two absent-ish values mean
 * different things: omitted leaves the parent alone, explicit null moves the
 * category to the top level. The service relies on that distinction, so the
 * schema must preserve it rather than normalising null away.
 *
 * No `slug` is required — the service derives one from the name and suffixes
 * it until it is free. A slug may still be sent to fix an ugly transliteration.
 */
export const categorySchema = z
  .object({
    name: required(2, 80, 'نام دسته‌بندی را وارد کنید'),
    /** Top-level categories only; a child takes its parent's. */
    kind: kind.optional(),
    slug: trimmed(60).optional(),
    parentId: z.string().cuid('دستهٔ والد نامعتبر است').nullable().optional(),
    position: z.coerce.number().int().min(0).max(9999).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const categoryUpdateSchema = categorySchema.partial();
