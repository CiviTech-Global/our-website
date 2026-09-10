import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { resolveStoredPath, type IncomingFile } from '../services/attachment.service.js';
import * as proposalService from '../services/project-proposal.service.js';
import * as requestService from '../services/project-request.service.js';
import type { z } from 'zod';
import {
  projectRequestSchema,
  proposalSchema,
  respondToProposalSchema,
  updateProjectStatusSchema,
} from '../validators/project.schema.js';

/**
 * BigInt does not survive JSON.stringify — it throws rather than guessing a
 * representation. Money is therefore serialised as a decimal string on the way
 * out, matching how it is accepted on the way in.
 */
/** Express types route params as `string | string[]`; a single segment never is. */
function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}

function serialize<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // multipart: the structured brief travels as one JSON field so it keeps
    // its types, and the files travel as files.
    const raw = typeof req.body?.payload === 'string' ? req.body.payload : null;
    if (!raw) {
      throw new AppError('اطلاعات فرم ارسال نشده است.', 400);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AppError('قالب اطلاعات فرم نامعتبر است.', 400);
    }

    const input = projectRequestSchema.parse(parsed);
    const files: IncomingFile[] = (req.files as Express.Multer.File[] | undefined ?? []).map(
      (file) => ({ originalName: file.originalname, buffer: file.buffer })
    );

    const result = await requestService.submitRequest(
      { ...input, website: input.website || undefined },
      files
    );

    successResponse(res, result, 'درخواست شما ثبت شد. کد رهگیری را نگه دارید.', 201);
  } catch (error) {
    next(error);
  }
}

export async function track(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await requestService.trackRequest(param(req, 'code'));
    successResponse(res, serialize(result));
  } catch (error) {
    next(error);
  }
}

export async function respond(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof respondToProposalSchema>;
    const result = await requestService.respondToProposal(
      input.trackingCode,
      input.email,
      input.decision,
      input.note
    );
    successResponse(res, result, 'پاسخ شما ثبت شد.');
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where = status ? { status: status as never } : {};
    const [rows, total] = await Promise.all([
      prisma.projectRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          trackingCode: true,
          title: true,
          contactName: true,
          organizationName: true,
          projectType: true,
          urgency: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
          budgetUnknown: true,
          currency: true,
          createdAt: true,
          _count: { select: { attachments: true, proposals: true } },
        },
      }),
      prisma.projectRequest.count({ where }),
    ]);

    successResponse(res, serialize({ items: rows, page, pageSize, total }));
  } catch (error) {
    next(error);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await prisma.projectRequest.findUnique({
      where: { id: param(req, 'id') },
      include: {
        attachments: true,
        proposals: { orderBy: { version: 'desc' } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        identity: {
          select: { id: true, requestCount: true, trusted: true, blocked: true, createdAt: true },
        },
      },
    });
    if (!request) throw new AppError('درخواست پیدا نشد.', 404);
    successResponse(res, serialize(request));
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof updateProjectStatusSchema>;
    const updated = await prisma.projectRequest.update({
      where: { id: param(req, 'id') },
      data: { status: input.status, internalNotes: input.internalNotes },
      select: { id: true, status: true },
    });
    successResponse(res, updated, 'وضعیت به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
}

export async function createProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof proposalSchema>;
    const proposal = await proposalService.createProposal(
      param(req, 'id'),
      req.user!.userId,
      input as never
    );
    successResponse(res, serialize(proposal), 'پیش‌نویس پیشنهاد ساخته شد.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof proposalSchema>;
    const proposal = await proposalService.updateProposal(param(req, 'proposalId'), input as never);
    successResponse(res, serialize(proposal), 'پیشنهاد به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
}

export async function sendProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await proposalService.sendProposal(param(req, 'proposalId'));
    successResponse(res, serialize(proposal), 'پیشنهاد ارسال شد.');
  } catch (error) {
    next(error);
  }
}

/**
 * Streams an attachment to an authenticated admin.
 *
 * Never a redirect to a static path, and never served from a public directory:
 * this route is the ONLY way the bytes come back out, which is what makes
 * "stored outside the web root" mean something. The headers force a download
 * and forbid content-type sniffing, so a file whose contents disagree with its
 * type cannot be coaxed into executing in the browser.
 */
export async function downloadAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const attachment = await prisma.projectAttachment.findUnique({
      where: { id: param(req, 'attachmentId') },
    });
    if (!attachment) throw new AppError('فایل پیدا نشد.', 404);

    const fullPath = resolveStoredPath(attachment.storedName);
    const stats = await stat(fullPath).catch(() => null);
    if (!stats) throw new AppError('فایل روی سرور موجود نیست.', 410);

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', String(stats.size));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // RFC 5987 encoding: the original name may be Persian, and a raw UTF-8
    // header value is not portable.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`
    );

    createReadStream(fullPath).pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function proposalDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await requestService.getProposalDocument(param(req, 'proposalId'));
    successResponse(res, serialize(data));
  } catch (error) {
    next(error);
  }
}
