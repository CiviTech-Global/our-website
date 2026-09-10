import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  accountEmailRateLimiter,
  credentialRateLimiter,
  refreshRateLimiter,
} from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  mfaCodeSchema,
  mfaVerifySchema,
  verifyEmailSchema,
} from '../validators/auth.schema.js';

const router = Router();

router.post('/register', credentialRateLimiter, validate(registerSchema), authController.register);
router.post('/login', credentialRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post(
  '/forgot-password',
  accountEmailRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  // Credential-tight rather than email-tight: this one sends nothing, but it
  // does accept guesses at a live token.
  credentialRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/verify-email',
  credentialRateLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  '/send-verification',
  authenticate,
  accountEmailRateLimiter,
  authController.sendVerificationEmail
);

// Second step of sign-in. Rate limited like a credential, because that is
// what a six-digit code is.
router.post(
  '/mfa/verify',
  credentialRateLimiter,
  validate(mfaVerifySchema),
  authController.verifyMfa
);

// Enrolment and removal, all requiring a live session.
router.get('/mfa', authenticate, authController.mfaStatus);
router.post('/mfa/begin', authenticate, authController.mfaBegin);
router.post(
  '/mfa/confirm',
  authenticate,
  credentialRateLimiter,
  validate(mfaCodeSchema),
  authController.mfaConfirm
);
router.post(
  '/mfa/disable',
  authenticate,
  credentialRateLimiter,
  validate(mfaCodeSchema),
  authController.mfaDisable
);

router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);

export default router;
