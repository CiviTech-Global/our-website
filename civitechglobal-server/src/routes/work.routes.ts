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
import { listWorkCategories } from '../services/work-taxonomy.service.js';
import * as work from '../services/project-work.service.js';
import * as catalog from '../services/service-catalog.service.js';
import * as engagement from '../services/engagement.service.js';
import { reviewSchema } from '../validators/marketplace.schema.js';
import {
  bidNoteSchema,
  bidStageSchema,
  featuredSchema,
  freelancerProfileSchema,
  inviteSchema,
  ndaSignSchema,
  orderDeclineSchema,
  orderSchema,
  projectAlertCreateSchema,
  projectAlertUpdateSchema,
  serviceCatalogSchema,
  serviceSchema,
  serviceStateSchema,
  staffServiceListSchema,
  talentQuerySchema,
  timesheetReviewSchema,
  timesheetSchema,
} from '../validators/work.schema.js';

/**
 * The freelance side's second generation: categories, the talent directory,
 * the service catalogue, and — signed in — NDAs, saved projects, alerts,
 * invitations, the client's pipeline, timesheets, services and orders.
 *
 * Projects and bids themselves stay where they always were, under /market,
 * so that switching this off leaves the live board exactly as it was.
 *
 * NOT REACHABLE WHILE FEATURE_PROJECTS_V2 IS OFF. Gated once, at the router:
 * a route added later is covered without anybody remembering.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 6, fields: 20, fieldSize: 256 * 1024 },
});

const router = Router();

/** Off means absent: a 404, indistinguishable from a route that never existed. */
router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (!features.projectsV2) {
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
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('شناسه نامعتبر است.', 400);
  return value;
}

/** Multipart carries the structured half as one JSON field, as elsewhere. */
function payloadOf(req: Request): unknown {
  const raw = typeof req.body?.payload === 'string' ? req.body.payload : null;
  if (!raw) throw new AppError('اطلاعات فرم ارسال نشده است.', 400);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
  }
}

const imagesOf = (req: Request) =>
  ((req.files as Express.Multer.File[] | undefined) ?? []).map((file) => ({
    originalName: file.originalname,
    buffer: file.buffer,
  }));

const listCache = publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 });
const taxonomyCache = publicCache({ maxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600 });
const imageCache = publicCache({ maxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86_400 });

// ===========================================================================
// Public
// ===========================================================================

router.get(
  '/categories',
  taxonomyCache,
  wrap(async (_req, res) => {
    successResponse(res, await listWorkCategories());
  }),
);

router.get(
  '/talent',
  listCache,
  validate({ query: talentQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, await work.listTalent(req.query as never));
  }),
);

router.get(
  '/talent/:username',
  listCache,
  wrap(async (req, res) => {
    successResponse(res, await work.freelancerCard(param(req, 'username')));
  }),
);

router.get(
  '/services',
  listCache,
  validate({ query: serviceCatalogSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await catalog.listPublicServices(req.query as never)));
  }),
);

router.get(
  '/services/:code',
  listCache,
  wrap(async (req, res) => {
    successResponse(res, serialize(await catalog.getPublicService(param(req, 'code'))));
  }),
);

router.get(
  '/service-images/:id',
  imageCache,
  wrap(async (req, res) => {
    const image = await catalog.getServiceImage(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

// ===========================================================================
// Signed in
// ===========================================================================

router.use('/me', authenticate, (req: Request, _res: Response, next: NextFunction) => {
  // "Active recently" on talent and client cards; written at most every few minutes.
  void work.touchActivity(req.user!.userId);
  next();
});

// ---- Reading a project as oneself -----------------------------------------

router.get(
  '/me/projects/:code/view',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.viewProject(req.user!.userId, param(req, 'code'))));
  }),
);

router.post(
  '/me/projects/:id/nda',
  validate({ body: ndaSignSchema }),
  wrap(async (req, res) => {
    const result = await work.signNda(req.user!.userId, param(req, 'id'), req.body.signedName);
    successResponse(res, result, 'توافق‌نامه امضا شد.');
  }),
);

router.get(
  '/me/projects/:id/nda',
  wrap(async (req, res) => {
    successResponse(res, await work.listNdaSignatures(req.user!.userId, param(req, 'id')));
  }),
);

router.get(
  '/me/projects/:id/price-guide',
  wrap(async (req, res) => {
    successResponse(res, await work.priceGuide(param(req, 'id')));
  }),
);

