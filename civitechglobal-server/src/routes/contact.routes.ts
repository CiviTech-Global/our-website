import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { insuranceSubmitRateLimiter } from '../middleware/rateLimit.js';
import { noStore } from '../middleware/cacheControl.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import * as contact from '../services/contact.service.js';

/**
 * The public contact form, the ticket it becomes, and the inbox behind it.
 *
 * There is no outbound email in this deployment, so a visitor cannot be told
 * anything — they have to come and look. That shapes the whole surface: the
 * submission hands back a tracking code, the lookup is public and needs no
 * account, and staff answer from the panel.
 */

const contactSchema = z.object({
  name: z.string().trim().min(2, 'نام الزامی است').max(120),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, 'پیام خود را کمی کامل‌تر بنویسید').max(5000),
});

/** Ten characters from the unambiguous alphabet, however it was typed. */
const trackingCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[2346789ABCDEFGHJKMNPQRTVWXYZ]{10}$/, 'کد پیگیری معتبر نیست'),
});

const router = Router();

// Public. Same budget as an insurance submission: cheap to serve, but an
// unauthenticated write a bot would happily repeat.
router.post('/', insuranceSubmitRateLimiter, validate(contactSchema), async (req, res, next) => {
  try {
    const created = await contact.submitTicket(req.body as z.infer<typeof contactSchema>);
    successResponse(
      res,
      created,
      'پیام شما ثبت شد. کد پیگیری را نگه دارید — پاسخ را با همین کد می‌بینید.',
      201,
    );
  } catch (error) {
    next(error);
  }
});

/**
 * Reading your own ticket.
 *
 * No authentication, because the visitor has no account — the code IS the
 * credential, which is why it is ten characters of unguessable alphabet and
 * why this response carries no internal notes and no email address.
 *
 * Never cached: a reply that appeared a minute ago must not be hidden behind a
 * proxy still holding "no answer yet".
 */
router.get(
  '/track/:code',
  noStore,
  validate({ params: trackingCodeSchema }),
  async (req, res, next) => {
    try {
      const code = typeof req.params.code === 'string' ? req.params.code : '';
      successResponse(res, await contact.findByTrackingCode(code));
    } catch (error) {
      next(error);
    }
  },
);

// --- Inbox ---------------------------------------------------------------

// Per-module, not per-role: an admin reaches the inbox only if a super admin
// granted it. SUPER_ADMIN bypasses the check inside requirePermission.
router.use(authenticate, requirePermission(PERMISSIONS.messages));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'ANSWERED', 'CLOSED']).optional(),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

router.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    successResponse(res, await contact.listTickets(req.query as never));
  } catch (error) {
    next(error);
  }
});

const replySchema = z.object({
  body: z.string().trim().min(2, 'پاسخ نمی‌تواند خالی باشد').max(5000),
});

router.post('/:id/reply', validate(replySchema), async (req, res, next) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id) throw new AppError('شناسه نامعتبر است.', 400);

    const created = await contact.reply(id, req.body.body as string, req.user!.userId);
    successResponse(res, created, 'پاسخ ثبت شد و برای مخاطب قابل مشاهده است.', 201);
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  read: z.boolean().optional(),
  status: z.enum(['OPEN', 'ANSWERED', 'CLOSED']).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
});

router.patch('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    successResponse(res, await contact.updateTicket(id, req.body as never), 'به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
});

export default router;
