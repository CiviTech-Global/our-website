import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { successResponse } from '../utils/apiResponse.js';
import { features } from '../config/features.js';
import { MAX_FILE_BYTES, MAX_FILES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import * as shops from '../services/trademaster-shop.service.js';
import {
  reviewDecisionSchema,
  reviewQueueSchema,
  shopBoardSchema,
  shopSchema,
  shopUpdateSchema,
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

export default router;
