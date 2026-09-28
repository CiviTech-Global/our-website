import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { demoSummary, seedDemoData, teardownDemoData } from '../services/demo/index.js';

/**
 * Demo data, from the admin panel.
 *
 * The same three operations the command line offers, for the case where
 * somebody is already looking at the site and wants to fill it or empty it
 * without leaving it.
 *
 * FOUR THINGS GUARD THIS, and the redundancy is deliberate. Teardown is a loop
 * of deleteMany, so the question is not whether one guard is enough but whether
 * every plausible mistake is covered by at least one:
 *
 *   1. The router answers 404 outside development, so the endpoints do not
 *      exist in production rather than merely refusing.
 *   2. authenticate — a caller must be signed in.
 *   3. authorize('SUPER_ADMIN') — and be the owner of the site, not merely
 *      staff. There is no grantable permission for this on purpose: a module
 *      permission can be handed to somebody who should not be able to empty
 *      the database.
 *   4. The service itself calls assertNotProduction, so even a route mounted
 *      by mistake cannot reach a live database.
 */

const router = Router();

/**
 * Absent outside development, not forbidden.
 *
 * A 403 would tell anybody who asked that a "wipe the database" endpoint
 * exists here and invite them to keep trying. This way it is indistinguishable
 * from a route that was never written.
 */
router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (env.NODE_ENV === 'production') {
    next(new AppError('یافت نشد.', 404));
    return;
  }
  next();
});

const onlyOwner = [authenticate, authorize('SUPER_ADMIN')] as const;

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap =
  (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

router.get(
  '/',
  ...onlyOwner,
  wrap(async (_req, res) => {
    successResponse(res, await demoSummary());
  })
);

router.post(
  '/seed',
  ...onlyOwner,
  wrap(async (_req, res) => {
    const result = await seedDemoData();
    successResponse(res, result, 'داده‌های نمونه ساخته شد.', 201);
  })
);

/**
 * DELETE, not POST.
 *
 * The method says what happens, so a link that is followed by accident — a
 * crawler, a prefetch, a browser restoring tabs — cannot empty the demo data.
 */
router.delete(
  '/',
  ...onlyOwner,
  wrap(async (_req, res) => {
    const result = await teardownDemoData();
    successResponse(res, result, 'داده‌های نمونه حذف شد.');
  })
);

export default router;
