import { Router } from 'express';
import * as leadController from '../controllers/lead.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { updateLeadStatusSchema, leadListQuerySchema, assignLeadSchema } from '../validators/lead.schema.js';
import { cuidParamSchema } from '../validators/common.schema.js';

const router = Router();

router.get('/stats', authenticate, requirePermission('leads'), leadController.getLeadStats);
router.get(
  '/',
  authenticate,
  requirePermission('leads'),
  validate({ query: leadListQuerySchema }),
  leadController.getAllLeads,
);
router.get(
  '/:id',
  authenticate,
  requirePermission('leads'),
  validate({ params: cuidParamSchema }),
  leadController.getLead,
);
router.put(
  '/:id/status',
  authenticate,
  requirePermission('leads'),
  validate({ params: cuidParamSchema, body: updateLeadStatusSchema }),
  leadController.updateLeadStatus,
);
router.patch(
  '/:id/assign',
  authenticate,
  requirePermission('leads'),
  validate({ params: cuidParamSchema, body: assignLeadSchema }),
  leadController.assignLead,
);

export default router;
