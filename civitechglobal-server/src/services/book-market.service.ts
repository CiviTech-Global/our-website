import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';
import { assertAuthorEditable, assertSubmittable, PUBLIC_LISTING_WHERE } from './moderation.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';
import { authorProfileSummaries } from './profile.service.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { assertBookCategoryUsable, bookCategoryScope } from './book-taxonomy.service.js';
import { BOOK_GRADES, MAX_BOOK_PHOTOS, normalizeIsbnStrict, type BookGrade } from '../catalog/book-taxonomy.js';

/**
 * The book market, second generation.
 *
 * A shared CATALOGUE of books — one entry per edition, with the facts the
 * trade prints (authors and translators, publisher, ISBN, year, printing,
 * pages, binding, trim size, cover price) — and OFFERS: one seller's copy or
 * copies of a catalogue book, with its graded condition, photographs, price,
 * quantity and how it can reach the buyer. A reader finds one page per book
 * with every copy for sale on it, as on Bookshop.org, instead of a scatter of
 * separate adverts for the same thing.
 *
 * Offers are moderated like every listing. Buying is a REQUEST: the buyer asks,
 * the seller accepts or declines, they arrange the hand-over in the request's
 * thread, and the seller marks it done — which opens the two-way review,
 * through a contract like every other deal here. No money moves.
 *
 * An offer also fills the first-generation columns (title, author, price…),
 * so the old pages keep working the day the flag is turned off.
 *
 * NOT REACHABLE WHILE FEATURE_BOOKS_V2 IS OFF — its router is gated once.
 */

export type BookFacts = {
  title: string;
  subtitle?: string;
  authors: string[];
  translators?: string[];
  publisher?: string;
  isbn?: string;
  publishYear?: number;
  yearCalendar?: string;
  edition?: number;
  printRun?: number;
  pageCount?: number;
  language?: string;
  originalTitle?: string;
  originalLanguage?: string;
  series?: string;
  seriesNumber?: number;
  binding?: string;
  trimSize?: string;
  weightGrams?: number;
  listPrice?: bigint;
  currency?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
};

export interface OfferInput {
  bookId?: string;
  book?: BookFacts;
  grade: BookGrade;
  conditionNotes?: string;
  price: bigint;
  negotiable?: boolean;
  quantity?: number;
  deliveryOptions: string[];
  shippingCost?: bigint;
  province?: string;
  city?: string;
}

const GRADE_RANK = Object.fromEntries(BOOK_GRADES.map((grade, index) => [grade, index])) as Record<BookGrade, number>;

/** Grades at least as good as `floor`. */
function gradesAtLeast(floor: BookGrade): BookGrade[] {
  return BOOK_GRADES.filter((grade) => GRADE_RANK[grade] <= GRADE_RANK[floor]);
}

const PUBLIC_OFFER_WHERE = {
  ...PUBLIC_LISTING_WHERE,
  bookId: { not: null },
  quantity: { gt: 0 },
  seller: { deletedAt: null, marketplacePaused: false },
} as const satisfies Prisma.BookListingWhereInput;

function assertSanePrice(price: bigint | undefined): void {
  if (price === undefined) return;
  if (price < 0n) throw new AppError('قیمت نمی‌تواند منفی باشد.', 400);
  if (price > 10_000_000_000n) throw new AppError('قیمت واردشده معتبر نیست.', 400);
}

async function isStaff(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}

/** Lower-cased, spaces collapsed, Arabic letters folded to Persian: how titles are compared. */
export function normalizeTitle(title: string): string {
  return title
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** The book's one search column: every name it can be looked up by, folded. */
export function searchTextOf(book: {
  title: string;
  subtitle?: string | null;
  authors: string[];
  translators: string[];
  publisher?: string | null;
  series?: string | null;
  originalTitle?: string | null;
  tags: string[];
  isbn?: string | null;
}): string {
  return normalizeTitle(
    [book.title, book.subtitle, ...book.authors, ...book.translators, book.publisher, book.series, book.originalTitle, ...book.tags, book.isbn]
      .filter(Boolean)
      .join(' '),
  );
}

/** Recompute a book's search column after its facts change. */
async function refreshSearchText(bookId: string): Promise<void> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { title: true, subtitle: true, authors: true, translators: true, publisher: true, series: true, originalTitle: true, tags: true, isbn: true },
  });
  if (book) await prisma.book.update({ where: { id: bookId }, data: { searchText: searchTextOf(book) } });
}

function factsData(facts: Partial<BookFacts>) {
  const isbn = facts.isbn === undefined ? undefined : facts.isbn ? normalizeIsbnStrict(facts.isbn) : null;
  if (facts.isbn && !isbn) throw new AppError('شابک معتبر نیست؛ رقم کنترلی آن نمی‌خواند.', 400);
  return {
    ...(facts.title !== undefined ? { title: facts.title.trim() } : {}),
    ...(facts.subtitle !== undefined ? { subtitle: facts.subtitle || null } : {}),
    ...(facts.authors !== undefined ? { authors: facts.authors } : {}),
    ...(facts.translators !== undefined ? { translators: facts.translators } : {}),
    ...(facts.publisher !== undefined ? { publisher: facts.publisher || null } : {}),
    ...(isbn !== undefined ? { isbn } : {}),
    ...(facts.publishYear !== undefined ? { publishYear: facts.publishYear } : {}),
    ...(facts.yearCalendar !== undefined ? { yearCalendar: facts.yearCalendar } : {}),
    ...(facts.edition !== undefined ? { edition: facts.edition } : {}),
    ...(facts.printRun !== undefined ? { printRun: facts.printRun } : {}),
    ...(facts.pageCount !== undefined ? { pageCount: facts.pageCount } : {}),
    ...(facts.language !== undefined ? { language: facts.language } : {}),
    ...(facts.originalTitle !== undefined ? { originalTitle: facts.originalTitle || null } : {}),
    ...(facts.originalLanguage !== undefined ? { originalLanguage: facts.originalLanguage || null } : {}),
    ...(facts.series !== undefined ? { series: facts.series || null } : {}),
    ...(facts.seriesNumber !== undefined ? { seriesNumber: facts.seriesNumber } : {}),
    ...(facts.binding !== undefined ? { binding: facts.binding } : {}),
    ...(facts.trimSize !== undefined ? { trimSize: facts.trimSize } : {}),
    ...(facts.weightGrams !== undefined ? { weightGrams: facts.weightGrams } : {}),
    ...(facts.listPrice !== undefined ? { listPrice: facts.listPrice } : {}),
    ...(facts.currency !== undefined ? { currency: facts.currency } : {}),
    ...(facts.description !== undefined ? { description: facts.description || null } : {}),
    ...(facts.tags !== undefined ? { tags: facts.tags } : {}),
    ...(facts.categoryId !== undefined ? { categoryId: facts.categoryId || null } : {}),
  };
}

