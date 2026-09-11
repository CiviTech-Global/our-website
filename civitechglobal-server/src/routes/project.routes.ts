import { Router } from 'express';
import multer from 'multer';
import * as projectController from '../controllers/project.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { MAX_FILES, MAX_FILE_BYTES } from '../services/attachment.service.js';
import { projectRespondRateLimiter, projectSubmitRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  proposalSchema,
  respondToProposalSchema,
  updateProjectStatusSchema,
} from '../validators/project.schema.js';

/**
 * Software project enquiries: brief in, proposal out.
 *
 * Files are buffered in memory rather than written by multer, because the
 * bytes have to be inspected before anything reaches the disk — multer's own
 * disk storage would write first and ask questions afterwards. The limits here
 * are a cheap outer guard so an oversized upload is cut off at the parser
 * instead of being read into memory in full; attachment.service.ts enforces
 * the real rules on content.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES,
    // One text field (`payload`) and nothing else.
    fields: 4,
    fieldSize: 128 * 1024,
  },
});

const router = Router();

// --- Public ---------------------------------------------------------------
//
// Unauthenticated by design: a company describing a problem should not need an
// account first. Three things stand in for that account — the per-IP limiter
// below, the (email, phone) identity binding with its daily cap and hourly
// cooldown, and the content checks on every uploaded byte.

router.post(
  '/requests',
  projectSubmitRateLimiter,
  upload.array('files', MAX_FILES),
  projectController.submit
);

router.get('/requests/track/:code', projectController.track);
router.post(
  '/requests/respond',
  projectRespondRateLimiter,
  validate(respondToProposalSchema),
  projectController.respond
);

// --- Admin ----------------------------------------------------------------

// Everything below is staff-only. Attachments in particular: these are client
// documents, often under NDA.
router.use(authenticate, requirePermission(PERMISSIONS.projects));

router.get('/admin/requests', projectController.list);
router.get('/admin/requests/:id', projectController.detail);
router.patch(
  '/admin/requests/:id/status',
  validate(updateProjectStatusSchema),
  projectController.updateStatus
);

router.post(
  '/admin/requests/:id/proposals',
  validate(proposalSchema),
  projectController.createProposal
);
router.patch(
  '/admin/proposals/:proposalId',
  validate(proposalSchema),
  projectController.updateProposal
);
router.post('/admin/proposals/:proposalId/send', projectController.sendProposal);
router.get('/admin/proposals/:proposalId/document', projectController.proposalDocument);

router.get('/admin/attachments/:attachmentId', projectController.downloadAttachment);

export default router;
