import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { useHelpLibrary } from '@/content/help/load';
import { cn } from '@/lib/utils';
import { useHelp } from './HelpContext';

const KEY = 'ct-help-tips';

/** Which tips have been put away, as "guide:index" strings. Per browser, not per account. */
function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // A browser refusing storage shows the tip again next time, which is harmless.
  }
}

function TipCard({
  title,
  body,
  counter,
  onDismiss,
  onMore,
  className,
}: {
  title: string;
  body: string;
  counter?: string;
  onDismiss: () => void;
  onMore?: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <aside
      aria-label={t.help.tipLabel}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-brand-amber-500/30 bg-brand-amber-500/[0.06] p-4',
        className
      )}
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-amber-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-text-primary">
          {title}
          {counter && <span className="text-xs font-normal text-text-muted">{counter}</span>}
        </p>
        <p className="mt-1 text-sm leading-6 text-text-secondary">{body}</p>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="mt-2 text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
          >
            {t.help.openGuideLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.help.dismissTip}
        title={t.help.dismissTip}
        className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-100 hover:text-text-primary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  );
}

/**
 * The next tip for the screen on show, one at a time, at the top of every
 * dashboard and admin screen.
 *
 * Dismissing a tip puts it away for good and the next one appears on the next
 * visit, so a screen teaches itself gradually instead of in one wall of text,
 * and somebody who has read them all sees nothing at all.
 */
export function ScreenTips() {
  const { t, locale } = useLocale();
  const { pageEntry, open } = useHelp();
  const library = useHelpLibrary(locale);
  const [dismissed, setDismissed] = useState(readDismissed);

  const tips = pageEntry ? (library?.article(pageEntry.id)?.text.tips ?? []) : [];
  const index = tips.findIndex((_, i) => !dismissed.has(`${pageEntry?.id}:${i}`));
  if (!pageEntry || index === -1) return null;

  const [title, body] = tips[index];
  const number = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));
  const counter = t.help.tipCounter.replace('{n}', number(index + 1)).replace('{total}', number(tips.length));

  return (
    <TipCard
      className="mb-5"
      title={title}
      body={body}
      counter={tips.length > 1 ? counter : undefined}
      onMore={() => open()}
      onDismiss={() => {
        const next = new Set(dismissed);
        next.add(`${pageEntry.id}:${index}`);
        writeDismissed(next);
        setDismissed(next);
      }}
    />
  );
}

/**
 * One named tip, placed in the section of a public page it is about.
 *
 * A tip about the budget field belongs beside the budget field, so public
 * pages place these by hand rather than stacking them at the top.
 */
export function PageTip({ guide, tip, className }: { guide: string; tip: number; className?: string }) {
  const { locale } = useLocale();
  const library = useHelpLibrary(locale);
  const [dismissed, setDismissed] = useState(readDismissed);
  const key = `${guide}:${tip}`;
  const pair = library?.article(guide)?.text.tips?.[tip];
  if (!pair || dismissed.has(key)) return null;

  return (
    <TipCard
      className={className}
      title={pair[0]}
      body={pair[1]}
      onDismiss={() => {
        const next = new Set(dismissed);
        next.add(key);
        writeDismissed(next);
        setDismissed(next);
      }}
    />
  );
}
