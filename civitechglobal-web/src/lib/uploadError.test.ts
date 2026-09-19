import { describe, expect, it, vi } from 'vitest';
import { ApiError, UploadError } from '@/config/api';
import en from '@/i18n/en';
import { diagnoseUpload } from './uploadError';

const file = new File([new Uint8Array(3)], 'holiday.heic', { type: 'image/heic' });

/** Builds the shape the server actually sends on a failure. */
const apiError = (status: number, body: unknown) => new ApiError(status, body, 'fallback');

describe('what the person is told', () => {
  it('prefers the server\'s own words, which name the real limit', () => {
    const { message } = diagnoseUpload(
      apiError(413, { success: false, message: 'حجم فایل بیش از ۳۰۰ کیلوبایت است.' }),
      en,
      file,
    );

    expect(message).toBe('حجم فایل بیش از ۳۰۰ کیلوبایت است.');
  });

  it('falls back to its own wording when the server sent none', () => {
    expect(diagnoseUpload(apiError(413, null), en, file).message).toBe(en.upload.errors.tooLarge);
    expect(diagnoseUpload(apiError(415, null), en, file).message).toBe(en.upload.errors.wrongType);
  });

  it('never shows the server\'s words for an expired session', () => {
    // The server's 401 body is about tokens; the person needs to know to sign
    // in again, which is a different sentence.
    const { message } = diagnoseUpload(apiError(401, { message: 'Access token required' }), en, file);

    expect(message).toBe(en.upload.errors.session);
  });

  it('distinguishes being offline from the server being unreachable', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get');

    online.mockReturnValue(false);
    expect(diagnoseUpload(new UploadError('network', 'x'), en, file).message).toBe(en.upload.errors.offline);

    online.mockReturnValue(true);
    expect(diagnoseUpload(new UploadError('network', 'x'), en, file).message).toBe(en.upload.errors.network);

    online.mockRestore();
  });

  it('names a timeout and a cancellation as themselves', () => {
    expect(diagnoseUpload(new UploadError('timeout', 'x'), en, file).message).toBe(en.upload.errors.timeout);
    expect(diagnoseUpload(new UploadError('aborted', 'x'), en, file).message).toBe(en.upload.errors.cancelled);
  });
});

describe('what the developer is told', () => {
  it('carries the status, the server message and the file', () => {
    const { detail } = diagnoseUpload(apiError(422, { message: 'infected' }), en, file);

    expect(detail).toContain('HTTP 422');
    expect(detail).toContain('infected');
    expect(detail).toContain('holiday.heic');
    expect(detail).toContain('image/heic');
    expect(detail).toContain('3 bytes');
  });

  it('spells out per-field validation errors', () => {
    const { detail } = diagnoseUpload(
      apiError(400, { errors: [{ path: 'cover', message: 'required' }] }),
      en,
      file,
    );

    expect(detail).toContain('cover: required');
  });

  it('says so when there was no file at all', () => {
    expect(diagnoseUpload(apiError(500, null), en, null).detail).toContain('no file');
  });
});

describe('what to do next', () => {
  it('offers a retry only where retrying could work', () => {
    expect(diagnoseUpload(new UploadError('network', 'x'), en, file).retryable).toBe(true);
    expect(diagnoseUpload(apiError(500, null), en, file).retryable).toBe(true);
    expect(diagnoseUpload(apiError(429, null), en, file).retryable).toBe(true);

    // Sending the same too-large file again cannot succeed.
    expect(diagnoseUpload(apiError(413, null), en, file).retryable).toBe(false);
    expect(diagnoseUpload(apiError(415, null), en, file).retryable).toBe(false);
    expect(diagnoseUpload(apiError(422, null), en, file).retryable).toBe(false);
  });

  it('marks the cases where a different file is the fix', () => {
    expect(diagnoseUpload(apiError(413, null), en, file).needsDifferentFile).toBe(true);
    expect(diagnoseUpload(apiError(422, null), en, file).needsDifferentFile).toBe(true);
    expect(diagnoseUpload(apiError(401, null), en, file).needsDifferentFile).toBe(false);
  });
});
