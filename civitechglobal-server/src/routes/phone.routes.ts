import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { credentialRateLimiter, otpRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { passwordSchema } from '../validators/auth.schema.js';
import * as phone from '../services/phone-account.service.js';

/**
 * The account's phone, and resetting a password by SMS. Mounted under /auth.
 *
 *   GET   /auth/me/phone            the number, whether it is verified, the opt-out
 *   POST  /auth/me/phone/code       text a code to a number
 *   POST  /auth/me/phone/verify     prove it
 *   PATCH /auth/me/sms              informational texts on or off
 *   POST  /auth/password/sms        text a reset code to the account's verified phone
 *   POST  /auth/password/sms/reset  the code and the new password
 */

const router = Router();

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const code = z.string().trim().regex(/^\d{4,8}$/, 'کد نامعتبر است');
const identifier = z.string().trim().toLowerCase().min(1, 'ایمیل یا نام کاربری را وارد کنید').max(254);

router.get(
  '/me/phone',
  authenticate,
  wrap(async (req, res) => {
    successResponse(res, await phone.getPhoneSettings(req.user!.userId));
  }),
);

router.post(
  '/me/phone/code',
  authenticate,
  otpRateLimiter,
  validate({ body: z.object({ phone: z.string().trim().min(10).max(20) }) }),
  wrap(async (req, res) => {
    successResponse(res, await phone.requestPhoneCode(req.user!.userId, req.body.phone), 'کد تأیید ارسال شد.');
  }),
);

router.post(
  '/me/phone/verify',
  authenticate,
  credentialRateLimiter,
  validate({ body: z.object({ code }) }),
  wrap(async (req, res) => {
    successResponse(res, await phone.confirmPhoneCode(req.user!.userId, req.body.code), 'شمارهٔ همراه تأیید شد.');
  }),
);

router.patch(
  '/me/sms',
  authenticate,
  validate({ body: z.object({ optOut: z.boolean() }) }),
  wrap(async (req, res) => {
    successResponse(res, await phone.setSmsOptOut(req.user!.userId, req.body.optOut), 'ذخیره شد.');
  }),
);

router.post(
  '/password/sms',
  otpRateLimiter,
  validate({ body: z.object({ identifier }) }),
  wrap(async (req, res) => {
    await phone.requestPasswordResetSms(req.body.identifier);
    // The same answer whatever happened: see requestPasswordResetSms.
    successResponse(res, { sent: true }, 'اگر این حساب شمارهٔ همراه تأییدشده داشته باشد، کد بازیابی برای آن پیامک شد.');
  }),
);

router.post(
  '/password/sms/reset',
  credentialRateLimiter,
  validate({ body: z.object({ identifier, code, password: passwordSchema }) }),
  wrap(async (req, res) => {
    await phone.resetPasswordWithSms(req.body.identifier, req.body.code, req.body.password);
    successResponse(res, { reset: true }, 'رمز عبور تغییر کرد. با رمز تازه وارد شوید.');
  }),
);

export default router;
