import { Router, type Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { MAX_FILE_BYTES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import * as showcase from '../services/showcase.service.js';

/**
 * The customers club (باشگاه مشتریان), the partners page, and the projects
 * page — public reads, and the editorial control behind them.
 *
 * Writes sit behind the grantable `showcase` permission rather than
 * SUPER_ADMIN: keeping a logo wall and a portfolio current is ordinary
 * editorial work a super admin may reasonably hand to someone else.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 4, fieldSize: 64 * 1024 },
});

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => trimmed(max).optional();
const optionalUrl = z.union([z.literal(''), z.string().trim().url('نشانی معتبر نیست')]).optional();
const CURRENT_YEAR = new Date().getFullYear();

const organizationSchema = z.object({
  kind: z.enum(['CUSTOMER', 'PARTNER']),
  name: trimmed(160).min(2, 'نام الزامی است'),
  description: optionalText(2000),
  industry: optionalText(120),
  website: optionalUrl,
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sinceYear: z.number().int().min(1950).max(CURRENT_YEAR).nullable().optional(),
  partnershipType: z
    .enum(['TECHNOLOGY', 'STRATEGIC', 'ACADEMIC', 'RESELLER', 'COMMUNITY', 'OTHER'])
    .nullable()
    .optional(),
  testimonialQuote: optionalText(1000),
  testimonialAuthor: optionalText(120),
  testimonialRole: optionalText(160),
  published: z.boolean().optional(),
});

/** Dates arrive as ISO strings from the date field, Gregorian whatever was shown. */
const optionalDate = z
  .union([z.literal(''), z.null(), z.coerce.date()])
  .optional()
  .transform((value) => (value === '' ? null : value));

const projectSchema = z.object({
  title: trimmed(160).min(2, 'عنوان الزامی است'),
  summary: trimmed(400).min(10, 'خلاصه دست‌کم ۱۰ نویسه باشد'),
  description: optionalText(5000),
  category: optionalText(120),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'LAUNCHED', 'MAINTAINED', 'ARCHIVED']).optional(),
  technologies: z.array(trimmed(40).min(1)).max(30).optional(),
  projectUrl: optionalUrl,
  repositoryUrl: optionalUrl,
  startedAt: optionalDate,
  completedAt: optionalDate,
  clientId: z.string().trim().min(1).nullable().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'فهرست خالی است').max(500),
});

const router = Router();

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('شناسه نامعتبر است.', 400);
  return value;
}

/** The structured half of a multipart body, as on every other upload route. */
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

/**
 * An emptied field means "clear it".
 *
 * Mapped to null rather than undefined: on an update undefined means "leave it
 * as it was", so a website somebody deleted from the form would silently
 * survive the save.
 */
function blankToNull<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === '' ? null : value]),
  ) as T;
}

// --- Public ----------------------------------------------------------------

// Identical for everyone and edited rarely.
const cached = publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 });

router.get('/customers', cached, async (_req, res, next) => {
  try {
    successResponse(res, await showcase.listPublicOrganizations('CUSTOMER'));
  } catch (error) {
    next(error);
  }
});

router.get('/partners', cached, async (_req, res, next) => {
  try {
    successResponse(res, await showcase.listPublicOrganizations('PARTNER'));
  } catch (error) {
    next(error);
  }
});

router.get('/projects', cached, async (req, res, next) => {
  try {
    const filter = req.query.filter;
    successResponse(
      res,
      await showcase.listPublicProjects(filter === 'current' || filter === 'completed' ? filter : 'all'),
    );
  } catch (error) {
    next(error);
  }
});

