import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The job board's write paths.
 *
 * Pinned here: an edit can clear a field, not only change it; "negotiable"
 * wins over a stale number; a role hiring several people stays open until the
 * last one is hired; and the employer's CV route opens only applications that
 * reached them, on their own posting.
 */

const mocks = vi.hoisted(() => {
  const tx = {
    jobApplication: {
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    jobPost: { update: vi.fn() },
    marketplaceAward: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 'award1' })),
    },
  };
  return {
    tx,
    prisma: {
      jobPost: {
        findUnique: vi.fn(),
        update: vi.fn(async () => ({ id: 'j1', moderationStatus: 'DRAFT' })),
      },
      jobApplication: { findUnique: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
    },
  };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./notifications.service.js', () => ({ notifySafely: vi.fn() }));

const { getApplicationCvForEmployer, setApplicationOutcome, updateJob, withdrawApplication } = await import(
  './jobs.service.js'
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('editing a posting', () => {
  beforeEach(() => {
    mocks.prisma.jobPost.findUnique.mockResolvedValue({ id: 'j1', authorId: 'u1', moderationStatus: 'DRAFT' });
  });

  it('clears a field sent as null', async () => {
    await updateJob('u1', 'j1', { city: null, province: null, closesAt: null });

    const { data } = mocks.prisma.jobPost.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ city: null, province: null, closesAt: null });
  });

  it('leaves a field that was not sent', async () => {
    await updateJob('u1', 'j1', { title: 'Backend developer' });

    const { data } = mocks.prisma.jobPost.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toEqual({ title: 'Backend developer' });
  });

  it('ignores a null for a field that cannot be empty', async () => {
    await updateJob('u1', 'j1', { title: null, employmentType: null });

    const { data } = mocks.prisma.jobPost.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).not.toHaveProperty('title');
    expect(data).not.toHaveProperty('employmentType');
  });

  it('drops the numbers when the salary becomes negotiable', async () => {
    await updateJob('u1', 'j1', { salaryUndisclosed: true, salaryMin: 10n });

    const { data } = mocks.prisma.jobPost.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ salaryUndisclosed: true, salaryMin: null, salaryMax: null });
  });

  it('refuses somebody else’s posting as not found', async () => {
    await expect(updateJob('u2', 'j1', { city: null })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('accepting an applicant', () => {
  const application = (openings: number) => ({
    id: 'a1',
    applicantId: 'cand',
    expectedSalary: null,
    moderationStatus: 'APPROVED',
    job: { id: 'j1', authorId: 'emp', title: 'Developer', openings },
  });

  it('keeps a role with openings left open, and nobody else is declined', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue(application(3));
    mocks.tx.jobApplication.count.mockResolvedValue(1);

    await setApplicationOutcome('emp', 'a1', 'ACCEPTED');

    expect(mocks.tx.jobApplication.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.jobPost.update).not.toHaveBeenCalled();
    expect(mocks.tx.marketplaceAward.create).toHaveBeenCalled();
  });

  it('closes the role when the last opening is filled', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue(application(2));
    mocks.tx.jobApplication.count.mockResolvedValue(2);

    await setApplicationOutcome('emp', 'a1', 'ACCEPTED');

    expect(mocks.tx.jobApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { outcome: 'DECLINED' } }),
    );
    expect(mocks.tx.jobPost.update).toHaveBeenCalledWith(expect.objectContaining({ data: { state: 'AWARDED' } }));
  });
});

describe('the employer’s copy of a CV', () => {
  const row = {
    moderationStatus: 'APPROVED',
    cvStoredName: 'stored.pdf',
    cvMimeType: 'application/pdf',
    cvOriginalName: 'cv.pdf',
    job: { authorId: 'emp' },
  };

  it('opens for the employer whose posting it answers', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue(row);
    await expect(getApplicationCvForEmployer('emp', 'a1')).resolves.toMatchObject({ cvStoredName: 'stored.pdf' });
  });

  it('is not found for anybody else', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue(row);
    await expect(getApplicationCvForEmployer('other', 'a1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('is not found while the application has not reached the employer', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue({ ...row, moderationStatus: 'PENDING_REVIEW' });
    await expect(getApplicationCvForEmployer('emp', 'a1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('withdrawing an application', () => {
  it('is refused once the employer has decided', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue({ id: 'a1', applicantId: 'cand', outcome: 'ACCEPTED' });
    await expect(withdrawApplication('cand', 'a1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('is not found for anybody but the applicant', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue({ id: 'a1', applicantId: 'cand', outcome: 'PENDING' });
    await expect(withdrawApplication('other', 'a1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('moving a withdrawn application', () => {
  it('is refused: the applicant took it back', async () => {
    mocks.prisma.jobApplication.findUnique.mockResolvedValue({
      id: 'a1',
      applicantId: 'cand',
      expectedSalary: null,
      outcome: 'WITHDRAWN',
      moderationStatus: 'APPROVED',
      job: { id: 'j1', authorId: 'emp', title: 'Developer', openings: 1 },
    });
    await expect(setApplicationOutcome('emp', 'a1', 'SHORTLISTED')).rejects.toMatchObject({ statusCode: 409 });
  });
});