const CATALOG_SELECT = {
  id: true,
  code: true,
  title: true,
  subtitle: true,
  authors: true,
  translators: true,
  publisher: true,
  isbn: true,
  publishYear: true,
  yearCalendar: true,
  edition: true,
  pageCount: true,
  language: true,
  binding: true,
  trimSize: true,
  listPrice: true,
  currency: true,
  verified: true,
  coverStoredName: true,
  categoryId: true,
} as const satisfies Prisma.BookSelect;

/**
 * The sell form's first step: is this book already in the catalogue? By ISBN
 * when the query reads as one, otherwise by title, author or translator.
 */
export async function searchCatalog(query: string) {
  const isbn = normalizeIsbnStrict(query);
  const needle = query.trim();
  const rows = await prisma.book.findMany({
    where: isbn ? { isbn } : { searchText: { contains: normalizeTitle(needle) } },
    orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }],
    take: 10,
    select: { ...CATALOG_SELECT, _count: { select: { listings: { where: PUBLIC_OFFER_WHERE } } } },
  });
  return rows.map(({ coverStoredName, ...row }) => ({ ...row, coverUrl: coverStoredName ? `/bookshop/books/${row.id}/cover` : null }));
}

/**
 * The catalogue entry an offer hangs off: the one chosen, the one with this
 * ISBN already, or a new one. An existing entry's facts are never rewritten by
 * a seller — they are shared, and staff own them once verified.
 */
async function resolveBook(userId: string, input: { bookId?: string; book?: BookFacts }): Promise<string> {
  if (input.bookId) {
    const book = await prisma.book.findUnique({ where: { id: input.bookId }, select: { id: true } });
    if (!book) throw new AppError('این کتاب در فهرست پیدا نشد.', 404);
    return book.id;
  }
  const facts = input.book!;
  if (facts.categoryId) await assertBookCategoryUsable(facts.categoryId);
  const data = factsData(facts);
  if (data.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: data.isbn }, select: { id: true } });
    if (existing) return existing.id;
  }
  const created = await prisma.book.create({
    data: {
      code: generateTrackingCode(),
      ...data,
      title: facts.title.trim(),
      authors: facts.authors,
      createdById: userId,
      searchText: searchTextOf({ ...facts, translators: facts.translators ?? [], tags: facts.tags ?? [], isbn: data.isbn ?? null }),
    },
    select: { id: true },
  });
  return created.id;
}

// ---------------------------------------------------------------------------
// Offers — the seller's side
// ---------------------------------------------------------------------------

/** The first-generation columns, filled from the book and the offer so the old pages keep reading. */
async function legacyColumns(bookId: string, offer: Pick<OfferInput, 'grade' | 'conditionNotes' | 'price' | 'negotiable' | 'province' | 'city'>) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  return {
    title: book.title,
    bookAuthor: book.authors.join('، ') || '—',
    description: offer.conditionNotes || book.description || book.title,
    publisher: book.publisher,
    isbn: book.isbn,
    publishYear: book.publishYear,
    language: book.language,
    pageCount: book.pageCount,
    condition: offer.grade === 'NEW' ? ('NEW' as const) : ('USED' as const),
    price: offer.price,
    currency: book.currency,
    negotiable: offer.negotiable ?? false,
    province: offer.province ?? null,
    city: offer.city ?? null,
  };
}

async function storePhotos(files: IncomingFile[]) {
  return files.length ? storeFiles(files, IMAGE_EXTENSIONS) : [];
}

