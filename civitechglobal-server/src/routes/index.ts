import { Router } from 'express';
import authRoutes from './auth.routes.js';
import leadRoutes from './lead.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import insuranceRoutes from './insurance.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/insurance', insuranceRoutes);

export default router;
