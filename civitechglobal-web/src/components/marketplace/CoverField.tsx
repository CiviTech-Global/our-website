import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatBytes } from '@/lib/formatBytes';
import { ImageTooLargeError, MAX_IMAGE_BYTES, prepareImage } from '@/lib/prepareImage';
import { Button } from '@/components/ui/Button';
import { UploadStatus, type UploadState } from '@/components/ui/UploadStatus';

/**
 * Pick a picture, watch what happens to it.
 *
 * The shrinking happens here rather than at submit time so the person sees the
 * result: the preview is the image that will be stored, and the line beneath
 * says what it now weighs and what it weighed before. A failure is reported
 * where it happened, against the control that caused it, rather than as a
 * surprise 413 after the rest of the form has been filled in.
 *
 * Once the form is submitted the same block shows the upload itself — see
 * `uploadState`, which the parent owns because the request belongs to the
 * form, not to this field.
 */
export function CoverField({
  value,
  previewUrl,
  onChange,
  uploadState,
  onRetryUpload,
  onCancelUpload,
}: {
  value: File | null;
  /** An already-stored cover, shown until a new one is picked. */
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  /** The parent's submit progress, once there is one. */
  uploadState?: UploadState;
  onRetryUpload?: () => void;
  onCancelUpload?: () => void;
}) {
  const { t, locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [localState, setLocalState] = useState<UploadState | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function handlePick(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    setLocalState({ phase: 'shrinking', percent: 0, file });

    try {
      const prepared = await prepareImage(file);
      onChange(prepared.file);
      setLocalPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(prepared.file);
      });
      // Not 'done': the file has not left the browser. The parent's
      // uploadState takes over once the form is submitted.
      setLocalState({
        phase: 'ready',
        percent: 100,
        file: prepared.file,
        originalBytes: prepared.originalBytes,
      });
    } catch (error) {
      onChange(null);
      setLocalState({
        phase: 'error',
        percent: 0,
        file,
        error: {
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
        },
      });
    } finally {
      setPreparing(false);
      // Let the same file be picked again after a failure; without this the
      // input holds the old value and the change event never fires.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const shown = localPreview ?? previewUrl ?? null;
  // The submit's progress wins over the local "ready" line once it starts.
  const status = uploadState && uploadState.phase !== 'idle' ? uploadState : localState;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="size-28 shrink-0 overflow-hidden rounded border border-app-border bg-app-subtle">
          {shown ? (
            <img src={shown} alt="" className="size-full object-contain" />
          ) : (
            <div className="flex size-full items-center justify-center text-app-text-4">
              <ImagePlus className="size-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void handlePick(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={preparing} onClick={() => inputRef.current?.click()}>
            {preparing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {preparing
              ? t.upload.states.shrinking
              : value || shown
                ? t.upload.replace
                : t.upload.chooseImage}
          </Button>

          <p className="mt-2 text-label text-app-text-3">{t.books.coverHint}</p>
          <p className="mt-0.5 text-caption text-app-text-4">
            {t.upload.accepted
              .replace('{types}', 'JPG, PNG, WebP')
              .replace('{max}', formatBytes(MAX_IMAGE_BYTES, locale))}
          </p>
        </div>
      </div>

      {status && (
        <UploadStatus state={status} onRetry={onRetryUpload} onCancel={onCancelUpload} />
      )}
    </div>
  );
}
