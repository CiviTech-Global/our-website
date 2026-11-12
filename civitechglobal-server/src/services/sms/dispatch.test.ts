import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The dispatcher's promises: a link is never sent, a phone is never flooded,
 * every text is written down with its cost, and a failure gives the day's
 * allowance back.
 */

const mocks = vi.hoisted(() => ({
  sendTemplate: vi.fn(),
  canSend: vi.fn(() => true),
  create: vi.fn(async () => ({})),
  incr: vi.fn(async () => 1),
  expire: vi.fn(async () => 1),
  decr: vi.fn(async () => 0),
  env: { SMS_DAILY_CAP: 3, SMS_OTP_TEMPLATE: '', SMS_MEMBER_ALERTS: false },
}));

vi.mock('./index.js', () => ({
  canSendSms: mocks.canSend,
  smsProvider: () => ({ name: 'kavenegar', sendTemplate: mocks.sendTemplate }),
}));
vi.mock('../../config/database.js', () => ({ prisma: { smsMessage: { create: mocks.create } } }));
vi.mock('../../config/redis.js', () => ({ redis: { incr: mocks.incr, expire: mocks.expire, decr: mocks.decr } }));
vi.mock('../../config/env.js', async (importOriginal) => {
  const actual = await importOriginal<{ env: Record<string, unknown> }>();
  return { env: new Proxy(actual.env, { get: (target, key) => (key in mocks.env ? mocks.env[key as keyof typeof mocks.env] : target[key as string]) }) };
});

const { sendSms, smsDateTime } = await import('./dispatch.js');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canSend.mockReturnValue(true);
  mocks.incr.mockResolvedValue(1);
  mocks.env.SMS_OTP_TEMPLATE = '';
  mocks.sendTemplate.mockResolvedValue({ messageId: '991', cost: 1180 });
});

const logged = () => (mocks.create.mock.calls.at(-1) as unknown as [{ data: Record<string, unknown> }])[0].data;

describe('sending', () => {
  it('sends through the template named in the catalogue and records the cost', async () => {
    const outcome = await sendSms('received', { phone: '+98 912 000 0000' }, { token: 'AB12CD34', token2: 'x' });
    expect(outcome).toEqual({ status: 'SENT', messageId: '991', cost: 1180 });
    expect(mocks.sendTemplate).toHaveBeenCalledWith('09120000000', 'civiReceived', { token: 'AB12CD34', token2: 'x' });
    expect(logged()).toMatchObject({ kind: 'received', status: 'SENT', cost: 1180, providerMessageId: '991' });
    // The log holds a hash, never the number.
    expect(JSON.stringify(logged())).not.toContain('0912');
  });

  it('honours SMS_OTP_TEMPLATE for codes, the name the deploy already requires', async () => {
    mocks.env.SMS_OTP_TEMPLATE = 'approvedOtp';
    await sendSms('otp', { phone: '09120000000' }, { token: '123456' });
    expect(mocks.sendTemplate.mock.calls[0]![1]).toBe('approvedOtp');
  });
});

describe('refusing', () => {
  it('never sends a link, and says why in the log', async () => {
    const outcome = await sendSms('received', { phone: '09120000000' }, { token: 'AB12', token2: 'see example.com' });
    expect(outcome.status).toBe('SKIPPED');
    expect(mocks.sendTemplate).not.toHaveBeenCalled();
    expect(logged()).toMatchObject({ status: 'SKIPPED', reason: expect.stringContaining('link') });
  });

  it('stops at the daily cap', async () => {
    mocks.incr.mockResolvedValue(4);
    const outcome = await sendSms('received', { phone: '09120000000' }, { token: 'AB12' });
    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: expect.stringContaining('cap') });
    expect(mocks.sendTemplate).not.toHaveBeenCalled();
  });

  it('skips a number that is not an Iranian mobile', async () => {
    expect((await sendSms('received', { phone: '021-1234' }, { token: 'AB12' })).status).toBe('SKIPPED');
    expect(mocks.incr).not.toHaveBeenCalled();
  });

  it('skips without a gateway', async () => {
    mocks.canSend.mockReturnValue(false);
    expect((await sendSms('received', { phone: '09120000000' }, { token: 'AB12' })).status).toBe('SKIPPED');
  });
});

describe('failing', () => {
  it('records the failure and gives the allowance back', async () => {
    mocks.sendTemplate.mockRejectedValue(new Error('Kavenegar 418: insufficient credit'));
    const outcome = await sendSms('received', { phone: '09120000000' }, { token: 'AB12' });
    expect(outcome).toMatchObject({ status: 'FAILED', reason: expect.stringContaining('insufficient credit') });
    expect(mocks.decr).toHaveBeenCalledOnce();
  });
});

describe('dates for a text', () => {
  it('writes the Iranian date and Tehran time without spaces', () => {
    // 16 Nov 2026 11:00 UTC is 25 Aban 1405, 14:30 in Tehran.
    expect(smsDateTime(new Date('2026-11-16T11:00:00Z'))).toEqual({ date: '1405/08/25', time: '14:30' });
  });
});
