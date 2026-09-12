import type { Prisma, VerificationDocumentKind } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { isValidNationalId, normalizeIranMobile } from '../utils/persian.js';
import { removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * Knowing who somebody is, before they can trade on the marketplace.
 *
 * Nobody posts a job, posts a project, applies or bids until a person on this
 * side has looked at their documents and said yes. That is the whole point of
 * the module: a board where anyone can post anything is worth nothing to the
 * people reading it, and the cost of the check falls on us once per account
 * rather than on every reader every time.
 *
 * One row per account. Identity is not per-listing — verifying the same person
 * twice tells a reviewer nothing new and doubles the queue.
 */

/** What each document kind is for, and which account kinds must supply it. */
const REQUIRED_DOCUMENTS: Record<'INDIVIDUAL' | 'COMPANY', VerificationDocumentKind[]> = {
  // A photograph of the national card, or a passport for somebody without one.
  INDIVIDUAL: ['NATIONAL_ID_CARD'],
  // A company still needs the operator's own identity: a company cannot be
  // held to anything, and the person acting for it can.
  COMPANY: ['NATIONAL_ID_CARD', 'COMPANY_REGISTRATION'],
};

export interface VerificationInput {
  kind: 'INDIVIDUAL' | 'COMPANY';
  legalFirstName: string;
  legalLastName: string;
  nationalId: string;
  phone: string;
  birthDate?: Date;
  province?: string;
  city?: string;
  addressLine?: string;
  companyName?: string;
  companyRegistrationNo?: string;
  companyEconomicCode?: string;
  companyRole?: string;
  companyWebsite?: string;
}

export interface IncomingDocument extends IncomingFile {
  kind: VerificationDocumentKind;
}

/**
 * Submits, or resubmits after a rejection.
 *
 * Resubmission replaces rather than accumulates: a reviewer looking at an
 * account should see the documents being claimed now, not an archaeology of
 * every attempt. The old files are removed from storage in the same breath, so
 * a rejected passport scan does not sit on disk indefinitely.
 */
export async function submitVerification(
  userId: string,
  input: VerificationInput,
  documents: IncomingDocument[],
): Promise<{ id: string; status: string }> {
  if (!isValidNationalId(input.nationalId)) {
    // Checked here as well as in the validator so no path can store one that
    // fails the check digit — a reviewer's queue is not the place to discover
    // a typo a computer can catch.
    throw new AppError('کد ملی معتبر نیست.', 400);
  }

  const phone = normalizeIranMobile(input.phone);
  if (!phone) throw new AppError('شمارهٔ تماس معتبر نیست.', 400);

  const existing = await prisma.userVerification.findUnique({
    where: { userId },
    select: { id: true, status: true, documents: { select: { storedName: true } } },
  });

  if (existing?.status === 'APPROVED') {
    throw new AppError('این حساب پیش‌تر تأیید شده است.', 409);
  }
  if (existing?.status === 'PENDING') {
    throw new AppError('درخواست شما در حال بررسی است.', 409);
  }

  const required = REQUIRED_DOCUMENTS[input.kind];
  const supplied = new Set(documents.map((document) => document.kind));
  const missing = required.filter((kind) => !supplied.has(kind));
  if (missing.length > 0) {
    throw new AppError(`مدارک الزامی ارسال نشده است: ${missing.join('، ')}`, 400);
  }

  // Written before the transaction, because Postgres cannot roll back a file
  // and a half-written row is easier to recover from than an orphaned upload.
  const stored = await storeFiles(documents.map(({ kind: _kind, ...file }) => file));

  try {
    const record = await prisma.$transaction(async (tx) => {
      const data = {
        kind: input.kind,
        status: 'PENDING' as const,
        legalFirstName: input.legalFirstName,
        legalLastName: input.legalLastName,
        nationalId: input.nationalId.replace(/\D/g, ''),
        phone,
        birthDate: input.birthDate,
        province: input.province,
        city: input.city,
        addressLine: input.addressLine,
        companyName: input.kind === 'COMPANY' ? input.companyName : null,
        companyRegistrationNo: input.kind === 'COMPANY' ? input.companyRegistrationNo : null,
        companyEconomicCode: input.kind === 'COMPANY' ? input.companyEconomicCode : null,
        companyRole: input.kind === 'COMPANY' ? input.companyRole : null,
        companyWebsite: input.kind === 'COMPANY' ? input.companyWebsite : null,
        submittedAt: new Date(),
        // A fresh submission is not yet judged, so last time's verdict must go
        // with it — otherwise a rejection note hangs over a new attempt.
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
      };

      const verification = existing
        ? await tx.userVerification.update({ where: { userId }, data })
        : await tx.userVerification.create({ data: { ...data, userId } });

      if (existing) {
        await tx.verificationDocument.deleteMany({ where: { verificationId: verification.id } });
      }

      await tx.verificationDocument.createMany({
        data: stored.map((file, index) => ({
          verificationId: verification.id,
          kind: documents[index].kind,
          originalName: file.originalName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          checksum: file.checksum,
        })),
      });

      return verification;
    });

    // Only once the new documents are safely recorded.
    await Promise.all(
      (existing?.documents ?? []).map((document) => removeFile(document.storedName)),
    );

    return { id: record.id, status: record.status };
  } catch (error) {
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
}

/** What the account holder sees about their own verification. */
export async function getOwnVerification(userId: string) {
  const record = await prisma.userVerification.findUnique({
    where: { userId },
    select: {
      status: true,
      kind: true,
      legalFirstName: true,
      legalLastName: true,
      companyName: true,
      submittedAt: true,
      reviewedAt: true,
      // The note, but never the internal one — that is staff talking to staff.
      reviewNote: true,
      documents: { select: { id: true, kind: true, originalName: true } },
    },
  });

  return record ?? { status: 'UNVERIFIED' as const };
}

/**
 * The gate every marketplace action runs through.
 *
 * Thrown rather than returned as a boolean so a caller cannot forget to check
 * it, and phrased so the answer tells somebody what to do next rather than
 * simply refusing.
 */
export async function assertVerified(userId: string): Promise<void> {
  const record = await prisma.userVerification.findUnique({
    where: { userId },
    select: { status: true },
  });

  if (record?.status === 'APPROVED') return;

  const message =
    record?.status === 'PENDING'
      ? 'حساب شما در حال بررسی است. پس از تأیید می‌توانید آگهی ثبت کنید یا پیشنهاد بدهید.'
      : record?.status === 'REJECTED'
        ? 'احراز هویت شما تأیید نشد. لطفاً از پروفایل خود دوباره اقدام کنید.'
        : 'برای این کار ابتدا باید احراز هویت خود را از پروفایل تکمیل کنید.';

  throw new AppError(message, 403);
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export async function listForReview(query: { status?: string; page: number; pageSize: number }) {
  const where: Prisma.UserVerificationWhereInput = query.status
    ? { status: query.status as never }
    : { status: 'PENDING' };

  const [items, total] = await Promise.all([
    prisma.userVerification.findMany({
      where,
      orderBy: { submittedAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        status: true,
        kind: true,
        legalFirstName: true,
        legalLastName: true,
        companyName: true,
        submittedAt: true,
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.userVerification.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getForReview(id: string) {
  const record = await prisma.userVerification.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      documents: { select: { id: true, kind: true, originalName: true, sizeBytes: true } },
    },
  });

  if (!record) throw new AppError('این درخواست پیدا نشد.', 404);
  return record;
}

/**
 * Approves or refuses.
 *
 * A rejection without a reason is a dead end: the person cannot tell whether
 * they photographed the wrong document or simply held it at a bad angle, so
 * the note is required for anything other than an approval.
 */
export async function review(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  if (decision === 'REJECTED' && !notes.reviewNote?.trim()) {
    throw new AppError('برای رد کردن، باید دلیل را بنویسید.', 400);
  }

  const existing = await prisma.userVerification.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true },
  });
  if (!existing) throw new AppError('این درخواست پیدا نشد.', 404);

  const record = await prisma.userVerification.update({
    where: { id },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedById: reviewer.userId,
      reviewNote: notes.reviewNote,
      internalNote: notes.internalNote,
    },
  });

  // There is no audit table yet, and "who approved this identity?" is a
  // question somebody will eventually need answered.
  logger.info(
    { verificationId: id, subjectUserId: existing.userId, from: existing.status, to: decision, actorId: reviewer.userId },
    'Verification reviewed',
  );

  return record;
}