// ---- Saved projects and alerts -------------------------------------------

router.get(
  '/me/saved-projects',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.listSavedProjects(req.user!.userId)));
  }),
);

router.get(
  '/me/saved-projects/ids',
  wrap(async (req, res) => {
    successResponse(res, await work.listSavedProjectIds(req.user!.userId));
  }),
);

router.put(
  '/me/saved-projects/:projectId',
  wrap(async (req, res) => {
    successResponse(res, await work.saveProject(req.user!.userId, param(req, 'projectId')));
  }),
);

router.delete(
  '/me/saved-projects/:projectId',
  wrap(async (req, res) => {
    successResponse(res, await work.unsaveProject(req.user!.userId, param(req, 'projectId')));
  }),
);

router.get(
  '/me/project-alerts',
  wrap(async (req, res) => {
    successResponse(res, await work.listProjectAlerts(req.user!.userId));
  }),
);

router.post(
  '/me/project-alerts',
  validate({ body: projectAlertCreateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await work.createProjectAlert(req.user!.userId, req.body), 'هشدار پروژه ساخته شد.', 201);
  }),
);

router.patch(
  '/me/project-alerts/:id',
  validate({ body: projectAlertUpdateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await work.updateProjectAlert(req.user!.userId, param(req, 'id'), req.body));
  }),
);

router.delete(
  '/me/project-alerts/:id',
  wrap(async (req, res) => {
    successResponse(res, await work.deleteProjectAlert(req.user!.userId, param(req, 'id')));
  }),
);

router.get(
  '/me/recommended-projects',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.recommendedProjects(req.user!.userId)));
  }),
);

// ---- Invitations ------------------------------------------------------------

router.post(
  '/me/projects/:id/invites',
  validate({ body: inviteSchema }),
  wrap(async (req, res) => {
    const result = await work.inviteFreelancer(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, result, 'دعوت فرستاده شد.', 201);
  }),
);

router.get(
  '/me/projects/:id/invites',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.listInvitesForProject(req.user!.userId, param(req, 'id'))));
  }),
);

router.get(
  '/me/invites',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.listMyInvites(req.user!.userId)));
  }),
);

router.post(
  '/me/invites/:id/decline',
  wrap(async (req, res) => {
    successResponse(res, await work.declineInvite(req.user!.userId, param(req, 'id')), 'دعوت رد شد.');
  }),
);

// ---- The client's pipeline and the bidder's proposals ---------------------

router.get(
  '/me/client-pipeline',
  wrap(async (req, res) => {
    successResponse(res, await work.clientPipeline(req.user!.userId));
  }),
);

router.patch(
  '/me/bids/:id/stage',
  validate({ body: bidStageSchema }),
  wrap(async (req, res) => {
    successResponse(res, await work.setBidStage(req.user!.userId, param(req, 'id'), req.body.outcome));
  }),
);

router.patch(
  '/me/bids/:id/note',
  validate({ body: bidNoteSchema }),
  wrap(async (req, res) => {
    successResponse(res, await work.setBidNote(req.user!.userId, param(req, 'id'), req.body.note));
  }),
);

router.post(
  '/me/bids/:id/withdraw',
  wrap(async (req, res) => {
    successResponse(res, await work.withdrawBid(req.user!.userId, param(req, 'id')), 'پیشنهاد پس گرفته شد.');
  }),
);

router.get(
  '/me/proposals',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.listMyProposals(req.user!.userId)));
  }),
);

// ---- Hourly contracts -------------------------------------------------------

router.post(
  '/me/awards/:id/timesheets',
  validate({ body: timesheetSchema }),
  wrap(async (req, res) => {
    const result = await engagement.submitTimesheet(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, result, 'ساعت کار ثبت شد.', 201);
  }),
);

router.patch(
  '/me/timesheets/:id',
  validate({ body: timesheetReviewSchema }),
  wrap(async (req, res) => {
    successResponse(res, await engagement.reviewTimesheet(req.user!.userId, param(req, 'id'), req.body));
  }),
);

// ---- The freelancer's profile settings -------------------------------------

router.get(
  '/me/freelancer-profile',
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.getFreelancerProfile(req.user!.userId)));
  }),
);

router.patch(
  '/me/freelancer-profile',
  validate({ body: freelancerProfileSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await work.updateFreelancerProfile(req.user!.userId, req.body)), 'ذخیره شد.');
  }),
);

// ---- The seller's services ---------------------------------------------------

