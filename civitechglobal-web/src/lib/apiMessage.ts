import { ApiError } from '@/config/api';

/**
 * The server's own words for a failure, or a fallback.
 *
 * The API answers `{ success, message, errors? }`, where `errors` carries
 * per-field validation detail and `message` the general case. Reaching for the
 * first field error before the general message matters: "شمارهٔ تماس معتبر
 * نیست" tells somebody what to fix, and "اطلاعات فرم نامعتبر است" does not.
 */
export function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const data = error.response?.data as
      | { message?: string; errors?: { message: string }[] }
      | undefined;
    return data?.errors?.[0]?.message ?? data?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
