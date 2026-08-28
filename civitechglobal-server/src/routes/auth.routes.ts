import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { credentialRateLimiter, refreshRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/auth.schema.js';

const router = Router();

router.post('/register', credentialRateLimiter, validate(registerSchema), authController.register);
router.post('/login', credentialRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);

export default router;
