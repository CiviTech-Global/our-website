import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.analytics),
  dashboardController.getAdminDashboard,
);

export default router;
