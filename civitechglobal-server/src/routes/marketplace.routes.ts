import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { publicCache } from '../middleware/cacheControl.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, MAX_FILES, openStoredFile } from '../services/attachment.service.js';
import { requestedDisposition, serveStoredFile } from '../services/file-response.js';
import * as verification from '../services/verification.service.js';
import * as jobs from '../services/jobs.service.js';
import * as freelance from '../services/freelance.service.js';
import * as books from '../services/books.service.js';
import {
  applicationOutcomeSchema,
  applicationSchema,
  awardReviewSchema,
  bidReviewSchema,
  bidSchema,
  auditQuerySchema,
  disputeResolveSchema,
  disputeSchema,
  documentKindsSchema,
  extendDeadlineSchema,
  jobBoardSchema,
  jobSchema,
  jobUpdateSchema,
  listQuerySchema,
  messageSchema,
  milestoneDeliverSchema,
  milestoneSchema,
  pauseSchema,
  profileSchema,
  projectBoardSchema,
  projectSchema,
  projectUpdateSchema,
  reviewSchema,
  verificationReviewSchema,
  verificationSchema,
  bookSchema,
  bookUpdateSchema,
  bookBoardSchema,
} from '../validators/marketplace.schema.js';
import * as board from '../services/marketplace-board.service.js';
import * as profiles from '../services/profile.service.js';
import * as engagement from '../services/engagement.service.js';
import * as messaging from '../services/messaging.service.js';
import * as notifications from '../services/notifications.service.js';
import * as analytics from '../services/marketplace-analytics.service.js';
import * as ops from '../services/marketplace-ops.service.js';
import { authorize } from '../middleware/authorize.js';

/**
 * The marketplace: a job board and a freelance board over a shared
 * verification gate and a shared moderation queue.
 *
 * Three route groups, and the split matters:
 *
 *   /market/...        Public reading. Approved, open listings only.
 *   /market/me/...     An account acting for itself. Requires a session, and
 *                      for anything that creates something, verification.
 *   /market/admin/...  The queues. Gated per module, so a super admin can put
 *                      verification, jobs and freelance on three desks.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 25, fieldSize: 128 * 1024 },
});

const router = Router();

const canOps = [authenticate, requirePermission(PERMISSIONS.marketplaceOps)] as const;

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

/** The one uploaded file, in the shape the attachment service takes. */
const fileOf = (req: Request) =>
  req.file ? { originalName: req.file.originalname, buffer: req.file.buffer } : null;

/** A JSON array sent as a form field beside the files. */
function parseJsonField(req: Request, name: string, fallback: unknown): unknown {
  const raw = req.body?.[name];
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(`قالب «${name}» نامعتبر است.`, 400);
  }
}

const files = (req: Request) =>
  ((req.files as Express.Multer.File[] | undefined) ?? []).map((file) => ({
    originalName: file.originalname,
    buffer: file.buffer,
  }));

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

// ===========================================================================
// Public
// ===========================================================================

// Boards change as people post, so a short cache keeps a refresh cheap without
// making a new listing wait minutes to appear.
const boardCache = publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 });
const statsCache = publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 900 });

/**
 * The landing page's showcase numbers. Nothing personal, so it caches long —
 * a hero-section count five minutes stale is still true enough.
 */
router.get(
  '/stats',
  statsCache,
  wrap(async (_req, res) => {
    successResponse(res, await board.getBoardStats());
  }),
);

/** Staff-curated listings, newest filling any un-curated slots. */
router.get(
  '/featured',
  boardCache,
  wrap(async (_req, res) => {
    successResponse(res, serialize(await board.getFeatured()));
  }),
);

router.get(
  '/jobs',
  boardCache,
  validate({ query: jobBoardSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listPublicJobs(req.query as never)));
  }),
);

// ---- The book market ------------------------------------------------------
//
// Read-only and open to everybody: the point of a noticeboard is that it can
// be read without joining anything. Posting needs an account and verification,
// like every other listing here.

router.get(
  '/books',
  boardCache,
  validate({ query: bookBoardSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await books.listPublicBooks(req.query as never)));
  }),
);

