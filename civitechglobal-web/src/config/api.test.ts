import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, isApiError, refreshAccessToken, setAccessToken } from './api';

/**
 * The HTTP client, against a stubbed `fetch`.
 *
 * The refresh tests matter most: a production log showed two concurrent
 * POST /auth/refresh calls, each of which rotated the refresh token, so the
 * second overwrote the first's cookie. These pin the single-flight behaviour
 * that fixes it.
 */

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('envelope', () => {
  it('unwraps { success, data } to the payload', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 7 } }));
    const res = await api.get<{ id: number }>('/thing');
    expect(res.data).toEqual({ id: 7 });
  });

  it('flattens pagination meta alongside the rows', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [1, 2], meta: { total: 2, page: 1 } })
    );
    const res = await api.get<{ data: number[]; total: number }>('/things');
    expect(res.data).toEqual({ data: [1, 2], total: 2, page: 1 });
  });

  it('passes through a body that is not enveloped', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ plain: true }));
    const res = await api.get<{ plain: boolean }>('/raw');
    expect(res.data).toEqual({ plain: true });
  });
});

describe('requests', () => {
  it('sends JSON with a Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }));
    await api.post('/thing', { a: 1 });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.credentials).toBe('include');
  });

  it('leaves FormData alone so the browser can set the multipart boundary', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }));
    const form = new FormData();
    form.append('payload', '{}');
    await api.post('/upload', form);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe(form);
    // Naming the type by hand would lose the boundary and the upload would fail.
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('attaches the access token, except on auth endpoints', async () => {
    setAccessToken('tok');
    fetchMock.mockImplementation(() => jsonResponse({ success: true, data: null }));

    await api.get('/protected');
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer tok');

    // Sending a stale access token to /auth/login would be meaningless at best.
    await api.post('/auth/login', {});
    expect(fetchMock.mock.calls[1]![1].headers.Authorization).toBeUndefined();
  });

  it('serialises query params and drops empty ones', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }));
    await api.get('/list', { params: { page: 1, status: undefined, q: '' } });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/list?page=1');
  });

  it('returns a blob untouched, without envelope unwrapping', async () => {
    fetchMock.mockResolvedValueOnce(new Response('bytes', { status: 200 }));
    const res = await api.get<Blob>('/file', { responseType: 'blob' });
    expect(res.data).toBeInstanceOf(Blob);
  });
});

describe('errors', () => {
  it('throws an ApiError carrying the server message', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ success: false, message: 'نامعتبر' }, 400));

    await expect(api.post('/thing', {})).rejects.toThrow('نامعتبر');
    await expect(api.post('/thing', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('exposes status and body the way call sites read them', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ success: false, message: 'gone' }, 404));
    const error = await api.get('/missing').catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).response.status).toBe(404);
    expect((error as ApiError).response.data).toMatchObject({ message: 'gone' });
  });
});

describe('401 handling', () => {
  it('refreshes once and replays the original request', async () => {
    setAccessToken('stale');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'fresh' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }));

    const res = await api.get<{ ok: boolean }>('/protected');

    expect(res.data).toEqual({ ok: true });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/protected',
      '/api/auth/refresh',
      '/api/protected',
    ]);
    // The replay carries the NEW token, not the one that just failed.
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe('Bearer fresh');
  });

  it('does not retry a second time', async () => {
    setAccessToken('stale');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'fresh' } }))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'still no' }, 401));

    await expect(api.get('/protected')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never tries to refresh a failing refresh', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false }, 401));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('single-flight refresh', () => {
  it('collapses concurrent refreshes into one request', async () => {
    // The bug this replaces: bootstrap called /auth/refresh directly while the
    // 401 path had its own queue, so two refreshes ran at once and — because
    // the server rotates the token — the second invalidated the first.
    let release: (value: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        })
    );

    const all = Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);
    release(jsonResponse({ success: true, data: { accessToken: 'one-token' } }));

    expect(await all).toEqual(['one-token', 'one-token', 'one-token']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh attempt after the previous one settles', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'first' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'second' } }));

    expect(await refreshAccessToken()).toBe('first');
    expect(await refreshAccessToken()).toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears the shared promise after a failure, so a later retry can succeed', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'later' } }));

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError);
    expect(await refreshAccessToken()).toBe('later');
  });
});
