import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Who may submit an insurance request, and what the row then claims about the
 * phone number on it.
 *
 * The rule has two halves and both matter. With a gateway, the number must
 * come from a verified token and never from the body — otherwise anybody could
 * verify their own phone and file a hundred requests naming somebody else's.
 * Without a gateway there is no token to take it from, so the number is read
 * from the form and the row says plainly that nobody checked it.
 */

const mocks = vi.hoisted(() => ({
  canSendSms: vi.fn(() => true),
  verifyPhoneToken: vi.fn(() => '09120000001'),
  create: vi.fn(async (row: unknown) => ({ id: 'r1', createdAt: new Date(), ...(row as object) })),
  findBySlug: vi.fn(async () => ({
    id: 'p1',
    slug: 'third-party',
    title: 'ثالث',
    intakeMode: 'CALLBACK',
    category: { title: 'خودرو' },
  })),
  publishNewRequest: vi.fn(),
}));

vi.mock('./sms/index.js', () => ({ canSendSms: mocks.canSendSms }));
vi.mock('./otp.service.js', () => ({ verifyPhoneToken: mocks.verifyPhoneToken }));
vi.mock('./notify.service.js', () => ({ publishNewRequest: mocks.publishNewRequest }));
vi.mock('../database/prisma/repositories/insurance-request.repository.js', () => ({
  insuranceRequestRepository: { createFromWeb: mocks.create },
}));
vi.mock('../database/prisma/repositories/insurance-product.repository.js', () => ({
  insuranceProductRepository: { findBySlug: mocks.findBySlug },
}));
vi.mock('../insurance/catalog/index.js', () => ({
  CATALOG_VERSION: 1,
  getProduct: () => ({ slug: 'third-party', title: { fa: 'ثالث' }, intakeMode: 'CALLBACK', fields: [] }),
}));
vi.mock('../insurance/catalog/schema.js', () => ({
  // The real validator returns the normalised answers; the service reads the
  // contact block straight out of them.
  validateAnswers: () => ({
    ok: true,
    answers: { fullName: 'الف ب', city: 'تهران' },
  }),
}));

const { submitRequest } = await import('./insurance-request.service.js');

const base = { productSlug: 'third-party', answers: {}, email: 'a@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockImplementation(async (row: unknown) => ({ id: 'r1', createdAt: new Date(), ...(row as object) }));
  mocks.findBySlug.mockResolvedValue({
    id: 'p1',
    slug: 'third-party',
    title: 'ثالث',
    intakeMode: 'CALLBACK',
    category: { title: 'خودرو' },
  });
  mocks.verifyPhoneToken.mockReturnValue('09120000001');
});

describe('with an SMS gateway', () => {
  beforeEach(() => mocks.canSendSms.mockReturnValue(true));

  it('refuses a submission with no verification token', async () => {
    await expect(submitRequest({ ...base, phone: '09120000002' })).rejects.toThrow(/تأیید شماره تماس/);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('takes the number from the token, not from the body', async () => {
    await submitRequest({ ...base, phoneToken: 'tok', phone: '09120000002' });

    const row = mocks.create.mock.calls[0][0] as { phoneNumber: string; phoneVerified: boolean };
    expect(row.phoneNumber).toBe('09120000001');
    expect(row.phoneVerified).toBe(true);
  });
});

describe('with no SMS gateway', () => {
  beforeEach(() => mocks.canSendSms.mockReturnValue(false));

  it('accepts the number from the form and records that nobody proved it', async () => {
    await submitRequest({ ...base, phone: '09120000002' });

    const row = mocks.create.mock.calls[0][0] as { phoneNumber: string; phoneVerified: boolean };
    expect(row.phoneNumber).toBe('09120000002');
    // The whole point: staff ring these numbers, and the queue has to show
    // that this one is unchecked.
    expect(row.phoneVerified).toBe(false);
  });

  it('still refuses a submission with no number at all', async () => {
    await expect(submitRequest({ ...base })).rejects.toThrow(/شمارهٔ تماس/);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('honours a token that was issued before the gateway went away', async () => {
    await submitRequest({ ...base, phoneToken: 'tok', phone: '09120000002' });

    const row = mocks.create.mock.calls[0][0] as { phoneNumber: string; phoneVerified: boolean };
    expect(row.phoneNumber).toBe('09120000001');
    expect(row.phoneVerified).toBe(true);
  });
});
