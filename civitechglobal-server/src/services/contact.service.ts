import { prisma } from '../config/database.js';
import { toPage } from '../utils/page.js';
import { searchWhere } from './list-search.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import { generateTrackingCode, isUniqueViolation } from './insurance-request.service.js';

/**
 * Contact, as a ticket rather than a message.
 *
 * Nothing here sends email, and that is the design rather than a gap: this
 * deployment has no outbound mail provider, so a reply that was "sent" would
 * be a reply that vanished. Instead every message gets a tracking code, staff
 * answer from the panel, and the visitor reads the answer by quoting the code
 * back — the same shape the insurance intake already uses, which means people
 * only have to learn it once.
 *
 * The consequence worth stating: the code is shown exactly once, at
 * submission. There is no "resend my code" because there is nowhere to resend
 * it to. The form says so.
 */

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

/** Enough attempts that exhausting them means something is wrong, not unlucky. */
const CODE_ATTEMPTS = 5;

export async function submitTicket(input: ContactInput) {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.contactMessage.create({
        data: {
          trackingCode: generateTrackingCode(),
          name: input.name,
          email: input.email,
          emailHash: sha256Hex(input.email),
          subject: input.subject,
          message: input.message,
        },
        select: { trackingCode: true, createdAt: true },
      });
    } catch (error) {
      // Retry only a collision on the code. Anything else is a real failure
      // and swallowing it would turn a broken database into a silent no-op.
      if (!isUniqueViolation(error) || attempt === CODE_ATTEMPTS - 1) throw error;
    }
  }

  throw new AppError('ثبت پیام ممکن نشد. لطفاً دوباره تلاش کنید.', 500);
}

/**
 * What the visitor sees when they quote their code.
 *
 * Deliberately narrow. internalNotes is staff talking to staff and never
 * appears here; emailHash is a lookup key and has no business leaving the
 * server. The reply author's name is included because "somebody answered you"
 * is less reassuring than knowing who, but their email is not.
 */
export async function findByTrackingCode(code: string) {
  const ticket = await prisma.contactMessage.findUnique({
    where: { trackingCode: code.trim().toUpperCase() },
    select: {
      trackingCode: true,
      status: true,
      name: true,
      subject: true,
      message: true,
      createdAt: true,
      replies: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!ticket) throw new AppError('پیامی با این کد پیدا نشد.', 404);
  return ticket;
}

// --- The inbox -------------------------------------------------------------

export async function listTickets(query: {
  page: number;
  pageSize: number;
  status?: string;
  unread?: boolean;
  search?: string;
}) {
  const where = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.unread ? { readAt: null } : {}),
    ...searchWhere(query.search, ['trackingCode', 'fullName', 'email', 'subject']),
  };

  const [items, total, unread, open] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { readAt: null } }),
    prisma.contactMessage.count({ where: { status: 'OPEN' } }),
  ]);

  return { ...toPage(items, total, query.page, query.pageSize), unread, open };
}

/**
 * Answering a ticket.
 *
 * Writing the reply is what moves the ticket to ANSWERED, in one transaction.
 * Two separate actions would let a reply exist that the visitor is never told
 * about — and since there is no email, the status is the only thing that tells
 * them to look.
 *
 * A CLOSED ticket reopens to ANSWERED rather than staying closed: staff have
 * just said something new, so the conversation is demonstrably not finished.
 */
export async function reply(messageId: string, body: string, authorId: string) {
  const ticket = await prisma.contactMessage.findUnique({
    where: { id: messageId },
    select: { id: true },
  });
  if (!ticket) throw new AppError('پیام پیدا نشد.', 404);

  return prisma.$transaction(async (tx) => {
    const created = await tx.contactReply.create({
      data: { messageId, body, authorId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    });

    await tx.contactMessage.update({
      where: { id: messageId },
      data: {
        status: 'ANSWERED',
        // Answering something is reading it. Leaving it unread after a reply
        // means the inbox counter lies to the next person who opens it.
        readAt: new Date(),
      },
    });

    return created;
  });
}

export async function updateTicket(
  id: string,
  input: { read?: boolean; status?: 'OPEN' | 'ANSWERED' | 'CLOSED'; internalNotes?: string },
) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new AppError('پیام پیدا نشد.', 404);

  const now = new Date();
  return prisma.contactMessage.update({
    where: { id },
    data: {
      // A toggle, not a stamp-once: an inbox where marking something read by
      // mistake is permanent is an inbox people stop trusting.
      readAt: input.read === undefined ? undefined : input.read ? (existing.readAt ?? now) : null,
      status: input.status,
      // CLOSED is the only status that means "handled"; keeping handledAt in
      // step means the existing column still answers the question it was
      // added for rather than quietly going stale.
      handledAt:
        input.status === undefined ? undefined : input.status === 'CLOSED' ? (existing.handledAt ?? now) : null,
      internalNotes: input.internalNotes,
    },
  });
}