router.get(
  '/books/:code',
  wrap(async (req, res) => {
    successResponse(res, serialize(await books.getPublicBook(param(req, 'code'))));
  }),
);

/**
 * The cover.
 *
 * Cached hard: the bytes never change — a new picture is a new stored name
 * under the same listing id, so the URL is the id and the content behind it
 * is replaced only when the seller replaces the image.
 */
router.get(
  '/books/:id/cover',
  boardCache,
  wrap(async (req, res) => {
    const image = await books.getCover(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

router.get(
  '/jobs/:code',
  boardCache,
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.getPublicJob(param(req, 'code'))));
  }),
);

router.get(
  '/projects',
  boardCache,
  validate({ query: projectBoardSchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.listPublicProjects(req.query as never)));
  }),
);

router.get(
  '/projects/:code',
  boardCache,
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.getPublicProject(param(req, 'code'))));
  }),
);

/**
 * The public profile. Cached a little longer than the boards because it
 * changes less often; a paused account must not leave a cached copy behind,
 * so the cache stays short rather than clever.
 */
router.get(
  '/profiles/:username',
  publicCache({ maxAgeSeconds: 120, staleWhileRevalidateSeconds: 600 }),
  wrap(async (req, res) => {
    const profile = await profiles.getPublicProfile(param(req, 'username'));
    if (!profile) throw new AppError('این نمایه پیدا نشد.', 404);
    successResponse(res, serialize(profile));
  }),
);

// ===========================================================================
// The account acting for itself
// ===========================================================================

router.use('/me', authenticate);

// ---- The account's own public profile --------------------------------------

router.get(
  '/me/profile',
  wrap(async (req, res) => {
    successResponse(res, await profiles.getOwnProfile(req.user!.userId));
  }),
);

router.patch(
  '/me/profile',
  validate({ body: profileSchema }),
  wrap(async (req, res) => {
    successResponse(res, await profiles.updateOwnProfile(req.user!.userId, req.body));
  }),
);

// ---- Verification ---------------------------------------------------------

router.get(
  '/me/verification',
  wrap(async (req, res) => {
    successResponse(res, await verification.getOwnVerification(req.user!.userId));
  }),
);

router.post(
  '/me/verification',
  projectSubmitRateLimiter,
  upload.array('documents', MAX_FILES),
  wrap(async (req, res) => {
    const input = verificationSchema.parse(payloadOf(req));

    // Each file's kind travels alongside it, in the same order — as its own
    // JSON array rather than one field per file, because multipart preserves
    // field order but not the pairing between two repeated fields.
    //
    // Parsed, not cast: this never passes through validate(), and asserting it
    // into the enum meant an unrecognised kind reached Prisma and came back as
    // a 500 blaming us for the caller's typo.
    const kinds = documentKindsSchema.parse(parseJsonField(req, 'kinds', []));
    const documents = files(req).map((file, index) => ({
      ...file,
      kind: kinds[index] ?? ('OTHER' as const),
    }));

    const result = await verification.submitVerification(req.user!.userId, input, documents);
    successResponse(res, result, 'مدارک شما ثبت شد و در صف بررسی است.', 201);
  }),
);

// ---- Jobs the account has posted ------------------------------------------

// ---- The seller's own book listings ---------------------------------------

router.get(
  '/me/books',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, serialize(await books.listOwnBooks(req.user!.userId)));
  }),
);

router.post(
  '/me/books',
  authenticate,
  upload.single('cover'),
  wrap(async (req, res) => {
    const input = bookSchema.parse(payloadOf(req));
    const result = await books.createBook(req.user!.userId, input, fileOf(req));
    successResponse(res, serialize(result), 'پیش‌نویس آگهی کتاب ساخته شد.', 201);
  }),
);

router.patch(
  '/me/books/:id',
  authenticate,
  upload.single('cover'),
  wrap(async (req, res) => {
    const input = bookUpdateSchema.parse(payloadOf(req));
    const result = await books.updateBook(req.user!.userId, param(req, 'id'), input, fileOf(req));
    successResponse(res, serialize(result), 'ذخیره شد.');
  }),
);

