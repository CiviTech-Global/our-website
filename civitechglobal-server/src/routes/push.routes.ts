import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { registerDevice, unregisterDevice } from '../services/push-devices.service.js';

/**
 * The phones an account's notifications are pushed to; see
 * services/push-devices.service.ts. Signed in only: a device is registered
 * for the account presenting the token, never named by the caller.
 */

const deviceSchema = z.object({
  /** The provider the token belongs to. fcm is accepted ahead of its sender. */
  provider: z.enum(['pushe', 'fcm']),
  token: z.string().trim().min(8).max(512),
  platform: z.enum(['android', 'ios']),
  appVersion: z.string().trim().max(40).optional(),
  language: z.string().trim().max(8).optional(),
});

const router = Router();

router.use(authenticate);

router.post('/devices', validate(deviceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await registerDevice(req.user!.userId, req.body as z.infer<typeof deviceSchema>);
    successResponse(res, null);
  } catch (error) {
    next(error);
  }
});

router.delete('/devices/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token : '';
    // Deleting what is not there is still the state asked for: no error.
    if (token) await unregisterDevice(req.user!.userId, token);
    successResponse(res, null);
  } catch (error) {
    next(error);
  }
});

export default router;
