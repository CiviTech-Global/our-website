import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The values the public boards' filters may offer.
 *
 * Province and trade are free text on the shop form, so the options can only
 * come from what shops have really written. Two properties matter: no option
 * may come from a shop the public cannot see — it would appear in a dropdown
 * and then find nothing — and blanks must not become an empty option.
 */

const mocks = vi.hoisted(() => ({
  prisma: { business: { findMany: vi.fn(async () => []) } },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));

const { listFacets } = await import('./trademaster-shop.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the board filters', () => {
  it('asks only for shops the public can see', async () => {
    await listFacets();

    const { where } = mocks.prisma.business.findMany.mock.calls[0][0];
    // A trade that exists only in somebody's unapproved draft is not an option.
    expect(where).toEqual({ moderationStatus: 'APPROVED', state: 'OPEN' });
  });

  it('drops blanks and whitespace rather than offering an empty option', async () => {
    mocks.prisma.business.findMany.mockResolvedValue([
      { province: 'قزوین', industry: 'کتاب و نشر' },
      { province: null, industry: '   ' },
      { province: '', industry: 'صنایع دستی' },
    ]);

    const facets = await listFacets();

    expect(facets.provinces).toEqual(['قزوین']);
    expect(facets.industries).toEqual(['صنایع دستی', 'کتاب و نشر']);
  });

  it('says each value once, however many shops share it', async () => {
    mocks.prisma.business.findMany.mockResolvedValue([
      { province: 'قزوین', industry: 'مواد غذایی' },
      { province: 'قزوین', industry: 'مواد غذایی' },
      { province: 'تهران', industry: 'مواد غذایی' },
    ]);

    const facets = await listFacets();

    // distinct on the query is over the PAIR, so the same province still
    // arrives several times whenever its shops differ by trade.
    expect(facets.provinces).toEqual(['تهران', 'قزوین']);
    expect(facets.industries).toEqual(['مواد غذایی']);
  });

  it('is empty rather than absent when there are no shops', async () => {
    mocks.prisma.business.findMany.mockResolvedValue([]);

    // The boards hide a filter with fewer than two options, so this has to be
    // a list to count, not undefined to guard against.
    await expect(listFacets()).resolves.toEqual({ provinces: [], industries: [] });
  });
});
