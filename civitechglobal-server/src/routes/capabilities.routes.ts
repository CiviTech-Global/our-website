import { Router } from 'express';
import { publicCache } from '../middleware/cacheControl.js';
import { successResponse } from '../utils/apiResponse.js';
import { canSendEmail } from '../services/email/index.js';
import { canSendSms } from '../services/sms/index.js';

/**
 * What this deployment can actually do.
 *
 * The page needs to know before it offers something. There is no email or SMS
 * provider here: account recovery, address verification and phone OTP all end
 * in a 501 that explains itself, which is correct but arrives too late — the
 * person has already typed their address into a form that was never going to
 * work.
 *
 * So the capability is published, and the affordance is not drawn when it is
 * false. When a provider is configured the flags flip and the forms come back
 * without a redeploy of the front end, which is the point of asking rather
 * than hard-coding "we have no email" into the bundle.
 *
 * Deliberately boolean and deliberately public: which provider, and any of its
 * settings, are nobody's business outside the server.
 */
/**
 * A provider that cannot even be constructed certainly cannot deliver.
 *
 * Building one throws on a misconfiguration — a real provider with no API key,
 * or the console provider in production, which is refused so that live reset
 * links are never written to a log. Those are all honest "no"s, and none of
 * them should turn asking what this deployment can do into a 500.
 */
function safely(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

const router = Router();

router.get(
  '/',
  // Long enough to cost nothing on a page load, short enough that turning a
  // provider on shows up the same day.
  publicCache({ maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 }),
  (_req, res) => {
    successResponse(res, {
      email: safely(canSendEmail),
      sms: safely(canSendSms),
    });
  },
);

export default router;
