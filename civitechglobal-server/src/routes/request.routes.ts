import { Router } from 'express';
import * as requestController from '../controllers/request.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import {
  updateRequestStatusSchema,
  requestListQuerySchema,
  assignRequestSchema,
  scheduleCallbackSchema,
} from '../validators/request.schema.js';
import { cuidParamSchema } from '../validators/common.schema.js';

const router = Router();

// The permission string stays 'leads'. It is stored on user rows and inside
// AdminRole.permissions; renaming it would mean migrating that data to no
// benefit, and everyone who has it already means "can work the enquiry queue".
const canWorkRequests = [authenticate, requirePermission('leads')] as const;

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
