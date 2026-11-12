import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { publicCache } from '../middleware/cacheControl.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { FEATURE_KEYS } from '../catalog/plan-catalog.js';
import { getCatalog, setPrices } from '../services/billing/catalog.service.js';
import * as subscriptions from '../services/billing/subscription.service.js';
import { createCompanyAccount, listVouchedAccounts } from '../services/accounts.service.js';
import { companyAccountSchema } from '../validators/accounts.schema.js';
import { smsReport } from '../services/sms/report.js';

/**
 * Plans: the public price list, a member's own billing, checkout through the
 * payment seam (the sandbox driver until ZarinPal lands), and the staff side —
 * prices, grants, and accounts opened on somebody's behalf.
 */

const router = Router();

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const subject = z.enum(['USER', 'BUSINESS', 'COMPANY']);
const tier = z.enum(['FREE', 'PRO', 'PREMIUM', 'VIP']);

const selectionSchema = z
  .object({
    subject,
    months: z.coerce.number().int(),
    tier: z.enum(['PRO', 'PREMIUM', 'VIP']).optional(),
    items: z
      .array(z.object({ featureKey: z.enum(FEATURE_KEYS), tier }))
      .max(FEATURE_KEYS.length)
      .optional(),
  })
  .refine((value) => Boolean(value.tier) !== Boolean(value.items?.length), {
    message: 'یا یک پلن کامل، یا یک ترکیب سفارشی',
    path: ['tier'],
  });

/** The site language to come back to; Persian is unprefixed, the rest are /xx. */
const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'] as const;
const checkoutSchema = selectionSchema.and(z.object({ locale: z.enum(LOCALES).optional() }));

const confirmSchema = z.object({ reference: z.string().trim().min(1).max(200) });

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  search: z.string().trim().max(120).optional(),
});

const money = z.union([z.string().trim().regex(/^\d+$/), z.number().int().min(0)]).nullable().optional();

const pricesSchema = z.object({
  updates: z
    .array(
      z.object({
        featureKey: z.enum(FEATURE_KEYS),
        tier,
        priceIrt: money,
        priceUsdt: z
          .union([z.string().trim().regex(/^\d+(\.\d{1,2})?$/), z.number().min(0)])
          .nullable()
          .optional(),
      }),
    )
    .min(1)
    .max(200),
});

const grantSchema = selectionSchema.and(
  z.object({
    userId: z.string().trim().min(1).max(40).optional(),
    companyId: z.string().trim().min(1).max(40).optional(),
    note: z.string().trim().max(500).optional(),
  }),
);

// --- Public -------------------------------------------------------------------

router.get(
  '/plans',
  publicCache({ maxAgeSeconds: 120, staleWhileRevalidateSeconds: 600 }),
  validate({ query: z.object({ subject: subject.optional() }) }),
  wrap(async (req, res) => {
    successResponse(res, await getCatalog(req.query.subject as never));
  }),
);

/** The price of a selection, without buying it: the custom-tier builder's total. */
router.post(
  '/quote',
  validate({ body: selectionSchema }),
  wrap(async (req, res) => {
    const q = await subscriptions.quote(req.body);
    successResponse(res, {
      ...q,
      monthlyTotal: q.monthlyTotal.toString(),
      total: q.total.toString(),
      items: q.items.map((item) => ({ ...item, monthlyPrice: item.monthlyPrice.toString() })),
    });
  }),
);

// --- Members ------------------------------------------------------------------

router.get(
  '/me',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.getOwnBilling(req.user!.userId));
  }),
);

router.post(
  '/checkout',
  authenticate,
  validate({ body: checkoutSchema }),
  wrap(async (req, res) => {
    // Built here from our own origin, never from anything the client sends:
    // see the note on the order payment route. The locale is one of a fixed
    // list, so it brings the buyer back in their language and nowhere else.
    const { locale, ...selection } = req.body as z.infer<typeof checkoutSchema>;
    const prefix = locale && locale !== 'fa' ? `/${locale}` : '';
    const returnUrl = `${env.APP_URL.replace(/\/+$/, '')}${prefix}/dashboard/billing/return`;
    successResponse(res, await subscriptions.checkout(req.user!.userId, selection, returnUrl), undefined, 201);
  }),
);

router.post(
  '/confirm',
  authenticate,
  validate({ body: confirmSchema }),
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.confirmPayment(req.body.reference, req.user!.userId));
  }),
);

router.get(
  '/me/subscriptions/:id',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.getOwnPayment(req.user!.userId, String(req.params.id)));
  }),
);

// --- Staff: plans and grants ----------------------------------------------------

const canBill = [authenticate, requirePermission(PERMISSIONS.billing)] as const;

router.put(
  '/admin/prices',
  ...canBill,
  validate({ body: pricesSchema }),
  wrap(async (req, res) => {
    successResponse(res, await setPrices(req.body.updates), 'قیمت‌ها ذخیره شد.');
  }),
);

router.get(
  '/admin/subscriptions',
  ...canBill,
  validate({ query: pageQuery }),
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.listForStaff(req.query as never));
  }),
);

router.post(
  '/admin/grants',
  ...canBill,
  validate({ body: grantSchema }),
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.grant(req.user!.userId, req.body), 'پلن اعطا شد.', 201);
  }),
);

router.post(
  '/admin/subscriptions/:id/cancel',
  ...canBill,
  wrap(async (req, res) => {
    successResponse(res, await subscriptions.cancelForStaff(String(req.params.id)), 'لغو شد.');
  }),
);

/** What texts have cost, per kind, and the latest sends. Money, so billing's key. */
router.get(
  '/admin/sms',
  ...canBill,
  validate({ query: z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }) }),
  wrap(async (req, res) => {
    successResponse(res, await smsReport(Number(req.query.days)));
  }),
);

// --- Staff: accounts opened on somebody's behalf ---------------------------------

const canOpenAccounts = [authenticate, requirePermission(PERMISSIONS.accounts)] as const;

router.get(
  '/admin/accounts',
  ...canOpenAccounts,
  validate({ query: pageQuery }),
  wrap(async (req, res) => {
    successResponse(res, await listVouchedAccounts(req.query as never));
  }),
);

router.post(
  '/admin/accounts/company',
  ...canOpenAccounts,
  validate({ body: companyAccountSchema }),
  wrap(async (req, res) => {
    const created = await createCompanyAccount(req.body, req.user!.userId);
    successResponse(res, created, 'حساب شرکت ساخته شد.', 201);
  }),
);

export default router;