export async function createOffer(userId: string, input: OfferInput, photos: IncomingFile[]) {
  const staff = await isStaff(userId);
  if (!staff) {
    await assertVerified(userId);
    await assertMarketplaceAllowed(userId);
  }
  assertSanePrice(input.price);
  if (photos.length > MAX_BOOK_PHOTOS) throw new AppError(`حداکثر ${MAX_BOOK_PHOTOS} عکس.`, 400);

  const bookId = await resolveBook(userId, input);
  const stored = await storePhotos(photos);
  try {
    return await prisma.bookListing.create({
      data: {
        ...(await legacyColumns(bookId, input)),
        code: generateTrackingCode(),
        sellerId: userId,
        postedByCompany: staff,
        bookId,
        grade: input.grade,
        conditionNotes: input.conditionNotes ?? null,
        quantity: input.quantity ?? 1,
        deliveryOptions: input.deliveryOptions,
        shippingCost: input.shippingCost ?? null,
        moderationStatus: 'DRAFT',
        photos: {
          create: stored.map((file, position) => ({
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            position,
          })),
        },
      },
      select: { id: true, code: true, moderationStatus: true, bookId: true },
    });
  } catch (error) {
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
}

async function requireOwnOffer(userId: string, offerId: string) {
  const offer = await prisma.bookListing.findFirst({
    where: { id: offerId, sellerId: userId },
    select: { id: true, moderationStatus: true, bookId: true, title: true, state: true, quantity: true },
  });
  if (!offer) throw new AppError('این آگهی پیدا نشد.', 404);
  return offer;
}

/** A full edit, while it is a draft or sent back. */
export async function updateOffer(
  userId: string,
  offerId: string,
  input: OfferInput,
  newPhotos: IncomingFile[],
  removePhotoIds: string[],
) {
  const offer = await requireOwnOffer(userId, offerId);
  assertAuthorEditable(offer.moderationStatus);
  assertSanePrice(input.price);

  const existing = await prisma.bookListingPhoto.findMany({ where: { listingId: offerId }, select: { id: true, storedName: true } });
  const removing = existing.filter((photo) => removePhotoIds.includes(photo.id));
  if (existing.length - removing.length + newPhotos.length > MAX_BOOK_PHOTOS) {
    throw new AppError(`حداکثر ${MAX_BOOK_PHOTOS} عکس.`, 400);
  }

  const bookId = await resolveBook(userId, input);
  const stored = await storePhotos(newPhotos);
  try {
    await prisma.$transaction([
      prisma.bookListingPhoto.deleteMany({ where: { id: { in: removing.map((photo) => photo.id) } } }),
      prisma.bookListing.update({
        where: { id: offerId },
        data: {
          ...(await legacyColumns(bookId, input)),
          bookId,
          grade: input.grade,
          conditionNotes: input.conditionNotes ?? null,
          quantity: input.quantity ?? 1,
          deliveryOptions: input.deliveryOptions,
          shippingCost: input.shippingCost ?? null,
          photos: {
            create: stored.map((file, index) => ({
              originalName: file.originalName,
              storedName: file.storedName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              checksum: file.checksum,
              position: existing.length + index,
            })),
          },
        },
      }),
    ]);
  } catch (error) {
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
  await Promise.all(removing.map((photo) => removeFile(photo.storedName)));
  return { id: offerId };
}

/**
 * What a seller may change on a live offer at once: price, quantity, delivery.
 * The things a reviewer judged — the book, the condition, the photos — go
 * through a full edit instead.
 */
export async function quickEditOffer(
  userId: string,
  offerId: string,
  input: { price?: bigint; negotiable?: boolean; quantity?: number; deliveryOptions?: string[]; shippingCost?: bigint | null },
) {
  await requireOwnOffer(userId, offerId);
  assertSanePrice(input.price);
  return prisma.bookListing.update({
    where: { id: offerId },
    data: {
      ...input,
      // Back in stock reopens it; sold out closes it.
      ...(input.quantity !== undefined ? { state: input.quantity > 0 ? 'OPEN' : 'CLOSED' } : {}),
    },
    select: { id: true, price: true, quantity: true, state: true },
  });
}

export async function submitOffer(userId: string, offerId: string) {
  const offer = await requireOwnOffer(userId, offerId);
  assertSubmittable(offer.moderationStatus);
  const photos = await prisma.bookListingPhoto.count({ where: { listingId: offerId } });
  if (photos === 0) throw new AppError('برای ارسال آگهی دست‌کم یک عکس از خود کتاب لازم است.', 400);
  return prisma.bookListing.update({
    where: { id: offerId },
    data: { moderationStatus: 'PENDING_REVIEW', submittedAt: new Date() },
    select: { id: true, moderationStatus: true },
  });
}

export async function setOfferOpen(userId: string, offerId: string, open: boolean) {
  const offer = await requireOwnOffer(userId, offerId);
  if (open && offer.quantity < 1) throw new AppError('موجودی این آگهی صفر است؛ ابتدا تعداد را به‌روز کنید.', 409);
  return prisma.bookListing.update({
    where: { id: offerId },
    data: { state: open ? 'OPEN' : 'CLOSED' },
    select: { id: true, state: true },
  });
}

const PHOTO_SELECT = { orderBy: { position: 'asc' as const }, select: { id: true, originalName: true } };

/** The seller's offers, with their book, photos and the requests waiting on them. */
export async function listOwnOffers(userId: string) {
  const rows = await prisma.bookListing.findMany({
    where: { sellerId: userId, bookId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      code: true,
      grade: true,
      conditionNotes: true,
      price: true,
      currency: true,
      negotiable: true,
      quantity: true,
      soldCount: true,
      deliveryOptions: true,
      shippingCost: true,
      province: true,
      city: true,
      moderationStatus: true,
      reviewNote: true,
      state: true,
      viewCount: true,
      publishedAt: true,
      updatedAt: true,
      photos: PHOTO_SELECT,
      book: { select: CATALOG_SELECT },
    },
  });
  const requests = await prisma.bookRequest.groupBy({
    by: ['listingId', 'status'],
    where: { listingId: { in: rows.map((row) => row.id) } },
    _count: { _all: true },
  });
  return rows.map((row) => ({
    ...row,
    book: row.book ? presentBookFacts(row.book) : null,
    requests: Object.fromEntries(
      requests.filter((entry) => entry.listingId === row.id).map((entry) => [entry.status, entry._count._all]),
    ),
  }));
}

function presentBookFacts<T extends { id: string; coverStoredName: string | null }>(book: T) {
  const { coverStoredName, ...rest } = book;
  return { ...rest, coverUrl: coverStoredName ? `/bookshop/books/${book.id}/cover` : null };
}

// ---------------------------------------------------------------------------
// The public market
// ---------------------------------------------------------------------------

export interface BoardQuery {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  language?: string;
  binding?: string;
  trimSize?: string;
  grade?: BookGrade;
  priceMin?: bigint;
  priceMax?: bigint;
  province?: string;
  delivery?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  yearFrom?: number;
  yearTo?: number;
  discounted?: boolean;
  translated?: boolean;
  freeShipping?: boolean;
  sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'mostOffers' | 'discount' | 'title' | 'popular';
}

const BOARD_CANDIDATES = 1000;

/**
 * The board: books with at least one copy for sale that matches the offer
 * filters, each summarised from its offers — the lowest price, how many
 * copies and sellers, the best condition on offer, the discount against the
 * cover price. Sorting by those needs the aggregate, so it runs over a bounded
 * candidate set rather than in SQL; plenty at this size.
 */
export async function listBoard(query: BoardQuery) {
  const offerWhere: Prisma.BookListingWhereInput = {
    ...PUBLIC_OFFER_WHERE,
    ...(query.grade ? { grade: { in: gradesAtLeast(query.grade) } } : {}),
    ...(query.province ? { province: query.province } : {}),
    ...(query.delivery ? { deliveryOptions: { has: query.delivery } } : {}),
    ...(query.freeShipping ? { shippingCost: 0n } : {}),
    ...(query.priceMin !== undefined || query.priceMax !== undefined
      ? {
          price: {
            ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
            ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
          },
        }
      : {}),
  };

  const and: Prisma.BookWhereInput[] = [{ listings: { some: offerWhere } }];
  if (query.search) {
    const needle = query.search.trim();
    const isbn = normalizeIsbnStrict(needle);
    and.push(
      isbn
        ? { isbn }
        : // Every word must appear somewhere: "دانشور سووشون" finds the book.
          { AND: normalizeTitle(needle).split(' ').map((word) => ({ searchText: { contains: word } })) },
    );
  }
  if (query.categoryId) and.push({ categoryId: { in: await bookCategoryScope(query.categoryId) } });
  if (query.language) and.push({ language: query.language });
  if (query.binding) and.push({ binding: query.binding });
  if (query.trimSize) and.push({ trimSize: query.trimSize });
  if (query.author) and.push({ authors: { has: query.author } });
  if (query.translator) and.push({ translators: { has: query.translator } });
  if (query.publisher) and.push({ publisher: { contains: query.publisher, mode: 'insensitive' } });
  if (query.translated) and.push({ translators: { isEmpty: false } });
  if (query.yearFrom !== undefined) and.push({ publishYear: { gte: query.yearFrom } });
  if (query.yearTo !== undefined) and.push({ publishYear: { lte: query.yearTo } });

  const books = await prisma.book.findMany({
    where: { AND: and },
    take: BOARD_CANDIDATES,
    orderBy: { updatedAt: 'desc' },
    select: {
      ...CATALOG_SELECT,
      viewCount: true,
      category: { select: { id: true, slug: true, name: true, nameEn: true } },
      listings: {
        where: offerWhere,
        select: {
          id: true,
          price: true,
          grade: true,
          quantity: true,
          sellerId: true,
          publishedAt: true,
          province: true,
          deliveryOptions: true,
          shippingCost: true,
          featured: true,
          photos: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
        },
      },
    },
  });

  let cards = books.map(({ listings, coverStoredName, ...book }) => {
    const prices = listings.map((offer) => offer.price);
    const lowest = prices.reduce((min, price) => (price < min ? price : min), prices[0]);
    const best = listings.map((offer) => offer.grade as BookGrade).sort((a, b) => GRADE_RANK[a] - GRADE_RANK[b])[0] ?? null;
    const discount =
      book.listPrice && book.listPrice > 0n && lowest < book.listPrice
        ? Number(((book.listPrice - lowest) * 100n) / book.listPrice)
        : 0;
    const newest = listings.map((offer) => offer.publishedAt?.getTime() ?? 0).sort((a, b) => b - a)[0] ?? 0;
    const photo = listings.find((offer) => offer.photos.length)?.photos[0]?.id ?? null;
    return {
      ...book,
      coverUrl: coverStoredName ? `/bookshop/books/${book.id}/cover` : photo ? `/bookshop/photos/${photo}` : null,
      lowestPrice: lowest.toString(),
      offerCount: listings.length,
      copies: listings.reduce((sum, offer) => sum + offer.quantity, 0),
      sellerCount: new Set(listings.map((offer) => offer.sellerId)).size,
      bestGrade: best,
      discountPercent: discount,
      featured: listings.some((offer) => offer.featured),
      freeShipping: listings.some((offer) => offer.shippingCost === 0n),
      deliveryOptions: [...new Set(listings.flatMap((offer) => offer.deliveryOptions))],
      provinces: [...new Set(listings.map((offer) => offer.province).filter((value): value is string => Boolean(value)))],
      newestOfferAt: newest ? new Date(newest).toISOString() : null,
    };
  });

  if (query.discounted) cards = cards.filter((card) => card.discountPercent > 0);

  const price = (card: (typeof cards)[number]) => BigInt(card.lowestPrice);
  switch (query.sort) {
    case 'priceAsc':
      cards.sort((a, b) => (price(a) < price(b) ? -1 : price(a) > price(b) ? 1 : 0));
      break;
    case 'priceDesc':
      cards.sort((a, b) => (price(a) > price(b) ? -1 : price(a) < price(b) ? 1 : 0));
      break;
    case 'mostOffers':
      cards.sort((a, b) => b.offerCount - a.offerCount);
      break;
    case 'discount':
      cards.sort((a, b) => b.discountPercent - a.discountPercent);
      break;
    case 'title':
      cards.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
      break;
    case 'popular':
      cards.sort((a, b) => b.viewCount - a.viewCount);
      break;
    default:
      // Featured first, then whatever was most recently put up for sale.
      cards.sort((a, b) => Number(b.featured) - Number(a.featured) || (b.newestOfferAt ?? '').localeCompare(a.newestOfferAt ?? ''));
  }

  const start = (query.page - 1) * query.pageSize;
  return toPage(cards.slice(start, start + query.pageSize), cards.length, query.page, query.pageSize);
}

/** A small strip of books, as cards with their lowest price: "more by", "similar". */
async function strip(where: Prisma.BookWhereInput, take = 6) {
  const books = await prisma.book.findMany({
    where: { AND: [where, { listings: { some: PUBLIC_OFFER_WHERE } }] },
    take,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      code: true,
      title: true,
      authors: true,
      coverStoredName: true,
      listPrice: true,
      listings: {
        where: PUBLIC_OFFER_WHERE,
        orderBy: { price: 'asc' },
        select: { price: true, photos: { orderBy: { position: 'asc' }, take: 1, select: { id: true } } },
      },
    },
  });
  return books.map(({ listings, coverStoredName, ...book }) => {
    const photo = listings.find((offer) => offer.photos.length)?.photos[0]?.id ?? null;
    return {
      ...book,
      coverUrl: coverStoredName ? `/bookshop/books/${book.id}/cover` : photo ? `/bookshop/photos/${photo}` : null,
      lowestPrice: listings[0]?.price.toString() ?? null,
      offerCount: listings.length,
    };
  });
}

/**
 * One book's page: every fact, every copy for sale (cheapest first, with its
 * seller's record), the other editions of the same work, more by the same
 * author and more from the same shelf.
 */
export async function getBook(code: string) {
  const book = await prisma.book.findFirst({
    where: { code: code.trim().toUpperCase() },
    select: {
      ...CATALOG_SELECT,
      printRun: true,
      originalTitle: true,
      originalLanguage: true,
      series: true,
      seriesNumber: true,
      weightGrams: true,
      description: true,
      tags: true,
      viewCount: true,
      createdAt: true,
      category: { select: { id: true, slug: true, name: true, nameEn: true, parentId: true } },
      listings: {
        where: PUBLIC_OFFER_WHERE,
        orderBy: [{ price: 'asc' }],
        select: {
          id: true,
          code: true,
          grade: true,
          conditionNotes: true,
          price: true,
          currency: true,
          negotiable: true,
          quantity: true,
          soldCount: true,
          deliveryOptions: true,
          shippingCost: true,
          province: true,
          city: true,
          postedByCompany: true,
          publishedAt: true,
          sellerId: true,
          photos: PHOTO_SELECT,
        },
      },
    },
  });
  if (!book) throw new AppError('این کتاب پیدا نشد.', 404);
  if (book.listings.length === 0 && !book.verified) throw new AppError('این کتاب پیدا نشد.', 404);

  try {
    await prisma.book.update({ where: { id: book.id }, data: { viewCount: { increment: 1 } } });
  } catch {
    // Reading beats counting.
  }

  const sellerIds = [...new Set(book.listings.map((offer) => offer.sellerId))];
  const [profiles, completed] = await Promise.all([
    authorProfileSummaries(sellerIds),
    prisma.bookRequest.groupBy({ by: ['sellerId'], where: { sellerId: { in: sellerIds }, status: 'COMPLETED' }, _count: { _all: true } }),
  ]);
  const salesBy = new Map(completed.map((row) => [row.sellerId, row._count._all]));

  const firstAuthor = book.authors[0];
  const key = normalizeTitle(book.originalTitle ?? book.title);
  const [editions, byAuthor, similar] = await Promise.all([
    // The same work in another edition, binding, printing or translation.
    prisma.book
      .findMany({
        where: {
          id: { not: book.id },
          OR: [
            { title: { equals: book.title, mode: 'insensitive' } },
            ...(book.originalTitle ? [{ originalTitle: { equals: book.originalTitle, mode: 'insensitive' as const } }] : []),
          ],
          ...(firstAuthor ? { authors: { has: firstAuthor } } : {}),
        },
        take: 12,
        select: {
          id: true,
          code: true,
          title: true,
          publisher: true,
          translators: true,
          publishYear: true,
          yearCalendar: true,
          edition: true,
          binding: true,
          trimSize: true,
          originalTitle: true,
          listings: { where: PUBLIC_OFFER_WHERE, orderBy: { price: 'asc' }, take: 1, select: { price: true } },
          _count: { select: { listings: { where: PUBLIC_OFFER_WHERE } } },
        },
      })
      .then((rows) =>
        rows
          .filter((row) => normalizeTitle(row.originalTitle ?? row.title) === key || normalizeTitle(row.title) === normalizeTitle(book.title))
          .map(({ listings, _count, ...row }) => ({ ...row, lowestPrice: listings[0]?.price.toString() ?? null, offerCount: _count.listings })),
      ),
    firstAuthor ? strip({ id: { not: book.id }, authors: { has: firstAuthor } }) : Promise.resolve([]),
    book.categoryId ? strip({ id: { not: book.id }, categoryId: book.categoryId }) : Promise.resolve([]),
  ]);

  const { listings, coverStoredName, ...rest } = book;
  const firstPhoto = listings.find((offer) => offer.photos.length)?.photos[0]?.id ?? null;
  const lowest = listings[0]?.price ?? null;
  return {
    ...rest,
    coverUrl: coverStoredName ? `/bookshop/books/${book.id}/cover` : firstPhoto ? `/bookshop/photos/${firstPhoto}` : null,
    lowestPrice: lowest?.toString() ?? null,
    discountPercent:
      lowest !== null && book.listPrice && book.listPrice > 0n && lowest < book.listPrice
        ? Number(((book.listPrice - lowest) * 100n) / book.listPrice)
        : 0,
    offers: listings.map(({ sellerId, ...offer }) => ({
      ...offer,
      seller: offer.postedByCompany ? null : (profiles.get(sellerId) ?? null),
      sellerSales: salesBy.get(sellerId) ?? 0,
    })),
    editions,
    moreByAuthor: byAuthor,
    similar: similar.filter((row) => !byAuthor.some((other) => other.id === row.id)),
  };
}

export async function getBookCover(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { coverStoredName: true, coverMimeType: true, coverOriginalName: true },
  });
  if (!book?.coverStoredName || !book.coverMimeType) throw new AppError('این تصویر پیدا نشد.', 404);
  return { storedName: book.coverStoredName, mimeType: book.coverMimeType, originalName: book.coverOriginalName ?? 'cover' };
}

