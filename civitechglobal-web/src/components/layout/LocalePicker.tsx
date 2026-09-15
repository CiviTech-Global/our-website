import { useEffect, useId, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALES, LOCALE_NAMES, LOCALE_TAGS } from '@/i18n/locales';
import { cn } from '@/lib/utils';

/**
 * The language menu.
 *
 * This replaced a two-state toggle. A toggle is the right control for two
 * languages and the wrong one for six: cycling through a list to reach Spanish
 * means passing through four languages you cannot read, and the label can only
 * ever name one destination. A menu shows every option at once, in its own
 * script, with the current one marked.
 *
 * Two shapes, one behaviour. `variant="compact"` is the icon button the navbar
 * and dashboard header use; `variant="inline"` is the labelled row for the
 * mobile sheet, where there is width for the language's name and no room for a
 * floating panel.
 */
export function LocalePicker({
  variant = 'compact',
  className,
  triggerClassName,
}: {
  variant?: 'compact' | 'inline';
  className?: string;
  /** Lets a host match its own control size — the dashboard topbar runs larger. */
  triggerClassName?: string;
}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Dismissal is a press elsewhere or Escape — never the pointer leaving, which
  // would close the panel while you are travelling towards it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="group" aria-label="Language">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            lang={LOCALE_TAGS[option]}
            onClick={() => setLocale(option)}
            aria-current={option === locale ? 'true' : undefined}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
              option === locale
                ? 'bg-brand-green-500/15 text-brand-green-600 dark:text-brand-green-400'
                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
            )}
          >
            {LOCALE_NAMES[option]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? id : undefined}
        // The button shows a globe, so the accessible name has to carry both
        // what it does and where it currently stands.
        aria-label={`Language: ${LOCALE_NAMES[locale]}`}
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary',
          triggerClassName
        )}
      >
        <Languages className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={id}
          role="menu"
          className="glass absolute end-0 top-full z-50 mt-2 min-w-40 rounded-xl p-1.5 shadow-soft"
        >
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              lang={LOCALE_TAGS[option]}
              onClick={() => {
                setLocale(option);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors',
                option === locale
                  ? 'text-brand-green-600 dark:text-brand-green-400'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              )}
            >
              {LOCALE_NAMES[option]}
              {option === locale && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
