import { Router, type NextFunction, type Request, type Response } from 'express';
import { toPage } from '../utils/page.js';
import multer from 'multer';
import type { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { projectRespondRateLimiter, projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, openStoredFile, type IncomingFile } from '../services/attachment.service.js';
import { requestedDisposition, serveStoredFile } from '../services/file-response.js';
import * as resumeService from '../services/resume-submission.service.js';
import {
  resumeAllowanceSchema,
  resumeSubmissionSchema,
  resumeTrackSchema,
  updateResumeStatusSchema,
} from '../validators/resume.schema.js';

/**
 * Talent intake.
 *
 * Public and unauthenticated by design — asking someone to create an account
 * before they can hand you a CV loses the candidates you most want. Three
 * things stand in for that account: the per-IP limiter here, the (email, phone)
 * identity with its two-a-day / two-days-ever policy, and the content checks on
 * the uploaded bytes.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  // One CV. The outer caps are a cheap guard so an oversized upload dies at the
  // parser rather than being read into memory in full; attachment.service.ts
  // enforces the real rules on content.
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 4, fieldSize: 128 * 1024 },
});

const router = Router();

/** BigInt does not survive JSON.stringify; money crosses as a decimal string. */
function serialize<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}

// --- Public ---------------------------------------------------------------

router.post(
  '/',
  projectSubmitRateLimiter,
  upload.single('resume'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = typeof req.body?.payload === 'string' ? req.body.payload : null;
      if (!raw) throw new AppError('اطلاعات فرم ارسال نشده است.', 400);

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
      }

      const input = resumeSubmissionSchema.parse(parsed);
      const file = req.file;
      const files: IncomingFile[] = file
        ? [{ originalName: file.originalname, buffer: file.buffer }]
        : [];

      const result = await resumeService.submitResume(input, files);

      successResponse(
        res,
        result,
        // A volunteer or intern is not waiting for a vacancy to match, so the
        // job applicant's confirmation would promise them the wrong next step.
        input.track === 'JOB'
          ? 'رزومهٔ شما دریافت شد. کد رهگیری را نگه دارید؛ در صورت تطابق با موقعیت شغلی مناسب با شما تماس می‌گیریم.'
          : 'درخواست شما دریافت شد. کد رهگیری را نگه دارید؛ درخواست را بررسی می‌کنیم و برای گفت‌وگو با شما تماس می‌گیریم.',
        201
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * How much of the allowance is left, before anything is typed.
 *
 * Finding out you have used your two days AFTER writing a page of detail and
 * attaching a file is a bad way to find out.
 */
router.post(
  '/allowance',
  projectRespondRateLimiter,
  validate(resumeAllowanceSchema),
  async (req, res, next) => {
    try {
      const { email, track } = req.body as z.infer<typeof resumeAllowanceSchema>;
      successResponse(res, await resumeService.describeResumeAllowance(email, track));
    } catch (error) {
      next(error);
    }
  }
);

router.get('/track/:code', async (req, res, next) => {
  try {
    successResponse(res, serialize(await resumeService.trackResume(param(req, 'code'))));
  } catch (error) {
    next(error);
  }
});

// --- Admin ----------------------------------------------------------------
//
// Staff only. A CV is somebody's employment history, address and phone number
// handed over in confidence; it is not browsable by anyone with a link.

router.use(authenticate, requirePermission(PERMISSIONS.resumes));

router.get('/admin', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    // Parsed, not cast: an unknown value here used to reach Prisma as an enum
    // it could not match, which is a 500 for what is really a bad query string.
    const status = updateResumeStatusSchema.shape.status.safeParse(req.query.status);
    // One track or several, comma-separated: the volunteer and internship
    // queue shows both programmes together, and the CV queue shows jobs alone.
    const tracks = (typeof req.query.track === 'string' ? req.query.track.split(',') : [])
      .map((value) => resumeTrackSchema.safeParse(value.trim()))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
    const where = {
      ...(status.success ? { status: status.data } : {}),
      ...(tracks.length > 0 ? { track: { in: tracks } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.resumeSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          trackingCode: true,
          fullName: true,
          city: true,
          track: true,
          discipline: true,
          hoursPerWeek: true,
          status: true,
          matchedRole: true,
          createdAt: true,
        },
      }),
      prisma.resumeSubmission.count({ where }),
    ]);

    successResponse(res, serialize(toPage(items, total, page, pageSize)));
  } catch (error) {
    next(error);
  }
});

router.get('/admin/:id', async (req, res, next) => {
  try {
    const row = await prisma.resumeSubmission.findUnique({
      where: { id: param(req, 'id') },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        identity: { select: { id: true, requestCount: true, trusted: true, blocked: true } },
      },
    });
    if (!row) throw new AppError('رزومه پیدا نشد.', 404);
    successResponse(res, serialize(row));
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id', validate(updateResumeStatusSchema), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof updateResumeStatusSchema>;
    const updated = await prisma.resumeSubmission.update({
      where: { id: param(req, 'id') },
      data: {
        status: input.status,
        matchedRole: input.matchedRole,
        internalNotes: input.internalNotes,
        // Prisma skips undefined, so an update that only sets the status does
        // not silently unassign the person already working on it. Explicit
        // null is the way to hand it back to the pile.
        assignedToId: input.assignedToId,
      },
      select: { id: true, status: true, matchedRole: true, assignedToId: true },
    });
    successResponse(res, updated, 'وضعیت به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
});

/**
 * Streams the CV to an authenticated member of staff.
 *
 * The only route the bytes come back out of, which is what makes "stored
 * outside the web root" mean something. Forced download, no content sniffing.
 */
router.get('/admin/:id/file', async (req, res, next) => {
  try {
    const row = await prisma.resumeSubmission.findUnique({
      where: { id: param(req, 'id') },
      select: { resumeStoredName: true, resumeOriginalName: true, resumeMimeType: true },
    });
    if (!row) throw new AppError('رزومه پیدا نشد.', 404);

    const object = await openStoredFile(row.resumeStoredName);

    serveStoredFile(res, object, {
      mimeType: row.resumeMimeType,
      originalName: row.resumeOriginalName,
      disposition: requestedDisposition(req.query.disposition),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
