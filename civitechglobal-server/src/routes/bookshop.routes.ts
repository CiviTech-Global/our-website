import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { features } from '../config/features.js';
import { MAX_FILE_BYTES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import { listBookCategories } from '../services/book-taxonomy.service.js';
import * as market from '../services/book-market.service.js';
import * as messaging from '../services/messaging.service.js';
import {
  boardSchema,
  bookMessageSchema,
  catalogSearchSchema,
  declineSchema,
  offerQuickEditSchema,
  offerSchema,
  requestSchema,
  staffBooksSchema,
  staffBookUpdateSchema,
} from '../validators/bookshop.schema.js';
import { z } from 'zod';

/**
 * The book market's second generation: the catalogue and its board, offers of
 * copies with photos, purchase requests and their threads, and the staff's
 * catalogue tools. Offers are reviewed in the existing book queue under
 * /market/admin/books — an offer is still a BookListing.
 *
 * NOT REACHABLE WHILE FEATURE_BOOKS_V2 IS OFF. Gated once, at the router.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 6, fields: 20, fieldSize: 256 * 1024 },
});

const router = Router();

router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (!features.booksV2) {
    next(new AppError('یافت نشد.', 404));
    return;
  }
  next();
});

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

/** BigInt does not survive JSON.stringify; money crosses as a decimal string. */
function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))) as T;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('شناسه نامعتبر است.', 400);
  return value;
}

function payloadOf(req: Request): unknown {
  const raw = typeof req.body?.payload === 'string' ? req.body.payload : null;
  if (!raw) throw new AppError('اطلاعات فرم ارسال نشده است.', 400);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
  }
}

const filesOf = (req: Request) =>
  ((req.files as Express.Multer.File[] | undefined) ?? []).map((file) => ({ originalName: file.originalname, buffer: file.buffer }));

const listCache = publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 });
const taxonomyCache = publicCache({ maxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600 });
const imageCache = publicCache({ maxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86_400 });

async function sendImage(res: Response, image: { storedName: string; mimeType: string; originalName: string }) {
  serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
}

// ===========================================================================
// Public
// ===========================================================================

router.get(
  '/categories',
  taxonomyCache,
  wrap(async (_req, res) => {
    successResponse(res, await listBookCategories());
  }),
);

router.get(
  '/board',
  listCache,
  validate({ query: boardSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.listBoard(req.query as never)));
  }),
);

router.get(
  '/books/:code',
  listCache,
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.getBook(param(req, 'code'))));
  }),
);

router.get(
  '/books/:id/cover',
  imageCache,
  wrap(async (req, res) => {
    await sendImage(res, await market.getBookCover(param(req, 'id')));
  }),
);

router.get(
  '/photos/:id',
  imageCache,
  wrap(async (req, res) => {
    await sendImage(res, await market.getOfferPhoto(param(req, 'id')));
  }),
);

// ===========================================================================
// Signed in
// ===========================================================================

router.use('/me', authenticate);

router.get(
  '/me/catalog',
  validate({ query: catalogSearchSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.searchCatalog(String(req.query.q))));
  }),
);

// ---- The seller ---------------------------------------------------------------

router.get(
  '/me/offers',
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.listOwnOffers(req.user!.userId)));
  }),
);

router.post(
  '/me/offers',
  projectSubmitRateLimiter,
  upload.array('photos', 6),
  wrap(async (req, res) => {
    const { removePhotoIds: _none, ...input } = offerSchema.parse(payloadOf(req));
    const result = await market.createOffer(req.user!.userId, input, filesOf(req));
    successResponse(res, result, 'پیش‌نویس آگهی ساخته شد.', 201);
  }),
);

router.put(
  '/me/offers/:id',
  upload.array('photos', 6),
  wrap(async (req, res) => {
    const { removePhotoIds, ...input } = offerSchema.parse(payloadOf(req));
    const result = await market.updateOffer(req.user!.userId, param(req, 'id'), input, filesOf(req), removePhotoIds);
    successResponse(res, result, 'آگهی ذخیره شد.');
  }),
);

router.patch(
  '/me/offers/:id/quick',
  validate({ body: offerQuickEditSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.quickEditOffer(req.user!.userId, param(req, 'id'), req.body)), 'ذخیره شد.');
  }),
);

