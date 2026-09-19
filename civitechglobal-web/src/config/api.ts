/**
 * The HTTP client, on `fetch`.
 *
 * This replaces axios. The surface kept is deliberately the small part the app
 * actually used — `api.get/post/patch/put/delete` returning `{ data }` — so
 * call sites did not change; what went away is ~13 kB of compressed JavaScript
 * on every page load and an XHR shim the platform has not needed for years.
 *
 * The access token is kept ONLY in memory and never written to
 * localStorage/sessionStorage, so an XSS payload cannot read it back out. The
 * refresh token lives solely in an httpOnly cookie set by the server and is
 * never touched by client JavaScript.
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

/**
 * Carries what the call sites already read off a failed request: a status and
 * the server's `{ success, message, errors }` body. Shaped like the axios
 * error it replaces (`error.response.data.message`) so error handling did not
 * have to be rewritten in eight files at the same time as the transport.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly response: { status: number; data: unknown };

  constructor(status: number, data: unknown, fallback: string) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : fallback;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = { status, data };
  }
}

/** Narrows an unknown catch value to an ApiError. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** 'blob' skips envelope unwrapping and hands back the raw body. */
  responseType?: 'json' | 'blob';
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  /** Optional so a test double can be a bare `{ data }`. */
  status?: number;
}

function buildUrl(url: string, params?: RequestConfig['params']): string {
  const full = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  if (!params) return full;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `${full}${full.includes('?') ? '&' : '?'}${query}` : full;
}

/**
 * The server wraps every response as `{ success, message, data }`. Unwrapping
 * here lets the rest of the app treat the result as the payload itself.
 *
 * There used to be a fourth field, `meta`, which some list endpoints used for
 * their page counts and which this function spread into the payload. Every list
 * now answers with those counts inside `data` as a Paged<T>, so the special
 * case is gone along with the two envelope shapes it existed to reconcile.
 */
