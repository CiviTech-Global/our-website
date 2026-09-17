import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { successResponse } from '../utils/apiResponse.js';
import { getWorkload } from '../services/workload.service.js';

const router = Router();

/**
 * What is waiting for the caller, scoped to the modules they can open.
 *
 * Any member of staff, with no module permission required: it is their own
 * home screen and sidebar, and the service leaves out every queue they have
 * not been granted — so an admin with nothing granted gets an empty workload
 * rather than an error.
 */
router.get('/workload', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    // Personal and live: never shared or cached.
    res.setHeader('Cache-Control', 'no-store');
    successResponse(res, await getWorkload({ userId: req.user!.userId, role: req.user!.role }));
  } catch (error) {
    next(error);
  }
});

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.analytics),
  dashboardController.getAdminDashboard,
);

export default router;
