import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Saved searches and matching.
 *
 * Alerts must promise nothing the board would not show for the same search,
 * and one advert must reach a person once however many of their alerts it
 * answers. Matching skills must be exact after normalising — a fuzzy match
 * that counts "react" as "react native" tells somebody they fit when they do
 * not.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    jobPost: { findUnique: vi.fn() },
    jobAlert: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(async () => 0),
      create: vi.fn(async (args: unknown) => args),
    },
  },
  notifySafely: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./notifications.service.js', () => ({ notifySafely: mocks.notifySafely }));

const { alertMatches, createAlert, notifyMatchingAlerts, skillMatch } = await import('./job-seeker.service.js');

const JOB = {
  title: 'Senior React developer',
  description: 'Build our dashboard.',
  country: 'IR',
  remoteWorldwide: false,
  currency: 'IRT',
  province: 'تهران',
  jobCategoryId: 'web',
  categoryParentId: 'it',
  employmentType: 'FULL_TIME',
  workArrangement: 'ONSITE',
  seniority: 'SENIOR',
  salaryMin: 40_000_000n,
  salaryMax: 60_000_000n,
  salaryUndisclosed: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('alertMatches', () => {
  it('matches a keyword in the title or description, ignoring case', () => {
    expect(alertMatches({ search: 'react' }, JOB)).toBe(true);
    expect(alertMatches({ search: 'DASHBOARD' }, JOB)).toBe(true);
    expect(alertMatches({ search: 'golang' }, JOB)).toBe(false);
  });

  it('matches a province, and a remote role in any province', () => {
    expect(alertMatches({ province: 'قزوین' }, JOB)).toBe(false);
    expect(alertMatches({ province: 'قزوین' }, { ...JOB, workArrangement: 'REMOTE' })).toBe(true);
  });

  it('matches a category through its parent', () => {
    expect(alertMatches({ jobCategoryId: 'it' }, JOB)).toBe(true);
    expect(alertMatches({ jobCategoryId: 'web' }, JOB)).toBe(true);
    expect(alertMatches({ jobCategoryId: 'sales' }, JOB)).toBe(false);
  });

  it('matches a pay floor against the top of the range, and never an undisclosed one', () => {
    expect(alertMatches({ salaryMin: '50000000' }, JOB)).toBe(true);
    expect(alertMatches({ salaryMin: '70000000' }, JOB)).toBe(false);
    expect(alertMatches({ salaryMin: '1' }, { ...JOB, salaryUndisclosed: true })).toBe(false);
  });
});

describe('alertMatches across countries', () => {
  it('matches a country, and a worldwide remote role from any country', () => {
    expect(alertMatches({ country: 'DE' }, JOB)).toBe(false);
    expect(alertMatches({ country: 'IR' }, JOB)).toBe(true);
    expect(alertMatches({ country: 'DE' }, { ...JOB, workArrangement: 'REMOTE', remoteWorldwide: true })).toBe(true);
    expect(alertMatches({ country: 'DE' }, { ...JOB, workArrangement: 'REMOTE', remoteWorldwide: false })).toBe(false);
  });

  it('never compares a toman floor with pay in another currency', () => {
    expect(alertMatches({ salaryMin: '1' }, { ...JOB, currency: 'EUR' })).toBe(false);
  });
});

describe('skillMatch', () => {
  it('counts exact matches after case and spacing', () => {
    const match = skillMatch(['React', 'Node.js', 'PostgreSQL'], ['react', ' node.js ']);
    expect(match.matched).toEqual(['React', 'Node.js']);
    expect(match.missing).toEqual(['PostgreSQL']);
    expect(match.total).toBe(3);
  });

  it('does not count a different skill that shares a word', () => {
    expect(skillMatch(['React Native'], ['React']).matched).toEqual([]);
  });
});

describe('notifyMatchingAlerts', () => {
  it('tells each person once, however many of their alerts match', async () => {
    mocks.prisma.jobPost.findUnique.mockResolvedValue({
      ...JOB,
      code: 'J1',
      authorId: 'employer',
      companyName: 'Acme',
      jobCategory: { parentId: 'it' },
    });
    mocks.prisma.jobAlert.findMany.mockResolvedValue([
      { id: 'a1', userId: 'u1', name: 'React', query: { search: 'react' } },
      { id: 'a2', userId: 'u1', name: 'Tehran', query: { province: 'تهران' } },
      { id: 'a3', userId: 'u2', name: 'Sales', query: { jobCategoryId: 'sales' } },
    ]);

    const notified = await notifyMatchingAlerts('j1');

    expect(notified).toBe(1);
    expect(mocks.notifySafely).toHaveBeenCalledTimes(1);
    expect(mocks.notifySafely).toHaveBeenCalledWith('u1', expect.objectContaining({ link: '/jobs/J1' }));
    expect(mocks.prisma.jobAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['a1', 'a2'] } } }),
    );
  });

  it('never throws, so a publication cannot fail on it', async () => {
    mocks.prisma.jobPost.findUnique.mockRejectedValue(new Error('database down'));
    await expect(notifyMatchingAlerts('j1')).resolves.toBe(0);
  });
});

describe('createAlert', () => {
  it('refuses an alert on everything', async () => {
    await expect(createAlert('u1', { name: 'All', query: {} })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses past the per-person limit', async () => {
    mocks.prisma.jobAlert.count.mockResolvedValueOnce(20);
    await expect(createAlert('u1', { name: 'React', query: { search: 'react' } })).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
