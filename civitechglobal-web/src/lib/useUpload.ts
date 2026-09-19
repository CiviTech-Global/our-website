import { useCallback, useRef, useState } from 'react';
import { api } from '@/config/api';
import { useLocale } from '@/i18n/LocaleProvider';
import { ImageTooLargeError, ImageUnreadableError, prepareImage } from '@/lib/prepareImage';
import { diagnoseUpload, logUploadFailure, type UploadDiagnosis } from '@/lib/uploadError';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';

export interface UseUploadOptions {
  /** Where the multipart body goes. */
  url: string;
  method?: 'POST' | 'PATCH' | 'PUT';
  /** Re-encode images to WebP under the size ceiling before sending. */
  prepareImages?: boolean;
  /** Names this upload in console diagnostics. */
  context: string;
  /** Builds the body. The prepared file is handed back, not the original. */
  buildBody: (file: File) => FormData;
  onSuccess?: (data: unknown, file: File) => void;
}

/**
 * One file, from the moment it is chosen to the moment the server accepts it.
 *
 * The state machine every upload screen was writing badly by hand:
 *
 *   preparing → shrinking (images only) → uploading → finishing → done | error
 *
 * `finishing` is the honest name for the gap nobody models: the browser has
 * sent the last byte and the request is still open while the server scans,
 * writes and commits. Showing "done" there is a lie that gets found out when
 * the scanner refuses the file two seconds later.
 *
 * Retry re-sends the file that is already chosen, so the person does not have
 * to find it again after a dropped connection.
 */
export function useUpload(options: UseUploadOptions) {
  const { t } = useLocale();
  const [state, setState] = useState<UploadState>(IDLE);
  const controller = useRef<AbortController | null>(null);
  // Kept so retry can re-send without another trip through the file picker.
  const pending = useRef<File | null>(null);

  const fail = useCallback(
    (diagnosis: UploadDiagnosis, file: File | null, error: unknown) => {
      logUploadFailure(options.context, diagnosis, error);
      setState((prev) => ({ ...prev, phase: 'error', file: file ?? prev.file, error: diagnosis }));
    },
    [options.context],
  );

  const send = useCallback(
    async (file: File, originalBytes?: number) => {
      controller.current = new AbortController();
      setState({ phase: 'uploading', percent: 0, file, originalBytes });

      try {
        const response = await api.upload(options.method ?? 'POST', options.url, options.buildBody(file), {
          signal: controller.current.signal,
          onProgress: (percent) =>
            setState((prev) =>
              prev.phase === 'uploading'
                ? // At 100% the bytes are gone but the answer has not arrived:
                  // switch to finishing rather than sitting on a full bar.
                  { ...prev, percent, ...(percent >= 100 ? { phase: 'finishing' as const } : {}) }
                : prev,
            ),
        });

        setState({ phase: 'done', percent: 100, file, originalBytes });
        options.onSuccess?.(response.data, file);
        return response.data;
      } catch (error) {
        fail(diagnoseUpload(error, t, file), file, error);
        return null;
      } finally {
        controller.current = null;
      }
    },
    [fail, options, t],
  );

  /** Takes the file the person picked and starts the whole sequence. */
  const start = useCallback(
    async (file: File) => {
      pending.current = file;
      setState({ phase: 'preparing', percent: 0, file });

      if (!options.prepareImages) return send(file);

      setState({ phase: 'shrinking', percent: 0, file });
      try {
        const prepared = await prepareImage(file);
        pending.current = prepared.file;
        return await send(prepared.file, prepared.originalBytes);
      } catch (error) {
        // The two image failures are about this file, not about the network,
        // so they never offer a retry — the answer is a different picture.
        if (error instanceof ImageTooLargeError || error instanceof ImageUnreadableError) {
          fail(
            {
              message:
                error instanceof ImageTooLargeError
                  ? t.upload.errors.imageTooLarge
                  : t.upload.errors.unreadableImage,
              detail: `${error.name}: ${error.message} — ${file.name} (${file.type || 'unknown type'}, ${file.size} bytes)`,
              retryable: false,
              needsDifferentFile: true,
            },
            file,
            error,
          );
          return null;
        }
        fail(diagnoseUpload(error, t, file), file, error);
        return null;
      }
    },
    [fail, options, send, t],
  );

  const retry = useCallback(() => {
    const file = pending.current;
    if (file) void send(file);
  }, [send]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    pending.current = null;
    setState(IDLE);
  }, []);

  return { state, start, retry, cancel, reset };
}
