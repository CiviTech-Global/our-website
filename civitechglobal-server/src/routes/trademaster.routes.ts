import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { successResponse } from '../utils/apiResponse.js';
import { features } from '../config/features.js';
import { env } from '../config/env.js';
import { checkoutRateLimiter } from '../middleware/rateLimit.js';
import { MAX_FILE_BYTES, MAX_FILES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import * as shops from '../services/trademaster-shop.service.js';
import * as products from '../services/trademaster-product.service.js';
import * as orders from '../services/trademaster-order.service.js';
import * as categories from '../services/trademaster-category.service.js';
import * as guilds from '../services/business-category.service.js';
import {
  reviewDecisionSchema,
  reviewQueueSchema,
  shopBoardSchema,
  shopMapSchema,
  shopSchema,
  shopUpdateSchema,
  productSchema,
  productUpdateSchema,
  productBoardSchema,
  variantSchema,
  imageCaptionSchema,
  checkoutSchema,
  startPaymentSchema,
  paymentReturnSchema,
  orderMoveSchema,
  orderListSchema,
  categorySchema,
  categoryUpdateSchema,
  businessCategorySchema,
  businessCategoryUpdateSchema,
} from '../validators/trademaster.schema.js';

/**
 * The TradeMaster module.
 *
 * Shops now; products, and later orders, on the same routes. Mounted under
 * /trademaster rather than folded into /market because it is a distinct
 * service with its own review desk and its own permission — a buyer looking
 * for a mug and an employer looking for a developer have nothing to do with
 * one another beyond sharing an account.
 *
 * NOT REACHABLE IN PRODUCTION. Every route below sits behind the feature
 * gate, which is off unless FEATURE_TRADEMASTER says otherwise. The gate is
 * applied once here, at the router, rather than on each handler: a new route
 * added later is covered by default, which is the opposite of what per-handler
 * checks give you.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 25, fieldSize: 128 * 1024 },
});

const router = Router();

/**
 * Off means absent, not forbidden.
 *
 * A 404 rather than a 403: a 403 tells anybody who asks that there is an
 * unfinished shop system here and invites them to keep checking. The module
 * should be indistinguishable from one that does not exist.
 */
router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (!features.tradeMaster) {
    next(new AppError('یافت نشد.', 404));
    return;
  }
  next();
});

const canReview = [authenticate, requirePermission(PERMISSIONS.tradeMaster)] as const;

/** BigInt does not survive JSON.stringify; money crosses as a decimal string. */
function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  ) as T;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('شناسه نامعتبر است.', 400);
  return value;
}

/** Multipart carries the structured half as one JSON field, as elsewhere here. */
function payloadOf(req: Request): unknown {
  const raw = typeof req.body?.payload === 'string' ? req.body.payload : null;
  if (!raw) throw new AppError('اطلاعات فرم ارسال نشده است.', 400);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
  }
}

/** One named picture from a multipart form with several, or null. */
const namedFile = (req: Request, field: string) => {
  const file = (req.files as Record<string, Express.Multer.File[]> | undefined)?.[field]?.[0];
  return file ? { originalName: file.originalname, buffer: file.buffer } : null;
};

/** A shop form's two pictures: the logo, and the cover across the top of its card. */
const shopImagesOf = (req: Request) => ({ logo: namedFile(req, 'logo'), cover: namedFile(req, 'cover') });

const shopImageFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

/** Several uploaded files, in the shape the attachment service takes. */
const filesOf = (req: Request) =>
  ((req.files as Express.Multer.File[] | undefined) ?? []).map((file) => ({
    originalName: file.originalname,
    buffer: file.buffer,
  }));

/**
 * Captions travel beside the files as one JSON array, positionally.
 *
 * Multipart has no way to attach a field to a particular file, so the caption
 * at index 2 belongs to the third file. A malformed array is answered rather
 * than ignored: silently dropping captions would look like the server losing
 * what somebody typed.
 */
