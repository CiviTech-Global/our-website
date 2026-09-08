import { Router } from 'express';
import authRoutes from './auth.routes.js';
import requestRoutes from './request.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import insuranceRoutes from './insurance.routes.js';
import adminRoutes from './admin.routes.js';
import projectRoutes from './project.routes.js';

const router = Router();

router.use('/auth', authRoutes);
// Admin-side queue: list, assign, progress an enquiry. Was /leads; renamed with
// the model it serves. The 'leads' permission string is unchanged — see
// request.routes.ts for why.
router.use('/requests', requestRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
// Public: catalog, phone verification, submission, tracking.
router.use('/insurance', insuranceRoutes);
// Software project enquiries: public intake and tracking, admin triage and
// proposals. The main service line, so it sits alongside insurance rather
// than under it.
router.use('/projects', projectRoutes);

export default router;
