import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, openStoredFile } from '../services/attachment.service.js';
import { requestedDisposition, serveStoredFile } from '../services/file-response.js';
import * as team from '../services/team.service.js';

/**
 * The public "تیم ما" page, and the super admin's control over it.
 *
 * Who appears on the company's own page, in what order, is not a moderation
 * decision that gets delegated per module — it is the company describing
 * itself. So this is SUPER_ADMIN rather than a permission a super admin can
 * hand out.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 20, fieldSize: 64 * 1024 },
});

const trimmed = (max: number) => z.string().trim().max(max);
const optionalUrl = z.union([z.literal(''), z.string().trim().url('نشانی معتبر نیست')]).optional();

const memberSchema = z.object({
  name: trimmed(120).min(2, 'نام الزامی است'),
  title: trimmed(160).min(2, 'سمت الزامی است'),
  bio: trimmed(2000).optional(),
  team: trimmed(80).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('ایمیل معتبر نیست')]).optional(),
  linkedin: optionalUrl,
  github: optionalUrl,
  website: optionalUrl,
  published: z.coerce.boolean().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'فهرست خالی است').max(200),
});

const router = Router();

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('شناسه نامعتبر است.', 400);
  return value;
}

/** The structured half of a multipart body, as everywhere else here. */
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

// --- Public ----------------------------------------------------------------

// The page changes rarely and is identical for everyone.
router.get(
  '/',
  publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 }),
  async (_req, res, next) => {
    try {
      successResponse(res, await team.listPublic());
    } catch (error) {
      next(error);
    }
  },
);

/**
 * A portrait, served inline.
 *
 * Public, because the page is — but only for a published member: an
 * unpublished profile being prepared should not be readable by anyone who
 * guesses an id.
 */
router.get(
  '/photo/:id',
  publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 }),
  async (req, res, next) => {
    try {
      const photo = await team.getPhoto(param(req, 'id'));
      if (!photo.published) throw new AppError('تصویری برای این عضو ثبت نشده است.', 404);

      const object = await openStoredFile(photo.storedName);
      serveStoredFile(res, object, {
        mimeType: photo.mimeType,
        originalName: photo.originalName,
        // A portrait on a public page is meant to be looked at, not downloaded.
        disposition: requestedDisposition(req.query.disposition ?? 'inline'),
      });
    } catch (error) {
      next(error);
    }
  },
);

// --- Super admin -----------------------------------------------------------

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/admin', async (_req, res, next) => {
  try {
    successResponse(res, await team.listAll());
  } catch (error) {
    next(error);
  }
});

router.post('/admin', upload.single('photo'), async (req, res, next) => {
  try {
    const input = memberSchema.parse(payloadOf(req));
    successResponse(res, await team.create(input, fileOf(req)), 'عضو جدید اضافه شد.', 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:id', upload.single('photo'), async (req, res, next) => {
  try {
    const input = memberSchema.partial().parse(payloadOf(req));
    successResponse(res, await team.update(param(req, 'id'), input, fileOf(req)), 'به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
});

// No POST /admin/:id exists, so this cannot be shadowed by one — but it is
// kept adjacent to the other /admin writes rather than at the end, where the
// next person adding a POST would not see it.
router.post('/admin/reorder', validate(reorderSchema), async (req, res, next) => {
  try {
    await team.reorder(req.body.ids as string[]);
    successResponse(res, { ok: true }, 'ترتیب ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/:id', async (req, res, next) => {
  try {
    await team.remove(param(req, 'id'));
    successResponse(res, { ok: true }, 'عضو حذف شد.');
  } catch (error) {
    next(error);
  }
});

export default router;