function captionsOf(req: Request): Array<string | null> {
  const raw = req.body?.captions;
  if (typeof raw !== 'string' || !raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('قالب «captions» نامعتبر است.', 400);
  }

  if (!Array.isArray(parsed)) throw new AppError('«captions» باید یک آرایه باشد.', 400);
  return parsed.map((value) => (typeof value === 'string' ? value : null));
}

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap =
  (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * What the board's filters may offer.
 *
 * Cached longer than the boards themselves: the set of provinces a shop can
 * be in changes when a new town joins the marketplace, not when a shop is
 * edited.
 */
router.get(
  '/facets',
  publicCache({ maxAgeSeconds: 600, staleWhileRevalidateSeconds: 1800 }),
  wrap(async (_req, res) => {
    successResponse(res, serialize(await shops.listFacets()));
  })
);

router.get(
  '/shops',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    const query = shopBoardSchema.parse(req.query);
    successResponse(res, serialize(await shops.listPublicShops(query)));
  })
);

/**
 * Every matching shop with a location, for the map.
 *
 * Its own route rather than a large page of /shops: a map is drawn whole, and
 * the list's page size cap is the right cap for a list and the wrong one for
 * a map. Same filters as the board, so the two always agree on what matches.
 */
router.get(
  '/map',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    const query = shopMapSchema.parse(req.query);
    successResponse(res, serialize(await shops.listMapShops(query)));
  })
);

router.get(
  '/shops/:slug',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await shops.getPublicShop(param(req, 'slug'))));
  })
);

router.get(
  '/shops/:id/logo',
  wrap(async (req, res) => {
    const image = await shops.getLogo(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.get(
  '/shops/:id/cover',
  wrap(async (req, res) => {
    const image = await shops.getCover(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

/** The guild list, for the board's filter and the shop form. */
router.get(
  '/business-categories',
  publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 900 }),
  wrap(async (_req, res) => {
    successResponse(res, serialize(await guilds.listBusinessCategories()));
  })
);

// ---------------------------------------------------------------------------
// The seller's own shops
// ---------------------------------------------------------------------------

router.get(
  '/me/shops',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, serialize(await shops.listOwnShops(req.user!.userId)));
  })
);

router.post(
  '/me/shops',
  authenticate,
  shopImageFields,
  wrap(async (req, res) => {
    const input = shopSchema.parse(payloadOf(req));
    const result = await shops.createShop(req.user!.userId, input, shopImagesOf(req));
    successResponse(res, serialize(result), 'پیش‌نویس فروشگاه ساخته شد.', 201);
  })
);

router.patch(
  '/me/shops/:id',
  authenticate,
  shopImageFields,
  wrap(async (req, res) => {
    const input = shopUpdateSchema.parse(payloadOf(req));
    const result = await shops.updateShop(req.user!.userId, param(req, 'id'), input, shopImagesOf(req));
    successResponse(res, serialize(result), 'ذخیره شد.');
  })
);

/** One of the caller's own shops, whole, for the edit form. */
router.get(
  '/me/shops/:id',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, serialize(await shops.getOwnShop(req.user!.userId, param(req, 'id'))));
  })
);

router.post(
  '/me/shops/:id/submit',
  authenticate,
  wrap(async (req, res) => {
    const result = await shops.submitShop(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'فروشگاه برای بررسی ارسال شد.');
  })
);

/**
 * The owner's own logo, at any moment in its life.
 *
 * Declared before '/me/shops/:id' would ever be reached for it, and separate
 * from the public '/shops/:id/logo', which serves approved shops only.
 */