/** A photo of a copy: public when its offer is; the seller and staff always. */
export async function getOfferPhoto(photoId: string, viewer: { userId?: string; staff?: boolean } = {}) {
  const photo = await prisma.bookListingPhoto.findUnique({
    where: { id: photoId },
    select: {
      storedName: true,
      mimeType: true,
      originalName: true,
      listing: { select: { sellerId: true, moderationStatus: true, state: true } },
    },
  });
  if (!photo) throw new AppError('این تصویر پیدا نشد.', 404);
  const live = photo.listing.moderationStatus === 'APPROVED';
  if (!live && !viewer.staff && viewer.userId !== photo.listing.sellerId) throw new AppError('این تصویر پیدا نشد.', 404);
  return { storedName: photo.storedName, mimeType: photo.mimeType, originalName: photo.originalName };
}

// ---------------------------------------------------------------------------
// Purchase requests
// ---------------------------------------------------------------------------

export interface RequestInput {
  quantity: number;
  deliveryMethod: string;
  offeredPrice?: bigint;
  note?: string;
}

export async function createRequest(buyerId: string, offerId: string, input: RequestInput) {
  await assertVerified(buyerId);
  await assertMarketplaceAllowed(buyerId);

  const offer = await prisma.bookListing.findFirst({
    where: { id: offerId, ...PUBLIC_OFFER_WHERE },
    select: {
      id: true,
      sellerId: true,
      title: true,
      price: true,
      currency: true,
      quantity: true,
      negotiable: true,
      deliveryOptions: true,
      shippingCost: true,
      postedByCompany: true,
    },
  });
  if (!offer) throw new AppError('این آگهی پیدا نشد یا دیگر فروشی نیست.', 404);
  if (offer.sellerId === buyerId) throw new AppError('نمی‌توانید کتاب خودتان را بخرید.', 400);
  if (input.quantity > offer.quantity) throw new AppError(`فقط ${offer.quantity} نسخه موجود است.`, 400);
  if (!offer.deliveryOptions.includes(input.deliveryMethod)) {
    throw new AppError('فروشنده این روش تحویل را ارائه نمی‌کند.', 400);
  }
  if (input.offeredPrice !== undefined && !offer.negotiable) {
    throw new AppError('قیمت این آگهی توافقی نیست.', 400);
  }
  const open = await prisma.bookRequest.count({
    where: { listingId: offerId, buyerId, status: { in: ['REQUESTED', 'ACCEPTED'] } },
  });
  if (open > 0) throw new AppError('درخواست قبلی شما برای این کتاب هنوز باز است.', 409);

  const request = await prisma.bookRequest.create({
    data: {
      code: generateTrackingCode(),
      listingId: offerId,
      buyerId,
      sellerId: offer.sellerId,
      quantity: input.quantity,
      deliveryMethod: input.deliveryMethod,
      unitPrice: offer.price,
      shippingCost: input.deliveryMethod === 'IN_PERSON' ? 0n : offer.shippingCost,
      offeredPrice: input.offeredPrice ?? null,
      currency: offer.currency,
      note: input.note ?? null,
    },
    select: { id: true, code: true, status: true },
  });

  notifySafely(offer.sellerId, {
    type: 'book.request',
    title: 'درخواست خرید کتاب',
    body: `کسی می‌خواهد «${offer.title}» را بخرد.`,
    link: '/dashboard/books?tab=requests',
  });
  return request;
}

