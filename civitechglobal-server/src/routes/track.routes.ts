import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { lookupTrackingCode, normalizeCode } from '../services/tracking.service.js';

/**
 * One tracking code box, whatever the code belongs to.
 *
 * There are four intakes now — insurance, project, resume, consultation —
 * and they draw
 * codes from the same alphabet, so a code is indistinguishable by eye. The
 * person holding one has no reason to know which system it came from, and
 * making them choose would be asking them to know our architecture.
 *
 * Resolving it here rather than in the browser costs three indexed lookups on
 * one connection instead of three HTTP round trips, and stops two of them
 * being 404s on every single search — which is both wasted work and a log line
 * per miss.
 */

const router = Router();

/** BigInt does not survive JSON.stringify. */
function serialize<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

router.get('/:code', async (req, res, next) => {
  try {
    const code = typeof req.params.code === 'string' ? normalizeCode(req.params.code) : '';
    if (code.length < 6 || code.length > 20) {
      throw new AppError('کد رهگیری معتبر نیست.', 400);
    }

    const state = await lookupTrackingCode(code);
    if (!state) throw new AppError('درخواستی با این کد رهگیری پیدا نشد.', 404);
    successResponse(res, serialize(state));
  } catch (error) {
    next(error);
  }
});

export default router;
