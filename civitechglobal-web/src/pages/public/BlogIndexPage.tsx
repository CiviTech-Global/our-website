import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { blogPostsFor } from '@/content/blog';

const PAGE_SIZE = 8;

export default function BlogIndexPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.nav.blog, { description: t.seo.blog });

  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  // Only the editions written in this reader's language. The Persian blog is
  // the long one; the others carry what was written for everybody.
  const posts = useMemo(() => blogPostsFor(locale), [locale]);

  // Every keyword the posts on this page carry, so the dropdown cannot offer a
  // topic that would return nothing.
  const topics = useMemo(
    () => [...new Set(posts.flatMap((post) => post.keywords))].sort(),
    [posts]
  );

  // The posts are bundled with the application, so every word of every article
  // is already here — the search can read the body, not just the summary.
  const controls = useListControls({ defaultSort: 'newest', pageSize: PAGE_SIZE, filters: { topic: '' } });
  const list = useClientList(posts, controls, {
    searchFields: (post) => [post.title, post.description, post.body, ...post.keywords],
    filters: { topic: (post, value) => post.keywords.includes(value) },
    sorts: {
      newest: (a, b) => (a.date < b.date ? 1 : -1),
      oldest: (a, b) => (a.date > b.date ? 1 : -1),
      reading: (a, b) => a.readingMinutes - b.readingMinutes,
    },
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.blog.title}</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.blog.subtitle}</p>
      </AnimatedSection>

      <ListToolbar
        className="mb-8"
        controls={controls}
        searchPlaceholder={t.blog.searchPlaceholder}
        total={list.total}
        filters={
          <>
            <Select
              className="w-48"
              value={controls.filters.topic}
              aria-label={t.blog.filterTopic}
              onChange={(e) => controls.setFilter('topic', e.target.value)}
            >
              <option value="">{t.blog.filterTopicAll}</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </Select>
            <Select
              className="w-44"
              value={controls.sort}
              aria-label={t.list.sortLabel}
              onChange={(e) => controls.setSort(e.target.value)}
            >
              <option value="newest">{t.blog.sortNewest}</option>
              <option value="oldest">{t.blog.sortOldest}</option>
              <option value="reading">{t.blog.sortShortest}</option>
            </Select>
          </>
        }
      />

      {list.total === 0 && (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      )}

      <div className="flex flex-col gap-6">
        {list.items.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.05}>
            <article className="rounded-2xl border border-border-default bg-surface-50 p-6 transition-colors hover:border-brand-green-500/40">
              <h2 className="text-xl font-semibold text-text-primary">
                <Link to={`/blog/${post.slug}`} className="hover:text-brand-green-600 dark:hover:text-brand-green-400">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{post.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {post.dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t.blog.minutes.replace('{n}', String(post.readingMinutes))}
                </span>
              </div>
              <Link
                to={`/blog/${post.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
              >
                {t.blog.readMore}
                <ArrowIcon className="size-4" aria-hidden="true" />
              </Link>
            </article>
          </AnimatedSection>
        ))}
      </div>

      {list.totalPages > 1 && (
        <div className="mt-10">
          <Pagination page={controls.page} totalPages={list.totalPages} onPageChange={controls.setPage} />
        </div>
      )}
    </div>
  );
}
