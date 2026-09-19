import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadError, upload } from './api';

/**
 * The upload transport, against a fake XMLHttpRequest.
 *
 * The cases that matter are the ones a network cannot be relied on to
 * reproduce: a connection that dies mid-request and leaves the socket open, a
 * cancellation, and the difference between the two.
 */

interface FakeXhr {
  method?: string;
  url?: string;
  headers: Record<string, string>;
  body?: unknown;
  status: number;
  responseText: string;
  withCredentials: boolean;
  upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void; onloadend?: () => void };
  open: (method: string, url: string) => void;
  setRequestHeader: (key: string, value: string) => void;
  send: (body: unknown) => void;
  abort: () => void;
  onload?: () => void;
  onerror?: () => void;
  ontimeout?: () => void;
  onabort?: () => void;
}

let current: FakeXhr;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'XMLHttpRequest',
    class {
      headers: Record<string, string> = {};
      status = 0;
      responseText = '';
      withCredentials = false;
      upload: FakeXhr['upload'] = {};
      onload?: () => void;
      onerror?: () => void;
      ontimeout?: () => void;
      onabort?: () => void;
      method?: string;
      url?: string;
      body?: unknown;

      constructor() {
        current = this as unknown as FakeXhr;
      }

      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }

      setRequestHeader(key: string, value: string) {
        this.headers[key] = value;
      }

      send(body: unknown) {
        this.body = body;
      }

      abort() {
        this.onabort?.();
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const form = () => {
  const f = new FormData();
  f.append('cover', new File([new Uint8Array(2)], 'c.webp'));
  return f;
};

describe('a connection that dies mid-upload', () => {
  it('gives up once nothing has moved for the stall window', async () => {
    const promise = upload('POST', '/market/me/books', form());
    const settled = promise.catch((e: unknown) => e);

    // 29 seconds of silence is not yet a fault.
    await vi.advanceTimersByTimeAsync(29_000);
    let done = false;
    void settled.then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    const error = await settled;

    expect(error).toBeInstanceOf(UploadError);
    expect((error as UploadError).kind).toBe('timeout');
    // The detail says what actually happened, for whoever reads the report.
    expect((error as UploadError).message).toMatch(/No progress for 30s/);
  });

  it('keeps waiting while the bytes are still moving', async () => {
    const promise = upload('POST', '/market/me/books', form(), { onProgress: () => {} });
    const settled = promise.catch((e: unknown) => e);

    // A slow but live upload: progress every 20 seconds for two minutes.
    for (let i = 0; i < 6; i += 1) {
      await vi.advanceTimersByTimeAsync(20_000);
      current.upload.onprogress?.({ lengthComputable: true, loaded: i + 1, total: 100 });
    }

    let done = false;
    void settled.then(() => {
      done = true;
    });
    await Promise.resolve();
    // Two minutes in and still going: a big file on a slow line is not a fault.
    expect(done).toBe(false);

    current.status = 201;
    current.responseText = JSON.stringify({ success: true, data: { id: 'b1' } });
    current.onload?.();
    await expect(promise).resolves.toMatchObject({ data: { id: 'b1' } });
  });

  it('tells a stall apart from somebody pressing cancel', async () => {
    const controller = new AbortController();
    const promise = upload('POST', '/market/me/books', form(), { signal: controller.signal });
    const settled = promise.catch((e: unknown) => e);

    controller.abort();
    const error = (await settled) as UploadError;

    expect(error.kind).toBe('aborted');
  });
});

describe('what it sends', () => {
  it('carries the cookie and never names its own content type', async () => {
    const promise = upload('POST', '/market/me/books', form());
    const settled = promise.catch(() => null);

    expect(current.withCredentials).toBe(true);
    // The browser writes the multipart boundary; naming the type loses it.
    expect(Object.keys(current.headers)).not.toContain('Content-Type');

    current.status = 201;
    current.responseText = JSON.stringify({ success: true, data: null });
    current.onload?.();
    await settled;
  });

  it('unwraps the envelope, as the rest of the client does', async () => {
    const promise = upload<{ id: string }>('POST', '/x', form());
    current.status = 200;
    current.responseText = JSON.stringify({ success: true, data: { id: 'x1' } });
    current.onload?.();

    await expect(promise).resolves.toMatchObject({ data: { id: 'x1' } });
  });

  it('reports the server\'s refusal as an ApiError with its body', async () => {
    const promise = upload('POST', '/x', form());
    const settled = promise.catch((e: unknown) => e);

    current.status = 413;
    current.responseText = JSON.stringify({ success: false, message: 'too big' });
    current.onload?.();

    const error = (await settled) as { status: number; message: string };
    expect(error.status).toBe(413);
    expect(error.message).toBe('too big');
  });
});
