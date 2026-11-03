import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    jobPost: { findMany: vi.fn(async () => []) },
    freelanceProject: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./profile.service.js', () => ({ authorProfileSummaries: vi.fn(async () => new Map()) }));
vi.mock('./job-cards.service.js', () => ({
  JOB_CARD_SELECT: { code: true },
  presentJobCards: vi.fn(async (rows: unknown[]) => rows),
}));

import { getFeatured } from './marketplace-board.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('featured listings', () => {
  it('read what a project card needs to say about its price', async () => {
    await getFeatured();

    // Without pricingType the app shows an hourly rate as a fixed price, and
    // without urgent it drops the badge the board shows.
    for (const [args] of mocks.prisma.freelanceProject.findMany.mock.calls as unknown as Array<
      [{ select: Record<string, unknown> }]
    >) {
      expect(args.select).toMatchObject({ pricingType: true, urgent: true, featured: true });
    }
    expect(mocks.prisma.freelanceProject.findMany).toHaveBeenCalled();
  });
});
