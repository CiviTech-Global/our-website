import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const bookListing = {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  };
  return {
    prisma: { bookListing, user: { findUnique: vi.fn() } },
    storeFiles: vi.fn(async () => [
      { storedName: 'abc.webp', originalName: 'cover.webp', mimeType: 'image/webp', sizeBytes: 1000 },
    ]),
    removeFile: vi.fn(async () => {}),
    assertVerified: vi.fn(async () => {}),
    assertMarketplaceAllowed: vi.fn(async () => {}),
    notifySafely: vi.fn(),
    authorProfileSummary: vi.fn(async () => ({ username: 'seller', headline: null, verified: true })),
    authorProfileSummaries: vi.fn(async () => new Map()),
  };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./attachment.service.js', () => ({
  IMAGE_EXTENSIONS: ['png', 'jpg', 'webp'],
  storeFiles: mocks.storeFiles,
  removeFile: mocks.removeFile,
}));
vi.mock('./verification.service.js', () => ({
  assertVerified: mocks.assertVerified,
  assertMarketplaceAllowed: mocks.assertMarketplaceAllowed,
}));
vi.mock('./notifications.service.js', () => ({ notifySafely: mocks.notifySafely }));
vi.mock('./profile.service.js', () => ({
  authorProfileSummary: mocks.authorProfileSummary,
  authorProfileSummaries: mocks.authorProfileSummaries,
}));
vi.mock('./insurance-request.service.js', () => ({ generateTrackingCode: () => 'BK12345' }));

import {
  createBook,
  getPublicBook,
  listPublicBooks,
  reviewBook,
  submitBook,
  updateBook,
} from './books.service.js';

const input = {
  title: '  The Hobbit  ',
  bookAuthor: ' J. R. R. Tolkien ',
  description: 'A clean paperback, spine uncreased.',
  condition: 'USED' as const,
  price: 250_000n,
};

const cover = { originalName: 'cover.webp', buffer: Buffer.from('fake') };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.bookListing.create.mockResolvedValue({ id: 'b1', code: 'BK12345', moderationStatus: 'DRAFT' });
  mocks.prisma.bookListing.update.mockResolvedValue({ id: 'b1', moderationStatus: 'PENDING_REVIEW' });
  mocks.prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
});

describe('creating a listing', () => {
  it('requires verification before anything is stored', async () => {
    mocks.assertVerified.mockRejectedValueOnce(new Error('not verified'));

    await expect(createBook('u1', input, cover)).rejects.toThrow('not verified');
    expect(mocks.storeFiles).not.toHaveBeenCalled();
    expect(mocks.prisma.bookListing.create).not.toHaveBeenCalled();
  });

  it('trims what it stores and starts as a draft', async () => {
    await createBook('u1', input, cover);

    const data = mocks.prisma.bookListing.create.mock.calls[0][0].data;
    expect(data.title).toBe('The Hobbit');
    expect(data.bookAuthor).toBe('J. R. R. Tolkien');
    expect(data.moderationStatus).toBe('DRAFT');
    expect(data.coverStoredName).toBe('abc.webp');
  });

  it('marks a staff listing as the company speaking', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

    await createBook('admin', input, cover);

    expect(mocks.prisma.bookListing.create.mock.calls[0][0].data.postedByCompany).toBe(true);
  });

  it('does not take a seller at their word about being the company', async () => {
    await createBook('u1', { ...input, postedByCompany: true } as never, cover);

    expect(mocks.prisma.bookListing.create.mock.calls[0][0].data.postedByCompany).toBe(false);
  });

  it('deletes the uploaded cover when the insert fails', async () => {
    mocks.prisma.bookListing.create.mockRejectedValueOnce(new Error('constraint'));

    await expect(createBook('u1', input, cover)).rejects.toThrow('constraint');
    expect(mocks.removeFile).toHaveBeenCalledWith('abc.webp');
  });

  it('rejects a price no book has', async () => {
    await expect(createBook('u1', { ...input, price: 2_000_000_000n }, cover)).rejects.toThrow(/معتبر/);
    await expect(createBook('u1', { ...input, price: -1n }, cover)).rejects.toThrow(/منفی/);
  });

  it('stores an ISBN as digits, however it was typed', async () => {
    await createBook('u1', { ...input, isbn: '978-0-261-10221-4' }, cover);

    expect(mocks.prisma.bookListing.create.mock.calls[0][0].data.isbn).toBe('9780261102214');
  });

  it('refuses an ISBN of the wrong length', async () => {
    await expect(createBook('u1', { ...input, isbn: '12345' }, cover)).rejects.toThrow(/شابک/);
  });
});

