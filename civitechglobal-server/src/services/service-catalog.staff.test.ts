import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findFirst: vi.fn() },
    service: { count: vi.fn(async () => 0), create: vi.fn(), findUnique: vi.fn() },
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
  authorProfileSummaries: vi.fn(async () => new Map()),
}));
vi.mock('./work-taxonomy.service.js', () => ({
  assertWorkCategoryUsable: vi.fn(async () => {}),
  workCategoryScope: vi.fn(async (id: string) => [id]),
}));
vi.mock('./project-cards.service.js', () => ({
  freelancerStats: vi.fn(async () => new Map()),
}));
vi.mock('./insurance-request.service.js', () => ({ generateTrackingCode: () => 'SV12345' }));

import { createService, createServiceAsStaff } from './service-catalog.service.js';

/**
 * A service opened from the desk: for a member or the company's counter, with
 * the two member gates — identity verification and the per-account ceiling —
 * replaced by the desk's permission, exactly as the book market does it.
 */

const input = {
  title: 'I will design a modern logo for your brand',
  description: 'x'.repeat(150),
  packages: [
    {
      tier: 'BASIC' as const,
      name: 'Basic',
      description: 'One concept, two revisions.',
      price: 1000n,
      deliveryDays: 3,
      revisions: 2,
      features: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.service.create.mockResolvedValue({ id: 'sv1', code: 'SV12345', moderationStatus: 'DRAFT' });
});

describe('a service created from the desk', () => {
  it('skips verification and the per-account ceiling, and creates a draft for the member', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'member' });

    await createServiceAsStaff('staff', 'member', input, []);

    expect(mocks.assertVerified).not.toHaveBeenCalled();
    expect(mocks.prisma.service.count).not.toHaveBeenCalled();
    expect(mocks.assertMarketplaceAllowed).toHaveBeenCalledWith('member');

    const data = mocks.prisma.service.create.mock.calls[0][0].data;
    expect(data.ownerId).toBe('member');
    expect(data.moderationStatus).toBe('DRAFT');
  });

  it('tells the member a service was opened for them', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'member' });

    await createServiceAsStaff('staff', 'member', input, []);

    expect(mocks.notifySafely).toHaveBeenCalledWith(
      'member',
      expect.objectContaining({ link: '/dashboard/services' })
    );
  });

  it('defaults to the staff member themselves, and tells nobody', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'staff' });

    await createServiceAsStaff('staff', undefined, input, []);

    expect(mocks.prisma.user.findFirst.mock.calls[0][0].where.id).toBe('staff');
    expect(mocks.notifySafely).not.toHaveBeenCalled();
  });

  it('refuses a member that does not exist', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue(null);

    await expect(createServiceAsStaff('staff', 'ghost', input, [])).rejects.toThrow(/پیدا نشد/);
    expect(mocks.prisma.service.create).not.toHaveBeenCalled();
  });

  it('refuses a package set with no Basic, as the seller path does', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'member' });

    await expect(
      createServiceAsStaff('staff', 'member', { ...input, packages: [{ ...input.packages[0], tier: 'PREMIUM' as const }] }, [])
    ).rejects.toThrow(/پایه/);
    expect(mocks.prisma.service.create).not.toHaveBeenCalled();
  });
});

describe("the seller's own path, unchanged", () => {
  it('still requires verification and counts against the ceiling', async () => {
    mocks.assertVerified.mockRejectedValueOnce(new Error('not verified'));

    await expect(createService('member', input, [])).rejects.toThrow('not verified');
    expect(mocks.prisma.service.create).not.toHaveBeenCalled();
  });
});
