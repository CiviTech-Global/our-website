import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Codes on an account: only real ones, shaped like codes, and never more than
 * the cap. The state comes from the same lookup the public tracking page uses.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    trackedRequest: {
      count: vi.fn(async () => 0),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async (args: { create: unknown }) => args.create),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insurance: vi.fn(),
  project: vi.fn(),
  resume: vi.fn(),
  consultation: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./insurance-request.service.js', () => ({ trackRequest: mocks.insurance }));
vi.mock('./project-request.service.js', () => ({ trackRequest: mocks.project }));
vi.mock('./resume-submission.service.js', () => ({ trackResume: mocks.resume }));
vi.mock('./consultation.service.js', () => ({ trackRequest: mocks.consultation }));

const { listTrackedForUser, lookupTrackingCode, trackForUser } = await import('./tracking.service.js');

const miss = () => Promise.reject(new Error('not found'));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insurance.mockImplementation(miss);
  mocks.project.mockImplementation(miss);
  mocks.resume.mockImplementation(miss);
  mocks.consultation.mockImplementation(miss);
});

describe('lookupTrackingCode', () => {
  it('names the intake that issued the code', async () => {
    mocks.project.mockResolvedValue({ status: 'IN_REVIEW' });
    await expect(lookupTrackingCode('PRJ123')).resolves.toEqual({ kind: 'project', status: 'IN_REVIEW' });
  });

  it('is null when no intake knows the code', async () => {
    await expect(lookupTrackingCode('NOPE123')).resolves.toBeNull();
  });
});

describe('trackForUser', () => {
  it('keeps a real code, uppercased', async () => {
    mocks.resume.mockResolvedValue({ status: 'RECEIVED' });
    const saved = await trackForUser('u1', ' abc123 ', 'My CV');
    expect(saved).toMatchObject({ userId: 'u1', code: 'ABC123', label: 'My CV' });
  });

  it('refuses a code nobody issued', async () => {
    await expect(trackForUser('u1', 'ABC123')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses something that is not shaped like a code', async () => {
    await expect(trackForUser('u1', 'ab')).rejects.toMatchObject({ statusCode: 400 });
    await expect(trackForUser('u1', 'abc 123 <x>')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses past the cap', async () => {
    mocks.resume.mockResolvedValue({ status: 'RECEIVED' });
    mocks.prisma.trackedRequest.count.mockResolvedValueOnce(50);
    await expect(trackForUser('u1', 'ABC123')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('listTrackedForUser', () => {
  it('reads each state afresh, and a vanished request reads as null', async () => {
    mocks.prisma.trackedRequest.findMany.mockResolvedValue([
      { code: 'AAA111', label: null, createdAt: new Date() },
      { code: 'BBB222', label: 'Car', createdAt: new Date() },
    ]);
    mocks.insurance.mockImplementation((code: string) =>
      code === 'BBB222' ? Promise.resolve({ status: 'NEW' }) : miss(),
    );

    const rows = await listTrackedForUser('u1');
    expect(rows[0].state).toBeNull();
    expect(rows[1].state).toEqual({ kind: 'insurance', status: 'NEW' });
  });
});
