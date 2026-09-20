import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { showcaseImageSrc, type ProjectShot } from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';

/**
 * A project's screenshots, as a strip that opens into a viewer.
 *
 * The strip is the honest default: a card in a grid has no room for a picture
 * anybody can read, and a row of thumbnails says "there is more to see"
 * without pretending the thumbnail is the thing. Clicking opens the full
 * picture with its caption.
 *
 * The viewer is a plain overlay rather than a modal library: it needs Escape,
 * the arrow keys, and a way out — which is the whole of what a lightbox is.
 */
export function ProjectGallery({ shots, title }: { shots: ProjectShot[]; title: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState<number | null>(null);

  const count = shots.length;
  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  // Escape closes, arrows move. Registered only while something is open, so
  // the page's own keys are untouched the rest of the time.
  useEffect(() => {
    if (open === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
      if (event.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % count));
      if (event.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, count]);

  if (count === 0) return null;

  // Both captured together, so the index keeps its narrowing inside the JSX.
  const current = open === null ? null : { index: open, shot: shots[open] };

  return (
    <div>
      <p className="mb-2 text-xs text-text-muted">{t.showcase.gallery}</p>

      <ul className="flex gap-2 overflow-x-auto pb-1">
        {shots.map((shot, index) => (
          <li key={shot.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="block overflow-hidden rounded-lg border border-border-default transition hover:border-brand-green-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/40"
              aria-label={t.showcase.shotOf
                .replace('{index}', number(index + 1))
                .replace('{total}', number(count))}
            >
              <img
                src={showcaseImageSrc(shot.url)}
                alt={shot.caption ?? ''}
                loading="lazy"
                className="h-16 w-24 object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
        >
          {/* The backdrop is a real button rather than a div with a click
              handler: dismissing by clicking away has to be reachable from a
              keyboard too, and that is what a button already is. It also puts
              the dismiss target behind the content as a sibling, so nothing
              else needs to stop the event bubbling to it. */}
          <button
            type="button"
            aria-label={t.showcase.closeGallery}
            className="absolute inset-0 cursor-default bg-black/80"
            onClick={() => setOpen(null)}
          />

          <button
            type="button"
            aria-label={t.showcase.closeGallery}
            className="absolute end-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setOpen(null)}
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <figure className="relative z-10 max-h-full max-w-4xl">
            <img
              src={showcaseImageSrc(current.shot.url)}
              alt={current.shot.caption ?? title}
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-white/80">
              {current.shot.caption && <span className="block">{current.shot.caption}</span>}
              <span className="text-white/60">
                {t.showcase.shotOf
                  .replace('{index}', number(current.index + 1))
                  .replace('{total}', number(count))}
              </span>
            </figcaption>
          </figure>

          {count > 1 && (
            <div className="relative z-10 mt-4 flex items-center gap-4">
              <button
                type="button"
                aria-label={t.common.previous}
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => setOpen((i) => (i === null ? i : (i - 1 + count) % count))}
              >
                <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t.common.next}
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => setOpen((i) => (i === null ? i : (i + 1) % count))}
              >
                <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
