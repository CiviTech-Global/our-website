import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import * as experts from '../services/experts.service.js';
import * as consultations from '../services/consultation.service.js';

/**
 * The club of experts, and the consultations they give.
 *
 * Two halves of one idea, so one router: the club is how somebody decides who
 * to talk to, and the request is how they ask. Reads are public and cached;
 * the editorial side sits behind `experts`, and the queue behind
 * `consultations`, because keeping a directory current and ringing people back
 * are different jobs for different desks.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 4, fieldSize: 64 * 1024 },
});

const router = Router();

const trimmed = (max: number) => z.string().trim().max(max);
const optionalUrl = z.union([z.literal(''), z.string().trim().url('نشانی معتبر نیست')]).optional();

/** Iranian mobile, the same rule the insurance intake uses. */
const phone = z
  .string()
  .trim()
  .regex(/^09\d{9}$/, 'شمارهٔ تماس باید به فرمت ۰۹xxxxxxxxx باشد');

const requestSchema = z.object({
  fullName: trimmed(120).min(2, 'نام الزامی است'),
  phone,
  email: z.union([z.literal(''), z.string().trim().email('ایمیل معتبر نیست')]).optional(),
  topic: z.enum(['CAREER', 'TECHNICAL', 'STARTING_OUT', 'HIRING', 'OTHER']),
  preferredMode: z.enum(['ONLINE', 'PHONE', 'IN_PERSON']).optional(),
  goal: trimmed(2000).optional(),
  background: trimmed(1000).optional(),
  expertSlug: trimmed(80).optional(),
  availability: z
    .array(
      z.object({
        day: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ نامعتبر است'),
        part: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
      })
    )
    .min(1, 'حداقل یک بازهٔ زمانی انتخاب کنید')
    .max(6),
});

const expertSchema = z.object({
  fullName: trimmed(120).min(2, 'نام الزامی است'),
  headline: trimmed(160).min(2, 'عنوان الزامی است'),
  slug: trimmed(80).optional(),
  bio: trimmed(4000).optional(),
  specialities: z.array(trimmed(60)).max(20).optional(),
  languages: z.array(trimmed(40)).max(10).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(70).nullable().optional(),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  websiteUrl: optionalUrl,
  acceptsConsultations: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  published: z.coerce.boolean().optional(),
});

const staffUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'NO_ANSWER', 'CANCELLED']).optional(),
  staffNote: z.union([z.literal(''), trimmed(2000)]).nullable().optional(),
  scheduledAt: z.string().trim().datetime().nullable().optional(),
  assignedToId: z.string().trim().nullable().optional(),
});

const queueSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: trimmed(30).optional(),
  expertId: trimmed(40).optional(),
  search: trimmed(120).optional(),
});

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

const wrap =
  (handler: (req: Request, res: import('express').Response) => Promise<void>) =>
  (req: Request, res: import('express').Response, next: import('express').NextFunction) => {
    handler(req, res).catch(next);
  };

// --- Public: the club ------------------------------------------------------

const cached = publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 });

router.get(
  '/experts',
  cached,
  wrap(async (_req, res) => {
    successResponse(res, await experts.listPublicExperts());
  })
);

router.get(
  '/experts/:slug',
  cached,
  wrap(async (req, res) => {
    successResponse(res, await experts.getPublicExpert(param(req, 'slug')));
  })
);

router.get(
  '/experts/:id/photo',
  cached,
  wrap(async (req, res) => {
    const image = await experts.getPhoto(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

// --- Public: asking for a consultation -------------------------------------

router.post(
  '/requests',
  // The same limiter the project intake uses: a public form that writes a row
  // is the shape somebody scripts.
  projectSubmitRateLimiter,
  validate({ body: requestSchema }),
  wrap(async (req, res) => {
    const result = await consultations.createRequest(req.body as never);
    successResponse(res, result, 'درخواست مشاوره ثبت شد. کد رهگیری را نگه دارید.', 201);
  })
);

router.get(
  '/requests/:code',
  wrap(async (req, res) => {
    successResponse(res, await consultations.trackRequest(param(req, 'code')));
  })
);

router.post(
  '/requests/:code/cancel',
  wrap(async (req, res) => {
    successResponse(res, await consultations.cancelRequest(param(req, 'code')), 'درخواست لغو شد.');
  })
);

// --- Staff: the directory --------------------------------------------------

const canEditExperts = [authenticate, requirePermission(PERMISSIONS.experts)] as const;
const canHandleConsultations = [authenticate, requirePermission(PERMISSIONS.consultations)] as const;

router.get(
  '/admin/experts',
  ...canEditExperts,
  wrap(async (_req, res) => {
    successResponse(res, await experts.listAllExperts());
  })
);

/** An unpublished profile's photo, which the public route will not serve. */
router.get(
  '/admin/experts/:id/photo',
  ...canEditExperts,
  wrap(async (req, res) => {
    const image = await experts.getPhoto(param(req, 'id'), true);
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  })
);

router.post(
  '/admin/experts',
  ...canEditExperts,
  upload.single('photo'),
  wrap(async (req, res) => {
    const input = expertSchema.parse(payloadOf(req));
    successResponse(res, await experts.createExpert(input as never, fileOf(req)), 'ذخیره شد.', 201);
  })
);

router.patch(
  '/admin/experts/:id',
  ...canEditExperts,
  upload.single('photo'),
  wrap(async (req, res) => {
    const input = expertSchema.partial().parse(payloadOf(req));
    successResponse(res, await experts.updateExpert(param(req, 'id'), input as never, fileOf(req)), 'ذخیره شد.');
  })
);

router.post(
  '/admin/experts/reorder',
  ...canEditExperts,
  validate({ body: z.object({ ids: z.array(z.string().trim().min(1)).min(1) }) }),
  wrap(async (req, res) => {
    successResponse(res, await experts.reorderExperts(req.body.ids as string[]), 'ترتیب ذخیره شد.');
  })
);

router.delete(
  '/admin/experts/:id',
  ...canEditExperts,
  wrap(async (req, res) => {
    successResponse(res, await experts.deleteExpert(param(req, 'id')), 'حذف شد.');
  })
);

// --- Staff: the queue ------------------------------------------------------

router.get(
  '/admin/requests',
  ...canHandleConsultations,
  validate({ query: queueSchema }),
  wrap(async (req, res) => {
    successResponse(res, await consultations.listForStaff(req.query as never));
  })
);

router.patch(
  '/admin/requests/:id',
  ...canHandleConsultations,
  validate({ body: staffUpdateSchema }),
  wrap(async (req, res) => {
    const result = await consultations.updateForStaff(
      param(req, 'id'),
      req.body as never,
      req.user!.userId
    );
    successResponse(res, result, 'ثبت شد.');
  })
);

export default router;
