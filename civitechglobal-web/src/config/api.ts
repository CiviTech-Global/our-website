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
 * The server wraps every response as `{ success, message, data, meta? }`.
 * Unwrapping here lets the rest of the app treat the result as the payload —
 * a plain object or array, or `{ data, total, page, limit }` when the server
 * sent pagination meta.
 */
function unwrap(body: unknown): unknown {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const envelope = body as { data: unknown; meta?: Record<string, unknown> };
    return envelope.meta ? { data: envelope.data, ...envelope.meta } : envelope.data;
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

export const api = {
  get: <T>(url: string, config?: RequestConfig) => request<T>('GET', url, undefined, config),
  post: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('POST', url, body, config),
  put: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PUT', url, body, config),
  patch: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PATCH', url, body, config),
  delete: <T>(url: string, config?: RequestConfig) => request<T>('DELETE', url, undefined, config),
};
