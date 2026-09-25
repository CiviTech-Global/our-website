import { Router } from 'express';
import authRoutes from './auth.routes.js';
import requestRoutes from './request.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import insuranceRoutes from './insurance.routes.js';
import adminRoutes from './admin.routes.js';
import projectRoutes from './project.routes.js';
import contactRoutes from './contact.routes.js';
import teamRoutes from './team.routes.js';
import showcaseRoutes from './showcase.routes.js';
import capabilitiesRoutes from './capabilities.routes.js';
import consultationRoutes from './consultation.routes.js';
import i18nRoutes from './i18n.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import marketplaceRoutes from './marketplace.routes.js';
import tradeMasterRoutes from './trademaster.routes.js';
import resumeRoutes from './resume.routes.js';
import trackRoutes from './track.routes.js';
import sitemapRoutes from './sitemap.routes.js';

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
// Public contact form, and the inbox behind it.
router.use('/contact', contactRoutes);

// The public "تیم ما" page, and the super admin's control over it.
router.use('/team', teamRoutes);

// The club of experts, and the consultations they give.
router.use('/consult', consultationRoutes);

// The customers club, the partners page and the projects page.
router.use('/showcase', showcaseRoutes);

// What this deployment can do — read before offering email or SMS steps.
router.use('/capabilities', capabilitiesRoutes);

// Which language to open in, for a visitor who has not chosen one.
router.use('/i18n', i18nRoutes);
// Talent intake: CV in, tracking code out, and the pile behind it.
router.use('/resumes', resumeRoutes);
// One box for any tracking code, whichever intake issued it.
router.use('/track', trackRoutes);

// The dynamic half of the sitemap: catalog products and open marketplace
// listings. Served by nginx at /sitemap-extras.xml.
router.use('/sitemap', sitemapRoutes);

// The job and freelance boards, their verification gate, and their queues.
router.use('/market', marketplaceRoutes);

// TradeMaster: shops and their catalogues. Every route inside answers 404
// unless FEATURE_TRADEMASTER is on, so mounting it here does not expose it.
router.use('/trademaster', tradeMasterRoutes);

// Browser error reports and the Prometheus scrape endpoint. Mounted at the
// root of /api rather than under a prefix: /api/metrics is where a scraper
// looks, and /api/client-errors is quoted in the browser bundle.
router.use('/', telemetryRoutes);

export default router;
