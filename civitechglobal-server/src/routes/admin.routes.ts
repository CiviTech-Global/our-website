import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  identityStandingSchema,
  updateUserAdminRoleSchema,
  updateUserRoleSchema,
  userListQuerySchema,
} from '../validators/admin.schema.js';
import { cuidParamSchema } from '../validators/common.schema.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));
router.get('/users', validate({ query: userListQuerySchema }), adminController.getUsers);
router.get('/roles', adminController.getRoles);

// Role changes and account deactivation are more sensitive than the
// read-only routes above, so they're restricted to SUPER_ADMIN even though
// the router-level guard already allows ADMIN.
router.patch(
  '/users/:id/role',
  authorize('SUPER_ADMIN'),
  validate({ params: cuidParamSchema, body: updateUserRoleSchema }),
  adminController.updateUserRole,
);
router.patch(
  '/users/:id/admin-role',
  authorize('SUPER_ADMIN'),
  validate({ params: cuidParamSchema, body: updateUserAdminRoleSchema }),
  adminController.updateUserAdminRole,
);
router.patch(
  '/users/:id/deactivate',
  authorize('SUPER_ADMIN'),
  validate({ params: cuidParamSchema }),
  adminController.deactivateUser,
);

// Client identities — the (email, phone) pair shared by the project and CV
// intakes. Reading one is ordinary admin work; changing its standing is not.
router.get(
  '/identities/:id',
  validate({ params: cuidParamSchema }),
  adminController.getIdentity,
);

// SUPER_ADMIN only, alongside the other decisions with lasting consequences.
// Blocking stops somebody submitting anything at all, and trusting removes
// every rate limit that keeps anonymous abuse expensive.
router.patch(
  '/identities/:id',
  authorize('SUPER_ADMIN'),
  validate({ params: cuidParamSchema, body: identityStandingSchema }),
  adminController.setIdentityStanding,
);

export default router;
