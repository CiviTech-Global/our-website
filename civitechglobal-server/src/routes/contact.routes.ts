import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { insuranceSubmitRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/apiResponse.js';
import { sha256Hex } from '../utils/hash.js';

/**
 * The public contact form, and the inbox behind it.
 *
 * The form previously opened a `mailto:` link and stored nothing, so a message
 * existed only if the visitor's machine had a mail client and they followed
 * through. This gives it somewhere to land.
 */

const contactSchema = z.object({
  name: z.string().trim().min(2, 'نام الزامی است').max(120),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, 'پیام خود را کمی کامل‌تر بنویسید').max(5000),
});

const router = Router();

// Public. Same budget as an insurance submission: cheap to serve, but an
// unauthenticated write that a bot would happily repeat.
router.post(
  '/',
  insuranceSubmitRateLimiter,
  validate(contactSchema),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof contactSchema>;
      const created = await prisma.contactMessage.create({
        data: {
          name: input.name,
          email: input.email,
          emailHash: sha256Hex(input.email),
          subject: input.subject,
          message: input.message,
        },
        select: { id: true, createdAt: true },
      });
      successResponse(res, created, 'پیام شما دریافت شد. به‌زودی پاسخ می‌دهیم.', 201);
    } catch (error) {
      next(error);
    }
  }
);

// --- Inbox ---------------------------------------------------------------

// Per-module, not per-role: an admin reaches the inbox only if a super admin
// granted it. SUPER_ADMIN bypasses the check inside requirePermission.
router.use(authenticate, requirePermission(PERMISSIONS.messages));

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    // `unread=true` is the view an operator actually opens.
    const where = req.query.unread === 'true' ? { readAt: null } : {};

    const [items, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { readAt: null } }),
    ]);

    successResponse(res, { items, page, pageSize, total, unread });
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  read: z.boolean().optional(),
  handled: z.boolean().optional(),
  internalNotes: z.string().trim().max(5000).optional(),
});

router.patch('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof updateSchema>;
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new AppError('پیام پیدا نشد.', 404);

    const now = new Date();
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        // Toggles rather than stamps-once, so marking something unread again
        // is possible — an inbox where a mistake is permanent gets avoided.
        readAt: input.read === undefined ? undefined : input.read ? (existing.readAt ?? now) : null,
        handledAt:
          input.handled === undefined ? undefined : input.handled ? (existing.handledAt ?? now) : null,
        internalNotes: input.internalNotes,
      },
    });

    successResponse(res, updated, 'به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
});

export default router;

