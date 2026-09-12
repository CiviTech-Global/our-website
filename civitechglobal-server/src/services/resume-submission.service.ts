import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  RESUME_RULES,
  assertRate,
  localDayKey,
  normalizeEmail,
  normalizePhone,
  recordRequest,
  resolveIdentity,
} from './client-identity.service.js';
import { RESUME_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { generateTrackingCode, isUniqueViolation } from './insurance-request.service.js';
import { sha256Hex } from '../utils/hash.js';

/**
 * Talent intake: someone sends a CV, we read it and get in touch if something
 * fits.
 *
 * The shape mirrors the project intake deliberately — same identity record,
 * same tracking codes, same upload controls — because they are the same problem
 * wearing different clothes: an unauthenticated stranger writing to our
 * database and our disk. What differs is the rate policy, and only the numbers.
 */

export interface ResumeInput {
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  province?: string;
  birthYear?: number;
  coverNote?: string;
}

export interface ResumeResult {
  id: string;
  trackingCode: string;
}

export async function submitResume(input: ResumeInput, files: IncomingFile[]): Promise<ResumeResult> {
  // Exactly one file. Zero is the commonest mistake (the picker was opened and
  // cancelled) and deserves its own message rather than a schema error about a
  // missing field.
  if (files.length === 0) {
    throw new AppError('فایل رزومه الزامی است.', 400);
  }
  if (files.length > 1) {
    throw new AppError('فقط یک فایل رزومه ارسال کنید.', 400);
  }

  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  // Written before the transaction opens, because Postgres cannot roll a file
  // write back — and removed by hand below if the transaction then fails.
  const [stored] = await storeFiles(files, RESUME_EXTENSIONS);
  if (!stored) throw new AppError('ذخیرهٔ فایل رزومه ناموفق بود.', 500);

  try {
    return await prisma.$transaction(async (tx) => {
      const identity = await resolveIdentity(tx, { email, phone });
      if (identity.blocked) {
        throw new AppError('امکان ثبت درخواست با این اطلاعات وجود ندارد. با ما تماس بگیرید.', 403);
      }

      if (!identity.trusted) {
        // The whole history, not just the last 24 hours: the two-day lifetime
        // cap cannot be decided from a rolling window.
        const history = await tx.resumeSubmission.findMany({
          where: { identityId: identity.id },
          select: { createdAt: true },
        });
        assertRate(
          history.map((row) => row.createdAt),
          RESUME_RULES
        );
      }

      const created = await createWithUniqueTrackingCode(tx, identity.id, email, phone, input, stored);
      await recordRequest(tx, identity.id);
      return { id: created.id, trackingCode: created.trackingCode };
    });
  } catch (error) {
    await removeFile(stored.storedName);
    throw error;
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function createWithUniqueTrackingCode(
  tx: Tx,
  identityId: string,
  email: string,
  phone: string,
  input: ResumeInput,
  stored: Awaited<ReturnType<typeof storeFiles>>[number]
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await tx.resumeSubmission.create({
        data: {
          trackingCode: generateTrackingCode(),
          identityId,
          fullName: input.fullName,
          email,
          phone,
          city: input.city,
          province: input.province,
          birthYear: input.birthYear,
          coverNote: input.coverNote,
          resumeOriginalName: stored.originalName,
          resumeStoredName: stored.storedName,
          resumeMimeType: stored.mimeType,
          resumeSizeBytes: stored.sizeBytes,
          resumeChecksum: stored.checksum,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }
  throw new AppError('ثبت رزومه ناموفق بود. لطفاً دوباره تلاش کنید.', 500);
}

/**
 * Public status lookup.
 *
 * Status and dates only — never the CV, never the contact details, never the
 * internal notes. The tracking code is quotable over the phone, so anything it
 * unlocks is effectively public.
 */
export async function trackResume(trackingCode: string) {
  const row = await prisma.resumeSubmission.findUnique({
    where: { trackingCode: trackingCode.trim().toUpperCase() },
    select: {
      trackingCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) throw new AppError('رزومه‌ای با این کد رهگیری پیدا نشد.', 404);

  return {
    trackingCode: row.trackingCode,
    status: row.status,
    submittedAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * What the form can tell someone BEFORE they fill it in.
 *
 * Learning that you have used your two days after typing a page of detail and
 * attaching a file is a bad way to find out. This lets the form say so on blur
 * of the email field instead.
 */
export async function describeResumeAllowance(email: string) {
  const identity = await prisma.clientIdentity.findUnique({
    where: { emailHash: sha256Hex(normalizeEmail(email)) },
    select: { id: true, trusted: true, blocked: true },
  });

  if (!identity) {
    return { known: false, daysUsed: 0, daysAllowed: RESUME_RULES.maxDistinctDays ?? null };
  }

  const history = await prisma.resumeSubmission.findMany({
    where: { identityId: identity.id },
    select: { createdAt: true },
  });
  const days = new Set(history.map((row) => localDayKey(row.createdAt)));

  return {
    known: true,
    daysUsed: days.size,
    daysAllowed: RESUME_RULES.maxDistinctDays ?? null,
    blocked: identity.blocked,
  };
}
