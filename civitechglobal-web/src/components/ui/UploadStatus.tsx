import { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Loader2, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatBytes } from '@/lib/formatBytes';
import type { UploadDiagnosis } from '@/lib/uploadError';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export type UploadPhase =
  | 'idle'
  | 'preparing'
  | 'shrinking'
  /** Prepared and waiting for the form to be submitted — nothing sent yet. */
  | 'ready'
  | 'uploading'
  | 'finishing'
  | 'done'
  | 'error';

export interface UploadState {
  phase: UploadPhase;
  /** 0–100 while uploading. */
  percent: number;
  file: File | null;
  /** Set when an image was re-encoded before sending. */
  originalBytes?: number;
  error?: UploadDiagnosis;
}

export const IDLE: UploadState = { phase: 'idle', percent: 0, file: null };

/**
 * What is happening to this file, and what to do when it goes wrong.
 *
 * One component for every upload on the site, because the alternative — each
 * screen inventing its own spinner and its own "something went wrong" — is
 * what made a failed upload impossible to report and impossible to diagnose.
 *
 * Three things it insists on:
 *
 *   A bar that means something. It reflects bytes actually sent, and stops at
 *   the point the browser stops knowing: once the body is out, the server is
 *   still scanning and writing it, so the bar sits at 100% under a "checking
 *   it" line rather than claiming to be finished.
 *
 *   A reason, not a shrug. diagnoseUpload turns the status into a sentence
 *   about this file, and the technical detail is one click away rather than
 *   only in the console.
 *
 *   Announced. The phase changes are in a live region, so somebody using a
 *   screen reader is told the upload finished rather than being left to guess
 *   from a bar they cannot see.
 */
export function UploadStatus({
  state,
  onRetry,
  onCancel,
  onRemove,
  className,
}: {
  state: UploadState;
  onRetry?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  if (state.phase === 'idle' || !state.file) return null;

  const size = formatBytes(state.file.size, locale);
  const busy = state.phase === 'preparing' || state.phase === 'shrinking' || state.phase === 'uploading' || state.phase === 'finishing';

  const label = (() => {
    switch (state.phase) {
      case 'preparing':
        return t.upload.states.preparing;
      case 'shrinking':
        return t.upload.states.shrinking;
      case 'uploading':
        return t.upload.states.uploadingPercent.replace(
          '{percent}',
          locale === 'fa' ? toFaDigits(state.percent) : String(state.percent),
        );
      case 'finishing':
        return t.upload.states.finishing;
      case 'ready':
        return t.upload.states.ready;
      case 'done':
        return t.upload.states.done;
      case 'error':
        // A file that was never sent did not fail to upload — it was refused
        // before it left, and saying otherwise sends people hunting for a
        // network problem that was never there.
        return state.error?.needsDifferentFile ? t.upload.states.notUsable : t.upload.states.failed;
      default:
        return '';
    }
  })();

  return (
    <div
      className={cn(
        'rounded border px-3 py-2.5',
        state.phase === 'error'
          ? 'border-status-error-border bg-status-error-bg'
          : state.phase === 'done' || state.phase === 'ready'
            ? 'border-status-success-border bg-status-success-bg'
            : 'border-app-border bg-app-subtle',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">
          {busy && <Loader2 className="size-4 animate-spin text-app-text-3" aria-hidden="true" />}
          {(state.phase === 'done' || state.phase === 'ready') && <CheckCircle2 className="size-4 text-status-success" aria-hidden="true" />}
          {state.phase === 'error' && <AlertCircle className="size-4 text-status-error" aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-app-text" title={state.file.name}>
            {state.file.name}
          </p>

          {/* The status line is the live region: the file name does not change,
              so announcing the whole block would repeat it on every tick. */}
          <p className="mt-0.5 text-label text-app-text-3" aria-live="polite">
            <span>{label}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span dir="ltr">{size}</span>
            {state.originalBytes !== undefined && state.phase !== 'error' && (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>
                  {t.upload.savedFrom
                    .replace('{original}', formatBytes(state.originalBytes, locale))
                    .replace('{size}', size)}
                </span>
              </>
            )}
          </p>

          {state.phase === 'error' && state.error && (
            <>
              <p className="mt-1.5 text-body text-app-text">{state.error.message}</p>

              <button
                type="button"
                className="mt-1 text-label text-app-text-3 underline underline-offset-2 hover:text-app-text"
                onClick={() => setShowDetail((open) => !open)}
                aria-expanded={showDetail}
              >
                {showDetail ? t.upload.hideDetails : t.upload.showDetails}
              </button>

              {showDetail && (
                <div className="mt-1.5 rounded border border-app-border-light bg-app-panel p-2">
                  <code className="block break-all text-caption text-app-text-3" dir="ltr">
                    {state.error.detail}
                  </code>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-caption text-app-text-3 hover:text-app-text"
                      onClick={() => {
                        void navigator.clipboard?.writeText(state.error!.detail).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        });
                      }}
                    >
                      <Copy className="size-3" aria-hidden="true" />
                      {copied ? t.upload.copied : t.upload.copyDetails}
                    </button>
                    <span className="text-caption text-app-text-4">{t.upload.detailsHint}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* A bar only while there is something to measure. */}
          {(state.phase === 'uploading' || state.phase === 'finishing') && (
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-fill"
              role="progressbar"
              aria-valuenow={state.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.upload.states.uploading}
            >
              <div
                className={cn(
                  'h-full rounded-full bg-app-primary transition-[width] duration-200',
                  // Once the bytes are out the bar cannot move, so it pulses
                  // instead of sitting still and looking stuck.
                  state.phase === 'finishing' && 'animate-pulse',
                )}
                style={{ width: `${state.percent}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {state.phase === 'uploading' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={t.upload.cancel}
              className="rounded p-1 text-app-text-3 hover:bg-app-hover hover:text-app-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          {state.phase === 'error' && state.error?.retryable && onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {t.upload.retry}
            </Button>
          )}
          {state.phase === 'done' && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t.upload.remove}
              className="rounded p-1 text-app-text-3 hover:bg-app-hover hover:text-app-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Local copy to avoid importing the i18n util into a leaf component. */
function toFaDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