describe('editing and submitting', () => {
  it('refuses an edit once it is in the queue', async () => {
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      moderationStatus: 'PENDING_REVIEW',
      coverStoredName: 'old.webp',
    });

    await expect(updateBook('u1', 'b1', { title: 'New' }, null)).rejects.toThrow(/ویرایش/);
  });

  it('replaces the old cover only after the row points at the new one', async () => {
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      moderationStatus: 'DRAFT',
      coverStoredName: 'old.webp',
    });
    const order: string[] = [];
    mocks.prisma.bookListing.update.mockImplementationOnce(async () => {
      order.push('update');
      return { id: 'b1', code: 'BK1', moderationStatus: 'DRAFT' };
    });
    mocks.removeFile.mockImplementationOnce(async () => {
      order.push('remove');
    });

    await updateBook('u1', 'b1', { title: 'New' }, cover);

    expect(order).toEqual(['update', 'remove']);
  });

  it('will not submit a listing with no cover', async () => {
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      moderationStatus: 'DRAFT',
      coverStoredName: null,
    });

    await expect(submitBook('u1', 'b1')).rejects.toThrow(/تصویر جلد/);
    expect(mocks.prisma.bookListing.update).not.toHaveBeenCalled();
  });

  it('submits a draft that has one', async () => {
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      moderationStatus: 'DRAFT',
      coverStoredName: 'abc.webp',
    });

    await submitBook('u1', 'b1');

    expect(mocks.prisma.bookListing.update.mock.calls[0][0].data.moderationStatus).toBe('PENDING_REVIEW');
  });
});

describe('the public market', () => {
  it('searches the title and the author, never the description', async () => {
    await listPublicBooks({ search: 'hobbit', page: 1, pageSize: 20 });

    const where = mocks.prisma.bookListing.findMany.mock.calls[0][0].where;
    const fields = where.AND[1].OR.map((clause: Record<string, unknown>) => Object.keys(clause)[0]);
    expect(fields).toEqual(['title', 'bookAuthor']);
  });

  it('shows only approved, open listings', async () => {
    await listPublicBooks({ page: 1, pageSize: 20 });

    expect(mocks.prisma.bookListing.findMany.mock.calls[0][0].where.AND[0]).toMatchObject({
      moderationStatus: 'APPROVED',
      state: 'OPEN',
    });
  });

  it('gives a company listing no personal seller profile', async () => {
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      id: 'b1',
      code: 'BK1',
      title: 'The Hobbit',
      postedByCompany: true,
      coverStoredName: 'abc.webp',
      sellerId: 'admin',
    });

    const book = await getPublicBook('bk1');

    expect(book.sellerProfile).toBeNull();
    expect(mocks.authorProfileSummary).not.toHaveBeenCalled();
    expect(book.coverUrl).toBe('/market/books/b1/cover');
  });

  it('counts the read without letting a failed counter fail the read', async () => {
    mocks.prisma.bookListing.updateMany.mockRejectedValueOnce(new Error('deadlock'));
    mocks.prisma.bookListing.findFirst.mockResolvedValue({
      id: 'b1',
      code: 'BK1',
      postedByCompany: false,
      coverStoredName: null,
      sellerId: 'u1',
    });

    await expect(getPublicBook('BK1')).resolves.toMatchObject({ code: 'BK1' });
  });
});

describe('review', () => {
  it('tells the seller what was decided', async () => {
    mocks.prisma.bookListing.findUnique.mockResolvedValue({
      id: 'b1',
      sellerId: 'u1',
      title: 'The Hobbit',
      moderationStatus: 'PENDING_REVIEW',
      publishedAt: null,
    });

    await reviewBook('b1', 'APPROVED', { userId: 'admin' }, {});

    expect(mocks.notifySafely).toHaveBeenCalledWith('u1', expect.objectContaining({ link: '/dashboard/books' }));
    expect(mocks.prisma.bookListing.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('refuses to review something never submitted', async () => {
    mocks.prisma.bookListing.findUnique.mockResolvedValue({
      id: 'b1',
      sellerId: 'u1',
      title: 'Draft',
      moderationStatus: 'DRAFT',
      publishedAt: null,
    });

    await expect(reviewBook('b1', 'APPROVED', { userId: 'admin' }, {})).rejects.toThrow(/ارسال نشده/);
  });

  it('insists on a reason for anything that is not a yes', async () => {
    mocks.prisma.bookListing.findUnique.mockResolvedValue({
      id: 'b1',
      sellerId: 'u1',
      title: 'The Hobbit',
      moderationStatus: 'PENDING_REVIEW',
      publishedAt: null,
    });

    await expect(reviewBook('b1', 'REJECTED', { userId: 'admin' }, {})).rejects.toThrow(/توضیح/);
  });
});
