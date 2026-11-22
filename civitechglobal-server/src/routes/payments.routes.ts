import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { successResponse } from '../utils/apiResponse.js';
import { zibalCallbackTarget } from '../services/payment/confirmation.service.js';
import * as paymentRequests from '../services/payment/payment-request.service.js';
import {
  paymentRequestCodeSchema,
  paymentRequestConfirmSchema,
  paymentRequestCreateSchema,
  paymentRequestListSchema,
} from '../validators/payments.schema.js';

/**
 * Payments.
 *
 * GET /zibal/callback is the gateway's way back in: unauthenticated by design
 * — the buyer arrives from the gateway's redirect, possibly with no session —
 * and the query string is treated as untrusted throughout (see
 * confirmation.service.ts).
 *
 * /requests* is the staff-issued bill for arranged work (a consultation, a
 * freelance contract): create and list need the billing permission; the
 * status, pay and confirm endpoints are code-gated and public, like the
 * public intake forms — the code is the credential, and there may be no
 * account on the other end at all.
 */

const router = Router();

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const callbackQuerySchema = z.object({
  trackId: z.string().trim().min(1).max(40),
  success: z.string().max(4).optional(),
  status: z.string().max(8).optional(),
  orderId: z.string().max(60).optional(),
});

router.get('/zibal/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = callbackQuerySchema.parse(req.query);
    res.redirect(await zibalCallbackTarget({ trackId: query.trackId, success: query.success }));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/requests',
  authenticate,
  requirePermission(PERMISSIONS.billing),
  wrap(async (req, res) => {
    const body = paymentRequestCreateSchema.parse(req.body);
    successResponse(res, await paymentRequests.createPaymentRequest(req.user!.userId, body), 'صورتحساب صادر شد.');
  }),
);

router.get(
  '/requests',
  authenticate,
  requirePermission(PERMISSIONS.billing),
  wrap(async (req, res) => {
    const query = paymentRequestListSchema.parse(req.query);
    successResponse(res, await paymentRequests.listPaymentRequests(query));
  }),
);

router.get(
  '/requests/:code',
  wrap(async (req, res) => {
    const code = paymentRequestCodeSchema.parse(req.params.code);
    successResponse(res, await paymentRequests.paymentRequestStatus(code));
  }),
);

router.post(
  '/requests/:code/pay',
  wrap(async (req, res) => {
    const code = paymentRequestCodeSchema.parse(req.params.code);
    successResponse(res, await paymentRequests.startPayment(code));
  }),
);

router.post(
  '/requests/confirm',
  wrap(async (req, res) => {
    const body = paymentRequestConfirmSchema.parse(req.body);
    successResponse(res, await paymentRequests.confirmPayment(body.reference));
  }),
);

export default router;
