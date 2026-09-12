import { Router } from 'express';
import * as requestController from '../controllers/request.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { validate } from '../middleware/validate.js';
import {
  updateRequestStatusSchema,
  requestListQuerySchema,
  assignRequestSchema,
  scheduleCallbackSchema,
} from '../validators/request.schema.js';
import { cuidParamSchema } from '../validators/common.schema.js';

const router = Router();

const canWorkRequests = [authenticate, requirePermission(PERMISSIONS.insurance)] as const;

router.get('/stats', ...canWorkRequests, requestController.getRequestStats);

router.get(
  '/',
  ...canWorkRequests,
  validate({ query: requestListQuerySchema }),
  requestController.getAllRequests,
);

router.get(
  '/:id',
  ...canWorkRequests,
  validate({ params: cuidParamSchema }),
  requestController.getRequest,
);

router.put(
  '/:id/status',
  ...canWorkRequests,
  validate({ params: cuidParamSchema, body: updateRequestStatusSchema }),
  requestController.updateRequestStatus,
);

router.patch(
  '/:id/assign',
  ...canWorkRequests,
  validate({ params: cuidParamSchema, body: assignRequestSchema }),
  requestController.assignRequest,
);

router.patch(
  '/:id/callback',
  ...canWorkRequests,
  validate({ params: cuidParamSchema, body: scheduleCallbackSchema }),
  requestController.scheduleCallback,
);

export default router;
