import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * The access token is kept ONLY in memory (module-level variable) and is never
 * persisted to localStorage/sessionStorage — this avoids exposing it to XSS-borne
 * script injection. The refresh token lives solely in an httpOnly cookie set by the
 * backend and is never touched by client JS.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken && !isAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * The backend wraps every response as `{ success, message, data, meta? }`
 * (see `src/utils/apiResponse.ts` on the server). Unwrap it here so the rest
 * of the frontend can treat `response.data` as the raw payload — a plain
 * object/array for simple endpoints, or `{ data, total, page, limit }`
 * (matching `PaginatedResponse<T>`) when the server sent pagination `meta`.
 */
api.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    response.data = body.meta ? { data: body.data, ...body.meta } : body.data;
  }
  return response;
});

// --- 401 auto-refresh with a single in-flight refresh + request queue ---

type QueuedRequest = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let refreshQueue: QueuedRequest[] = [];

function flushQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const response = await api.post<{ accessToken: string }>('/auth/refresh');
  const { accessToken: newToken } = response.data;
  setAccessToken(newToken);
  return newToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest || error.response?.status !== 401 || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      flushQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      flushQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
