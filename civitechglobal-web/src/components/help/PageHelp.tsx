import { useEffect } from 'react';
import { BookOpenText, CircleHelp } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALE_TAGS } from '@/i18n/locales';
import { useAuth } from '@/contexts/AuthProvider';
import { useHelpLibrary } from '@/content/help/load';
import { faqPageSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { HelpArticleView } from './HelpArticleView';
import { useHelp } from './HelpContext';

/**
 * Marks the FAQ markup this component owns.
 *
 * Not the head manager's marker: useDocumentTitle clears everything it owns in
 * its own effect, which runs after this one (a parent's effects run after its
 * children's), so markup written under its marker would be deleted the moment
 * it was written.
 */
const OWNED = 'data-help-faq';

/**
 * The written half of every public page: what it is, how to use it, what it
 * connects to, and the questions people ask.
 *
 * Rendered once, by the public layout, for whichever guide the address has.
 * That is what puts a guide on every public page without every page having to
 * remember to include one. Its questions are also the page's FAQPage
 * structured data, so the markup states exactly what the page shows.
 */
export function PageHelp() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { pageEntry, open } = useHelp();
  const library = useHelpLibrary(locale);

  // The help centre's own pages are the guides; a guide to them underneath
  // would only repeat the page. The panel still has it, for "?".
  const shown = pageEntry && pageEntry.audience === 'public' && pageEntry.id !== 'help-centre';
  const article = shown ? library?.article(pageEntry.id) : undefined;
  const faqKey = article && !article.fallback ? `${pageEntry!.id}:${locale}` : '';

  useEffect(() => {
    if (!article || article.fallback) return;
    // A guide shown in borrowed English is not this page's content in this
    // language; claiming it as such in the markup would be the one thing
    // structured data must never do.
    const schema = faqPageSchema(
      article.text.faqs.map(([question, answer]) => ({ question, answer })),
      LOCALE_TAGS[locale]
    );
    if (!schema) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    script.setAttribute(OWNED, '');
    // A page with questions of its own (a blog post, the third-party insurance
    // page, the job board) already states a FAQPage, and a page may carry only
    // one. Checked a tick later, once the page's head tags are written; the
    // guide's questions are still shown, just not claimed twice in the markup.
    const timer = window.setTimeout(() => {
      const own = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]')).some(
        (node) => !node.hasAttribute(OWNED) && node.textContent?.includes('"FAQPage"')
      );
      if (!own) document.head.appendChild(script);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      script.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqKey]);

  if (!pageEntry || !article || !library) return null;
  const { text } = article;

  return (
    <div className="page-frame !pt-4">
      <AnimatedSection>
        <section
          aria-labelledby="page-help-title"
          className="rounded-[var(--radius-feature)] border border-border-default bg-surface-50/70 p-6 sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-brand-green-600 dark:text-brand-green-400">
                <BookOpenText className="size-4" aria-hidden="true" />
                {t.help.inPageEyebrow}
              </p>
              <h2 id="page-help-title" className="text-xl font-semibold text-text-primary sm:text-2xl">
                {text.heading ?? text.title}
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-text-secondary">{text.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => open()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-brand-green-500/50 hover:text-text-primary"
            >
              <CircleHelp className="size-4" aria-hidden="true" />
              {t.help.openGuideLabel}
            </button>
          </div>
          <HelpArticleView
            entry={pageEntry}
            text={text}
            library={library}
            isStaff={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'}
            // The tips are placed where they apply on the page itself.
            hideTips
            onOpenGuide={(id) => open(id)}
          />
        </section>
      </AnimatedSection>
    </div>
  );
}
