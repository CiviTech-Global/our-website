import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as insuranceRequestService from '../services/insurance-request.service.js';
import * as projectRequestService from '../services/project-request.service.js';
import * as resumeService from '../services/resume-submission.service.js';

/**
 * One tracking code box, whatever the code belongs to.
 *
 * There are three intakes now — insurance, project, resume — and they draw
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
    const code = typeof req.params.code === 'string' ? req.params.code.trim().toUpperCase() : '';
    if (code.length < 6 || code.length > 20) {
      throw new AppError('کد رهگیری معتبر نیست.', 400);
    }

    // `allSettled`, not `all`: a miss in two of the three is the NORMAL case,
    // and one rejection must not discard the answer the third one found.
    const [insurance, project, resume] = await Promise.allSettled([
      insuranceRequestService.trackRequest(code),
      projectRequestService.trackRequest(code),
      resumeService.trackResume(code),
    ]);

    if (insurance.status === 'fulfilled') {
      successResponse(res, serialize({ kind: 'insurance', ...insurance.value }));
      return;
    }
    if (project.status === 'fulfilled') {
      successResponse(res, serialize({ kind: 'project', ...project.value }));
      return;
    }
    if (resume.status === 'fulfilled') {
      successResponse(res, serialize({ kind: 'resume', ...resume.value }));
      return;
    }

    throw new AppError('درخواستی با این کد رهگیری پیدا نشد.', 404);
  } catch (error) {
    next(error);
  }
});

export default router;
