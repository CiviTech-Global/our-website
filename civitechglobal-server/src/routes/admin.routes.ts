import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { validate } from '../middleware/validate.js';
import {
  createAdminSchema,
  identityStandingSchema,
  setPermissionsSchema,
  updateUserAdminRoleSchema,
  updateUserRoleSchema,
  userListQuerySchema,
} from '../validators/admin.schema.js';
import { cuidParamSchema } from '../validators/common.schema.js';

const router = Router();

// Reading the staff list needs the users module; everything that CHANGES a
// staff account or a client's standing stays SUPER_ADMIN, below.
router.use(authenticate, requirePermission(PERMISSIONS.users));
router.get('/users', validate({ query: userListQuerySchema }), adminController.getUsers);
router.get('/roles', adminController.getRoles);
router.get('/permissions', adminController.listPermissions);

// Creating staff and deciding what they reach is the super admin's job alone.
// An admin who could grant modules could grant itself the rest of them.
router.post(
  '/users',
  authorize('SUPER_ADMIN'),
  validate({ body: createAdminSchema }),
  adminController.createAdmin,
);
router.patch(
  '/users/:id/permissions',
  authorize('SUPER_ADMIN'),
  validate({ params: cuidParamSchema, body: setPermissionsSchema }),
  adminController.setUserPermissions,
);

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
