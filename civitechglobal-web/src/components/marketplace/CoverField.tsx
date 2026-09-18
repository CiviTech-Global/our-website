import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { ImageTooLargeError, prepareImage } from '@/lib/prepareImage';
import { Button } from '@/components/ui/Button';

/**
 * Pick a picture, and get back one that is small enough to send.
 *
 * The shrinking happens here rather than at submit time so the person sees the
 * result — the preview they get is the image that will be stored, and the line
 * underneath says what it now weighs. A failure is reported when it happens,
 * next to the control that caused it, rather than as a surprise 413 after they
 * have filled in the rest of the form.
 */
export function CoverField({
  value,
  previewUrl,
  onChange,
  onError,
}: {
  value: File | null;
  /** An already-stored cover, shown until a new one is picked. */
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}) {
  const { t, locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const kb = (bytes: number) =>
    new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en', { maximumFractionDigits: 0 }).format(
      Math.max(1, Math.round(bytes / 1024)),
    );

  async function handlePick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      const prepared = await prepareImage(file);
      onChange(prepared.file);
      setLocalPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(prepared.file);
      });
      setNote(
        t.books.coverPrepared
          .replace('{size}', `${kb(prepared.file.size)} KB`)
          .replace('{original}', `${kb(prepared.originalBytes)} KB`),
      );
    } catch (error) {
      onChange(null);
      onError(error instanceof ImageTooLargeError ? t.books.coverTooLarge : t.books.coverUnreadable);
    } finally {
      setBusy(false);
      // Let the same file be picked again after a failure; without this the
      // input holds the old value and the change event never fires.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const shown = localPreview ?? previewUrl ?? null;

  return (
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
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? t.books.coverPreparing : value || shown ? t.books.coverReplace : t.books.coverChoose}
        </Button>
        <p className="mt-2 text-label text-app-text-3">{t.books.coverHint}</p>
        {note && <p className="mt-1 text-label text-status-success">{note}</p>}
      </div>
    </div>
  );
}