router.get(
  '/me/shops/:id/logo',
  authenticate,
  wrap(async (req, res) => {
    const image = await shops.getOwnLogo(req.user!.userId, param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.get(
  '/me/shops/:id/cover',
  authenticate,
  wrap(async (req, res) => {
    const image = await shops.getOwnCover(req.user!.userId, param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.post(
  '/me/shops/:id/withdraw',
  authenticate,
  wrap(async (req, res) => {
    const result = await shops.withdrawShop(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'فروشگاه به پیش‌نویس بازگشت.');
  })
);

router.post(
  '/me/shops/:id/close',
  authenticate,
  wrap(async (req, res) => {
    const result = await shops.closeShop(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'فروشگاه بسته شد.');
  })
);

router.post(
  '/me/shops/:id/reopen',
  authenticate,
  wrap(async (req, res) => {
    const result = await shops.reopenShop(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'فروشگاه دوباره باز شد.');
  })
);

// ---------------------------------------------------------------------------
// The review desk
// ---------------------------------------------------------------------------

router.get(
  '/admin/shops',
  ...canReview,
  wrap(async (req, res) => {
    const query = reviewQueueSchema.parse(req.query);
    successResponse(res, serialize(await shops.listShopsForReview(query)));
  })
);

router.get(
  '/admin/shops/:id',
  ...canReview,
  wrap(async (req, res) => {
    successResponse(res, serialize(await shops.getShopForReview(param(req, 'id'))));
  })
);

router.get(
  '/admin/shops/:id/logo',
  ...canReview,
  wrap(async (req, res) => {
    // includeUnpublished: a reviewer has to see the logo before anybody has
    // approved it, which is the entire point of the queue.
    const image = await shops.getLogo(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.get(
  '/admin/shops/:id/cover',
  ...canReview,
  wrap(async (req, res) => {
    const image = await shops.getCover(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.post(
  '/admin/shops/:id/review',
  ...canReview,
  wrap(async (req, res) => {
    const body = reviewDecisionSchema.parse(req.body);
    const result = await shops.reviewShop(
      req.user!.userId,
      param(req, 'id'),
      body.decision,
      { reviewNote: body.reviewNote, internalNote: body.internalNote }
    );
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  })
);

// ---------------------------------------------------------------------------
// Categories — the desk
//
// Staff-only, and behind the same permission as the review queue: deciding how
// the catalogue is filed is the same job as deciding what goes in it. Sellers
// only ever read the list, through the public route further down.
// ---------------------------------------------------------------------------

router.get(
  '/admin/categories',
  ...canReview,
  wrap(async (_req, res) => {
    successResponse(res, serialize(await categories.listCategoriesForAdmin()));
  })
);

router.post(
  '/admin/categories',
  ...canReview,
  wrap(async (req, res) => {
    const body = categorySchema.parse(req.body);
    successResponse(res, serialize(await categories.createCategory(body)), 'دسته‌بندی ساخته شد.', 201);
  })
);

router.patch(
  '/admin/categories/:id',
  ...canReview,
  wrap(async (req, res) => {
    const body = categoryUpdateSchema.parse(req.body);
    successResponse(res, serialize(await categories.updateCategory(param(req, 'id'), body)), 'دسته‌بندی به‌روز شد.');
  })
);

router.delete(
  '/admin/categories/:id',
  ...canReview,
  wrap(async (req, res) => {
    successResponse(res, serialize(await categories.deleteCategory(param(req, 'id'))), 'دسته‌بندی حذف شد.');
  })
);

// ---------------------------------------------------------------------------
// Business categories (the guild list) — the desk. Same permission and the
// same shape as the listing categories above.
// ---------------------------------------------------------------------------

router.get(
  '/admin/business-categories',
  ...canReview,
  wrap(async (_req, res) => {
    successResponse(res, serialize(await guilds.listBusinessCategoriesForAdmin()));
  })
);

router.post(
  '/admin/business-categories',
  ...canReview,
  wrap(async (req, res) => {
    const body = businessCategorySchema.parse(req.body);
    successResponse(res, serialize(await guilds.createBusinessCategory(body)), 'صنف ساخته شد.', 201);
  })
);

router.patch(
  '/admin/business-categories/:id',
  ...canReview,
  wrap(async (req, res) => {
    const body = businessCategoryUpdateSchema.parse(req.body);
    successResponse(
      res,
      serialize(await guilds.updateBusinessCategory(param(req, 'id'), body)),
      'صنف به‌روز شد.'
    );
  })
);

router.delete(
  '/admin/business-categories/:id',
  ...canReview,
  wrap(async (req, res) => {
    successResponse(res, serialize(await guilds.deleteBusinessCategory(param(req, 'id'))), 'صنف حذف شد.');
  })
);

// ---------------------------------------------------------------------------
// Products — public
// ---------------------------------------------------------------------------

router.get(
  '/categories',
  publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 900 }),
  wrap(async (_req, res) => {
    successResponse(res, serialize(await products.listCategories()));
  })
);

router.get(
  '/products',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    const query = productBoardSchema.parse(req.query);
    successResponse(res, serialize(await products.listPublicProducts(query)));
  })
);

/**
 * Images are addressed by their own id rather than nested under the product.
 *
 * Mounted above `/products/:shopSlug/:productSlug` on purpose: Express matches
 * in declaration order, and `/products/images/abc` fits that two-segment
 * pattern perfectly well. Declared the other way round, every image request
 * would be answered by the product handler looking for a shop called
 * "images".
 */
router.get(
  '/products/images/:id',
  wrap(async (req, res) => {
    const image = await products.getImage(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), {
      ...image,
      disposition: 'inline',
    });
  })
);

router.get(
  '/products/:shopSlug/:productSlug',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    const result = await products.getPublicProduct(
      param(req, 'shopSlug'),
      param(req, 'productSlug')
    );
    successResponse(res, serialize(result));
  })
);

// ---------------------------------------------------------------------------
// Products — the seller's own
// ---------------------------------------------------------------------------

router.get(
  '/me/shops/:id/products',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.listShopProducts(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result));
  })
);

router.post(
  '/me/shops/:id/products',
  authenticate,
  wrap(async (req, res) => {
    const input = productSchema.parse(req.body);
    const result = await products.createProduct(req.user!.userId, param(req, 'id'), input);
    successResponse(res, serialize(result), 'پیش‌نویس کالا ساخته شد.', 201);
  })
);

router.patch(
  '/me/products/:id',
  authenticate,
  wrap(async (req, res) => {
    const input = productUpdateSchema.parse(req.body);
    const result = await products.updateProduct(req.user!.userId, param(req, 'id'), input);
    successResponse(res, serialize(result), 'ذخیره شد.');
  })
);

/**
 * Delete a listing of one's own, for good.
 *
 * One path segment after /me/products, so it cannot catch
 * /me/products/images/:id or /me/products/variants/:id, which have two.
 */
router.delete(
  '/me/products/:id',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.deleteProduct(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'حذف شد.');
  })
);

router.post(
  '/me/products/:id/submit',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.submitProduct(req.user!.userId, param(req, 'id'));
    // Published straight away, unless the desk had asked for changes — then
    // it goes back to the desk. The message says which.
    successResponse(
      res,
      serialize(result),
      result.moderationStatus === 'APPROVED' ? 'منتشر شد.' : 'برای بررسی ارسال شد.'
    );
  })
);

router.get(
  '/me/products/images/:id',
  authenticate,
  wrap(async (req, res) => {
    const image = await products.getOwnImage(req.user!.userId, param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.post(
  '/me/products/:id/withdraw',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.withdrawProduct(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'کالا به پیش‌نویس بازگشت.');
  })
);

router.post(
  '/me/products/:id/close',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.closeProduct(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'کالا بسته شد.');
  })
);

router.post(
  '/me/products/:id/reopen',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.reopenProduct(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'کالا دوباره باز شد.');
  })
);