router.get(
  '/me/services',
  wrap(async (req, res) => {
    successResponse(res, serialize(await catalog.listOwnServices(req.user!.userId)));
  }),
);

router.post(
  '/me/services',
  projectSubmitRateLimiter,
  upload.array('images', 6),
  wrap(async (req, res) => {
    const { removeImageIds: _none, ...input } = serviceSchema.parse(payloadOf(req));
    const result = await catalog.createService(req.user!.userId, input, imagesOf(req));
    successResponse(res, result, 'پیش‌نویس خدمت ساخته شد.', 201);
  }),
);

router.get(
  '/me/services/:id',
  wrap(async (req, res) => {
    successResponse(res, serialize(await catalog.getOwnService(req.user!.userId, param(req, 'id'))));
  }),
);

router.put(
  '/me/services/:id',
  upload.array('images', 6),
  wrap(async (req, res) => {
    const { removeImageIds, ...input } = serviceSchema.parse(payloadOf(req));
    const result = await catalog.updateService(req.user!.userId, param(req, 'id'), input, imagesOf(req), removeImageIds);
    successResponse(res, result, 'خدمت ذخیره شد.');
  }),
);

router.delete(
  '/me/services/:id',
  wrap(async (req, res) => {
    successResponse(res, await catalog.deleteService(req.user!.userId, param(req, 'id')), 'خدمت حذف شد.');
  }),
);

router.post(
  '/me/services/:id/submit',
  wrap(async (req, res) => {
    const result = await catalog.submitService(req.user!.userId, param(req, 'id'));
    successResponse(res, result, 'خدمت برای بررسی ارسال شد.');
  }),
);

router.patch(
  '/me/services/:id/state',
  validate({ body: serviceStateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await catalog.setServiceState(req.user!.userId, param(req, 'id'), req.body.state));
  }),
);

router.get(
  '/me/service-images/:id',
  wrap(async (req, res) => {
    const image = await catalog.getOwnServiceImage(req.user!.userId, param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

// ---- Orders -------------------------------------------------------------------

router.post(
  '/me/services/:id/order',
  projectSubmitRateLimiter,
  validate({ body: orderSchema }),
  wrap(async (req, res) => {
    const result = await catalog.placeOrder(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, serialize(result), 'سفارش شما برای فروشنده فرستاده شد.', 201);
  }),
);

router.get(
  '/me/orders',
  wrap(async (req, res) => {
    const side = req.query.side === 'seller' ? 'seller' : 'buyer';
    successResponse(res, serialize(await catalog.listOrders(req.user!.userId, side)));
  }),
);

router.post(
  '/me/orders/:id/accept',
  wrap(async (req, res) => {
    successResponse(res, await catalog.acceptOrder(req.user!.userId, param(req, 'id')), 'سفارش پذیرفته شد.');
  }),
);

router.post(
  '/me/orders/:id/decline',
  validate({ body: orderDeclineSchema }),
  wrap(async (req, res) => {
    successResponse(res, await catalog.declineOrder(req.user!.userId, param(req, 'id'), req.body.reason));
  }),
);

router.post(
  '/me/orders/:id/cancel',
  wrap(async (req, res) => {
    successResponse(res, await catalog.cancelOrder(req.user!.userId, param(req, 'id')), 'سفارش لغو شد.');
  }),
);

// ===========================================================================
// Staff
// ===========================================================================

const canModerateFreelance = [authenticate, requirePermission(PERMISSIONS.freelance)] as const;

router.get(
  '/admin/services',
  ...canModerateFreelance,
  validate({ query: staffServiceListSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await catalog.listServicesForReview(req.query as never)));
  }),
);

router.post(
  '/admin/services/:id/review',
  ...canModerateFreelance,
  validate({ body: reviewSchema }),
  wrap(async (req, res) => {
    const result = await catalog.reviewService(param(req, 'id'), req.body.decision, { userId: req.user!.userId }, req.body);
    successResponse(res, result);
  }),
);

router.patch(
  '/admin/services/:id/featured',
  ...canModerateFreelance,
  validate({ body: featuredSchema }),
  wrap(async (req, res) => {
    successResponse(res, await catalog.setServiceFeatured(param(req, 'id'), req.body.featured));
  }),
);

router.get(
  '/admin/service-images/:id',
  ...canModerateFreelance,
  wrap(async (req, res) => {
    const image = await catalog.getServiceImageForReview(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

export default router;
