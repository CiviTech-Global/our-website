import { useEffect, useState } from 'react';
import { Download, FileText, TriangleAlert } from 'lucide-react';
import { api } from '@/config/api';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

export interface FilePreviewProps {
  /** API path serving the file, without the disposition query. */
  url: string;
  filename: string;
  /** Shown as the modal's heading. Defaults to the filename. */
  title?: string;
  onClose: () => void;
}

/** What we can put on screen, matching the server's own inline allow list. */
function previewKind(contentType: string): 'pdf' | 'image' | 'text' | null {
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png' || type === 'image/jpeg' || type === 'image/webp') return 'image';
  if (type === 'text/plain' || type === 'text/markdown' || type === 'text/csv') return 'text';
  return null;
}

/**
 * Looking at an upload without downloading it.
 *
 * Reviewers approve identity documents, CVs and project briefs, which means
 * looking at them. Making that a download filled the reviewer's own disk with
 * copies of other people's personal papers, somewhere no retention rule of
 * ours reaches, and left them to open each one in another application.
 *
 * The bytes are fetched rather than linked because these routes are
 * staff-only: a plain <a href> sends no Authorization header and would get a
 * 401. They arrive as a blob, get an object URL, and that URL is revoked when
 * the modal closes — otherwise every document opened stays in memory for the
 * life of the tab.
 *
 * Anything not renderable falls back to a download button rather than an empty
 * frame, which is what the server does with the same file.
 */
export function FilePreview({ url, filename, title, onClose }: FilePreviewProps) {
  const { t } = useLocale();

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; kind: 'pdf' | 'image' | null; objectUrl: string }
    | { status: 'ready'; kind: 'text'; objectUrl: string; text: string }
  >({ status: 'loading' });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`${url}?disposition=inline`, { responseType: 'blob' });
        const blob = res.data as Blob;
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        const kind = previewKind(blob.type);

        if (kind === 'text') {
          const text = await blob.text();
          if (cancelled) return;
          setState({ status: 'ready', kind, objectUrl, text });
          return;
        }

        setState({ status: 'ready', kind, objectUrl });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: apiMessage(error, t.common.error) });
      }
    })();

    return () => {
      cancelled = true;
      // Without this every document opened stays in memory until the tab is
      // closed — and these are large scans, not thumbnails.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, t.common.error]);

  function download() {
    if (state.status !== 'ready') return;

    const link = document.createElement('a');
    link.href = state.objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <Modal isOpen onClose={onClose} title={title ?? filename} className="max-w-4xl">
      {state.status === 'loading' && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <TriangleAlert className="size-8 text-brand-red-500" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="flex flex-col gap-3">
          {state.kind === 'pdf' && (
            <iframe
              src={state.objectUrl}
              title={filename}
              className="h-[70vh] w-full rounded-lg border border-border-default bg-surface-200"
            />
          )}

          {state.kind === 'image' && (
            <img
              src={state.objectUrl}
              alt={filename}
              className="max-h-[70vh] w-full rounded-lg border border-border-default object-contain"
            />
          )}

          {state.kind === 'text' && (
            <pre className="ltr max-h-[70vh] overflow-auto rounded-lg border border-border-default bg-surface-200 p-3 text-xs text-text-primary">
              {state.text}
            </pre>
          )}

          {state.kind === null && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="size-8 text-text-muted" aria-hidden="true" />
              <p className="text-sm text-text-secondary">{t.common.file.notPreviewable}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="size-4" aria-hidden="true" />
              {t.common.file.download}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
