import { ApiError } from '@/config/api';

/** The server's error envelope: a general message, plus per-field detail. */
export interface ApiErrorBody {
  message?: string;
  errors?: { path: string; message: string }[];
}

/**
 * The server's error body, or undefined if the failure never reached it.
 *
 * The single place that knows the shape. Callers that only want something to
 * show should use `apiMessage`; this is for forms that map `errors` back onto
 * their own fields.
 */
export function apiErrorBody(error: unknown): ApiErrorBody | undefined {
  return error instanceof ApiError ? (error.response?.data as ApiErrorBody | undefined) : undefined;
}

/**
 * Something to show the person who hit the error.
 *
 * Reaching for the first field error before the general message matters:
 * "شمارهٔ تماس معتبر نیست" tells somebody what to fix and "اطلاعات فرم نامعتبر
 * است" does not.
 *
 * Anything that is not an ApiError — a dropped connection, a parse failure —
 * gets the caller's fallback rather than its own text. The UI is Persian and
 * English; "Failed to fetch" is neither, and is not addressed to a user.
 */
export function apiMessage(error: unknown, fallback: string): string {
  const body = apiErrorBody(error);
  return body?.errors?.[0]?.message ?? body?.message ?? fallback;
}
