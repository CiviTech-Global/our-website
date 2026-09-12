import { Router } from 'express';
import * as insuranceController from '../controllers/insurance.controller.js';
import { publicCache } from '../middleware/cacheControl.js';
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
//
// The one genuinely cacheable thing this API serves: identical for every
// visitor and changed a few times a year. Fifteen minutes in the browser, a
// day of stale-while-revalidate for any shared cache, so a catalog edit
// propagates without every client hitting the origin at once.
const catalogCache = publicCache({ maxAgeSeconds: 900, staleWhileRevalidateSeconds: 86_400 });

router.get('/catalog', catalogCache, insuranceController.getCatalog);
router.get('/products', catalogCache, insuranceController.getProducts);
router.get(
  '/products/:slug',
  catalogCache,
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
