import { Router } from 'express';
import { noStore } from '../middleware/cacheControl.js';
import { successResponse } from '../utils/apiResponse.js';
import { detectLocale } from '../services/locale-detect.service.js';

/**
 * Which language to open in, for somebody who has not chosen yet.
 *
 * It lives on the server because the signals do: the client IP is only visible
 * here, and Accept-Language is a request header the browser will not hand to
 * JavaScript. The page asks once, on a first visit, and remembers the answer.
 *
 * Never cached — two visitors on the same edge node get different answers, and
 * a shared cache holding one of them would hand it to the other.
 */
const router = Router();

router.get('/detect', noStore, (req, res) => {
  successResponse(res, detectLocale(req));
});

export default router;