router.get('/logo/:id', cached, async (req, res, next) => {
  try {
    const image = await showcase.getLogo(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

router.get('/shot/:id', cached, async (req, res, next) => {
  try {
    const image = await showcase.getScreenshot(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

router.get('/cover/:id', cached, async (req, res, next) => {
  try {
    const image = await showcase.getCover(param(req, 'id'));
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

// --- Staff -----------------------------------------------------------------

router.use('/admin', authenticate, requirePermission(PERMISSIONS.showcase));

router.get('/admin/organizations', async (req, res, next) => {
  try {
    const kind = req.query.kind === 'CUSTOMER' || req.query.kind === 'PARTNER' ? req.query.kind : undefined;
    successResponse(res, await showcase.listAllOrganizations(kind));
  } catch (error) {
    next(error);
  }
});

router.post('/admin/organizations', upload.single('logo'), async (req, res, next) => {
  try {
    const input = blankToNull(organizationSchema.parse(payloadOf(req)));
    successResponse(res, await showcase.createOrganization(input, fileOf(req)), 'ذخیره شد.', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/admin/organizations/reorder', validate(reorderSchema), async (req, res, next) => {
  try {
    await showcase.reorderOrganizations(req.body.ids as string[]);
    successResponse(res, { ok: true }, 'ترتیب ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/organizations/:id', upload.single('logo'), async (req, res, next) => {
  try {
    const input = blankToNull(organizationSchema.partial().parse(payloadOf(req)));
    successResponse(res, await showcase.updateOrganization(param(req, 'id'), input, fileOf(req)), 'ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/organizations/:id', async (req, res, next) => {
  try {
    await showcase.removeOrganization(param(req, 'id'));
    successResponse(res, { ok: true }, 'حذف شد.');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/logo/:id', async (req, res, next) => {
  try {
    const image = await showcase.getLogo(param(req, 'id'), { includeUnpublished: true });
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/projects', async (_req, res, next) => {
  try {
    successResponse(res, await showcase.listAllProjects());
  } catch (error) {
    next(error);
  }
});

router.post('/admin/projects', upload.single('cover'), async (req, res, next) => {
  try {
    const input = blankToNull(projectSchema.parse(payloadOf(req)));
    successResponse(res, await showcase.createProject(input, fileOf(req)), 'پروژه ذخیره شد.', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/admin/projects/reorder', validate(reorderSchema), async (req, res, next) => {
  try {
    await showcase.reorderProjects(req.body.ids as string[]);
    successResponse(res, { ok: true }, 'ترتیب ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/projects/:id', upload.single('cover'), async (req, res, next) => {
  try {
    const input = blankToNull(projectSchema.partial().parse(payloadOf(req)));
    successResponse(res, await showcase.updateProject(param(req, 'id'), input, fileOf(req)), 'پروژه ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/projects/:id', async (req, res, next) => {
  try {
    await showcase.removeProject(param(req, 'id'));
    successResponse(res, { ok: true }, 'پروژه حذف شد.');
  } catch (error) {
    next(error);
  }
});

router.get('/admin/cover/:id', async (req, res, next) => {
  try {
    const image = await showcase.getCover(param(req, 'id'), { includeUnpublished: true });
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

// --- Project screenshots ---------------------------------------------------

/** Several at once: a gallery is usually chosen in one go. */
const shots = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 12, fields: 4, fieldSize: 64 * 1024 },
});

router.post('/admin/projects/:id/shots', shots.array('shots', 12), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new AppError('تصویری انتخاب نشده است.', 400);

    // Captions ride alongside as one JSON array, paired by position — the
    // same reason verification sends its document kinds that way.
    const raw = typeof req.body?.captions === 'string' ? req.body.captions : '[]';
    let captions: Array<string | null> = [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) captions = parsed.map((c) => (typeof c === 'string' ? c : null));
    } catch {
      throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
    }

    const result = await showcase.addScreenshots(
      param(req, 'id'),
      files.map((file) => ({ originalName: file.originalname, buffer: file.buffer })),
      captions,
    );
    successResponse(res, result, 'تصاویر افزوده شد.', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/admin/projects/:id/shots/reorder', validate(reorderSchema), async (req, res, next) => {
  try {
    await showcase.reorderScreenshots(param(req, 'id'), req.body.ids as string[]);
    successResponse(res, { ok: true }, 'ترتیب ذخیره شد.');
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/shots/:id', async (req, res, next) => {
  try {
    successResponse(res, await showcase.removeScreenshot(param(req, 'id')), 'حذف شد.');
  } catch (error) {
    next(error);
  }
});

/** An unpublished project's screenshot, which the public route will not serve. */
router.get('/admin/shot/:id', async (req, res, next) => {
  try {
    const image = await showcase.getScreenshot(param(req, 'id'), { includeUnpublished: true });
    serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
  } catch (error) {
    next(error);
  }
});

export default router;
