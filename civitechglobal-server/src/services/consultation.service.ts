import type { ConsultationStatus, DayPart, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { sha256Hex } from '../utils/hash.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';

/**
 * Consultation requests.
 *
 * Somebody says what they want to talk about and when they could be free; we
 * ring them. Deliberately not a booking calendar: a public grid of slots
 * promises availability nobody has committed to keeping, and a slot taken at
 * 2am by a stranger is a promise made by software rather than by a person.
 *
 * No account is needed and no message is sent — there is no mail or SMS
 * provider here — so the tracking code is the whole thread back to the
 * request. It goes through the same box as every other code on the site.
 */

export interface AvailabilityInput {
  /** yyyy-mm-dd, the day they are free. */
  day: string;
  part: DayPart;
}

export interface ConsultationInput {
  fullName: string;
  phone: string;
  email?: string | null;
  topic: 'CAREER' | 'TECHNICAL' | 'STARTING_OUT' | 'HIRING' | 'OTHER';
  preferredMode?: 'ONLINE' | 'PHONE' | 'IN_PERSON';
  goal?: string;
  background?: string;
  expertSlug?: string;
  availability: AvailabilityInput[];
}

/** Midnight UTC for a yyyy-mm-dd, which is what a @db.Date column stores. */
function toDay(value: string): Date {
  const day = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) throw new AppError('تاریخ انتخابی معتبر نیست.', 400);
  return day;
}

/**
 * Rejects a day already gone.
 *
 * Compared at day resolution rather than by timestamp: somebody filling the
 * form at nine in the evening naming that same day is saying something
 * sensible, and rounding it to "in the past" would refuse a reasonable answer.
 */
function assertNotPast(day: Date, now: Date): void {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (day < today) throw new AppError('زمان انتخابی گذشته است.', 400);
}

const MAX_WINDOWS = 6;

export async function createRequest(input: ConsultationInput, now = new Date()) {
  if (input.availability.length === 0) {
    throw new AppError('حداقل یک بازهٔ زمانی برای تماس انتخاب کنید.', 400);
  }
  if (input.availability.length > MAX_WINDOWS) {
    throw new AppError(`حداکثر ${MAX_WINDOWS} بازهٔ زمانی می‌توانید انتخاب کنید.`, 400);
  }

  // Deduplicated here as well as by the unique index: the index would answer
  // with a constraint violation, and "you picked Tuesday morning twice" is not
  // worth a 500.
  const seen = new Set<string>();
  const windows = input.availability.map(({ day, part }) => {
    const parsed = toDay(day);
    assertNotPast(parsed, now);
    const key = `${day}|${part}`;
    if (seen.has(key)) throw new AppError('بازه‌های زمانی تکراری هستند.', 400);
    seen.add(key);
    return { day: parsed, part };
  });

  // A named expert is a preference, not a guarantee, and one who does not take
  // appointments cannot be asked for.
  let expertId: string | null = null;
  if (input.expertSlug) {
    const expert = await prisma.expert.findFirst({
      where: { slug: input.expertSlug, published: true, acceptsConsultations: true },
      select: { id: true },
    });
    if (!expert) throw new AppError('این کارشناس برای مشاوره در دسترس نیست.', 400);
    expertId = expert.id;
  }

  const phone = input.phone.trim();
  const created = await prisma.consultationRequest.create({
    data: {
      trackingCode: generateTrackingCode(),
      fullName: input.fullName.trim(),
      phoneNumber: phone,
      phoneNumberHash: sha256Hex(phone),
      email: input.email?.trim() || null,
      topic: input.topic,
      preferredMode: input.preferredMode ?? 'ONLINE',
      goal: input.goal?.trim() || null,
      background: input.background?.trim() || null,
      expertId,
      availability: { create: windows },
    },
    select: { id: true, trackingCode: true, createdAt: true },
  });

  logger.info({ requestId: created.id, topic: input.topic, expertId }, 'Consultation requested');
  return {
    trackingCode: created.trackingCode,
    createdAt: created.createdAt.toISOString(),
  };
}

/**
 * What the person who asked can see of their own request.
 *
 * Their own answers, where it has got to, and — once a time is fixed — when.
 * Never the staff note, and never who is handling it: an internal assignment
 * is about us, not about them.
 */
