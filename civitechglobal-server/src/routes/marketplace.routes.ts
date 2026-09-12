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
import {
  applicationOutcomeSchema,
  applicationSchema,
  bidReviewSchema,
  bidSchema,
  documentKindsSchema,
  jobSchema,
  jobUpdateSchema,
  listQuerySchema,
  projectSchema,
  projectUpdateSchema,
  reviewSchema,
  verificationReviewSchema,
  verificationSchema,
} from '../validators/marketplace.schema.js';

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

router.get(
  '/jobs',
  boardCache,
  validate({ query: listQuerySchema }),
  wrap(async (req, res) => {
    successResponse(res, serialize(await jobs.listPublicJobs(req.query as never)));
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
  validate({ query: listQuerySchema }),
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

// ===========================================================================
// The account acting for itself
// ===========================================================================

router.use('/me', authenticate);

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
    const cv = req.file ? { originalName: req.file.originalname, buffer: req.file.buffer } : null;

    const result = await jobs.apply(req.user!.userId, param(req, 'id'), input, cv);
    successResponse(res, result, 'درخواست شما ثبت شد و پس از بررسی برای کارفرما ارسال می‌شود.', 201);
  }),
);

router.patch(
  '/me/applications/:id',
  upload.single('cv'),
  wrap(async (req, res) => {
    const input = applicationSchema.parse(payloadOf(req));
    const cv = req.file ? { originalName: req.file.originalname, buffer: req.file.buffer } : null;

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

// ===========================================================================
// Moderation
// ===========================================================================

const canVerify = [authenticate, requirePermission(PERMISSIONS.verification)] as const;
const canModerateJobs = [authenticate, requirePermission(PERMISSIONS.jobs)] as const;
const canModerateFreelance = [authenticate, requirePermission(PERMISSIONS.freelance)] as const;

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
