import { Router } from 'express';
import * as insuranceController from '../controllers/insurance.controller.js';
import { validate } from '../middleware/validate.js';
import { otpRateLimiter, insuranceSubmitRateLimiter } from '../middleware/rateLimit.js';
import {
  otpSendSchema,
  otpVerifySchema,
  productSlugParamSchema,
  submitRequestSchema,
  trackingCodeParamSchema,
} from '../validators/insurance.schema.js';

const router = Router();

/**
 * Every route here is public and unauthenticated — buying insurance should not
 * require an account. That makes the rate limiters load-bearing rather than
 * decorative; see middleware/rateLimit.ts for why each one is sized as it is.
 */

// --- Catalog (read-only) --------------------------------------------------

router.get('/catalog', insuranceController.getCatalog);
router.get('/products', insuranceController.getProducts);
router.get(
  '/products/:slug',
  validate({ params: productSlugParamSchema }),
  insuranceController.getProduct,
);

// --- Phone verification ---------------------------------------------------

router.post(
  '/otp/send',
  otpRateLimiter,
  validate({ body: otpSendSchema }),
  insuranceController.sendOtp,
);

router.post(
  '/otp/verify',
  otpRateLimiter,
  validate({ body: otpVerifySchema }),
  insuranceController.verifyOtp,
);

// --- Submission and tracking ---------------------------------------------

router.post(
  '/requests',
  insuranceSubmitRateLimiter,
  validate({ body: submitRequestSchema }),
  insuranceController.submitRequest,
);

router.get(
  '/requests/track/:code',
  validate({ params: trackingCodeParamSchema }),
  insuranceController.trackRequest,
);

export default router;
