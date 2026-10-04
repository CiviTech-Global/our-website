import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicCache } from '../middleware/cacheControl.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { features } from '../config/features.js';
import { MAX_FILE_BYTES, openStoredFile } from '../services/attachment.service.js';
import { serveStoredFile } from '../services/file-response.js';
import * as companies from '../services/company.service.js';
import * as seeker from '../services/job-seeker.service.js';
import * as jobs from '../services/jobs.service.js';
import { listJobCategories } from '../services/job-taxonomy.service.js';
import {
  alertCreateSchema,
  alertUpdateSchema,
  companyHiddenSchema,
  companyListSchema,
  companySchema,
  employerNoteSchema,
  staffCompanyListSchema,
} from '../validators/jobs.schema.js';

/**
 * The job board's second generation: categories, company pages, saved jobs,
 * alerts, recommendations and the employer's pipeline tools.
 *
 * The board's postings and applications stay where they always were, under
 * /market; this router holds only what is new, so that switching it off
 * leaves the live board exactly as it was.
 *
 * NOT REACHABLE WHILE FEATURE_JOBS_V2 IS OFF. Gated once, at the router, as
 * TradeMaster is: a route added later is covered without anybody remembering.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 2, fields: 20, fieldSize: 64 * 1024 },
});

const router = Router();

/** Off means absent: a 404, indistinguishable from a route that never existed. */
router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (!features.jobsV2) {
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

const namedFile = (req: Request, field: string) => {
  const file = (req.files as Record<string, Express.Multer.File[]> | undefined)?.[field]?.[0];
  return file ? { originalName: file.originalname, buffer: file.buffer } : null;
};

const listCache = publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 });
/** A category list changes when staff edit it, which is rarely. */
const taxonomyCache = publicCache({ maxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600 });

// ===========================================================================
// Public
// ===========================================================================

router.get(
  '/categories',
  taxonomyCache,
  wrap(async (_req, res) => {
    successResponse(res, await listJobCategories());
  }),
);

router.get(
  '/companies',
  listCache,
  validate({ query: companyListSchema }),
  wrap(async (req, res) => {
    successResponse(res, await companies.listCompanies(req.query as never));
  }),
);

router.get(
  '/companies/:slug',
  listCache,
  wrap(async (req, res) => {
    successResponse(res, serialize(await companies.getPublicCompany(param(req, 'slug'))));
  }),
);

for (const which of ['logo', 'cover'] as const) {
  router.get(
    `/companies/:id/${which}`,
    listCache,
    wrap(async (req, res) => {
      const image = await companies.getCompanyImage(param(req, 'id'), which);
      serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
    }),
  );
}

// ===========================================================================
// Signed in
// ===========================================================================

router.use('/me', authenticate);

// ---- The employer's company page ------------------------------------------

router.get(
  '/me/company',
  wrap(async (req, res) => {
    successResponse(res, await companies.getOwnCompany(req.user!.userId));
  }),
);

router.put(
  '/me/company',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  wrap(async (req, res) => {
    const input = companySchema.parse(payloadOf(req));
    const result = await companies.saveOwnCompany(req.user!.userId, input, {
      logo: namedFile(req, 'logo'),
      cover: namedFile(req, 'cover'),
    });
    successResponse(res, result, 'صفحهٔ شرکت ذخیره شد.');
  }),
);

for (const which of ['logo', 'cover'] as const) {
  router.get(
    `/me/company/${which}`,
    wrap(async (req, res) => {
      const image = await companies.getOwnCompanyImage(req.user!.userId, which);
      serveStoredFile(res, await openStoredFile(image.storedName), { ...image, disposition: 'inline' });
    }),
  );
}

// ---- The employer's pipeline ----------------------------------------------

router.get(
  '/me/pipeline',
  wrap(async (req, res) => {
    successResponse(res, await jobs.ownJobPipelineCounts(req.user!.userId));
  }),
);

router.patch(
  '/me/applications/:id/note',
  validate({ body: employerNoteSchema }),
  wrap(async (req, res) => {
    successResponse(res, await jobs.setEmployerNote(req.user!.userId, param(req, 'id'), req.body.note));
  }),
);

// ---- The applicant --------------------------------------------------------

router.post(
  '/me/applications/:id/withdraw',
  wrap(async (req, res) => {
    const result = await jobs.withdrawApplication(req.user!.userId, param(req, 'id'));
    successResponse(res, result, 'درخواست شما پس گرفته شد.');
  }),
);

router.get(
  '/me/saved',
  wrap(async (req, res) => {
    successResponse(res, serialize(await seeker.listSavedJobs(req.user!.userId)));
  }),
);

router.get(
  '/me/saved/ids',
  wrap(async (req, res) => {
    successResponse(res, await seeker.listSavedJobIds(req.user!.userId));
  }),
);

router.put(
  '/me/saved/:jobId',
  wrap(async (req, res) => {
    successResponse(res, await seeker.saveJob(req.user!.userId, param(req, 'jobId')));
  }),
);

router.delete(
  '/me/saved/:jobId',
  wrap(async (req, res) => {
    successResponse(res, await seeker.unsaveJob(req.user!.userId, param(req, 'jobId')));
  }),
);

router.get(
  '/me/alerts',
  wrap(async (req, res) => {
    successResponse(res, await seeker.listAlerts(req.user!.userId));
  }),
);

router.post(
  '/me/alerts',
  validate({ body: alertCreateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await seeker.createAlert(req.user!.userId, req.body), 'هشدار شغلی ساخته شد.', 201);
  }),
);

router.patch(
  '/me/alerts/:id',
  validate({ body: alertUpdateSchema }),
  wrap(async (req, res) => {
    successResponse(res, await seeker.updateAlert(req.user!.userId, param(req, 'id'), req.body));
  }),
);

router.delete(
  '/me/alerts/:id',
  wrap(async (req, res) => {
    successResponse(res, await seeker.deleteAlert(req.user!.userId, param(req, 'id')));
  }),
);

router.get(
  '/me/recommended',
  wrap(async (req, res) => {
    successResponse(res, serialize(await seeker.recommendedJobs(req.user!.userId)));
  }),
);

router.get(
  '/me/match/:jobId',
  wrap(async (req, res) => {
    successResponse(res, await seeker.myMatchForJob(req.user!.userId, param(req, 'jobId')));
  }),
);

// ===========================================================================
// Staff
// ===========================================================================

const canModerateJobs = [authenticate, requirePermission(PERMISSIONS.jobs)] as const;

router.get(
  '/admin/companies',
  ...canModerateJobs,
  validate({ query: staffCompanyListSchema }),
  wrap(async (req, res) => {
    successResponse(res, await companies.listCompaniesForStaff(req.query as never));
  }),
);

router.patch(
  '/admin/companies/:id',
  ...canModerateJobs,
  validate({ body: companyHiddenSchema }),
  wrap(async (req, res) => {
    successResponse(res, await companies.setCompanyHidden(param(req, 'id'), req.body.hidden));
  }),
);

export default router;
