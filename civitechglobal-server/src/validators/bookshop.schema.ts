import { z } from 'zod';
import { normalizePersianDigits } from '../utils/persian.js';
import { CURRENCIES } from '../catalog/geo.js';
import { BOOK_BINDINGS, BOOK_DELIVERY, BOOK_GRADES, BOOK_TRIM_SIZES, YEAR_CALENDARS } from '../catalog/book-taxonomy.js';

/**
 * Wire formats for the book market's second generation: the catalogue entry,
 * the offer of a copy, the board query, and purchase requests.
 */

const latinDigits = (value: unknown) => (typeof value === 'string' ? normalizePersianDigits(value) : value);
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);
const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => z.preprocess(blankToUndefined, trimmed(max).optional());
const money = z.preprocess(
  latinDigits,
  z
    .string()
    .trim()
    .regex(/^\d{1,13}$/, 'مبلغ باید عددی صحیح باشد')
    .transform((value) => BigInt(value)),
);
const optionalMoney = z.preprocess(blankToUndefined, money.optional());
const optionalInt = (min: number, max: number) =>
  z.preprocess((value) => blankToUndefined(latinDigits(value)), z.coerce.number().int().min(min).max(max).optional());
const currency = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(CURRENCIES, { message: 'واحد پول نامعتبر است' }),
);
const names = (max: number) =>
  z
    .array(z.string().trim().min(1).max(120))
    .max(max)
    .transform((list) => [...new Set(list)]);
const flagParam = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((value) => (value === 'true' ? true : undefined));

/** The facts of a book: one edition, as printed. */
export const bookFactsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان کتاب الزامی است').max(200),
  subtitle: optionalText(200),
  authors: names(10).refine((list) => list.length > 0, 'دست‌کم یک نویسنده'),
  translators: names(10).default([]),
  publisher: optionalText(120),
  isbn: optionalText(20),
  publishYear: optionalInt(1000, 2200),
  yearCalendar: z.enum(YEAR_CALENDARS).default('SOLAR'),
  edition: optionalInt(1, 500),
  printRun: optionalInt(1, 10_000_000),
  pageCount: optionalInt(1, 20_000),
  language: z.string().trim().min(2).max(8).default('fa'),
  originalTitle: optionalText(200),
  originalLanguage: optionalText(8),
  series: optionalText(160),
  seriesNumber: optionalInt(1, 1000),
  binding: z.enum(BOOK_BINDINGS).optional(),
  trimSize: z.enum(BOOK_TRIM_SIZES).optional(),
  weightGrams: optionalInt(1, 50_000),
  listPrice: optionalMoney,
  currency: currency.default('IRT'),
  description: optionalText(10_000),
  tags: names(12).default([]),
  categoryId: optionalText(40),
});

/** One seller's copy (or copies) of a book. */
const offerFields = {
  grade: z.enum(BOOK_GRADES),
  conditionNotes: optionalText(2000),
  price: money,
  negotiable: z.boolean().default(false),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  deliveryOptions: z
    .array(z.enum(BOOK_DELIVERY))
    .min(1, 'دست‌کم یک روش تحویل')
    .max(BOOK_DELIVERY.length)
    .transform((list) => [...new Set(list)]),
  shippingCost: optionalMoney,
  province: optionalText(80),
  city: optionalText(80),
};

/** Listing a copy: either of a book already in the catalogue, or of a new one. */
export const offerSchema = z
  .object({
    bookId: optionalText(40),
    book: bookFactsSchema.optional(),
    ...offerFields,
    /** On an edit: photos to drop. */
    removePhotoIds: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  })
  .refine((value) => Boolean(value.bookId) !== Boolean(value.book), {
    message: 'یا کتابی از فهرست انتخاب کنید یا مشخصات کتاب را وارد کنید',
    path: ['book'],
  });

/** What a seller may change on a live offer without sending it back to review. */
export const offerQuickEditSchema = z
  .object({
    price: money.optional(),
    negotiable: z.boolean().optional(),
    quantity: z.coerce.number().int().min(0).max(999).optional(),
    deliveryOptions: offerFields.deliveryOptions.optional(),
    shippingCost: z.preprocess(blankToUndefined, money.nullable().optional()),
  })
  .strict();

export const catalogSearchSchema = z.object({
  q: trimmed(200).min(2, 'دست‌کم دو نویسه'),
});

export const boardSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  search: optionalText(160),
  categoryId: optionalText(40),
  language: optionalText(8),
  binding: z.enum(BOOK_BINDINGS).optional(),
  trimSize: z.enum(BOOK_TRIM_SIZES).optional(),
  /** The worst grade acceptable: GOOD finds NEW, LIKE_NEW, VERY_GOOD and GOOD. */
  grade: z.enum(BOOK_GRADES).optional(),
  priceMin: optionalMoney,
  priceMax: optionalMoney,
  province: optionalText(80),
  delivery: z.enum(BOOK_DELIVERY).optional(),
  author: optionalText(120),
  translator: optionalText(120),
  publisher: optionalText(120),
  yearFrom: optionalInt(1000, 2200),
  yearTo: optionalInt(1000, 2200),
  discounted: flagParam,
  translated: flagParam,
  freeShipping: flagParam,
  sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'mostOffers', 'discount', 'title', 'popular']).default('newest'),
});

export const requestSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  deliveryMethod: z.enum(BOOK_DELIVERY),
  offeredPrice: optionalMoney,
  note: optionalText(1000),
});

export const declineSchema = z.object({ reason: z.string().trim().min(3, 'دلیل را کوتاه بنویسید').max(500) });

export const bookMessageSchema = z.object({ body: z.string().trim().min(1, 'متن پیام الزامی است').max(2000) });

export const staffBooksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: optionalText(120),
  verified: z.enum(['true', 'false']).optional(),
});

export const staffBookUpdateSchema = bookFactsSchema.partial().extend({ verified: z.boolean().optional() });
