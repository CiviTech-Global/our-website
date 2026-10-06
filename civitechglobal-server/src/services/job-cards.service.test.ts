import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The facts a job card carries are counted once per list, and mean the same
 * as on the pages that explain them: "responsive" is the company page's rule,
 * "reviewing now" is an employer who opened applications this week, and the
 * applicant count leaves out withdrawn applications.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    jobApplication: { groupBy: vi.fn(), findMany: vi.fn() },
  },
  profiles: vi.fn(async () => new Map([['emp1', { username: 'acme' }]])),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./profile.service.js', () => ({ authorProfileSummaries: mocks.profiles }));

const { presentJobCards } = await import('./job-cards.service.js');

const row = (id: string, authorId: string) =>
  ({
    id,
    code: id.toUpperCase(),
    title: 'Developer',
    authorId,
    company: { id: 'c1', slug: 'acme', name: 'Acme', logoStoredName: null, hidden: false },
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('presentJobCards', () => {
  it('adds the counted facts in one batch, not per card', async () => {
    mocks.prisma.jobApplication.groupBy
      .mockResolvedValueOnce([{ jobId: 'j1', _count: { _all: 12 } }])
      .mockResolvedValueOnce([{ jobId: 'j2', _count: { _all: 1 } }]);
    // emp1 answered 4 of 4; emp2 answered 1 of 4.
    mocks.prisma.jobApplication.findMany.mockResolvedValue([
      ...Array.from({ length: 4 }, () => ({ employerSeenAt: new Date(), outcome: 'PENDING', job: { authorId: 'emp1' } })),
      { employerSeenAt: new Date(), outcome: 'PENDING', job: { authorId: 'emp2' } },
      ...Array.from({ length: 3 }, () => ({ employerSeenAt: null, outcome: 'PENDING', job: { authorId: 'emp2' } })),
    ]);

    const cards = await presentJobCards([row('j1', 'emp1'), row('j2', 'emp2')]);

    expect(mocks.prisma.jobApplication.groupBy).toHaveBeenCalledTimes(2);
    expect(cards[0]).toMatchObject({ applicantCount: 12, reviewingNow: false, responsiveEmployer: true });
    expect(cards[1]).toMatchObject({ applicantCount: 0, reviewingNow: true, responsiveEmployer: false });
    expect(cards[0].company).toEqual({ slug: 'acme', name: 'Acme', logoUrl: null });
    expect(cards[0]).not.toHaveProperty('authorId');
  });

  it('counts only applications still standing', async () => {
    mocks.prisma.jobApplication.groupBy.mockResolvedValue([]);
    mocks.prisma.jobApplication.findMany.mockResolvedValue([]);
    await presentJobCards([row('j1', 'emp1')]);
    const [countQuery] = mocks.prisma.jobApplication.groupBy.mock.calls[0];
    expect(countQuery.where).toMatchObject({ moderationStatus: 'APPROVED', outcome: { not: 'WITHDRAWN' } });
  });

  it('hides the company of a page staff took down', async () => {
    mocks.prisma.jobApplication.groupBy.mockResolvedValue([]);
    mocks.prisma.jobApplication.findMany.mockResolvedValue([]);
    const hidden = { ...(row('j1', 'emp1') as object), company: { id: 'c1', slug: 'x', name: 'X', logoStoredName: null, hidden: true } };
    const [card] = await presentJobCards([hidden as never]);
    expect(card.company).toBeNull();
  });
});
