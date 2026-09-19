import { ApiError, UploadError, isApiError } from '@/config/api';
import type fa from '@/i18n/fa';

/**
 * What went wrong with an upload, in two registers.
 *
 * `message` is for the person: what happened and what to do about it, in their
 * language, never a status code. `detail` is for whoever has to fix it — the
 * status, the server's own words, the file that caused it — and is shown in a
 * collapsed line and logged to the console, so a screenshot of a failure is
 * actually actionable instead of "it says it didn't work".
 *
 * Every branch here is a failure somebody has actually hit: a photograph
 * straight off a camera (413), a .heic the allowlist does not take (415), a
 * laptop lid closed mid-upload (network), a session that expired while a form
 * was open (401), and a file the scanner refused (422). A single "upload
 * failed" for all five is what this replaces.
 */

export interface UploadDiagnosis {
  /** Shown to the person, in their language. */
  message: string;
  /** Shown under "details", and logged. English, technical, never translated. */
  detail: string;
  /** Whether trying the same file again could plausibly work. */
  retryable: boolean;
  /** True when the fix is to pick a different file, not to retry this one. */
  needsDifferentFile: boolean;
}

type Dict = typeof fa;

/** The server's own message, when it sent one worth showing. */
function serverMessage(error: ApiError): string | null {
  const data = error.response.data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return null;
}

function fieldErrors(error: ApiError): string {
  const data = error.response.data;
  if (data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
    return (data.errors as Array<{ path?: string; message?: string }>)
      .map((e) => `${e.path ?? '?'}: ${e.message ?? '?'}`)
      .join('; ');
  }
  return '';
}

export function diagnoseUpload(error: unknown, t: Dict, file?: File | null): UploadDiagnosis {
  const where = file ? `${file.name} (${file.type || 'unknown type'}, ${file.size} bytes)` : 'no file';

  // Reached the server, which said why.
  if (isApiError(error)) {
    const server = serverMessage(error);
    const fields = fieldErrors(error);
    const detail = [`HTTP ${error.status}`, server, fields, where].filter(Boolean).join(' — ');

    switch (error.status) {
      case 413:
        return {
          // The server's message names the actual limit, which is more use
          // than a generic "too large".
          message: server ?? t.upload.errors.tooLarge,
          detail,
          retryable: false,
          needsDifferentFile: true,
        };
      case 415:
        return {
          message: server ?? t.upload.errors.wrongType,
          detail,
          retryable: false,
          needsDifferentFile: true,
        };
      case 422:
        // The malware scanner's verdict, or a file that failed inspection.
        return {
          message: server ?? t.upload.errors.rejected,
          detail,
          retryable: false,
          needsDifferentFile: true,
        };
      case 400:
        return {
          message: server ?? t.upload.errors.invalid,
          detail,
          retryable: false,
          needsDifferentFile: false,
        };
      case 401:
        // upload() already retried once through a refresh, so reaching here
        // means the session is genuinely gone.
        return {
          message: t.upload.errors.session,
          detail,
          retryable: false,
          needsDifferentFile: false,
        };
      case 403:
        return {
          message: server ?? t.upload.errors.forbidden,
          detail,
          retryable: false,
          needsDifferentFile: false,
        };
      case 429:
        return { message: server ?? t.upload.errors.tooMany, detail, retryable: true, needsDifferentFile: false };
      case 501:
        return { message: server ?? t.upload.errors.unavailable, detail, retryable: false, needsDifferentFile: false };
      default:
        return {
          message: error.status >= 500 ? t.upload.errors.server : (server ?? t.upload.errors.unknown),
          detail,
          retryable: error.status >= 500,
          needsDifferentFile: false,
        };
    }
  }

  // Never reached the server.
  if (error instanceof UploadError) {
    const detail = `${error.kind}: ${error.message} — ${where}`;
    switch (error.kind) {
      case 'aborted':
        return { message: t.upload.errors.cancelled, detail, retryable: true, needsDifferentFile: false };
      case 'timeout':
        return { message: t.upload.errors.timeout, detail, retryable: true, needsDifferentFile: false };
      default:
        return {
          message: typeof navigator !== 'undefined' && navigator.onLine === false
            ? t.upload.errors.offline
            : t.upload.errors.network,
          detail,
          retryable: true,
          needsDifferentFile: false,
        };
    }
  }

  const detail = `${error instanceof Error ? `${error.name}: ${error.message}` : String(error)} — ${where}`;
  return { message: t.upload.errors.unknown, detail, retryable: true, needsDifferentFile: false };
}

/**
 * The same diagnosis, in the console, where a developer looking at a bug
 * report will find it. Grouped so it is one collapsed line rather than noise.
 */
export function logUploadFailure(context: string, diagnosis: UploadDiagnosis, error: unknown): void {
   
  console.error(`[upload:${context}] ${diagnosis.detail}`, error);
}
