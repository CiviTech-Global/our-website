import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpenText, Languages, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useHelpLibrary } from '@/content/help/load';
import { canReadHelp, helpEntry } from '@/content/help/registry';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { HelpArticleView } from './HelpArticleView';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * The guide beside the page, not instead of it.
 *
 * A side panel rather than a modal in the middle of the screen: somebody
 * reading "step 3: press Publish" wants to see the Publish button while they
 * read. It slides in from the end edge — the side the language reads towards —
 * and holds focus the way the app's modal does, because on a phone it covers
 * the page and a keyboard user must not tab into what they cannot see.
 */
export function HelpPanel({
  articleId,
  onClose,
  onOpenGuide,
}: {
  /** Empty when the page has no guide yet. */
  articleId: string;
  onClose: () => void;
  onOpenGuide: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const library = useHelpLibrary(locale);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const entry = articleId ? helpEntry(articleId) : undefined;
  const readable = entry && canReadHelp(entry.audience, { isStaff });
  const article = readable ? library?.article(entry.id) : undefined;
  const collection = entry ? library?.collection(entry.collection) : undefined;
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    restoreFocus.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreFocus.current instanceof HTMLElement) restoreFocus.current.focus();
    };
  }, []);

  // A related guide opened in place starts at its top, not where the last one was scrolled to.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [articleId]);

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-[#0c111d]/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        className={cn(
          'absolute inset-y-0 end-0 flex w-full max-w-md flex-col border-s border-border-default bg-ground shadow-soft',
          locale === 'fa' ? 'ct-slide-in-left' : 'ct-slide-in-right'
        )}
      >
        <header className="flex items-start gap-3 border-b border-border-default px-5 py-4">
          <BookOpenText className="mt-1 size-5 shrink-0 text-brand-green-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-muted">{collection?.title ?? t.help.panelTitle}</p>
            <h2 id="help-panel-title" className="text-lg font-semibold text-text-primary">
              {article?.text.title ?? t.help.panelTitle}
            </h2>
            {article && <p className="mt-1 text-sm leading-6 text-text-secondary">{article.text.summary}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.help.close}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {!library && entry && readable ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} label={t.common.loading} />
            </div>
          ) : article && entry ? (
            <>
              {article.fallback && (
                <p className="mb-5 flex items-start gap-2 rounded-xl bg-surface-100 p-3 text-xs leading-5 text-text-secondary">
                  <Languages className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t.help.fallbackNote}
                </p>
              )}
              <HelpArticleView
                entry={entry}
                text={article.text}
                library={library!}
                isStaff={isStaff}
                compact
                headingLevel={3}
                onOpenGuide={onOpenGuide}
              />
            </>
          ) : (
            <p className="text-sm leading-7 text-text-secondary">{t.help.noGuide}</p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default px-5 py-3 text-sm">
          <Link
            to={article && entry ? `/help/${entry.id}` : '/help'}
            className="inline-flex items-center gap-1 font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
          >
            {article ? t.help.openInCentre : t.help.centreTitle}
            <ArrowIcon className="size-3.5" aria-hidden="true" />
          </Link>
          <span className="text-xs text-text-muted">{t.help.shortcutHint}</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}
