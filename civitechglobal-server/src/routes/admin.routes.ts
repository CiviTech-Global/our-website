import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { userListQuerySchema, updateUserRoleSchema, updateUserAdminRoleSchema } from '../validators/admin.schema.js';
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

export default router;
