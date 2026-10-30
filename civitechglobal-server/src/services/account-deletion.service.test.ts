import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Closing one's own account: who may, what it asks for, and that the files
 * go only once the database has let go of them.
 */

const mocks = vi.hoisted(() => {
  const calls: Array<{ model: string; op: string; args: any }> = [];
  const state = {
    user: null as any,
    activeAwards: 0,
    booksInHandOver: 0,
    failTransaction: false,
  };

  // Every model the transaction touches records what it was asked to do.
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) =>
          vi.fn(async (args: any) => {
            calls.push({ model: name, op, args });
            return { count: 1 };
          }),
      },
    );
  const tx = new Proxy({}, { get: (_t, name: string) => model(name) });

  const prisma = {
    user: {
      findFirst: vi.fn(async () => (state.user ? { ...state.user } : null)),
    },
    projectBid: {
      findMany: vi.fn(async (args: any) =>
        args.where.attachmentStoredName ? [{ attachmentStoredName: 'bid.pdf' }] : [{ id: 'bid1' }],
      ),
    },
    marketplaceAward: { count: vi.fn(async () => state.activeAwards) },
    bookRequest: { count: vi.fn(async () => state.booksInHandOver) },
    verificationDocument: { findMany: vi.fn(async () => [{ storedName: 'id-card.jpg' }]) },
    jobApplication: { findMany: vi.fn(async () => [{ cvStoredName: 'cv.pdf' }]) },
    trackedRequest: { findMany: vi.fn(async () => [{ code: 'MYCODE1234' }]) },
    insuranceRequest: { findMany: vi.fn(async () => [{ id: 'ins1' }]) },
    projectRequest: {
      findMany: vi.fn(async () => [
        { id: 'prj1', identityId: 'idn1', attachments: [{ storedName: 'brief.pdf' }] },
      ]),
    },
    resumeSubmission: {
      findMany: vi.fn(async () => [{ id: 'res1', identityId: 'idn1', resumeStoredName: 'resume.pdf' }]),
    },
    contactMessage: { findMany: vi.fn(async () => [{ id: 'msg1' }]) },
    consultationRequest: { findMany: vi.fn(async () => [{ id: 'con1' }]) },
    company: {
      findUnique: vi.fn(async () => ({ logoStoredName: 'company.webp', coverStoredName: null })),
    },
    business: { findMany: vi.fn(async () => [{ logoStoredName: 'shop.webp', coverStoredName: null }]) },
    productImage: { findMany: vi.fn(async () => [{ storedName: 'product.webp' }]) },
    bookListingPhoto: { findMany: vi.fn(async () => [{ storedName: 'book.webp' }]) },
    bookListing: { findMany: vi.fn(async () => [{ coverStoredName: 'cover.webp' }]) },
    serviceImage: { findMany: vi.fn(async () => [{ storedName: 'service.webp' }]) },
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<void>) => {
      await fn(tx);
      if (state.failTransaction) throw new Error('rolled back');
    }),
  };

  return {
    calls,
    state,
    prisma,
    removeFile: vi.fn(async () => {}),
    recordFailedAttempt: vi.fn(async () => {}),
    verifyChallenge: vi.fn(async () => {}),
    comparePassword: vi.fn(async (plain: string) => plain === 'right-password'),
  };
});

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));
vi.mock('./attachment.service.js', () => ({ removeFile: mocks.removeFile }));
vi.mock('./mfa.service.js', () => ({ verifyChallenge: mocks.verifyChallenge }));
vi.mock('./auth.service.js', () => ({
  emailLookupHash: (email: string) => `hash:${email}`,
  recordFailedAttempt: mocks.recordFailedAttempt,
}));
vi.mock('../utils/password.js', () => ({
  comparePassword: mocks.comparePassword,
  hashPassword: async () => 'unusable-hash',
}));

const { deleteOwnAccount, DELETED_DISPLAY_NAME } = await import('./account-deletion.service.js');

const member = {
  id: 'u1',
  email: 'sara@example.com',
  password: 'stored-hash',
  role: 'USER',
  mfaEnabledAt: null,
  emailVerified: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  Object.assign(mocks.state, { user: { ...member }, activeAwards: 0, booksInHandOver: 0, failTransaction: false });
});