// ---------------------------------------------------------------------------
// Products — pictures
// ---------------------------------------------------------------------------

router.post(
  '/me/products/:id/images',
  authenticate,
  upload.array('images', MAX_FILES),
  wrap(async (req, res) => {
    const captions = captionsOf(req);
    const result = await products.addImages(
      req.user!.userId,
      param(req, 'id'),
      filesOf(req),
      captions
    );
    successResponse(res, serialize(result), 'تصاویر افزوده شد.', 201);
  })
);

router.patch(
  '/me/products/images/:id',
  authenticate,
  wrap(async (req, res) => {
    const body = imageCaptionSchema.parse(req.body);
    const result = await products.updateImageCaption(
      req.user!.userId,
      param(req, 'id'),
      body.caption
    );
    successResponse(res, serialize(result), 'ذخیره شد.');
  })
);

router.delete(
  '/me/products/images/:id',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.removeImage(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'تصویر حذف شد.');
  })
);

// ---------------------------------------------------------------------------
// Products — variants
// ---------------------------------------------------------------------------

router.post(
  '/me/products/:id/variants',
  authenticate,
  wrap(async (req, res) => {
    const input = variantSchema.parse(req.body);
    const result = await products.addVariant(req.user!.userId, param(req, 'id'), input);
    successResponse(res, serialize(result), 'تنوع افزوده شد.', 201);
  })
);

router.patch(
  '/me/products/variants/:id',
  authenticate,
  wrap(async (req, res) => {
    const input = variantSchema.partial().parse(req.body);
    const result = await products.updateVariant(req.user!.userId, param(req, 'id'), input);
    successResponse(res, serialize(result), 'ذخیره شد.');
  })
);

router.delete(
  '/me/products/variants/:id',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.removeVariant(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'تنوع حذف شد.');
  })
);

// ---------------------------------------------------------------------------
// Products — the review desk
// ---------------------------------------------------------------------------

router.get(
  '/admin/products',
  ...canReview,
  wrap(async (req, res) => {
    const query = reviewQueueSchema.parse(req.query);
    successResponse(res, serialize(await products.listProductsForReview(query)));
  })
);