router.post(
  '/me/books/:id/submit',
  authenticate,
  wrap(async (req, res) => {
    const result = await books.submitBook(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'آگهی برای بررسی ارسال شد.');
  }),
);

router.post(
  '/me/books/:id/close',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, serialize(await books.closeBook(req.user!.userId, param(req, 'id'))), 'آگهی بسته شد.');
  }),
);

/** The seller's own cover, before anybody has approved it. */
router.get(
  '/me/books/:id/cover',
  authenticate,
  wrap(async (req, res) => {
    const image = await books.getCover(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

router.get(
  '/me/jobs',
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listOwnJobs(req.user!.userId)));
  }),
);

router.post(
  '/me/jobs',
  projectSubmitRateLimiter,
  validate({ body: jobSchema }),
  wrap(async (req, res) => {
    successResponse(res, await jobs.createJob(req.user!.userId, req.body), 'پیش‌نویس آگهی ساخته شد.', 201);
  }),
);

router.patch(
  '/me/jobs/:id',
  validate({ body: jobUpdateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await jobs.updateJob(req.user!.userId, param(req, 'id'), req.body));
  }),
);

router.post(
  '/me/jobs/:id/submit',
  wrap(async (req, res) => {
    const result = await jobs.submitJob(req.user!.userId, param(req, 'id'));
    successResponse(res, result, 'آگهی برای بررسی ارسال شد.');
  }),
);

router.post(
  '/me/jobs/:id/close',
  wrap(async (req, res) => {
    successResponse(res, await jobs.closeJob(req.user!.userId, param(req, 'id')), 'آگهی بسته شد.');
  }),
);

router.get(
  '/me/jobs/:id/applications',
  wrap(async (req, res) => {
    const result = await jobs.listApplicationsForEmployer(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result));
  }),
);

// ---- Applying -------------------------------------------------------------

// The applicant's own side of the board: what they applied to, where it got
// to, and any note a reviewer wrote back to them.
router.get(
  '/me/applications',
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listOwnApplications(req.user!.userId)));
  }),
);

router.post(
  '/me/jobs/:id/apply',
  projectSubmitRateLimiter,
  upload.single('cv'),
  wrap(async (req, res) => {
    const input = applicationSchema.parse(payloadOf(req));
    const cv = fileOf(req);

    const result = await jobs.apply(req.user!.userId, param(req, 'id'), input, cv);
    successResponse(res, result, 'درخواست شما ثبت شد و پس از بررسی برای کارفرما ارسال می‌شود.', 201);
  }),
);

router.patch(
  '/me/applications/:id',
  upload.single('cv'),
  wrap(async (req, res) => {
    const input = applicationSchema.parse(payloadOf(req));
    const cv = fileOf(req);

    const result = await jobs.reviseApplication(req.user!.userId, param(req, 'id'), input, cv);
    successResponse(res, result, 'درخواست شما به‌روزرسانی و دوباره برای بررسی ارسال شد.');
  }),
);

router.patch(
  '/me/applications/:id/outcome',
  validate({ body: applicationOutcomeSchema }),
  wrap(async (req, res) => {
    const result = await jobs.setApplicationOutcome(
      req.user!.userId,
      param(req, 'id'),
      req.body.outcome,
    );
    successResponse(res, result);
  }),
);

// ---- Projects the account has posted --------------------------------------

router.get(
  '/me/projects',
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.listOwnProjects(req.user!.userId)));
  }),
);

router.post(
  '/me/projects',
  projectSubmitRateLimiter,
  upload.array('attachments', MAX_FILES),
  wrap(async (req, res) => {
    const input = projectSchema.parse(payloadOf(req));
    const result = await freelance.createProject(req.user!.userId, input, files(req));
    successResponse(res, result, 'پیش‌نویس پروژه ساخته شد.', 201);
  }),
);

router.patch(
  '/me/projects/:id',
  validate({ body: projectUpdateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await freelance.updateProject(req.user!.userId, param(req, 'id'), req.body));
  }),
);

