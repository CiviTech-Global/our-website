import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Languages } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { useAuth } from '@/contexts/AuthProvider';
import { useHelpLibrary } from '@/content/help/load';
import { canReadHelp, helpEntry, helpEntryHome } from '@/content/help/registry';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { HelpArticleView } from '@/components/help/HelpArticleView';
import { COLLECTION_ICONS } from '@/components/help/collectionIcons';

/**
 * One guide on its own page, with its own address.
 *
 * Public guides exist in every language. Member guides are written in Persian
 * and English only, so their alternates name only those two, for the reason
 * blog posts name only their own editions: pointing a German search at an
 * English guide under a German address would be a duplicate in disguise.
 * Staff guides are for staff and are never indexed.
 */
export default function HelpArticlePage() {
  const { id = '' } = useParams();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const library = useHelpLibrary(locale);
  const entry = helpEntry(id);
  const readable = !!entry && canReadHelp(entry.audience, { isStaff });
  const article = readable ? library?.article(entry.id) : undefined;
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const BackIcon = locale === 'fa' ? ArrowRight : ArrowLeft;

  const path = `/help/${id}`;
  useDocumentTitle(article ? `${article.text.title} — ${t.help.centreTitle}` : t.help.centreTitle, {
    description: article?.text.summary ?? t.help.centreDescription,
    noindex: !entry || entry.audience === 'staff' || (library !== undefined && !article),
    type: 'article',
    // Borrowed English is the English guide; say so rather than claim a translation.
    contentLocale: article?.fallback ? 'en' : undefined,
    alternates:
      entry && entry.audience === 'member'
        ? (['fa', 'en'] as const).map((l) => ({ locale: l, href: localeHref(l, path) }))
        : undefined,
    jsonLd:
      CANONICAL_ORIGIN && article
        ? breadcrumbSchema(CANONICAL_ORIGIN, [
            { name: t.nav.home, path: localeHref(locale, '/') },
            { name: t.help.centreTitle, path: localeHref(locale, '/help') },
            { name: article.text.title, path: localeHref(locale, path) },
          ])
        : undefined,
  });

  if (!library && readable) {
    return (
      <div className="page-frame flex justify-center py-24">
        <Spinner size={28} label={t.common.loading} />
      </div>
    );
  }

  if (!entry || !article || !library) {
    return (
      <div className="page-frame text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t.help.centreTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">
          {entry && !readable ? t.help.staffOnly : t.help.noGuide}
        </p>
        <Link to="/help" className="mt-6 inline-block">
          <Button variant="outline">{t.help.backToCentre}</Button>
        </Link>
      </div>
    );
  }

  const Icon = COLLECTION_ICONS[entry.collection];
  const home = helpEntryHome(entry);

  return (
    <div className="page-frame-reading">
      <AnimatedSection className="mb-8">
        <Link
          to="/help"
          className="mb-5 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <BackIcon className="size-4" aria-hidden="true" />
          {t.help.backToCentre}
        </Link>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand-green-600 dark:text-brand-green-400">
          <Icon className="size-4" aria-hidden="true" />
          {library.collection(entry.collection)?.title}
        </p>
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{article.text.title}</h1>
        <p className="mt-3 text-lg leading-loose text-text-secondary">{article.text.summary}</p>
        {home && (
          <Link to={home} className="mt-5 inline-block">
            <Button>
              {t.help.openPage}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </AnimatedSection>

      {article.fallback && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-surface-100 p-3 text-sm text-text-secondary">
          <Languages className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t.help.fallbackNote}
        </p>
      )}

      <AnimatedSection delay={0.05}>
        <HelpArticleView entry={entry} text={article.text} library={library} isStaff={isStaff} />
      </AnimatedSection>
    </div>
  );
}
