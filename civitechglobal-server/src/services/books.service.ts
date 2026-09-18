import type { BookCondition, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';
import {
  PUBLIC_LISTING_WHERE,
  assertAuthorEditable,
  assertReviewable,
  assertSubmittable,
  reviewPatch,
  type ReviewDecision,
} from './moderation.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';
import { authorProfileSummaries, authorProfileSummary } from './profile.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The book market.
 *
 * A noticeboard: somebody describes a book they are willing to part with, what
 * state it is in and what they want for it, and everybody else can read it.
 * There is no basket and no payment — that is a later decision, and a market
 * that pretends to take money it cannot take is worse than one that is plainly
 * a list.
 *
 * Two things make it different from the job and project boards it otherwise
 * copies:
 *
 *   A cover is required. A book listing without a picture of the actual copy
 *   is asking a stranger to trust "good condition" as an adjective. The rule
 *   is enforced at submission rather than at creation, so a draft can be
 *   started from a phone and finished later from a desk.
 *
 *   Staff post here too. Everywhere else staff review what members write; in
 *   the book market the company also sells its own books, so a listing records
 *   whether it came from the company — see the schema note on postedByCompany
 *   for why that is frozen at creation rather than read from the role.
 */

export interface BookInput {
  title: string;
  bookAuthor: string;
  description: string;
  condition: BookCondition;
  price: bigint;
  publisher?: string;
  isbn?: string;
  publishYear?: number;
  language?: string;
  pageCount?: number;
  category?: string;
  negotiable?: boolean;
  province?: string;
  city?: string;
}

export interface BookQuery {
  search?: string;
  condition?: string;
  category?: string;
  province?: string;
  priceMin?: bigint;
  priceMax?: bigint;
  sort?: string;
  page: number;
  pageSize: number;
}

/** The public URL for a cover, never its storage key. See showcase.service. */
const coverUrl = (id: string, storedName: string | null): string | null =>
  storedName ? `/market/books/${id}/cover` : null;

/**
 * Whether this seller is the company.
 *
 * Read once, at creation. Staff are not asked to tick a box — the label is a
 * statement about who posted it, and letting anybody choose it would make it
 * worth nothing.
 */
async function isStaff(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}

/** Digits only, 10 or 13 of them. Hyphens and spaces are how ISBNs are written, not what they are. */
function normalizeIsbn(isbn: string | undefined): string | null {
  if (!isbn?.trim()) return null;
  const digits = isbn.replace(/[\s-]/g, '');
  if (!/^\d{10}$|^\d{13}$/.test(digits)) {
    throw new AppError('شابک باید ۱۰ یا ۱۳ رقم باشد.', 400);
  }
  return digits;
}

function normalize(input: Partial<BookInput>) {
  const trimmed = <T extends string | undefined>(value: T) => (value?.trim() ? value.trim() : undefined);
  return {
    ...input,
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.bookAuthor !== undefined ? { bookAuthor: input.bookAuthor.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.isbn !== undefined ? { isbn: normalizeIsbn(input.isbn) } : {}),
    ...(input.publisher !== undefined ? { publisher: trimmed(input.publisher) ?? null } : {}),
    ...(input.category !== undefined ? { category: trimmed(input.category) ?? null } : {}),
    ...(input.province !== undefined ? { province: trimmed(input.province) ?? null } : {}),
    ...(input.city !== undefined ? { city: trimmed(input.city) ?? null } : {}),
    ...(input.language !== undefined ? { language: trimmed(input.language) ?? null } : {}),
  };
}

/** Rejects a price that no currency can express, before it reaches the column. */
function assertSanePrice(price: bigint | undefined): void {
  if (price === undefined) return;
  if (price < 0n) throw new AppError('قیمت نمی‌تواند منفی باشد.', 400);
  // A billion tomans for a second-hand book is a typo, not an offer.
  if (price > 1_000_000_000n) throw new AppError('قیمت واردشده معتبر نیست.', 400);
}

async function storeCover(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

// ---------------------------------------------------------------------------
// The seller's side
// ---------------------------------------------------------------------------

export async function createBook(userId: string, input: BookInput, cover: IncomingFile | null) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);
  assertSanePrice(input.price);

  const stored = await storeCover(cover);
  try {
    return await prisma.bookListing.create({
      data: {
        // The caller's fields first, then the ones this service decides. The
        // order is the guard: spread last, a body carrying `postedByCompany`
        // would award itself the company's badge. The validator strips it
        // today, which is a reason not to also depend on the ordering here —
        // not a reason to leave it the other way round.
        ...(normalize(input) as BookInput),
        code: generateTrackingCode(),
        sellerId: userId,
        postedByCompany: await isStaff(userId),
        coverStoredName: stored?.storedName,
        coverOriginalName: stored?.originalName,
        coverMimeType: stored?.mimeType,
        // A draft, as everywhere else: writing a listing and publishing it are
        // separate decisions.
        moderationStatus: 'DRAFT',
      },
      select: { id: true, code: true, moderationStatus: true },
    });
  } catch (error) {
    // Nothing references the file yet, so a failed insert must not leave it
    // behind — an orphan in storage is invisible and never collected.
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function updateBook(
  userId: string,
  bookId: string,
  input: Partial<BookInput>,
  cover: IncomingFile | null,
) {
  const existing = await prisma.bookListing.findFirst({
    where: { id: bookId, sellerId: userId },
    select: { moderationStatus: true, coverStoredName: true },
  });
  if (!existing) throw new AppError('این آگهی پیدا نشد.', 404);
  assertAuthorEditable(existing.moderationStatus);
  assertSanePrice(input.price);

  const stored = await storeCover(cover);
  const updated = await prisma.bookListing.update({
    where: { id: bookId },
    data: {
      ...normalize(input),
      ...(stored
        ? {
            coverStoredName: stored.storedName,
            coverOriginalName: stored.originalName,
            coverMimeType: stored.mimeType,
          }
        : {}),
    },
    select: { id: true, code: true, moderationStatus: true },
  });

  // Only once the row points at the new file, and only then.
  if (stored && existing.coverStoredName) await removeFile(existing.coverStoredName);
  return updated;
}

export async function submitBook(userId: string, bookId: string) {
  const book = await prisma.bookListing.findFirst({
    where: { id: bookId, sellerId: userId },
    select: { moderationStatus: true, coverStoredName: true },
  });
  if (!book) throw new AppError('این آگهی پیدا نشد.', 404);
  assertSubmittable(book.moderationStatus);
  if (!book.coverStoredName) {
    throw new AppError('برای ارسال آگهی، تصویر جلد کتاب لازم است.', 400);
  }

  return prisma.bookListing.update({
    where: { id: bookId },
    data: { moderationStatus: 'PENDING_REVIEW', submittedAt: new Date() },
    select: { id: true, code: true, moderationStatus: true },
  });
}

export async function closeBook(userId: string, bookId: string) {
  const book = await prisma.bookListing.findFirst({
    where: { id: bookId, sellerId: userId },
    select: { id: true },
  });
  if (!book) throw new AppError('این آگهی پیدا نشد.', 404);

  return prisma.bookListing.update({
    where: { id: bookId },
    data: { state: 'CLOSED' },
    select: { id: true, state: true },
  });
}

export async function listOwnBooks(userId: string) {
  const rows = await prisma.bookListing.findMany({
    where: { sellerId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      code: true,
      title: true,
      bookAuthor: true,
      condition: true,
      price: true,
      currency: true,
      moderationStatus: true,
      reviewNote: true,
      state: true,
      publishedAt: true,
      viewCount: true,
      postedByCompany: true,
      coverStoredName: true,
      updatedAt: true,
    },
  });
  return rows.map(({ coverStoredName, ...row }) => ({ ...row, coverUrl: coverUrl(row.id, coverStoredName) }));
}

// ---------------------------------------------------------------------------
// The public market
// ---------------------------------------------------------------------------

const publicBookFields = () =>
  ({
    id: true,
    code: true,
    title: true,
    bookAuthor: true,
    publisher: true,
    condition: true,
    price: true,
    currency: true,
    negotiable: true,
    category: true,
    province: true,
    city: true,
    postedByCompany: true,
    featured: true,
    publishedAt: true,
    viewCount: true,
    coverStoredName: true,
  }) satisfies Prisma.BookListingSelect;

function bookSort(query: BookQuery): Prisma.BookListingOrderByWithRelationInput[] {
  switch (query.sort) {
    case 'price-asc':
      return [{ price: 'asc' }, { publishedAt: 'desc' }];
    case 'price-desc':
      return [{ price: 'desc' }, { publishedAt: 'desc' }];
    case 'title':
      return [{ title: 'asc' }];
    default:
      // Featured first, then newest. Same convention as the other boards.
      return [{ featured: 'desc' }, { publishedAt: 'desc' }];
  }
}

export async function listPublicBooks(query: BookQuery) {
  const where: Prisma.BookListingWhereInput = {
    AND: [
      PUBLIC_LISTING_WHERE,
      {
        ...(query.condition ? { condition: query.condition as BookCondition } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.province ? { province: query.province } : {}),
        ...(query.priceMin !== undefined || query.priceMax !== undefined
          ? {
              price: {
                ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
                ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
              },
            }
          : {}),
        // Search is by name: the title, or who wrote it. Not the description —
        // a word buried in a blurb is a worse match than a title, and mixing
        // the two makes the good matches impossible to find.
        ...(query.search?.trim()
          ? {
              OR: [
                { title: { contains: query.search.trim(), mode: 'insensitive' } },
                { bookAuthor: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.bookListing.findMany({
      where,
      orderBy: bookSort(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { ...publicBookFields(), sellerId: true },
    }),
    prisma.bookListing.count({ where }),
  ]);

  const profiles = await authorProfileSummaries(rows.map((row) => row.sellerId));
  const items = rows.map(({ sellerId, coverStoredName, ...row }) => ({
    ...row,
    coverUrl: coverUrl(row.id, coverStoredName),
    // A company listing speaks for the company, so it carries no personal
    // profile — the badge is the attribution.
    sellerProfile: row.postedByCompany ? null : (profiles.get(sellerId) ?? null),
  }));

  return toPage(items, total, query.page, query.pageSize);
}

export async function getPublicBook(code: string) {
  const decoded = code.trim().toUpperCase();
  try {
    await prisma.bookListing.updateMany({
      where: { code: decoded, ...PUBLIC_LISTING_WHERE },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Reading beats counting. See the schema note on viewCount.
  }

  const book = await prisma.bookListing.findFirst({
    where: { code: decoded, ...PUBLIC_LISTING_WHERE },
    select: {
      ...publicBookFields(),
      description: true,
      isbn: true,
      publishYear: true,
      language: true,
      pageCount: true,
      sellerId: true,
    },
  });
  if (!book) throw new AppError('این کتاب پیدا نشد.', 404);

  const { sellerId, coverStoredName, ...rest } = book;
  return {
    ...rest,
    coverUrl: coverUrl(book.id, coverStoredName),
    sellerProfile: book.postedByCompany ? null : await authorProfileSummary(sellerId),
  };
}

/**
 * The cover bytes.
 *
 * includeUnpublished is for the seller's own draft and the review queue, where
 * the picture has to be visible before anybody has approved it. An unpublished
 * listing's cover is as private as the rest of the row.
 */
export async function getCover(id: string, includeUnpublished = false) {
  const row = await prisma.bookListing.findUnique({
    where: { id },
    select: {
      coverStoredName: true,
      coverMimeType: true,
      coverOriginalName: true,
      moderationStatus: true,
      state: true,
    },
  });
  const visible = row?.moderationStatus === 'APPROVED' && row.state === 'OPEN';
  if (!row || (!visible && !includeUnpublished) || !row.coverStoredName || !row.coverMimeType) {
    throw new AppError('این تصویر پیدا نشد.', 404);
  }
  return {
    storedName: row.coverStoredName,
    mimeType: row.coverMimeType,
    originalName: row.coverOriginalName ?? 'cover',
  };
}

// ---------------------------------------------------------------------------
// The review queue
// ---------------------------------------------------------------------------

export async function listBooksForReview(query: { status?: string; page: number; pageSize: number }) {
  const where: Prisma.BookListingWhereInput = {
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
  };

  const [rows, total] = await Promise.all([
    prisma.bookListing.findMany({
      where,
      orderBy: { submittedAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        title: true,
        bookAuthor: true,
        description: true,
        condition: true,
        price: true,
        currency: true,
        publisher: true,
        isbn: true,
        publishYear: true,
        province: true,
        city: true,
        postedByCompany: true,
        moderationStatus: true,
        submittedAt: true,
        coverStoredName: true,
        seller: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.bookListing.count({ where }),
  ]);

  const items = rows.map(({ coverStoredName, ...row }) => ({
    ...row,
    coverUrl: coverUrl(row.id, coverStoredName),
  }));
  return toPage(items, total, query.page, query.pageSize);
}

export async function reviewBook(
  bookId: string,
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
) {
  const book = await prisma.bookListing.findUnique({
    where: { id: bookId },
    select: { id: true, sellerId: true, title: true, moderationStatus: true, publishedAt: true },
  });
  if (!book) throw new AppError('این آگهی پیدا نشد.', 404);

  assertReviewable(book.moderationStatus);

  const updated = await prisma.bookListing.update({
    where: { id: bookId },
    data: reviewPatch(decision, reviewer, notes, book.publishedAt),
    select: { id: true, moderationStatus: true, publishedAt: true },
  });

  notifySafely(book.sellerId, {
    type: 'listing.reviewed',
    title:
      decision === 'APPROVED'
        ? 'آگهی کتاب شما منتشر شد'
        : decision === 'CHANGES_REQUESTED'
          ? 'آگهی کتاب شما نیازمند اصلاح است'
          : 'آگهی کتاب شما رد شد',
    body:
      decision === 'APPROVED'
        ? `«${book.title}» تأیید و منتشر شد.`
        : `«${book.title}» — ${notes.reviewNote ?? ''}`,
    link: '/dashboard/books',
  });

  return updated;
}