router.post(
  '/me/projects/:id/submit',
  wrap(async (req, res) => {
    const result = await freelance.submitProject(req.user!.userId, param(req, 'id'));
    successResponse(res, result, 'پروژه برای بررسی ارسال شد.');
  }),
);

router.get(
  '/me/projects/:id/bids',
  wrap(async (req, res) => {
    const result = await freelance.listBidsForAuthor(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result));
  }),
);

// ---- Bidding --------------------------------------------------------------

router.get(
  '/me/bids',
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.listOwnBids(req.user!.userId)));
  }),
);

router.post(
  '/me/projects/:id/bid',
  projectSubmitRateLimiter,
  upload.single('attachment'),
  wrap(async (req, res) => {
    const input = bidSchema.parse(payloadOf(req));
    const attachment = req.file
      ? { originalName: req.file.originalname, buffer: req.file.buffer }
      : null;

    const result = await freelance.placeBid(req.user!.userId, param(req, 'id'), input, attachment);
    successResponse(res, result, 'پیشنهاد شما ثبت شد و پس از بررسی برای کارفرما ارسال می‌شود.', 201);
  }),
);

router.patch(
  '/me/bids/:id',
  validate({ body: bidSchema }),
  wrap(async (req, res) => {
    const result = await freelance.reviseBid(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, serialize(result), 'پیشنهاد اصلاح‌شده دوباره برای بررسی ارسال شد.');
  }),
);

router.post(
  '/me/bids/:id/accept',
  wrap(async (req, res) => {
    const result = await freelance.acceptBid(req.user!.userId, param(req, 'id'));
    successResponse(res, serialize(result), 'این پیشنهاد پذیرفته شد.');
  }),
);

// ---- Engagement: what happens after the deal -------------------------------

router.get(
  '/me/awards',
  wrap(async (req, res) => {
    successResponse(res, serialize(await engagement.listMyAwards(req.user!.userId)));
  }),
);

router.get(
  '/me/stats',
  wrap(async (req, res) => {
    successResponse(res, await profiles.getOwnStats(req.user!.userId));
  }),
);

router.post(
  '/me/awards/:id/milestones',
  validate({ body: milestoneSchema }),
  wrap(async (req, res) => {
    const result = await engagement.addMilestone(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, result, 'مرحله اضافه شد.', 201);
  }),
);

router.post(
  '/me/milestones/:id/deliver',
  upload.single('attachment'),
  wrap(async (req, res) => {
    const input = milestoneDeliverSchema.parse(payloadOf(req));
    const attachment = req.file
      ? { originalName: req.file.originalname, buffer: req.file.buffer }
      : null;
    const result = await engagement.deliverMilestone(
      req.user!.userId,
      param(req, 'id'),
      input.deliveryNote,
      attachment,
    );
    successResponse(res, result, 'تحویل ثبت شد و در انتظار تأیید است.');
  }),
);

router.post(
  '/me/milestones/:id/approve',
  wrap(async (req, res) => {
    const result = await engagement.approveMilestone(req.user!.userId, param(req, 'id'));
    successResponse(res, result, result.awardCompleted ? 'مرحله تأیید شد و همکاری به پایان رسید.' : 'مرحله تأیید شد.');
  }),
);

router.post(
  '/me/awards/:id/complete',
  wrap(async (req, res) => {
    const result = await engagement.completeAward(req.user!.userId, param(req, 'id'));
    successResponse(res, result, 'همکاری با موفقیت به پایان رسید.');
  }),
);

router.post(
  '/me/awards/:id/review',
  validate({ body: awardReviewSchema }),
  wrap(async (req, res) => {
    const result = await engagement.reviewAward(req.user!.userId, param(req, 'id'), req.body);
    successResponse(res, result, 'امتیاز شما ثبت شد.');
  }),
);

router.post(
  '/me/awards/:id/dispute',
  validate({ body: disputeSchema }),
  wrap(async (req, res) => {
    const result = await engagement.openDispute(req.user!.userId, param(req, 'id'), req.body.reason);
    successResponse(res, result, 'اختلاف ثبت شد و همکاری تا بررسی کارشناسان متوقف شد.');
  }),
);

