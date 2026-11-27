import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { publicCache } from '../middleware/cacheControl.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { socialRailSchema } from '../validators/site.schema.js';
import * as site from '../services/site.service.js';

/**
 * Runtime settings of the public site.
 *
 * The social rail is read by every public page, so the read is public and
 * cached briefly; changing what the company's own site shows is the super
 * admin's decision, the same rule as the team page.
 */

const router = Router();

// --- Public ----------------------------------------------------------------

router.get(
  '/social-rail',
  // Short: switching the rail on should show up within the minute, and the
  // answer is a handful of links either way.
  publicCache({ maxAgeSeconds: 60 }),
  async (_req, res, next) => {
    try {
      successResponse(res, await site.getSocialRail());
    } catch (error) {
      next(error);
    }
  },
);

// --- Super admin -----------------------------------------------------------

router.use('/admin', authenticate, authorize('SUPER_ADMIN'));

router.get('/admin/social-rail', async (_req, res, next) => {
  try {
    successResponse(res, await site.getSocialRail());
  } catch (error) {
    next(error);
  }
});

router.put(
  '/admin/social-rail',
  validate({ body: socialRailSchema }),
  async (req, res, next) => {
    try {
      successResponse(
        res,
        await site.saveSocialRail(req.body, req.user!.userId),
        'تنظیمات نوار پیوندها ذخیره شد.',
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
