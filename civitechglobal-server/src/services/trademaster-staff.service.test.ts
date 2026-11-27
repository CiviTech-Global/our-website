import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    business: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { findFirst: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn() },
  },
  assertVerified: vi.fn(async () => {}),
  assertMarketplaceAllowed: vi.fn(async () => {}),
  notifySafely: vi.fn(),
  storeFiles: vi.fn(async () => []),
  removeFile: vi.fn(async () => {}),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
// Plan limits have their own suite (billing/*.test.ts); here they always allow.
vi.mock('./billing/gates.js', () => ({ assertRoomFor: async () => undefined, chargeUser: async () => undefined }));
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
  authorProfileSummary: vi.fn(async () => null),
  authorProfileSummaries: vi.fn(async () => new Map()),
}));
vi.mock('./insurance-request.service.js', () => ({ generateTrackingCode: () => 'TM12345' }));

import { transferShopOwnership } from './trademaster-shop.service.js';
import { createProductAsStaff } from './trademaster-product.service.js';

/**
 * The desk's powers over a shop it did not open as a member: handing it to its
 * real owner, and listing stock in it without signing in as anybody.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transferring a shop to its real owner', () => {
  const shop = { id: 's1', name: 'فروشگاه مرکزی', ownerId: 'old-owner' };

  it('refuses a shop that does not exist', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    await expect(transferShopOwnership('missing', 'u2')).rejects.toThrow(/پیدا نشد/);
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });

  it('refuses to transfer to the owner the shop already has', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(shop);

    await expect(transferShopOwnership('s1', 'old-owner')).rejects.toThrow(/مالک/);
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });

  it('refuses a member that does not exist', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(shop);
    mocks.prisma.user.findFirst.mockResolvedValue(null);

    await expect(transferShopOwnership('s1', 'ghost')).rejects.toThrow(/پیدا نشد/);
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });

  it('moves only the owner, and tells both sides', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(shop);
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'new-owner' });
    mocks.prisma.business.update.mockResolvedValue({ id: 's1', code: 'TM12345', ownerId: 'new-owner' });

    const result = await transferShopOwnership('s1', 'new-owner');

    const data = mocks.prisma.business.update.mock.calls[0][0].data;
    // openedById stays as the record of who opened the shop; nothing else moves.
    expect(data).toEqual({ ownerId: 'new-owner' });
    expect(result.ownerId).toBe('new-owner');
    expect(mocks.notifySafely).toHaveBeenCalledWith(
      'new-owner',
      expect.objectContaining({ link: '/dashboard/shops' })
    );
    expect(mocks.notifySafely).toHaveBeenCalledWith(
      'old-owner',
      expect.objectContaining({ link: '/dashboard/shops' })
    );
  });

  it('does not hand a shop to a member whose market access is paused', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(shop);
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'new-owner' });
    mocks.assertMarketplaceAllowed.mockRejectedValueOnce(new Error('paused'));

    await expect(transferShopOwnership('s1', 'new-owner')).rejects.toThrow('paused');
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });
});

describe('a listing created from the desk', () => {
  const shop = { id: 's1', ownerId: 'owner', moderationStatus: 'APPROVED', state: 'OPEN' };
  const input = {
    kind: 'PRODUCT' as const,
    title: 'A blue ceramic mug',
    summary: 'Hand-thrown, holds a full tea glass.',
    price: 250_000n,
  };

  beforeEach(() => {
    mocks.prisma.business.findFirst.mockResolvedValue(shop);
    mocks.prisma.product.findFirst.mockResolvedValue(null);
    mocks.prisma.product.create.mockResolvedValue({
      id: 'p1',
      code: 'TM12345',
      slug: 'a-blue-ceramic-mug',
      moderationStatus: 'DRAFT',
    });
  });

  it('refuses a shop that does not exist', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(null);

    await expect(createProductAsStaff('missing', input)).rejects.toThrow(/پیدا نشد/);
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it('applies the shop-state rules exactly as the seller path does', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue({ ...shop, moderationStatus: 'PENDING_REVIEW' });
    await expect(createProductAsStaff('s1', input)).rejects.toThrow(/تأیید/);

    mocks.prisma.business.findFirst.mockResolvedValue({ ...shop, state: 'CLOSED' });
    await expect(createProductAsStaff('s1', input)).rejects.toThrow(/بسته/);

    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it('creates a draft without asking anybody to verify their identity', async () => {
    await createProductAsStaff('s1', input);

    expect(mocks.assertVerified).not.toHaveBeenCalled();
    // The shop owner's market access is what is checked, not the staff member's.
    expect(mocks.assertMarketplaceAllowed).toHaveBeenCalledWith('owner');

    const data = mocks.prisma.product.create.mock.calls[0][0].data;
    expect(data.businessId).toBe('s1');
    expect(data.moderationStatus).toBe('DRAFT');
  });
});
