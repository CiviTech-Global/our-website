import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * What a consultant profile needs before the club shows it as bookable: at
 * least one professional link, with the fee optional — and a refusal needs a
 * reason the expert can act on.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    expert: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(),
      create: vi.fn(async () => ({ id: 'e1', slug: 'ada', fullName: 'Ada', userId: null })),
      update: vi.fn(async () => ({ id: 'e1', moderationStatus: 'APPROVED', published: true })),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mocks.prisma)),
  },
  notify: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./notifications.service.js', () => ({ notifySafely: mocks.notify }));
vi.mock('./verification.service.js', () => ({ assertVerified: async () => undefined }));
vi.mock('./accounts.service.js', () => ({ createMemberAccount: vi.fn(async () => ({ id: 'u1' })) }));
vi.mock('./attachment.service.js', () => ({ IMAGE_EXTENSIONS: [], storeFiles: vi.fn(), removeFile: vi.fn() }));

const { createExpert, reviewExpert } = await import('./experts.service.js');

beforeEach(() => vi.clearAllMocks());

const base = { fullName: 'Ada Lovelace', headline: 'Engines', slug: 'ada' };

describe('a profile that takes consultations', () => {
  it('is published without a fee, for terms settled when a session is arranged', async () => {
    await createExpert({ ...base, githubUrl: 'https://github.com/ada' }, null);
    expect(mocks.prisma.expert.create).toHaveBeenCalledOnce();
  });

  it('keeps the organisation staff give it', async () => {
    await createExpert({ ...base, githubUrl: 'https://github.com/ada', affiliation: '  Partner Co  ' }, null);
    expect(mocks.prisma.expert.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ affiliation: 'Partner Co' }) }),
    );
  });

  it('cannot be published without a link to the expert\'s work', async () => {
    await expect(createExpert({ ...base, hourlyFee: 1_500_000n }, null)).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.prisma.expert.create).not.toHaveBeenCalled();
  });

  it('is published with both', async () => {
    await createExpert({ ...base, hourlyFee: 1_500_000n, linkedinUrl: 'https://linkedin.com/in/ada' }, null);
    expect(mocks.prisma.expert.create).toHaveBeenCalledOnce();
  });

  it('needs neither when it only lists somebody', async () => {
    await createExpert({ ...base, acceptsConsultations: false }, null);
    expect(mocks.prisma.expert.create).toHaveBeenCalledOnce();
  });
});

describe('reviewing a submitted profile', () => {
  it('refuses a rejection without a reason', async () => {
    mocks.prisma.expert.findUnique.mockResolvedValue({
      userId: 'u1',
      published: false,
      acceptsConsultations: true,
      hourlyFee: 1n,
      linkedinUrl: null,
      githubUrl: 'https://github.com/ada',
      websiteUrl: null,
    });
    await expect(reviewExpert('e1', 'REJECTED', '  ')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes on approval and tells the expert', async () => {
    mocks.prisma.expert.findUnique.mockResolvedValue({
      userId: 'u1',
      published: false,
      acceptsConsultations: true,
      hourlyFee: 1n,
      linkedinUrl: null,
      githubUrl: 'https://github.com/ada',
      websiteUrl: null,
    });
    await reviewExpert('e1', 'APPROVED');
    expect(mocks.prisma.expert.update.mock.calls[0]![0]).toMatchObject({
      data: { moderationStatus: 'APPROVED', published: true },
    });
    expect(mocks.notify).toHaveBeenCalledWith('u1', expect.objectContaining({ link: '/dashboard/expert' }));
  });
});