router.post(
  '/admin/awards/:id/resolve-dispute',
  ...canOps,
  validate({ body: disputeResolveSchema }),
  wrap(async (req, res) => {
    const result = await engagement.resolveDispute(param(req, 'id'), req.body.note);
    await ops.audit(req.user!.userId, {
      action: 'award.dispute_resolved',
      targetType: 'award',
      targetId: param(req, 'id'),
      meta: { note: req.body.note },
    });
    successResponse(res, result, 'اختلاف بسته شد.');
  }),
);

// ---- Analytics, operations and the audit trail -----------------------------

router.get(
  '/admin/disputes',
  ...canOps,
  wrap(async (_req, res) => {
    successResponse(res, serialize(await engagement.listOpenDisputes()));
  }),
);

router.get(
  '/admin/analytics',
  authenticate,
  requirePermission(PERMISSIONS.analytics),
  wrap(async (_req, res) => {
    successResponse(res, await analytics.getMarketplaceAnalytics());
  }),
);

router.post(
  '/admin/jobs/:id/feature',
  ...canOps,
  wrap(async (req, res) => {
    const result = await ops.setJobFeatured(req.user!.userId, param(req, 'id'), true);
    successResponse(res, result, 'آگهی ویژه شد.');
  }),
);

router.post(
  '/admin/jobs/:id/unfeature',
  ...canOps,
  wrap(async (req, res) => {
    const result = await ops.setJobFeatured(req.user!.userId, param(req, 'id'), false);
    successResponse(res, result, 'آگهی از حالت ویژه خارج شد.');
  }),
);

router.post(
  '/admin/projects/:id/feature',
  ...canOps,
  wrap(async (req, res) => {
    const result = await ops.setProjectFeatured(req.user!.userId, param(req, 'id'), true);
    successResponse(res, result, 'پروژه ویژه شد.');
  }),
);

router.post(
  '/admin/projects/:id/unfeature',
  ...canOps,
  wrap(async (req, res) => {
    const result = await ops.setProjectFeatured(req.user!.userId, param(req, 'id'), false);
    successResponse(res, result, 'پروژه از حالت ویژه خارج شد.');
  }),
);

router.post(
  '/admin/jobs/:id/extend',
  ...canOps,
  validate({ body: extendDeadlineSchema }),
  wrap(async (req, res) => {
    const result = await ops.extendJobDeadline(req.user!.userId, param(req, 'id'), req.body.closesAt);
    successResponse(res, serialize(result), 'مهلت آگهی تمدید شد.');
  }),
);

router.post(
  '/admin/projects/:id/extend',
  ...canOps,
  validate({ body: extendDeadlineSchema }),
  wrap(async (req, res) => {
    const result = await ops.extendProjectDeadline(req.user!.userId, param(req, 'id'), req.body.closesAt);
    successResponse(res, serialize(result), 'مهلت پروژه تمدید شد.');
  }),
);

router.post(
  '/admin/users/:id/pause',
  ...canOps,
  validate({ body: pauseSchema }),
  wrap(async (req, res) => {
    const result = await ops.setUserPaused(req.user!.userId, param(req, 'id'), req.body.paused, req.body.reason);
    successResponse(res, result, req.body.paused ? 'دسترسی کاربر به بازارگاه محدود شد.' : 'دسترسی کاربر بازگردانده شد.');
  }),
);

/** The audit log answers "who did what" — SUPER_ADMIN only, by design. */
router.get(
  '/admin/audit',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ query: auditQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, await ops.listAudit(req.query as never));
  }),
);

// ---- Messaging ---------------------------------------------------------------

router.get(
  '/me/conversations',
  wrap(async (req, res) => {
    successResponse(res, serialize(await messaging.listConversations(req.user!.userId)));
  }),
);

router.get(
  '/me/applications/:id/messages',
  wrap(async (req, res) => {
    successResponse(res, serialize(await messaging.listApplicationMessages(req.user!.userId, param(req, 'id'))));
  }),
);

