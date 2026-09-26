import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const count = () => vi.fn(async () => 3);
  const list = () => vi.fn(async () => []);
  const model = () => ({ count: count(), findMany: list() });

  const prisma = {
    user: { findUnique: vi.fn(), count: count() },
    projectRequest: model(),
    resumeSubmission: model(),
    insuranceRequest: model(),
    contactMessage: model(),
    userVerification: model(),
    jobPost: model(),
    jobApplication: model(),
    freelanceProject: model(),
    projectBid: model(),
    bookListing: model(),
    consultationRequest: model(),
    marketplaceAward: model(),
    showcaseOrganization: model(),
    showcaseProject: model(),
    business: model(),
    product: model(),
  };
  return { prisma };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));

import { buildTrend, getWorkload } from './workload.service.js';

const staff = { userId: 'u1', role: 'ADMIN' as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workload scoping', () => {
  it('reports only the queues an admin was granted', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ permissions: ['resumes'], adminRole: null });

    const workload = await getWorkload(staff);

    expect(Object.keys(workload.queues).sort()).toEqual(['programme', 'resumes']);
    // Not merely hidden from the answer: a desk the caller cannot open is not
    // queried at all, so its size cannot leak through timing or an error.
    expect(mocks.prisma.projectRequest.count).not.toHaveBeenCalled();
    expect(mocks.prisma.contactMessage.count).not.toHaveBeenCalled();
    expect(workload.users).toBeUndefined();
    expect(workload.showcase).toBeUndefined();
  });

  it('adds the grants that come from a role bundle', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      permissions: ['messages'],
      adminRole: { permissions: ['verification'] },
    });

    const workload = await getWorkload(staff);

    expect(Object.keys(workload.queues).sort()).toEqual(['messages', 'verification']);
  });

  it('gives an admin with nothing granted an empty workload, not an error', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ permissions: [], adminRole: null });

    const workload = await getWorkload(staff);

    expect(workload.queues).toEqual({});
    expect(workload.recent).toEqual([]);
    expect(workload.permissions).toEqual([]);
  });

  it('ignores a stored permission that is not in the catalogue', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ permissions: ['everything', 'jobs'], adminRole: null });

    const workload = await getWorkload(staff);

    expect(workload.permissions).toEqual(['jobs']);
  });

  it('shows a super admin every queue without looking up grants', async () => {
    const workload = await getWorkload({ userId: 'root', role: 'SUPER_ADMIN' });

    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    // Every key in the union, so adding a queue without giving a super admin
    // access to it fails here. A bare length was what this asserted before and
    // it only said "fifteen of something".
    expect(Object.keys(workload.queues).sort()).toEqual(
      [
        'applications',
        'bids',
        'books',
        'consultations',
        'disputes',
        'freelanceProjects',
        'insurance',
        'jobPosts',
        'messages',
        'programme',
        'projects',
        'resumes',
        'tradeMasterProducts',
        'tradeMasterShops',
        'verification',
      ].sort()
    );
    expect(workload.users).toBeDefined();
    expect(workload.showcase).toBeDefined();
  });
});

describe('arrivals trend', () => {
  const now = new Date('2026-09-17T15:00:00Z');

  it('covers fourteen days ending today, oldest first', () => {
    const trend = buildTrend([], now);
    expect(trend).toHaveLength(14);
    expect(trend[0].day).toBe('2026-09-04');
    expect(trend[13].day).toBe('2026-09-17');
  });

  it('counts arrivals into their day and fills quiet days with zero', () => {
    const trend = buildTrend(
      [new Date('2026-09-17T01:00:00Z'), new Date('2026-09-17T23:00:00Z'), new Date('2026-09-15T12:00:00Z')],
      now,
    );
    const byDay = Object.fromEntries(trend.map((point) => [point.day, point.count]));

    expect(byDay['2026-09-17']).toBe(2);
    expect(byDay['2026-09-15']).toBe(1);
    // A gap in the series would read as the line carrying on through it.
    expect(byDay['2026-09-16']).toBe(0);
  });
});