describe('deleteOwnAccount', () => {
  it('refuses a staff account', async () => {
    mocks.state.user.role = 'ADMIN';

    await expect(deleteOwnAccount('u1', { password: 'right-password' })).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('counts a wrong password as a failed sign-in and changes nothing', async () => {
    await expect(deleteOwnAccount('u1', { password: 'guess' })).rejects.toMatchObject({ statusCode: 400 });

    expect(mocks.recordFailedAttempt).toHaveBeenCalledWith('sara@example.com');
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('asks for the second factor when it is on, and checks it', async () => {
    mocks.state.user.mfaEnabledAt = new Date();

    await expect(deleteOwnAccount('u1', { password: 'right-password' })).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();

    await deleteOwnAccount('u1', { password: 'right-password', code: '123456' });
    expect(mocks.verifyChallenge).toHaveBeenCalledWith('u1', '123456');
  });

  it('will not leave a contract or a book hand-over half done', async () => {
    mocks.state.activeAwards = 1;

    await expect(deleteOwnAccount('u1', { password: 'right-password' })).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scrubs the person, closes what they had open, and removes their files', async () => {
    await deleteOwnAccount('u1', { password: 'right-password' });

    const userUpdate = mocks.calls.find((c) => c.model === 'user' && c.op === 'update')!;
    expect(userUpdate.args.data).toMatchObject({
      email: 'deleted+u1@deleted.invalid',
      emailHash: 'hash:deleted+u1@deleted.invalid',
      username: null,
      password: 'unusable-hash',
      firstName: DELETED_DISPLAY_NAME,
      lastName: '',
      phone: null,
      mfaSecret: null,
      deletedAt: expect.any(Date),
    });

    const touched = (model: string, op: string) => mocks.calls.some((c) => c.model === model && c.op === op);
    expect(touched('jobPost', 'updateMany')).toBe(true);
    expect(touched('freelanceProject', 'updateMany')).toBe(true);
    expect(touched('business', 'updateMany')).toBe(true);
    expect(touched('userVerification', 'deleteMany')).toBe(true);
    expect(touched('pushDevice', 'deleteMany')).toBe(true);
    expect(touched('refreshToken', 'updateMany')).toBe(true);

    expect(mocks.removeFile.mock.calls.map((c: unknown[]) => c[0]).sort()).toEqual(
      [
        'bid.pdf',
        'book.webp',
        'brief.pdf',
        'company.webp',
        'cover.webp',
        'cv.pdf',
        'id-card.jpg',
        'product.webp',
        'resume.pdf',
        'service.webp',
        'shop.webp',
      ].sort(),
    );
  });

  it('never matches a public form on an email nobody proved', async () => {
    await deleteOwnAccount('u1', { password: 'right-password' });

    const where = mocks.prisma.insuranceRequest.findMany.mock.calls[0]![0].where;
    expect(where.OR).toEqual([{ trackingCode: { in: ['MYCODE1234'] } }]);
  });

  it('matches on the email once the account has verified it', async () => {
    mocks.state.user.emailVerified = true;
    await deleteOwnAccount('u1', { password: 'right-password' });

    const where = mocks.prisma.insuranceRequest.findMany.mock.calls[0]![0].where;
    expect(where.OR).toContainEqual({ email: { equals: 'sara@example.com', mode: 'insensitive' } });
  });

  it('empties the forms it reaches, and leaves a blocked identity alone', async () => {
    await deleteOwnAccount('u1', { password: 'right-password' });

    const insurance = mocks.calls.find((c) => c.model === 'insuranceRequest' && c.op === 'updateMany')!;
    expect(insurance.args.data).toMatchObject({ phoneNumber: '', email: null, notes: null });
    const identity = mocks.calls.find((c) => c.model === 'clientIdentity')!;
    expect(identity.args.where).toEqual({ id: 'idn1', blocked: false });
  });

  it('keeps the files when the transaction rolls back', async () => {
    mocks.state.failTransaction = true;

    await expect(deleteOwnAccount('u1', { password: 'right-password' })).rejects.toThrow('rolled back');
    expect(mocks.removeFile).not.toHaveBeenCalled();
  });
});
