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
import {
  reviewDecisionSchema,
  reviewQueueSchema,
  shopBoardSchema,
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

const fileOf = (req: Request) =>
  req.file ? { originalName: req.file.originalname, buffer: req.file.buffer } : null;

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

router.get(
  '/shops',
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 }),
  wrap(async (req, res) => {
    const query = shopBoardSchema.parse(req.query);
    successResponse(res, serialize(await shops.listPublicShops(query)));
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
  upload.single('logo'),
  wrap(async (req, res) => {
    const input = shopSchema.parse(payloadOf(req));
    const result = await shops.createShop(req.user!.userId, input, fileOf(req));
    successResponse(res, serialize(result), 'پیش‌نویس فروشگاه ساخته شد.', 201);
  })
);

router.patch(
  '/me/shops/:id',
  authenticate,
  upload.single('logo'),
  wrap(async (req, res) => {
    const input = shopUpdateSchema.parse(payloadOf(req));
    const result = await shops.updateShop(req.user!.userId, param(req, 'id'), input, fileOf(req));
    successResponse(res, serialize(result), 'ذخیره شد.');
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

router.post(
  '/me/shops/:id/close',
  authenticate,
  wrap(async (req, res) => {
    const result = await shops.closeShop(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'فروشگاه بسته شد.');
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

router.post(
  '/me/products/:id/submit',
  authenticate,
  wrap(async (req, res) => {
    const result = await products.submitProduct(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'کالا برای بررسی ارسال شد.');
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
// Orders — the buyer
// ---------------------------------------------------------------------------

router.post(
  '/checkout',
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
  authenticate,
  wrap(async (req, res) => {
    const query = orderListSchema.parse(req.query);
    const result = await orders.listBuyerOrders(req.user!.userId, query);
    successResponse(res, serialize(result));
  })
);

router.get(
  '/me/orders/:id',
  authenticate,
  wrap(async (req, res) => {
    // Readable by either side of the order; the service decides which.
    successResponse(res, serialize(await orders.getOrder(req.user!.userId, param(req, 'id'))));
  })
);

router.post(
  '/me/orders/:id/pay',
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
  authenticate,
  wrap(async (req, res) => {
    const query = orderListSchema.parse(req.query);
    const result = await orders.listShopOrders(req.user!.userId, param(req, 'id'), query);
    successResponse(res, serialize(result));
  })
);

export default router;
