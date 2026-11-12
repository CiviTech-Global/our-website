import { describe, expect, it, vi } from 'vitest';
import { KavenegarClient, KavenegarError } from './kavenegar.js';

/**
 * The Kavenegar client against a stubbed fetch, shaped like the REST
 * reference: POST, form-encoded, and an HTTP status that mirrors return.status
 * with the reason in the body.
 */

// Not a credential: a stand-in so the test can check it never leaks into errors.
const KEY = ['placeholder', 'for', 'tests'].join('-');

function reply(status: number, entries: unknown = [], message = 'msg') {
  return new Response(JSON.stringify({ return: { status, message }, entries }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function client(...responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more stubbed responses');
    if (next instanceof Error) throw next;
    return next;
  });
  return { api: new KavenegarClient(KEY, fetchImpl as unknown as typeof fetch), fetchImpl };
}

describe('verify/lookup', () => {
  it('posts the receptor, token and template form-encoded, as the SDK does', async () => {
    const { api, fetchImpl } = client(reply(200, [{ messageid: 1, status: 1 }]));
    await api.verifyLookup('09120000000', { token: '123456' }, 'civitechOtp');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.kavenegar.com/v1/${KEY}/verify/lookup.json`);
    expect(init.method).toBe('POST');
    expect(String((init.headers as Record<string, string>)['Content-Type'])).toContain('x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      receptor: '09120000000',
      token: '123456',
      template: 'civitechOtp',
    });
  });

  it('reads the reason from the body when the HTTP status is an error', async () => {
    const { api } = client(reply(418, null, 'اعتبار کافی نیست'));
    const error = await api.verifyLookup('09120000000', { token: '123456' }, 't').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(KavenegarError);
    expect((error as KavenegarError).status).toBe(418);
    expect((error as KavenegarError).message).toMatch(/insufficient credit/);
  });

  it('names an unapproved template plainly', async () => {
    const { api } = client(reply(424));
    await expect(api.verifyLookup('09120000000', { token: '123456' }, 'pending')).rejects.toThrow(/template not found or not yet approved/);
  });

  it('retries once when Kavenegar says its server is unavailable, since nothing was sent', async () => {
    const { api, fetchImpl } = client(reply(409), reply(200, [{ messageid: 77, cost: 1200 }]));
    expect(await api.verifyLookup('09120000000', { token: '123456' }, 't')).toEqual({ messageId: '77', cost: 1200 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('never retries a refusal, which could text the person twice', async () => {
    const { api, fetchImpl } = client(reply(411), reply(200));
    await expect(api.verifyLookup('0912', { token: '123456' }, 't')).rejects.toThrow(/invalid receptor/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses a token with spaces without spending a call', async () => {
    const { api, fetchImpl } = client();
    await expect(api.verifyLookup('09120000000', { token: '1234', token2: 'two words' }, 't')).rejects.toThrow(/whitespace/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('keeps the API key out of every error, including network failures', async () => {
    for (const failure of [reply(403), new TypeError('fetch failed'), new Response('<html>bad gateway</html>', { status: 502 })]) {
      const { api } = client(failure);
      const error = (await api.verifyLookup('09120000000', { token: '123456' }, 't').catch((e: unknown) => e)) as Error;
      expect(error).toBeInstanceOf(KavenegarError);
      expect(error.message).not.toContain(KEY);
    }
  });
});

describe('account/info', () => {
  it('returns the remaining credit without sending anything', async () => {
    const { api, fetchImpl } = client(reply(200, { remaincredit: 486000, expiredate: 0, type: 'Master' }));
    expect(await api.accountInfo()).toEqual({ remainCredit: 486000, type: 'Master' });
    expect(String(fetchImpl.mock.calls[0]![0])).toMatch(/\/account\/info\.json$/);
  });
});
