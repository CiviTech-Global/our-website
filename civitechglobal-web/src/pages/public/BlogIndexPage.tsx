import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { blogPosts } from '@/content/blog';

export default function BlogIndexPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.nav.blog, { description: t.seo.blog });

  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.blog.title}</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.blog.subtitle}</p>
      </AnimatedSection>

      <div className="flex flex-col gap-6">
        {blogPosts.map((post, index) => (
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
    </div>
  );
}
