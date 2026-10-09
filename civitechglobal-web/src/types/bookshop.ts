import type { AuthorProfile, ListingState, ModerationStatus } from './marketplace';

/** The book market's second generation, as the API returns it. Money is a decimal string. */

export const BOOK_GRADES = ['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE'] as const;
export type BookGrade = (typeof BOOK_GRADES)[number];
export const BOOK_BINDINGS = ['PAPERBACK', 'HARDCOVER', 'SPIRAL', 'BOARD', 'LEATHER', 'OTHER'] as const;
export type BookBinding = (typeof BOOK_BINDINGS)[number];
export const BOOK_TRIM_SIZES = ['POCKET', 'PALTOI', 'ROGHEI', 'VAZIRI', 'KHESHTI', 'RAHLI', 'OTHER'] as const;
export type BookTrimSize = (typeof BOOK_TRIM_SIZES)[number];
export const BOOK_DELIVERY = ['IN_PERSON', 'POST', 'COURIER'] as const;
export type BookDelivery = (typeof BOOK_DELIVERY)[number];
export type YearCalendar = 'SOLAR' | 'GREGORIAN';
export type BookRequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
/** The languages a book on this market is most often in. */
export const BOOK_LANGUAGES = ['fa', 'en', 'ar', 'fr', 'de', 'tr', 'ru', 'es'] as const;

export interface BookCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  parentId: string | null;
  position: number;
  bookCount: number;
}

/** A catalogue entry's headline facts. */
export interface BookFactsSummary {
  id: string;
  code: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  translators: string[];
  publisher: string | null;
  isbn: string | null;
  publishYear: number | null;
  yearCalendar: YearCalendar;
  edition: number | null;
  pageCount: number | null;
  language: string;
  binding: BookBinding | null;
  trimSize: BookTrimSize | null;
  listPrice: string | null;
  currency: string;
  verified: boolean;
  categoryId: string | null;
  coverUrl: string | null;
}

/** A book on the board, summarised from its offers. */
export interface BookCard extends BookFactsSummary {
  viewCount: number;
  category: { id: string; slug: string; name: string; nameEn: string } | null;
  lowestPrice: string;
  offerCount: number;
  copies: number;
  sellerCount: number;
  bestGrade: BookGrade | null;
  discountPercent: number;
  featured: boolean;
  freeShipping: boolean;
  deliveryOptions: BookDelivery[];
  provinces: string[];
  newestOfferAt: string | null;
}

export interface BookOffer {
  id: string;
  code: string;
  grade: BookGrade;
  conditionNotes: string | null;
  price: string;
  currency: string;
  negotiable: boolean;
  quantity: number;
  soldCount: number;
  deliveryOptions: BookDelivery[];
  shippingCost: string | null;
  province: string | null;
  city: string | null;
  postedByCompany: boolean;
  publishedAt: string | null;
  photos: Array<{ id: string; originalName: string }>;
  seller: AuthorProfile | null;
  sellerSales: number;
}

export interface BookStripItem {
  id: string;
  code: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  listPrice: string | null;
  lowestPrice: string | null;
  offerCount: number;
}

export interface BookDetail extends BookFactsSummary {
  printRun: number | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  series: string | null;
  seriesNumber: number | null;
  weightGrams: number | null;
  description: string | null;
  tags: string[];
  viewCount: number;
  createdAt: string;
  category: { id: string; slug: string; name: string; nameEn: string; parentId: string | null } | null;
  lowestPrice: string | null;
  discountPercent: number;
  offers: BookOffer[];
  editions: Array<{
    id: string;
    code: string;
    title: string;
    publisher: string | null;
    translators: string[];
    publishYear: number | null;
    yearCalendar: YearCalendar;
    edition: number | null;
    binding: BookBinding | null;
    trimSize: BookTrimSize | null;
    lowestPrice: string | null;
    offerCount: number;
  }>;
  moreByAuthor: BookStripItem[];
  similar: BookStripItem[];
}

export interface CatalogHit extends BookFactsSummary {
  _count: { listings: number };
}

export interface BookFactsPayload {
  title: string;
  subtitle?: string;
  authors: string[];
  translators: string[];
  publisher?: string;
  isbn?: string;
  publishYear?: string;
  yearCalendar: YearCalendar;
  edition?: string;
  printRun?: string;
  pageCount?: string;
  language: string;
  originalTitle?: string;
  originalLanguage?: string;
  series?: string;
  seriesNumber?: string;
  binding?: BookBinding;
  trimSize?: BookTrimSize;
  weightGrams?: string;
  listPrice?: string;
  currency: string;
  description?: string;
  tags: string[];
  categoryId?: string;
}

export interface OfferPayload {
  bookId?: string;
  book?: BookFactsPayload;
  grade: BookGrade;
  conditionNotes?: string;
  price: string;
  negotiable: boolean;
  quantity: number;
  deliveryOptions: BookDelivery[];
  shippingCost?: string;
  province?: string;
  city?: string;
  removePhotoIds: string[];
}

export interface OwnOffer {
  id: string;
  code: string;
  grade: BookGrade | null;
  conditionNotes: string | null;
  price: string;
  currency: string;
  negotiable: boolean;
  quantity: number;
  soldCount: number;
  deliveryOptions: BookDelivery[];
  shippingCost: string | null;
  province: string | null;
  city: string | null;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  state: ListingState;
  viewCount: number;
  publishedAt: string | null;
  updatedAt: string;
  photos: Array<{ id: string; originalName: string }>;
  book: BookFactsSummary | null;
  requests: Partial<Record<BookRequestStatus, number>>;
}

export interface BookRequestRow {
  id: string;
  code: string;
  quantity: number;
  deliveryMethod: BookDelivery;
  unitPrice: string;
  shippingCost: string | null;
  offeredPrice: string | null;
  currency: string;
  note: string | null;
  status: BookRequestStatus;
  respondedAt: string | null;
  declineReason: string | null;
  completedAt: string | null;
  createdAt: string;
  total: string;
  award: { id: string; status: string } | null;
  listing: { id: string; code: string; grade: BookGrade | null; city: string | null; province: string | null };
  book: { id: string; code: string; title: string; authors: string[]; coverUrl: string | null } | null;
  counterparty: AuthorProfile | null;
  unreadMessages: number;
}

export interface StaffCatalogRow extends BookFactsSummary {
  subtitle: string | null;
  printRun: number | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  series: string | null;
  seriesNumber: number | null;
  weightGrams: number | null;
  description: string | null;
  tags: string[];
  createdBy: { email: string; firstName: string; lastName: string } | null;
  _count: { listings: number };
}

export interface StaffOfferRow {
  id: string;
  code: string;
  grade: BookGrade | null;
  conditionNotes: string | null;
  price: string;
  currency: string;
  negotiable: boolean;
  quantity: number;
  deliveryOptions: BookDelivery[];
  shippingCost: string | null;
  province: string | null;
  city: string | null;
  moderationStatus: ModerationStatus;
  submittedAt: string | null;
  featured: boolean;
  postedByCompany: boolean;
  photos: Array<{ id: string; originalName: string }>;
  seller: { id: string; email: string; firstName: string; lastName: string };
  book: (BookFactsSummary & { _count: { listings: number } }) | null;
}