router.get(
  '/admin/products/images/:id',
  ...canReview,
  wrap(async (req, res) => {
    // includeUnpublished: a reviewer has to see the picture before anybody has
    // approved it, which is the entire point of the queue.
    const image = await products.getImage(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), {
      ...image,
      disposition: 'inline',
    });
  })
);

router.get(
  '/admin/products/:id',
  ...canReview,
  wrap(async (req, res) => {
    successResponse(res, serialize(await products.getProductForReview(param(req, 'id'))));
  })
);

router.post(
  '/admin/products/:id/review',
  ...canReview,
  wrap(async (req, res) => {
    const body = reviewDecisionSchema.parse(req.body);
    const result = await products.reviewProduct(req.user!.userId, param(req, 'id'), body.decision, {
      reviewNote: body.reviewNote,
      internalNote: body.internalNote,
    });
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  })
);

// ---------------------------------------------------------------------------
// Orders
//
// Everything below is behind a second gate, off in every environment including
// development. The module is a catalogue for now: shops show what they sell and
// buyers contact them directly.
//
// 404 rather than 403, for the same reason the module gate does it — an
// unfinished checkout should be indistinguishable from one that was never
// built. Applied per route rather than with router.use, because a router.use
// here would also catch the catalogue routes declared above it in the file
// order Express cares about.
// ---------------------------------------------------------------------------

const ordersEnabled = (_req: Request, _res: Response, next: NextFunction): void => {
  if (!features.tradeMasterOrders) {
    next(new AppError('یافت نشد.', 404));
    return;
  }
  next();
};


router.post(
  '/checkout',
  ordersEnabled,
  authenticate,
  // Each checkout takes stock out of real inventory and holds it; see the note
  // on the limiter.
  checkoutRateLimiter,
  wrap(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const { lines, ...delivery } = body;
    const created = await orders.checkout(req.user!.userId, lines, delivery);
    successResponse(res, serialize(created), 'سفارش ثبت شد.', 201);
  })
);

router.get(
  '/me/orders',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    const query = orderListSchema.parse(req.query);
    const result = await orders.listBuyerOrders(req.user!.userId, query);
    successResponse(res, serialize(result));
  })
);

router.get(
  '/me/orders/:id',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    // Readable by either side of the order; the service decides which.
    successResponse(res, serialize(await orders.getOrder(req.user!.userId, param(req, 'id'))));
  })
);

router.post(
  '/me/orders/:id/pay',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    const body = startPaymentSchema.parse(req.body);

    /**
     * The return URL is built here, from our own origin and a path the
     * validator has already restricted.
     *
     * Never from anything the client sends whole: a caller-supplied absolute
     * URL would be an open redirect with a live payment reference attached to
     * it, which is a good way to hand somebody else's payment confirmation to
     * a site of your choosing.
     */
    const origin = env.APP_URL.replace(/\/+$/, '');
    const returnUrl = `${origin}${body.returnPath ?? '/dashboard/orders'}`;

    const result = await orders.startPayment(req.user!.userId, param(req, 'id'), returnUrl);
    successResponse(res, serialize(result));
  })
);

router.post(
  '/me/payments/confirm',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    const body = paymentReturnSchema.parse(req.body);
    // Scoped to the caller: see the note in confirmPayment.
    const result = await orders.confirmPayment(body.reference, req.user!.userId);
    successResponse(res, serialize(result));
  })
);

router.post(
  '/me/orders/:id/move',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    const body = orderMoveSchema.parse(req.body);
    const result = await orders.moveOrder(req.user!.userId, param(req, 'id'), body.to, {
      note: body.note,
      shipping: body.shipping,
      trackingCarrier: body.trackingCarrier,
      trackingCode: body.trackingCode,
    });
    successResponse(res, serialize(result), 'وضعیت سفارش به‌روزرسانی شد.');
  })
);

// ---------------------------------------------------------------------------
// Orders — the seller
// ---------------------------------------------------------------------------

router.get(
  '/me/shops/:id/orders',
  ordersEnabled,
  authenticate,
  wrap(async (req, res) => {
    const query = orderListSchema.parse(req.query);
    const result = await orders.listShopOrders(req.user!.userId, param(req, 'id'), query);
    successResponse(res, serialize(result));
  })
);

export default router;