router.post(
  '/me/applications/:id/messages',
  validate({ body: messageSchema }),
  wrap(async (req, res) => {
    const result = await messaging.sendApplicationMessage(req.user!.userId, param(req, 'id'), req.body.body);
    successResponse(res, result, undefined, 201);
  }),
);

router.get(
  '/me/bids/:id/messages',
  wrap(async (req, res) => {
    successResponse(res, serialize(await messaging.listBidMessages(req.user!.userId, param(req, 'id'))));
  }),
);

router.post(
  '/me/bids/:id/messages',
  validate({ body: messageSchema }),
  wrap(async (req, res) => {
    const result = await messaging.sendBidMessage(req.user!.userId, param(req, 'id'), req.body.body);
    successResponse(res, result, undefined, 201);
  }),
);

// ---- Notifications ----------------------------------------------------------

router.get(
  '/me/notifications',
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, await notifications.listNotifications(req.user!.userId, req.query as never));
  }),
);

router.get(
  '/me/notifications/unread-count',
  wrap(async (req, res) => {
    successResponse(res, { count: await notifications.unreadNotificationCount(req.user!.userId) });
  }),
);

router.post(
  '/me/notifications/:id/read',
  wrap(async (req, res) => {
    await notifications.markRead(req.user!.userId, param(req, 'id'));
    successResponse(res, { ok: true });
  }),
);

router.post(
  '/me/notifications/read-all',
  wrap(async (req, res) => {
    await notifications.markAllRead(req.user!.userId);
    successResponse(res, { ok: true });
  }),
);

// ===========================================================================
// Moderation
// ===========================================================================

const canVerify = [authenticate, requirePermission(PERMISSIONS.verification)] as const;
const canModerateJobs = [authenticate, requirePermission(PERMISSIONS.jobs)] as const;
const canModerateFreelance = [authenticate, requirePermission(PERMISSIONS.freelance)] as const;
const canModerateBooks = [authenticate, requirePermission(PERMISSIONS.books)] as const;

// ---- Book queue -----------------------------------------------------------

router.get(
  '/admin/books',
  ...canModerateBooks,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await books.listBooksForReview(req.query as never)));
  }),
);

/** The cover of something still in the queue — see books.getCover. */
router.get(
  '/admin/books/:id/cover',
  ...canModerateBooks,
  wrap(async (req, res) => {
    const image = await books.getCover(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  }),
);

router.post(
  '/admin/books/:id/review',
  ...canModerateBooks,
  validate({ body: reviewSchema }),
  wrap(async (req, res) => {
    const result = await books.reviewBook(
      param(req, 'id'),
      req.body.decision as never,
      { userId: req.user!.userId },
      { reviewNote: req.body.reviewNote as string | undefined, internalNote: req.body.internalNote as string | undefined },
    );
    successResponse(res, serialize(result), 'ثبت شد.');
  }),
);


// ---- Verification queue ---------------------------------------------------

router.get(
  '/admin/verifications',
  ...canVerify,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, await verification.listForReview(req.query as never));
  }),
);

router.get(
  '/admin/verifications/:id',
  ...canVerify,
  wrap(async (req, res) => {
    successResponse(res, await verification.getForReview(param(req, 'id')));
  }),
);

router.post(
  '/admin/verifications/:id/review',
  ...canVerify,
  validate({ body: verificationReviewSchema }),
  wrap(async (req, res) => {
    const result = await verification.review(
      param(req, 'id'),
      req.body.decision,
      { userId: req.user!.userId },
      req.body,
    );
    successResponse(res, result, 'بررسی ثبت شد.');
  }),
);

/**
 * Identity documents come back out of exactly one place, like every upload.
 *
 * ?disposition=inline asks for it to be shown rather than downloaded, which is
 * what a reviewer wants: approving an identity document means looking at it,
 * and forcing a download puts copies of other people's papers on the
 * reviewer's disk, outside anything our retention rules reach.
 *
 * Previously this set no Content-Type at all, so the browser had nothing to
 * render even had it been allowed to.
 */
