import { describe, expect, it, vi } from 'vitest';

/**
 * The dashboard sidebar follows which parts a member uses: a member who has
 * only a job alert and a book for sale sees job search and books, and the
 * rest waits under "More". Pinned here because a wrong area is a section
 * that disappears from somebody's sidebar.
 */

const counts: Record<string, number> = {};

vi.mock('../config/database.js', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_, model) => ({
        count: async () => counts[String(model)] ?? 0,
        findMany: async () => [],
      }),
    },
  ),
}));

const { getAreas } = await import('./workspace.service.js');

describe('the member areas', () => {
  it('marks only what the member has touched', async () => {
    Object.assign(counts, { jobAlert: 1, bookListing: 2 });
    expect(await getAreas('u1')).toEqual({
      hiring: false,
      jobSearch: true,
      client: false,
      freelance: false,
      collaborations: false,
      shops: false,
      books: true,
      buying: false,
      expert: false,
    });
  });

  it('counts a company page as hiring, and a book bought as buying', async () => {
    for (const key of Object.keys(counts)) delete counts[key];
    Object.assign(counts, { company: 1, bookRequest: 1 });
    const areas = await getAreas('u1');
    expect(areas.hiring).toBe(true);
    expect(areas.buying).toBe(true);
    expect(areas.books).toBe(false);
  });
});
