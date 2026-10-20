import { describe, expect, it, vi } from 'vitest';

/**
 * A review on a public profile says where its listing is read.
 *
 * The role alone cannot: a service order and a freelance project both read
 * as client and freelancer, so the web and the app, deriving the path from
 * the role, sent every review left on a service to a project page that does
 * not exist.
 */

const rows: Record<string, Record<string, unknown>> = {
  user: {
    findFirst: { id: 'u1', username: 'gulfbridge', headline: null, bio: null, skills: [], website: null, createdAt: new Date(), verification: null },
  },
  marketplaceReview: {
    findMany: ['a-job', 'a-bid', 'a-order', 'a-book', 'a-book-uncoded'].map((awardId) => ({
      rating: 5,
      text: null,
      createdAt: new Date(),
      raterId: 'rater',
      awardId,
    })),
    aggregate: { _avg: { rating: 5 }, _count: { _all: 5 } },
  },
  marketplaceAward: {
    findMany: [
      { id: 'a-job', jobApplicationId: 'app1', projectBidId: null, serviceOrderId: null, bookRequestId: null },
      { id: 'a-bid', jobApplicationId: null, projectBidId: 'bid1', serviceOrderId: null, bookRequestId: null },
      { id: 'a-order', jobApplicationId: null, projectBidId: null, serviceOrderId: 'ord1', bookRequestId: null },
      { id: 'a-book', jobApplicationId: null, projectBidId: null, serviceOrderId: null, bookRequestId: 'req1' },
      { id: 'a-book-uncoded', jobApplicationId: null, projectBidId: null, serviceOrderId: null, bookRequestId: 'req2' },
    ],
  },
  jobApplication: { findMany: [{ id: 'app1', job: { code: 'JOB1', title: 'Job', authorId: 'rater' } }] },
  projectBid: { findMany: [{ id: 'bid1', project: { code: 'PRJ1', title: 'Project', authorId: 'rater' } }] },
  serviceOrder: { findMany: [{ id: 'ord1', buyerId: 'rater', service: { code: 'SRV1', title: 'Service' } }] },
  bookRequest: {
    findMany: [
      { id: 'req1', buyerId: 'rater', listing: { title: 'Book', book: { code: 'BK1' } } },
      { id: 'req2', buyerId: 'rater', listing: { title: 'Uncatalogued book', book: null } },
    ],
  },
};

vi.mock('../config/database.js', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_, model: string) =>
        new Proxy(
          {},
          { get: (__, method: string) => async () => rows[model]?.[method] ?? (method === 'findMany' ? [] : null) },
        ),
    },
  ),
}));

const { getPublicProfile } = await import('./profile.service.js');

describe('public profile reviews', () => {
  it('carry the path of the listing they were left on, for every kind', async () => {
    const profile = await getPublicProfile('gulfbridge');

    expect(profile!.reviews.map((review) => [review.role, review.listingPath])).toEqual([
      ['employer', '/jobs/JOB1'],
      ['client', '/projects/PRJ1'],
      // The same role as a project, which is why the path has to travel.
      ['client', '/freelance-services/SRV1'],
      ['buyer', '/books/BK1'],
      // No code, no page: the title is shown without a link.
      ['buyer', null],
    ]);
  });
});