function unwrap(body: unknown): unknown {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

async function readBody(response: Response, responseType: 'json' | 'blob'): Promise<unknown> {
  if (responseType === 'blob') return response.blob();
  // 204, and 304 from a conditional request, carry no body to parse.
  if (response.status === 204 || response.status === 304) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- Single-flight refresh -------------------------------------------------
//
// One promise, shared by everyone who needs a fresh token: the 401 retry path
// below AND the app's own bootstrap. The previous implementation deduplicated
// only the 401 path, while AuthProvider called /auth/refresh directly — so a
// mount that raced a 401 (or React StrictMode's double-invoked effect in
// development) fired two refreshes at once. Since the server ROTATES the
// refresh token, the second response overwrote the first's cookie and left one
// freshly minted token orphaned. That is the bug behind the pairs of
// /auth/refresh calls in the server log.

let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= (async () => {
    try {
      const response = await request<{ accessToken: string }>('POST', '/auth/refresh');
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    } catch (error) {
      setAccessToken(null);
      throw error;
    } finally {
      // Cleared only once settled, so callers that arrive mid-flight join this
      // attempt instead of starting a second one.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  config: RequestConfig = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { ...config.headers };

  // FormData must set its own Content-Type: the multipart boundary is
  // generated by the browser, and naming the type by hand loses it.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken && !isAuthEndpoint(url)) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(buildUrl(url, config.params), {
    method,
    headers,
    credentials: 'include',
    signal: config.signal,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (response.ok) {
    const raw = await readBody(response, config.responseType ?? 'json');
    return {
      data: (config.responseType === 'blob' ? raw : unwrap(raw)) as T,
      status: response.status,
    };
  }

  // 401 on a non-auth endpoint: refresh once, then replay the original request.
  if (response.status === 401 && !isRetry && !isAuthEndpoint(url)) {
    try {
      await refreshAccessToken();
      return await request<T>(method, url, body, config, true);
    } catch {
      // Fall through and report the original 401 rather than the refresh
      // failure: the caller asked for this resource, not for a token.
    }
  }

  const data = await readBody(response, 'json');
  throw new ApiError(response.status, data, `Request failed with status ${response.status}`);
}


// --- Uploads ---------------------------------------------------------------
//
// fetch cannot report upload progress. The Streams-based workaround needs
// duplex requests, which Safari and Firefox still do not ship, so a file
// upload is the one request here that goes out over XMLHttpRequest — the only
// transport that fires progress events for the request body.
//
// Everything else is kept identical to `request` on purpose: same base URL,
// same bearer header, same cookie credentials, same envelope unwrapping, same
// ApiError, and the same single-flight refresh-and-replay on a 401. A second
// set of rules for uploads is how a session expiring mid-upload turns into an
// unexplained failure on one screen and a clean retry on another.

/**
 * How long an upload may make no progress at all before it is abandoned.
 *
 * Not a total timeout: a large file on a slow connection is not a fault, and
 * cutting it off at sixty seconds would punish exactly the people the progress
 * bar is for. What is a fault is silence — a connection that died mid-request
 * leaves the browser holding an open socket indefinitely, and the page sits at
 * "Uploading… 0%" forever. The watchdog resets on every progress event, so it
 * only fires when nothing has moved.
 */
const STALL_TIMEOUT_MS = 30_000;

export interface UploadConfig extends RequestConfig {
  /** 0–100, fired as the body goes out. Never called after the response. */
  onProgress?: (percent: number) => void;
}

/** Distinguishes the ways an upload can fail before the server ever answers. */
export type UploadFailure = 'network' | 'timeout' | 'aborted';

export class UploadError extends Error {
  readonly kind: UploadFailure;

  constructor(kind: UploadFailure, message: string) {
    super(message);
    this.name = 'UploadError';
    this.kind = kind;
  }
}

function sendXhr<T>(
  method: string,
  url: string,
  body: FormData,
  config: UploadConfig,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    // Nothing can be sent with no network, and the browser will happily hold
    // the request open rather than say so. Failing here gives the person the
    // real reason immediately instead of a bar that never moves.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      reject(new UploadError('network', 'The browser reports no network connection.'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, buildUrl(url, config.params), true);
    // The cookie carries the refresh token; without this the upload is
    // anonymous even when the page is signed in.
    xhr.withCredentials = true;

    for (const [key, value] of Object.entries(config.headers ?? {})) xhr.setRequestHeader(key, value);
    if (accessToken && !isAuthEndpoint(url)) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    // Deliberately no Content-Type: the browser writes the multipart boundary.

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const stopWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = undefined;
    };
    const armWatchdog = () => {
      stopWatchdog();
      watchdog = setTimeout(() => {
        stalled = true;
        // Rejected here rather than left to onabort: a request the browser
        // never managed to start — no network, or one blocked by the platform
        // — can be aborted without any event being dispatched, which is how
        // 'Uploading… 0%' ends up on screen forever. Settling twice is
        // harmless; a promise keeps its first result.
        reject(
          new UploadError(
            'timeout',
            `No progress for ${STALL_TIMEOUT_MS / 1000}s; the connection appears to have dropped.`,
          ),
        );
        xhr.abort();
      }, STALL_TIMEOUT_MS);
    };
    let stalled = false;

    xhr.upload.onprogress = (event) => {
      armWatchdog();
      if (config.onProgress) {
        // Only meaningful when the browser knows the total; otherwise the
        // caller keeps showing an indeterminate state rather than a lying bar.
        if (event.lengthComputable) {
          config.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      }
    };
    // The body may be out while the server is still working; the response is
    // what the watchdog waits on from then on.
    xhr.upload.onloadend = () => armWatchdog();

    xhr.onload = () => {
      stopWatchdog();
      let parsed: unknown = null;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        parsed = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: unwrap(parsed) as T, status: xhr.status });
      } else {
        reject(new ApiError(xhr.status, parsed, `Request failed with status ${xhr.status}`));
      }
    };

    // A dropped connection, DNS failure or blocked request: the status is 0
    // and there is no body to explain it.
    xhr.onerror = () => {
      stopWatchdog();
      reject(new UploadError('network', 'The upload could not reach the server.'));
    };
    xhr.ontimeout = () => {
      stopWatchdog();
      reject(new UploadError('timeout', 'The upload timed out.'));
    };
    xhr.onabort = () => {
      stopWatchdog();
      // A watchdog abort is a stall, not somebody pressing cancel, and the two
      // want different words and different offers of a retry.
      reject(
        stalled
          ? new UploadError('timeout', `No progress for ${STALL_TIMEOUT_MS / 1000}s; the connection appears to have dropped.`)
          : new UploadError('aborted', 'The upload was cancelled.'),
      );
    };

    if (config.signal) {
      if (config.signal.aborted) {
        reject(new UploadError('aborted', 'The upload was cancelled.'));
        return;
      }
      config.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    armWatchdog();
    xhr.send(body);
  });
}

/**
 * Sends a multipart body and reports how much of it has gone out.
 *
 * Retries once through the shared refresh when the session has expired, in
 * which case the file is sent a second time — unavoidable, since the bytes are
 * consumed by the first attempt, and far better than telling somebody their
 * upload failed when their session merely needed renewing.
 */
export async function upload<T>(
  method: 'POST' | 'PATCH' | 'PUT',
  url: string,
  body: FormData,
  config: UploadConfig = {},
): Promise<ApiResponse<T>> {
  try {
    return await sendXhr<T>(method, url, body, config);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !isAuthEndpoint(url)) {
      await refreshAccessToken();
      // Progress restarts from zero for the second attempt; the caller's bar
      // simply fills again rather than appearing to go backwards from 100.
      config.onProgress?.(0);
      return await sendXhr<T>(method, url, body, config);
    }
    throw error;
  }
}

export const api = {
  get: <T>(url: string, config?: RequestConfig) => request<T>('GET', url, undefined, config),
  post: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('POST', url, body, config),
  /** Multipart with progress — see `upload` above for why it is not fetch. */
  upload: <T>(method: 'POST' | 'PATCH' | 'PUT', url: string, body: FormData, config?: UploadConfig) =>
    upload<T>(method, url, body, config),
  put: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PUT', url, body, config),
  patch: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PATCH', url, body, config),
  delete: <T>(url: string, config?: RequestConfig) => request<T>('DELETE', url, undefined, config),
};