const REQUEST_SELECT = {
  id: true,
  code: true,
  quantity: true,
  deliveryMethod: true,
  unitPrice: true,
  shippingCost: true,
  offeredPrice: true,
  currency: true,
  note: true,
  status: true,
  respondedAt: true,
  declineReason: true,
  completedAt: true,
  createdAt: true,
  buyerId: true,
  sellerId: true,
  award: { select: { id: true, status: true } },
  listing: {
    select: {
      id: true,
      code: true,
      grade: true,
      city: true,
      province: true,
      photos: { orderBy: { position: 'asc' as const }, take: 1, select: { id: true } },
      book: { select: { id: true, code: true, title: true, authors: true, coverStoredName: true } },
    },
  },
} as const satisfies Prisma.BookRequestSelect;

/** Requests on either side: what I asked to buy, what I was asked to sell. */
export async function listRequests(userId: string, side: 'buyer' | 'seller') {
  const rows = await prisma.bookRequest.findMany({
    where: side === 'buyer' ? { buyerId: userId } : { sellerId: userId },
    orderBy: { createdAt: 'desc' },
    select: REQUEST_SELECT,
  });
  const otherIds = [...new Set(rows.map((row) => (side === 'buyer' ? row.sellerId : row.buyerId)))];
  const [profiles, unread] = await Promise.all([
    authorProfileSummaries(otherIds),
    prisma.marketplaceMessage.groupBy({
      by: ['bookRequestId'],
      where: { bookRequestId: { in: rows.map((row) => row.id) }, senderId: { not: userId }, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const unreadBy = new Map(unread.map((row) => [row.bookRequestId, row._count._all]));
  return rows.map(({ buyerId, sellerId, listing, ...row }) => {
    const photo = listing.photos[0]?.id ?? null;
    const book = listing.book;
    return {
      ...row,
      total: requestTotal(row).toString(),
      listing: {
        id: listing.id,
        code: listing.code,
        grade: listing.grade,
        city: listing.city,
        province: listing.province,
      },
      book: book
        ? {
            id: book.id,
            code: book.code,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverStoredName ? `/bookshop/books/${book.id}/cover` : photo ? `/bookshop/photos/${photo}` : null,
          }
        : null,
      counterparty: profiles.get(side === 'buyer' ? sellerId : buyerId) ?? null,
      unreadMessages: unreadBy.get(row.id) ?? 0,
    };
  });
}

function requestTotal(row: { unitPrice: bigint; offeredPrice: bigint | null; quantity: number; shippingCost: bigint | null }): bigint {
  return (row.offeredPrice ?? row.unitPrice) * BigInt(row.quantity) + (row.shippingCost ?? 0n);
}

async function requireRequest(id: string) {
  const request = await prisma.bookRequest.findUnique({
    where: { id },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      status: true,
      quantity: true,
      unitPrice: true,
      offeredPrice: true,
      shippingCost: true,
      currency: true,
      listingId: true,
      listing: { select: { title: true, quantity: true } },
      award: { select: { id: true } },
    },
  });
  if (!request) throw new AppError('این درخواست پیدا نشد.', 404);
  return request;
}

/**
 * The seller agrees. A contract opens with one hand-over milestone, so the
 * deal shows with every other deal, and both sides can review it at the end.
 */
export async function acceptRequest(sellerId: string, requestId: string) {
  const request = await requireRequest(requestId);
  if (request.sellerId !== sellerId) throw new AppError('این درخواست پیدا نشد.', 404);
  if (request.status !== 'REQUESTED') throw new AppError('به این درخواست پیش‌تر پاسخ داده شده است.', 409);
  if (request.quantity > request.listing.quantity) throw new AppError('موجودی کافی نیست؛ تعداد آگهی را به‌روز کنید.', 409);

  await prisma.$transaction(async (tx) => {
    await tx.bookRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
    const award = await tx.marketplaceAward.create({
      data: {
        bookRequestId: requestId,
        agreedAmount: requestTotal(request),
        currency: request.currency,
        awardedById: request.buyerId,
      },
      select: { id: true },
    });
    await tx.marketplaceMilestone.create({
      data: { awardId: award.id, order: 1, title: 'تحویل کتاب', dueDate: new Date(Date.now() + 7 * 86_400_000) },
    });
  });

  notifySafely(request.buyerId, {
    type: 'book.request.accepted',
    title: 'درخواست خرید شما پذیرفته شد',
    body: `فروشنده «${request.listing.title}» را برای شما کنار گذاشت. جزئیات تحویل را در گفت‌وگو هماهنگ کنید.`,
    link: '/dashboard/book-purchases',
  });
  return { id: requestId, status: 'ACCEPTED' as const };
}

export async function declineRequest(sellerId: string, requestId: string, reason: string) {
  const request = await requireRequest(requestId);
  if (request.sellerId !== sellerId) throw new AppError('این درخواست پیدا نشد.', 404);
  if (request.status !== 'REQUESTED') throw new AppError('به این درخواست پیش‌تر پاسخ داده شده است.', 409);
  const updated = await prisma.bookRequest.update({
    where: { id: requestId },
    data: { status: 'DECLINED', respondedAt: new Date(), declineReason: reason.trim() },
    select: { id: true, status: true },
  });
  notifySafely(request.buyerId, {
    type: 'book.request.declined',
    title: 'درخواست خرید شما پذیرفته نشد',
    body: `«${request.listing.title}» — ${reason.trim()}`,
    link: '/dashboard/book-purchases',
  });
  return updated;
}

/** The buyer withdraws, before the hand-over. An accepted deal's contract is cancelled with it. */
export async function cancelRequest(buyerId: string, requestId: string) {
  const request = await requireRequest(requestId);
  if (request.buyerId !== buyerId) throw new AppError('این درخواست پیدا نشد.', 404);
  if (request.status !== 'REQUESTED' && request.status !== 'ACCEPTED') {
    throw new AppError('این درخواست دیگر قابل لغو نیست.', 409);
  }
  await prisma.$transaction([
    prisma.bookRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED', respondedAt: new Date() } }),
    ...(request.award ? [prisma.marketplaceAward.update({ where: { id: request.award.id }, data: { status: 'CANCELLED' } })] : []),
  ]);
  notifySafely(request.sellerId, {
    type: 'book.request.cancelled',
    title: 'درخواست خرید لغو شد',
    body: `خریدار درخواست «${request.listing.title}» را لغو کرد.`,
    link: '/dashboard/books?tab=requests',
  });
  return { id: requestId, status: 'CANCELLED' as const };
}

/**
 * Handed over. The copies leave the offer's stock (a sold-out offer closes),
 * the contract completes, and both sides are invited to review each other.
 */
export async function completeRequest(sellerId: string, requestId: string) {
  const request = await requireRequest(requestId);
  if (request.sellerId !== sellerId) throw new AppError('این درخواست پیدا نشد.', 404);
  if (request.status !== 'ACCEPTED') throw new AppError('فقط درخواست پذیرفته‌شده را می‌توان تحویل‌شده ثبت کرد.', 409);

  const remaining = Math.max(0, request.listing.quantity - request.quantity);
  const now = new Date();
  await prisma.$transaction([
    prisma.bookRequest.update({ where: { id: requestId }, data: { status: 'COMPLETED', completedAt: now } }),
    prisma.bookListing.update({
      where: { id: request.listingId },
      data: { quantity: remaining, soldCount: { increment: request.quantity }, ...(remaining === 0 ? { state: 'CLOSED' } : {}) },
    }),
    ...(request.award
      ? [
          prisma.marketplaceMilestone.updateMany({
            where: { awardId: request.award.id },
            data: { status: 'APPROVED', deliveredAt: now, approvedAt: now },
          }),
          prisma.marketplaceAward.update({ where: { id: request.award.id }, data: { status: 'COMPLETED', completedAt: now } }),
        ]
      : []),
  ]);

  for (const userId of [request.buyerId, request.sellerId]) {
    notifySafely(userId, {
      type: 'award.completed',
      title: 'معامله انجام شد',
      body: `خرید «${request.listing.title}» کامل شد. حالا می‌توانید به طرف مقابل امتیاز بدهید.`,
      link: '/dashboard/awards',
    });
  }
  return { id: requestId, status: 'COMPLETED' as const };
}

/** Whether this account may read and write a request's thread. */
export async function requireRequestParty(userId: string, requestId: string) {
  const request = await prisma.bookRequest.findUnique({
    where: { id: requestId },
    select: { id: true, buyerId: true, sellerId: true, code: true, listing: { select: { title: true, book: { select: { code: true } } } } },
  });
  if (!request || (request.buyerId !== userId && request.sellerId !== userId)) {
    throw new AppError('این گفت‌وگو پیدا نشد.', 404);
  }
  return request;
}

// ---------------------------------------------------------------------------
// Staff: the catalogue
// ---------------------------------------------------------------------------

export async function listCatalogForStaff(query: { page: number; pageSize: number; search?: string; verified?: string }) {
  const where: Prisma.BookWhereInput = {
    ...(query.verified ? { verified: query.verified === 'true' } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search.toUpperCase() } },
            { isbn: { contains: query.search.replace(/[\s-]/g, '') } },
            { authors: { has: query.search } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ verified: 'asc' }, { updatedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...CATALOG_SELECT,
        subtitle: true,
        printRun: true,
        originalTitle: true,
        originalLanguage: true,
        series: true,
        seriesNumber: true,
        weightGrams: true,
        description: true,
        tags: true,
        createdBy: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { listings: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);
  return toPage(rows.map(presentBookFacts), total, query.page, query.pageSize);
}

/** Staff correct a catalogue entry's facts, and mark it verified. */
export async function updateBookForStaff(bookId: string, input: Partial<BookFacts> & { verified?: boolean }, cover: IncomingFile | null) {
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { coverStoredName: true } });
  if (!book) throw new AppError('این کتاب پیدا نشد.', 404);
  if (input.categoryId) await assertBookCategoryUsable(input.categoryId);
  const { verified, ...facts } = input;
  const stored = cover ? (await storeFiles([cover], IMAGE_EXTENSIONS))[0] : null;
  try {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        ...factsData(facts),
        ...(verified !== undefined ? { verified } : {}),
        ...(stored ? { coverStoredName: stored.storedName, coverOriginalName: stored.originalName, coverMimeType: stored.mimeType } : {}),
      },
    });
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
  if (stored && book.coverStoredName) await removeFile(book.coverStoredName);
  await refreshSearchText(bookId);
  return { id: bookId };
}

/**
 * Two catalogue entries that are the same edition: move every offer to the
 * one kept, and delete the other. What a typo in an ISBN, or a missing one,
 * costs — and the only way to put the copies back on one page.
 */
export async function mergeBooks(keepId: string, dropId: string) {
  if (keepId === dropId) throw new AppError('یک کتاب را نمی‌توان با خودش ادغام کرد.', 400);
  const [keep, drop] = await Promise.all([
    prisma.book.findUnique({ where: { id: keepId }, select: { id: true } }),
    prisma.book.findUnique({ where: { id: dropId }, select: { id: true, coverStoredName: true } }),
  ]);
  if (!keep || !drop) throw new AppError('این کتاب پیدا نشد.', 404);
  await prisma.$transaction([
    prisma.bookListing.updateMany({ where: { bookId: dropId }, data: { bookId: keepId } }),
    prisma.book.delete({ where: { id: dropId } }),
  ]);
  if (drop.coverStoredName) await removeFile(drop.coverStoredName);
  return { id: keepId };
}

/** The offer queue, with the book and the photos a reviewer needs to judge it. */
export async function listOffersForReview(query: { page: number; pageSize: number; search?: string; status?: string }) {
  const where: Prisma.BookListingWhereInput = {
    bookId: { not: null },
    moderationStatus: (query.status as never) ?? 'PENDING_REVIEW',
    ...(query.search
      ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search.toUpperCase() } }] }
      : {}),
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
        grade: true,
        conditionNotes: true,
        price: true,
        currency: true,
        negotiable: true,
        quantity: true,
        deliveryOptions: true,
        shippingCost: true,
        province: true,
        city: true,
        moderationStatus: true,
        submittedAt: true,
        featured: true,
        postedByCompany: true,
        photos: PHOTO_SELECT,
        seller: { select: { id: true, email: true, firstName: true, lastName: true } },
        book: { select: { ...CATALOG_SELECT, _count: { select: { listings: true } } } },
      },
    }),
    prisma.bookListing.count({ where }),
  ]);
  return toPage(
    rows.map((row) => ({ ...row, book: row.book ? presentBookFacts(row.book) : null })),
    total,
    query.page,
    query.pageSize,
  );
}