router.get(
  '/admin/verification-documents/:id',
  ...canVerify,
  wrap(async (req, res) => {
    const document = await verification.getDocumentForReview(param(req, 'id'));
    const object = await openStoredFile(document.storedName);

    serveStoredFile(res, object, {
      mimeType: document.mimeType,
      originalName: document.originalName,
      disposition: requestedDisposition(req.query.disposition),
    });
  }),
);

/** A project's brief and mockups, for whoever is judging the bids on it. */
router.get(
  '/admin/project-attachments/:id',
  ...canModerateFreelance,
  wrap(async (req, res) => {
    const attachment = await freelance.getAttachmentForReview(param(req, 'id'));
    const object = await openStoredFile(attachment.storedName);

    serveStoredFile(res, object, {
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      disposition: requestedDisposition(req.query.disposition),
    });
  }),
);

/** An applicant's CV, for the reviewer deciding whether it reaches the employer. */
router.get(
  '/admin/application-cvs/:id',
  ...canModerateJobs,
  wrap(async (req, res) => {
    const application = await jobs.getApplicationCvForReview(param(req, 'id'));
    const object = await openStoredFile(application.cvStoredName);

    serveStoredFile(res, object, {
      mimeType: application.cvMimeType,
      originalName: application.cvOriginalName,
      disposition: requestedDisposition(req.query.disposition),
    });
  }),
);

// ---- Job queue ------------------------------------------------------------

router.get(
  '/admin/jobs',
  ...canModerateJobs,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listJobsForReview(req.query as never)));
  }),
);

router.get(
  '/admin/jobs/:id',
  ...canModerateJobs,
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.getJobForReview(param(req, 'id'))));
  }),
);

router.post(
  '/admin/jobs/:id/review',
  ...canModerateJobs,
  validate({ body: reviewSchema }),
  wrap(async (req, res) => {
    const result = await jobs.reviewJob(
      param(req, 'id'),
      req.body.decision,
      { userId: req.user!.userId },
      req.body,
    );
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  }),
);

router.get(
  '/admin/applications',
  ...canModerateJobs,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listApplicationsForReview(req.query as never)));
  }),
);

router.post(
  '/admin/applications/:id/review',
  ...canModerateJobs,
  validate({ body: reviewSchema }),
  wrap(async (req, res) => {
    const result = await jobs.reviewApplication(
      param(req, 'id'),
      req.body.decision,
      { userId: req.user!.userId },
      req.body,
    );
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  }),
);

// ---- Freelance queue ------------------------------------------------------

router.get(
  '/admin/projects',
  ...canModerateFreelance,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.listProjectsForReview(req.query as never)));
  }),
);

router.post(
  '/admin/projects/:id/review',
  ...canModerateFreelance,
  validate({ body: reviewSchema }),
  wrap(async (req, res) => {
    const result = await freelance.reviewProject(
      param(req, 'id'),
      req.body.decision,
      { userId: req.user!.userId },
      req.body,
    );
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  }),
);

router.get(
  '/admin/bids',
  ...canModerateFreelance,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await freelance.listBidsForReview(req.query as never)));
  }),
);

router.post(
  '/admin/bids/:id/review',
  ...canModerateFreelance,
  validate({ body: bidReviewSchema }),
  wrap(async (req, res) => {
    const result = await freelance.reviewBid(
      param(req, 'id'),
      req.body.decision,
      { userId: req.user!.userId },
      req.body,
    );
    successResponse(res, serialize(result), 'بررسی ثبت شد.');
  }),
);

/** The company's own offer, placed by staff and reviewed like everyone else's. */
router.post(
  '/admin/projects/:id/company-offer',
  ...canModerateFreelance,
  validate({ body: bidSchema }),
  wrap(async (req, res) => {
    const result = await freelance.placeCompanyOffer(
      req.user!.userId,
      param(req, 'id'),
      req.body,
    );
    successResponse(res, serialize(result), 'پیشنهاد حرفه‌ای شرکت ثبت شد.', 201);
  }),
);

export default router;
