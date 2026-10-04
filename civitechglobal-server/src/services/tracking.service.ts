import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import * as insuranceRequestService from './insurance-request.service.js';
import * as projectRequestService from './project-request.service.js';
import * as resumeService from './resume-submission.service.js';
import * as consultationService from './consultation.service.js';

/**
 * Tracking codes: one lookup across every intake, and the account's own list.
 *
 * The intakes take requests from people without accounts, so a request is not
 * linked to anybody — its code is the only thread back to it, and a lookup by
 * code answers with state only, never personal data. That makes it safe for a
 * member to keep a list of codes on their account: the list holds nothing a
 * stranger holding the same code could not already see, and it puts their
 * requests on the dashboard instead of in a note on their phone.
 */

export type TrackedState = Record<string, unknown> & { kind: string };

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function assertCodeShape(code: string): void {
  if (code.length < 6 || code.length > 20 || !/^[A-Z0-9-]+$/.test(code)) {
    throw new AppError('کد رهگیری معتبر نیست.', 400);
  }
}

/** Whichever intake issued the code, its state; null when none did. */
export async function lookupTrackingCode(code: string): Promise<TrackedState | null> {
  // allSettled: a miss in three of the four is the normal case, and one
  // rejection must not discard the answer the fourth found.
  const [insurance, project, resume, consultation] = await Promise.allSettled([
    insuranceRequestService.trackRequest(code),
    projectRequestService.trackRequest(code),
    resumeService.trackResume(code),
    consultationService.trackRequest(code),
  ]);

  if (insurance.status === 'fulfilled') return { kind: 'insurance', ...insurance.value };
  if (project.status === 'fulfilled') return { kind: 'project', ...project.value };
  if (resume.status === 'fulfilled') return { kind: 'resume', ...resume.value };
  // The consultation service already names its own kind.
  if (consultation.status === 'fulfilled') return consultation.value as TrackedState;
  return null;
}

const MAX_TRACKED = 50;

/** Keep a code on the account. Only a code that exists; saving twice is saving once. */
export async function trackForUser(userId: string, rawCode: string, label?: string | null) {
  const code = normalizeCode(rawCode);
  assertCodeShape(code);
  const state = await lookupTrackingCode(code);
  if (!state) throw new AppError('درخواستی با این کد رهگیری پیدا نشد.', 404);

  const count = await prisma.trackedRequest.count({ where: { userId } });
  const existing = await prisma.trackedRequest.findUnique({ where: { userId_code: { userId, code } } });
  if (!existing && count >= MAX_TRACKED) {
    throw new AppError(`حداکثر ${MAX_TRACKED} کد رهگیری می‌توانید نگه دارید.`, 409);
  }

  return prisma.trackedRequest.upsert({
    where: { userId_code: { userId, code } },
    create: { userId, code, label: label?.trim() || null },
    update: label !== undefined ? { label: label?.trim() || null } : {},
  });
}

export async function untrackForUser(userId: string, rawCode: string) {
  await prisma.trackedRequest.deleteMany({ where: { userId, code: normalizeCode(rawCode) } });
  return { code: normalizeCode(rawCode) };
}

/**
 * The account's codes, each with where its request stands now.
 *
 * Looked up afresh on every read rather than cached on the row: the point of
 * the list is the current state, and a request moves when staff move it.
 */
export async function listTrackedForUser(userId: string) {
  const rows = await prisma.trackedRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_TRACKED,
  });
  const states = await Promise.all(rows.map((row) => lookupTrackingCode(row.code).catch(() => null)));
  return rows.map((row, index) => ({
    code: row.code,
    label: row.label,
    createdAt: row.createdAt,
    state: states[index],
  }));
}
