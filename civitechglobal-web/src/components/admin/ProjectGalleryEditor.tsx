import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  useAddScreenshots,
  useRemoveScreenshot,
  useReorderScreenshots,
  type ProjectShot,
} from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import { prepareImage, ImageTooLargeError } from '@/lib/prepareImage';
import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StaffImage } from '@/components/ui/StaffImage';
import { UploadStatus } from '@/components/ui/UploadStatus';

const MAX_SHOTS = 12;

/**
 * The gallery on one project, from the editor's side.
 *
 * Pictures are chosen several at a time, shrunk in the browser before they go,
 * and ordered explicitly — the order is what the public page shows, and
 * "whichever was uploaded first" is not a decision anybody made.
 *
 * The captions are asked for after the pictures are chosen rather than before:
 * nobody can caption a photograph they have not seen a thumbnail of yet.
 */
export function ProjectGalleryEditor({
  projectId,
  // Defaulted: the prop comes from an API response, and a response from a
  // server that predates the field should leave the panel empty rather than
  // take the page down.
  shots = [],
}: {
  projectId: string;
  shots?: ProjectShot[];
}) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useAddScreenshots();
  const remove = useRemoveScreenshot();
  const reorder = useReorderScreenshots();
  const upload = useUploadFeedback('project-screenshots');

  const [preparing, setPreparing] = useState(false);
  const [pending, setPending] = useState<{ files: File[]; captions: string[] } | null>(null);

  const number = (value: number) =>
    locale === 'fa' ? String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : String(value);
  const remaining = MAX_SHOTS - shots.length;

  async function choose(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files).slice(0, remaining);

    setPreparing(true);
    try {
      // Shrunk here, so what the person previews is what gets stored and the
      // server's 300KB ceiling is met before anything is sent.
      const prepared = await Promise.all(chosen.map((file) => prepareImage(file)));
      setPending({ files: prepared.map((p) => p.file), captions: prepared.map(() => '') });
    } catch (error) {
      showToast(
        error instanceof ImageTooLargeError ? t.upload.errors.imageTooLarge : t.upload.errors.unreadableImage,
        'error',
      );
    } finally {
      setPreparing(false);
      // Let the same files be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function send() {
    if (!pending) return;
    upload.start(pending.files);

    try {
      await add.mutateAsync({
        projectId,
        files: pending.files,
        captions: pending.captions.map((caption) => caption.trim() || null),
        onProgress: upload.onProgress,
      });
      upload.done();
      setPending(null);
      showToast(t.showcase.shotsAdded, 'success');
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...shots];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    try {
      await reorder.mutateAsync({ projectId, ids: next.map((shot) => shot.id) });
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-app-border-light p-4">
      <div>
        <p className="text-body font-medium text-app-text">{t.showcase.gallery}</p>
        <p className="mt-0.5 text-label text-app-text-3">{t.showcase.galleryHint}</p>
      </div>

      {shots.length === 0 && !pending && (
        <p className="text-body text-app-text-3">{t.showcase.galleryEmpty}</p>
      )}

      {shots.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shots.map((shot, index) => (
            <li key={shot.id} className="overflow-hidden rounded border border-app-border-light">
              <div className="aspect-video bg-app-subtle">
                <StaffImage
                  path={shot.url}
                  alt={shot.caption ?? ''}
                  className="size-full object-cover"
                  fallback={
                    <div className="flex size-full items-center justify-center text-app-text-4">
                      <ImagePlus className="size-5" aria-hidden="true" />
                    </div>
                  }
                />
              </div>

              <div className="flex items-center gap-1 p-2">
                <p className="min-w-0 flex-1 truncate text-caption text-app-text-3" title={shot.caption ?? ''}>
                  {shot.caption || '—'}
                </p>
                <button
                  type="button"
                  aria-label={t.showcase.moveUp}
                  disabled={index === 0 || reorder.isPending}
                  className="rounded p-1 text-app-text-3 hover:bg-app-hover disabled:opacity-40"
                  onClick={() => void move(index, -1)}
                >
                  <ArrowRight className="size-3.5 rtl:hidden" aria-hidden="true" />
                  <ArrowLeft className="hidden size-3.5 rtl:block" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t.showcase.moveDown}
                  disabled={index === shots.length - 1 || reorder.isPending}
                  className="rounded p-1 text-app-text-3 hover:bg-app-hover disabled:opacity-40"
                  onClick={() => void move(index, 1)}
                >
                  <ArrowLeft className="size-3.5 rtl:hidden" aria-hidden="true" />
                  <ArrowRight className="hidden size-3.5 rtl:block" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t.showcase.removeShot}
                  className="rounded p-1 text-status-error hover:bg-app-hover"
                  onClick={() => {
                    void remove
                      .mutateAsync(shot.id)
                      .then(() => showToast(t.showcase.shotRemoved, 'success'))
                      .catch((error: unknown) => showToast(apiMessage(error, t.common.error), 'error'));
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Captioned after the thumbnails exist: nobody can describe a picture
          they have not seen. */}
      {pending && (
        <ul className="flex flex-col gap-2">
          {pending.files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="size-14 shrink-0 rounded border border-app-border-light object-cover"
              />
              <Input
                aria-label={t.showcase.shotCaption}
                placeholder={t.showcase.shotCaption}
                value={pending.captions[index]}
                onChange={(e) =>
                  setPending((prev) =>
                    prev
                      ? {
                          ...prev,
                          captions: prev.captions.map((c, i) => (i === index ? e.target.value : c)),
                        }
                      : prev,
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      {upload.state.phase !== 'idle' && <UploadStatus state={upload.state} onRetry={() => void send()} />}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void choose(e.target.files)}
        />

        {remaining > 0 && !pending && (
          <Button type="button" variant="outline" size="sm" disabled={preparing} onClick={() => inputRef.current?.click()}>
            {preparing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-4" aria-hidden="true" />
            )}
            {preparing ? t.upload.states.shrinking : t.showcase.addShots}
          </Button>
        )}

        {pending && (
          <>
            <Button type="button" size="sm" isLoading={add.isPending} onClick={() => void send()}>
              {t.showcase.addShots}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPending(null);
                upload.done();
              }}
            >
              {t.common.cancel}
            </Button>
          </>
        )}

        {remaining > 0 && !pending && (
          <span className="text-label text-app-text-4">
            {t.showcase.shotLimit.replace('{count}', number(remaining))}
          </span>
        )}
      </div>
    </div>
  );
}
