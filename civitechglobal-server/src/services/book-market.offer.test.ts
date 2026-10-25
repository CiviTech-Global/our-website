import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ role: 'USER' })) },
    book: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    bookListing: { create: vi.fn(async () => ({ id: 'l1', code: 'C1', moderationStatus: 'DRAFT', bookId: 'b1' })) },
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./attachment.service.js', () => ({
  IMAGE_EXTENSIONS: ['png', 'jpg', 'webp'],
  storeFiles: vi.fn(async () => []),
  removeFile: vi.fn(async () => {}),
}));
vi.mock('./verification.service.js', () => ({
  assertVerified: vi.fn(async () => {}),
  assertMarketplaceAllowed: vi.fn(async () => {}),
}));
vi.mock('./notifications.service.js', () => ({ notifySafely: vi.fn() }));
vi.mock('./profile.service.js', () => ({ authorProfileSummaries: vi.fn(async () => new Map()) }));

const { createOffer } = await import('./book-market.service.js');

describe('a copy for sale', () => {
  beforeEach(() => {
    mocks.prisma.bookListing.create.mockClear();
    mocks.prisma.book.findUnique.mockResolvedValue({ id: 'b1' });
    // An imported book: its cover price is in pounds.
    mocks.prisma.book.findUniqueOrThrow.mockResolvedValue({
      id: 'b1',
      title: 'Cambridge IELTS 18',
      authors: ['Cambridge University Press'],
      description: null,
      publisher: 'Cambridge',
      isbn: null,
      publishYear: 2023,
      language: 'en',
      pageCount: null,
      currency: 'GBP',
    });
  });

  it('is priced in toman, whatever currency the cover price is in', async () => {
    await createOffer(
      'u1',
      {
        bookId: 'b1',
        grade: 'VERY_GOOD',
        price: 750_000n,
        negotiable: false,
        quantity: 1,
        deliveryOptions: ['IN_PERSON'],
      } as never,
      [],
    );
    const data = (mocks.prisma.bookListing.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0]
      .data;
    expect(data.currency).toBe('IRT');
    expect(data.price).toBe(750_000n);
  });
});
