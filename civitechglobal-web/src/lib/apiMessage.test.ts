import { describe, expect, it } from 'vitest';
import { ApiError } from '@/config/api';
import { apiErrorBody, apiMessage } from './apiMessage';

const FALLBACK = 'مشکلی پیش آمد';

/** Mirrors the server envelope: `{ success, message, errors? }`. */
function apiError(status: number, data: unknown): ApiError {
  return new ApiError(status, data, 'unused');
}

describe('apiMessage', () => {
  it('prefers a field error over the general message', () => {
    // "Enter a valid phone number" tells somebody what to fix; "Validation
    // failed" does not.
    const error = apiError(400, {
      message: 'Validation failed',
      errors: [{ path: 'phone', message: 'شمارهٔ تماس معتبر نیست' }],
    });

    expect(apiMessage(error, FALLBACK)).toBe('شمارهٔ تماس معتبر نیست');
  });

  it('uses the general message when there are no field errors', () => {
    expect(apiMessage(apiError(429, { message: 'کمی بعد دوباره تلاش کنید' }), FALLBACK)).toBe(
      'کمی بعد دوباره تلاش کنید'
    );
  });

  it('falls back when the body carries neither', () => {
    expect(apiMessage(apiError(500, {}), FALLBACK)).toBe(FALLBACK);
    expect(apiMessage(apiError(502, null), FALLBACK)).toBe(FALLBACK);
    expect(apiMessage(apiError(503, 'a wall of HTML'), FALLBACK)).toBe(FALLBACK);
  });

  it('ignores an empty errors array', () => {
    const error = apiError(400, { message: 'خطا', errors: [] });
    expect(apiMessage(error, FALLBACK)).toBe('خطا');
  });

  it('never shows a browser error to the user', () => {
    // The UI is Persian and English; "Failed to fetch" is neither, and is not
    // addressed to a user.
    expect(apiMessage(new TypeError('Failed to fetch'), FALLBACK)).toBe(FALLBACK);
    expect(apiMessage(new Error('socket hang up'), FALLBACK)).toBe(FALLBACK);
  });

  it('handles values that are not errors at all', () => {
    expect(apiMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(apiMessage('a thrown string', FALLBACK)).toBe(FALLBACK);
  });
});

describe('apiErrorBody', () => {
  it('hands back the whole envelope for a form to map onto its fields', () => {
    const errors = [
      { path: 'answers.plate', message: 'پلاک نامعتبر است' },
      { path: 'answers.year', message: 'سال نامعتبر است' },
    ];

    expect(apiErrorBody(apiError(400, { message: 'Validation failed', errors }))?.errors).toEqual(
      errors
    );
  });

  it('is undefined when the failure never reached the server', () => {
    expect(apiErrorBody(new TypeError('Failed to fetch'))).toBeUndefined();
    expect(apiErrorBody(null)).toBeUndefined();
  });
});