router.post(
  '/me/offers/:id/submit',
  wrap(async (req, res) => {
    successResponse(res, await market.submitOffer(req.user!.userId, param(req, 'id')), 'آگهی برای بررسی ارسال شد.');
  }),
);

router.post(
  '/me/offers/:id/state',
  validate({ body: z.object({ open: z.boolean() }) }),
  wrap(async (req, res) => {
    successResponse(res, await market.setOfferOpen(req.user!.userId, param(req, 'id'), req.body.open));
  }),
);

router.get(
  '/me/photos/:id',
  wrap(async (req, res) => {
    await sendImage(res, await market.getOfferPhoto(param(req, 'id'), { userId: req.user!.userId }));
  }),
);

// ---- Purchase requests ----------------------------------------------------------

router.post(
  '/me/offers/:id/requests',
  projectSubmitRateLimiter,
  validate({ body: requestSchema }),
  wrap(async (req, res) => {
    const result = await market.createRequest(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, result, 'درخواست خرید برای فروشنده فرستاده شد.', 201);
  }),
);

router.get(
  '/me/requests',
  wrap(async (req, res) => {
    const side = req.query.side === 'seller' ? 'seller' : 'buyer';
    successResponse(res, serialize(await market.listRequests(req.user!.userId, side)));
  }),
);

router.post(
  '/me/requests/:id/accept',
  wrap(async (req, res) => {
    successResponse(res, await market.acceptRequest(req.user!.userId, param(req, 'id')), 'درخواست پذیرفته شد.');
  }),
);

router.post(
  '/me/requests/:id/decline',
  validate({ body: declineSchema }),
  wrap(async (req, res) => {
    successResponse(res, await market.declineRequest(req.user!.userId, param(req, 'id'), req.body.reason));
  }),
);

router.post(
  '/me/requests/:id/cancel',
  wrap(async (req, res) => {
    successResponse(res, await market.cancelRequest(req.user!.userId, param(req, 'id')), 'درخواست لغو شد.');
  }),
);

router.post(
  '/me/requests/:id/complete',
  wrap(async (req, res) => {
    successResponse(res, await market.completeRequest(req.user!.userId, param(req, 'id')), 'تحویل ثبت شد.');
  }),
);

router.get(
  '/me/requests/:id/messages',
  wrap(async (req, res) => {
    successResponse(res, await messaging.listBookRequestMessages(req.user!.userId, param(req, 'id')));
  }),
);

router.post(
  '/me/requests/:id/messages',
  validate({ body: bookMessageSchema }),
  wrap(async (req, res) => {
    successResponse(res, await messaging.sendBookRequestMessage(req.user!.userId, param(req, 'id'), req.body.body), undefined, 201);
  }),
);

// ===========================================================================
// Staff
// ===========================================================================

const canModerateBooks = [authenticate, requirePermission(PERMISSIONS.books)] as const;

router.get(
  '/admin/catalog',
  ...canModerateBooks,
  validate({ query: staffBooksSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.listCatalogForStaff(req.query as never)));
  }),
);

router.patch(
  '/admin/catalog/:id',
  ...canModerateBooks,
  upload.single('cover'),
  wrap(async (req, res) => {
    const input = staffBookUpdateSchema.parse(req.is('multipart/form-data') ? payloadOf(req) : req.body);
    const cover = req.file ? { originalName: req.file.originalname, buffer: req.file.buffer } : null;
    successResponse(res, await market.updateBookForStaff(param(req, 'id'), input, cover), 'کتاب به‌روز شد.');
  }),
);

router.post(
  '/admin/catalog/merge',
  ...canModerateBooks,
  validate({ body: z.object({ keepId: z.string().min(1).max(40), dropId: z.string().min(1).max(40) }) }),
  wrap(async (req, res) => {
    successResponse(res, await market.mergeBooks(req.body.keepId, req.body.dropId), 'کتاب‌ها ادغام شدند.');
  }),
);

router.get(
  '/admin/offers',
  ...canModerateBooks,
  validate({ query: staffBooksSchema.extend({ status: z.string().max(40).optional() }) }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await market.listOffersForReview(req.query as never)));
  }),
);

router.get(
  '/admin/photos/:id',
  ...canModerateBooks,
  wrap(async (req, res) => {
    await sendImage(res, await market.getOfferPhoto(param(req, 'id'), { staff: true }));
  }),
);

export default router;
