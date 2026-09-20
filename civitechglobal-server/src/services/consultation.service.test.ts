import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * What a consultation request accepts, refuses, and shows back.
 *
 * The rules worth pinning are about time and about privacy: a window that has
 * already gone is not availability, and the person holding a tracking code is
 * shown their own request without our notes about them in it.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    consultationRequest: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    expert: { findFirst: vi.fn() },
  },
  notify: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./insurance-request.service.js', () => ({ generateTrackingCode: () => 'CN12345678' }));

const { cancelRequest, createRequest, trackRequest, updateForStaff } = await import(
  './consultation.service.js'
);

const NOW = new Date('2026-09-20T18:00:00Z');

const base = {
  fullName: '  Ali Rezaei ',
  phone: '09120000001',
  topic: 'CAREER' as const,
  availability: [{ day: '2026-09-22', part: 'MORNING' as const }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.consultationRequest.create.mockResolvedValue({
    id: 'r1',
    trackingCode: 'CN12345678',
    createdAt: NOW,
  });
});

describe('asking for a consultation', () => {
  it('issues a tracking code, because there is no other way back to it', async () => {
    const result = await createRequest(base, NOW);

    expect(result.trackingCode).toBe('CN12345678');
    expect(mocks.prisma.consultationRequest.create.mock.calls[0][0].data.fullName).toBe('Ali Rezaei');
  });

  it('stores each window it was given', async () => {
    await createRequest(
      {
        ...base,
        availability: [
          { day: '2026-09-22', part: 'MORNING' },
          { day: '2026-09-23', part: 'EVENING' },
        ],
      },
      NOW,
    );

    const created = mocks.prisma.consultationRequest.create.mock.calls[0][0].data.availability.create;
    expect(created).toHaveLength(2);
    expect(created[0].part).toBe('MORNING');
  });

  it('refuses a day that has already gone', async () => {
    await expect(
      createRequest({ ...base, availability: [{ day: '2026-09-19', part: 'MORNING' }] }, NOW),
    ).rejects.toThrow(/گذشته/);
  });

  it('accepts today, which is a sensible thing to say at six in the evening', async () => {
    await expect(
      createRequest({ ...base, availability: [{ day: '2026-09-20', part: 'EVENING' }] }, NOW),
    ).resolves.toMatchObject({ trackingCode: 'CN12345678' });
  });

  it('insists on at least one window, and caps how many', async () => {
    await expect(createRequest({ ...base, availability: [] }, NOW)).rejects.toThrow(/حداقل/);

    const many = Array.from({ length: 7 }, (_, i) => ({
      day: `2026-09-2${i + 1}`,
      part: 'MORNING' as const,
    }));
    await expect(createRequest({ ...base, availability: many }, NOW)).rejects.toThrow(/حداکثر/);
  });

  it('refuses the same window twice rather than letting the index do it', async () => {
    await expect(
      createRequest(
        {
          ...base,
          availability: [
            { day: '2026-09-22', part: 'MORNING' },
            { day: '2026-09-22', part: 'MORNING' },
          ],
        },
        NOW,
      ),
    ).rejects.toThrow(/تکراری/);
  });

  it('refuses a named expert who does not take appointments', async () => {
    mocks.prisma.expert.findFirst.mockResolvedValue(null);

    await expect(createRequest({ ...base, expertSlug: 'someone' }, NOW)).rejects.toThrow(/در دسترس/);
    expect(mocks.prisma.consultationRequest.create).not.toHaveBeenCalled();
  });

  it('records a named expert who does', async () => {
    mocks.prisma.expert.findFirst.mockResolvedValue({ id: 'e1' });

    await createRequest({ ...base, expertSlug: 'sara' }, NOW);

    expect(mocks.prisma.consultationRequest.create.mock.calls[0][0].data.expertId).toBe('e1');
  });
});

describe('what the tracking code shows', () => {
  it('shows the request without our notes about the person', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({
      trackingCode: 'CN12345678',
      fullName: 'Ali',
      topic: 'CAREER',
      preferredMode: 'ONLINE',
      status: 'CONTACTED',
      scheduledAt: null,
      createdAt: NOW,
      expert: null,
      availability: [{ day: new Date('2026-09-22T00:00:00Z'), part: 'MORNING' }],
    });

    const tracked = await trackRequest('cn12345678');

    expect(tracked.status).toBe('CONTACTED');
    expect(tracked.availability[0].day).toBe('2026-09-22');
    // The selection is the guard: a staff note or an assignee must not be
    // reachable through a code anybody could be holding.
    const selected = mocks.prisma.consultationRequest.findUnique.mock.calls[0][0].select;
    expect(selected.staffNote).toBeUndefined();
    expect(selected.assignedTo).toBeUndefined();
  });

  it('is not case-sensitive about the code', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue(null);

    await expect(trackRequest(' cn12345678 ')).rejects.toThrow(/پیدا نشد/);
    expect(mocks.prisma.consultationRequest.findUnique.mock.calls[0][0].where.trackingCode).toBe(
      'CN12345678',
    );
  });
});

describe('cancelling', () => {
  it('refuses to cancel a conversation that already happened', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'COMPLETED' });

    await expect(cancelRequest('CN12345678')).rejects.toThrow(/برگزار/);
    expect(mocks.prisma.consultationRequest.update).not.toHaveBeenCalled();
  });

  it('says so rather than cancelling twice', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'CANCELLED' });

    await expect(cancelRequest('CN12345678')).rejects.toThrow(/پیش‌تر/);
  });
});

describe('the queue', () => {
  it('stamps when we first picked it up, and never restamps it', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'NEW',
      contactedAt: null,
    });
    mocks.prisma.consultationRequest.update.mockResolvedValue({ id: 'r1', status: 'CONTACTED' });

    await updateForStaff('r1', { status: 'CONTACTED' }, 'staff-1');
    expect(mocks.prisma.consultationRequest.update.mock.calls[0][0].data.contactedAt).toBeInstanceOf(Date);

    // Already stamped: moving it on again must not rewrite when we answered.
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'CONTACTED',
      contactedAt: NOW,
    });
    await updateForStaff('r1', { status: 'SCHEDULED' }, 'staff-1');
    expect(mocks.prisma.consultationRequest.update.mock.calls[1][0].data.contactedAt).toBeUndefined();
  });

  it('claims the request for whoever moved it', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'NEW',
      contactedAt: null,
    });
    mocks.prisma.consultationRequest.update.mockResolvedValue({ id: 'r1', status: 'CONTACTED' });

    await updateForStaff('r1', { status: 'CONTACTED' }, 'staff-1');

    expect(mocks.prisma.consultationRequest.update.mock.calls[0][0].data.assignedToId).toBe('staff-1');
  });

  it('refuses a time that is not a time', async () => {
    mocks.prisma.consultationRequest.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'NEW',
      contactedAt: null,
    });

    await expect(
      updateForStaff('r1', { scheduledAt: 'next tuesday' }, 'staff-1'),
    ).rejects.toThrow(/معتبر/);
  });
});