export async function trackRequest(code: string) {
  const row = await prisma.consultationRequest.findUnique({
    where: { trackingCode: code.trim().toUpperCase() },
    select: {
      trackingCode: true,
      fullName: true,
      topic: true,
      preferredMode: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      expert: { select: { fullName: true, slug: true, headline: true } },
      availability: { select: { day: true, part: true }, orderBy: { day: 'asc' } },
    },
  });
  if (!row) throw new AppError('درخواستی با این کد پیدا نشد.', 404);

  return {
    kind: 'consultation' as const,
    trackingCode: row.trackingCode,
    fullName: row.fullName,
    topic: row.topic,
    preferredMode: row.preferredMode,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    expert: row.expert,
    availability: row.availability.map((window) => ({
      day: window.day.toISOString().slice(0, 10),
      part: window.part,
    })),
  };
}

/**
 * Called off by the person who asked, using their code.
 *
 * Only from a state where there is something to call off: a completed
 * conversation cannot be un-had, and cancelling an already cancelled request
 * should say so rather than pretend to do something.
 */
export async function cancelRequest(code: string) {
  const row = await prisma.consultationRequest.findUnique({
    where: { trackingCode: code.trim().toUpperCase() },
    select: { id: true, status: true },
  });
  if (!row) throw new AppError('درخواستی با این کد پیدا نشد.', 404);

  if (row.status === 'COMPLETED') throw new AppError('این جلسه برگزار شده است.', 409);
  if (row.status === 'CANCELLED') throw new AppError('این درخواست پیش‌تر لغو شده است.', 409);

  await prisma.consultationRequest.update({
    where: { id: row.id },
    // updatedAt carries when, which is all the status needs beside it.
    data: { status: 'CANCELLED' },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

export interface QueueQuery {
  status?: string;
  /** Only requests naming this expert. */
  expertId?: string;
  page: number;
  pageSize: number;
}

export async function listForStaff(query: QueueQuery) {
  const where: Prisma.ConsultationRequestWhereInput = {
    ...(query.status ? { status: query.status as ConsultationStatus } : {}),
    ...(query.expertId ? { expertId: query.expertId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.consultationRequest.findMany({
      where,
      // Oldest first within the queue: somebody who asked on Monday should not
      // wait behind somebody who asked this morning.
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        trackingCode: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        topic: true,
        preferredMode: true,
        goal: true,
        background: true,
        status: true,
        staffNote: true,
        scheduledAt: true,
        contactedAt: true,
        createdAt: true,
        expert: { select: { id: true, fullName: true, slug: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        availability: { select: { day: true, part: true }, orderBy: { day: 'asc' } },
      },
    }),
    prisma.consultationRequest.count({ where }),
  ]);

  return toPage(
    items.map((row) => ({
      ...row,
      availability: row.availability.map((window) => ({
        day: window.day.toISOString().slice(0, 10),
        part: window.part,
      })),
    })),
    total,
    query.page,
    query.pageSize
  );
}

export interface StaffUpdate {
  status?: ConsultationStatus;
  staffNote?: string | null;
  /** ISO timestamp for the agreed time, or null to clear it. */
  scheduledAt?: string | null;
  /** The staff member handling it; null releases it. */
  assignedToId?: string | null;
}

export async function updateForStaff(id: string, update: StaffUpdate, actorId: string) {
  const existing = await prisma.consultationRequest.findUnique({
    where: { id },
    select: { id: true, status: true, contactedAt: true },
  });
  if (!existing) throw new AppError('این درخواست پیدا نشد.', 404);

  const scheduledAt =
    update.scheduledAt === undefined
      ? undefined
      : update.scheduledAt === null
        ? null
        : new Date(update.scheduledAt);
  if (scheduledAt instanceof Date && Number.isNaN(scheduledAt.getTime())) {
    throw new AppError('زمان واردشده معتبر نیست.', 400);
  }

  return prisma.consultationRequest.update({
    where: { id },
    data: {
      ...(update.status ? { status: update.status } : {}),
      ...(update.staffNote !== undefined ? { staffNote: update.staffNote?.trim() || null } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
      ...(update.assignedToId !== undefined ? { assignedToId: update.assignedToId } : {}),
      // Stamped the first time somebody moves it out of NEW, so "how long
      // before we answered" is answerable later. Never overwritten.
      ...(update.status && update.status !== 'NEW' && !existing.contactedAt
        ? { contactedAt: new Date() }
        : {}),
      // Picking a request up claims it, unless the caller said otherwise.
      ...(update.assignedToId === undefined && update.status && update.status !== 'NEW'
        ? { assignedToId: actorId }
        : {}),
    },
    select: { id: true, status: true, scheduledAt: true },
  });
}

/** How many are waiting, for the admin home. */
export async function countOpen(): Promise<{ open: number; total: number }> {
  const [open, total] = await Promise.all([
    prisma.consultationRequest.count({ where: { status: { in: ['NEW', 'CONTACTED'] } } }),
    prisma.consultationRequest.count(),
  ]);
  return { open, total };
}
