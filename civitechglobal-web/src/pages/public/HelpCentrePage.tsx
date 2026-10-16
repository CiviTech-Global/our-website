import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { useAuth } from '@/contexts/AuthProvider';
import { useHelpLibrary } from '@/content/help/load';
import { HELP_COLLECTIONS, HELP_ENTRIES, canReadHelp } from '@/content/help/registry';
import { COLLECTION_ICONS } from '@/components/help/collectionIcons';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Lower-cased, with Arabic yeh and kaf read as their Persian forms and the
 * zero-width non-joiner read as a space, for searching: a reader types
 * "نرم افزار" for "نرم‌افزار" and expects it to match.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u064a/g, '\u06cc')
    .replace(/\u0643/g, '\u06a9')
    .replace(/\u200c/g, ' ');
}

/**
 * Every guide in one place, grouped by what it is about, and searchable.
 *
 * The panel answers "how does this page work?"; this answers "where do I even
 * start?" — and it is the one place a search engine finds every guide.
 */
export default function HelpCentrePage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const library = useHelpLibrary(locale);
  const [query, setQuery] = useState('');

  useDocumentTitle(t.help.centreSeoTitle, {
    description: t.help.centreDescription,
    jsonLd: CANONICAL_ORIGIN
      ? breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.help.centreTitle, path: localeHref(locale, '/help') },
        ])
      : undefined,
  });

  const groups = useMemo(() => {
    if (!library) return [];
    const needle = fold(query.trim());
    return HELP_COLLECTIONS.map((collection) => {
      const articles = HELP_ENTRIES.filter(
        (entry) => entry.collection === collection && canReadHelp(entry.audience, { isStaff })
      )
        .map((entry) => ({ entry, article: library.article(entry.id) }))
        .filter((item): item is { entry: typeof item.entry; article: NonNullable<typeof item.article> } => !!item.article)
        .filter(({ article }) => {
          if (!needle) return true;
          const { title, summary, intro, faqs, steps, points } = article.text;
          const haystack = [title, summary, intro, ...faqs.flat(), ...(steps ?? []).flat(), ...(points ?? []).flat()];
          return fold(haystack.join(' ')).includes(needle);
        });
      return { collection, text: library.collection(collection), articles };
    }).filter((group) => group.articles.length > 0);
  }, [library, query, isStaff]);

  return (
    <div className="page-frame">
      <AnimatedSection className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.help.centreTitle}</h1>
        <p className="mx-auto mt-3 max-w-2xl leading-loose text-text-secondary">{t.help.centreSubtitle}</p>
        <label className="relative mx-auto mt-6 block max-w-xl">
          <span className="sr-only">{t.help.searchPlaceholder}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.help.searchPlaceholder}
            className="w-full rounded-xl border border-border-default bg-surface-50 py-3 pe-4 ps-10 text-text-primary placeholder:text-text-muted focus:border-brand-green-500 focus:outline-none"
          />
        </label>
      </AnimatedSection>

      {!library ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} label={t.common.loading} />
        </div>
      ) : groups.length === 0 ? (
        <p className="py-12 text-center text-text-secondary">{t.help.searchEmpty}</p>
      ) : (
        <div className="flex flex-col gap-12">
          {groups.map(({ collection, text, articles }) => {
            const Icon = COLLECTION_ICONS[collection];
            return (
              <section key={collection} aria-labelledby={`help-${collection}`}>
                <AnimatedSection className="mb-5">
                  <h2 id={`help-${collection}`} className="flex items-center gap-2 text-xl font-semibold text-text-primary sm:text-2xl">
                    <Icon className="size-6 text-brand-green-500" aria-hidden="true" />
                    {text?.title ?? collection}
                  </h2>
                  {text?.description && <p className="mt-1 max-w-3xl text-text-secondary">{text.description}</p>}
                </AnimatedSection>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.map(({ entry, article }) => (
                    <li key={entry.id}>
                      <Link
                        to={`/help/${entry.id}`}
                        className="flex h-full flex-col gap-1.5 rounded-2xl border border-border-default bg-surface-50 p-5 transition-colors hover:border-brand-green-500/60"
                      >
                        <span className="font-semibold text-text-primary">{article.text.title}</span>
                        <span className="text-sm leading-6 text-text-secondary">{article.text.summary}</span>
                        {entry.audience !== 'public' && (
                          <span className="mt-auto pt-2 text-xs font-medium text-text-muted">
                            {entry.audience === 'staff' ? t.help.audienceStaff : t.help.audienceMember}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
