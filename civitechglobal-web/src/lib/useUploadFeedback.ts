import { useCallback, useRef, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { ImageTooLargeError, prepareImage } from '@/lib/prepareImage';
import { diagnoseUpload, logUploadFailure, type UploadDiagnosis } from '@/lib/uploadError';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';

/**
 * Upload feedback for a form that carries files.
 *
 * Most uploads here are not standalone: the file travels with the rest of the
 * form in one request, so the progress belongs to the submit. Every such
 * screen needs the same four moments — start, progress, done, failed — and
 * writing them by hand on each one is how they drifted apart in the first
 * place, with a different spinner and a different "something went wrong" per
 * page.
 *
 *   const upload = useUploadFeedback('verification');
 *   upload.start(files);
 *   await mutate({ ..., onProgress: upload.onProgress });
 *   upload.done();
 *   } catch (error) { showToast(upload.fail(error).message, 'error'); }
 *
 * and `<UploadStatus state={upload.state} … />` wherever the files are shown.
 */
export function useUploadFeedback(context: string) {
  const { t } = useLocale();
  const [state, setState] = useState<UploadState>(IDLE);
  // The failure handler runs after the request settles, by which time a
  // closure over `state` would be stale. The ref always holds what was sent.
  const sent = useRef<File | null>(null);

  /**
   * Several files go out as one request, so the bar is for the batch. The
   * status line names the batch rather than pretending to be a single file,
   * and reports the combined size — which is what the server's limit applies
   * to and what the person is actually waiting for.
   */
  const asOne = useCallback(
    (files: File | File[] | null): File | null => {
      if (!files) return null;
      const list = Array.isArray(files) ? files.filter(Boolean) : [files];
      if (list.length === 0) return null;
      if (list.length === 1) return list[0];

      const total = list.reduce((sum, file) => sum + file.size, 0);
      const batch = new File([], t.upload.batch.replace('{count}', String(list.length)), {
        type: 'application/octet-stream',
      });
      // A File built from [] reports size 0; the status line should show what
      // is actually being sent.
      return Object.defineProperty(batch, 'size', { value: total });
    },
    [t],
  );

  const start = useCallback(
    (files: File | File[] | null) => {
      const file = asOne(files);
      sent.current = file;
      setState(file ? { phase: 'uploading', percent: 0, file } : IDLE);
    },
    [asOne],
  );

  const onProgress = useCallback((percent: number) => {
    setState((prev) =>
      prev.file
        ? // At 100% the bytes are gone and the answer has not arrived, so the
          // bar holds while the server scans and writes.
          { ...prev, phase: percent >= 100 ? 'finishing' : 'uploading', percent }
        : prev,
    );
  }, []);

  const done = useCallback(() => {
    sent.current = null;
    setState(IDLE);
  }, []);

  /**
   * Shrinks a chosen picture before it is held for submission.
   *
   * Every image on this site is decoration around text and the server refuses
   * anything over 300KB, so a portrait straight off a phone would be a 413 the
   * person can do nothing about. Re-encoding here turns that into a smaller
   * file and a line saying what it saved.
   *
   * Returns the file to keep, or null when it cannot be used — in which case
   * the state already explains why, and the caller simply stores nothing.
   */
  const pickImage = useCallback(
    async (file: File | null): Promise<File | null> => {
      if (!file) {
        setState(IDLE);
        return null;
      }

      setState({ phase: 'shrinking', percent: 0, file });
      try {
        const prepared = await prepareImage(file);
        sent.current = prepared.file;
        setState({
          // Not 'done': nothing has been sent, only made ready.
          phase: 'ready',
          percent: 100,
          file: prepared.file,
          originalBytes: prepared.originalBytes,
        });
        return prepared.file;
      } catch (error) {
        const diagnosis: UploadDiagnosis = {
          message:
            error instanceof ImageTooLargeError
              ? t.upload.errors.imageTooLarge
              : t.upload.errors.unreadableImage,
          detail: `${error instanceof Error ? error.name : 'Error'}: ${
            error instanceof Error ? error.message : String(error)
          } — ${file.name} (${file.type || 'unknown type'}, ${file.size} bytes)`,
          // A different picture is the fix; retrying this one changes nothing.
          retryable: false,
          needsDifferentFile: true,
        };
        logUploadFailure(context, diagnosis, error);
        setState({ phase: 'error', percent: 0, file, error: diagnosis });
        return null;
      }
    },
    [context, t],
  );

  /** Records the failure and hands back the diagnosis for the caller's toast. */
  const fail = useCallback(
    (error: unknown): UploadDiagnosis => {
      const diagnosis = diagnoseUpload(error, t, sent.current);
      logUploadFailure(context, diagnosis, error);
      setState((prev) =>
        prev.file ? { ...prev, phase: 'error', error: diagnosis } : { ...IDLE, error: diagnosis },
      );
      return diagnosis;
    },
    [context, t],
  );

  return { state, start, onProgress, done, fail, pickImage };
}
