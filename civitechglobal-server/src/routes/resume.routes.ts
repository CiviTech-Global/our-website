import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { AppError } from '../middleware/errorHandler.js';
import { projectRespondRateLimiter, projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, resolveStoredPath, type IncomingFile } from '../services/attachment.service.js';
import * as resumeService from '../services/resume-submission.service.js';
import {
  resumeAllowanceSchema,
  resumeSubmissionSchema,
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

      const result = await resumeService.submitResume(
        {
          ...input,
          linkedinUrl: input.linkedinUrl || undefined,
          githubUrl: input.githubUrl || undefined,
          portfolioUrl: input.portfolioUrl || undefined,
        },
        files
      );

      successResponse(
        res,
        result,
        'رزومهٔ شما دریافت شد. کد رهگیری را نگه دارید؛ در صورت تطابق با موقعیت شغلی مناسب با شما تماس می‌گیریم.',
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
      const { email } = req.body as z.infer<typeof resumeAllowanceSchema>;
      successResponse(res, await resumeService.describeResumeAllowance(email));
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

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/admin', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status ? { status: status as never } : {};

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
          headline: true,
          desiredRole: true,
          yearsOfExperience: true,
          skills: true,
          city: true,
          status: true,
          matchedRole: true,
          createdAt: true,
        },
      }),
      prisma.resumeSubmission.count({ where }),
    ]);

    successResponse(res, serialize({ items, page, pageSize, total }));
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
      },
      select: { id: true, status: true, matchedRole: true },
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

    const fullPath = resolveStoredPath(row.resumeStoredName);
    const stats = await stat(fullPath).catch(() => null);
    if (!stats) throw new AppError('فایل روی سرور موجود نیست.', 410);

    res.setHeader('Content-Type', row.resumeMimeType);
    res.setHeader('Content-Length', String(stats.size));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resume"; filename*=UTF-8''${encodeURIComponent(row.resumeOriginalName)}`
    );

    createReadStream(fullPath).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
