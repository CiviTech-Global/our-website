import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, Clock, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { articleSchema, breadcrumbSchema, faqPageSchema } from '@/lib/structuredData';
import { Markdown } from '@/lib/markdown';
import { blogPostLocales, getBlogPost } from '@/content/blog';
import { localeHref } from '@/i18n/localePath';
import { LOCALE_NAMES, LOCALE_TAGS } from '@/i18n/locales';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useLocale();
  const post = slug ? getBlogPost(slug, locale) : undefined;

  // The post exists, but not in this language. Offering the editions it does
  // have is a better answer than "not found" — see the note below.
  const elsewhere = slug && !post ? blogPostLocales(slug) : [];

  const siteName = locale === 'fa' ? SITE_NAME.fa : SITE_NAME.en;
  // The language the article is actually written in, which is the post's own
  // and not the chrome's: an English reader browsing a Persian-only guide is
  // reading Persian, and the structured data should say so.
  const contentLocale = post ? LOCALE_TAGS[post.locale] : LOCALE_TAGS[locale];
  const faqLd = post ? faqPageSchema(post.faqs, contentLocale) : null;
  const postUrl = post
    ? `${CANONICAL_ORIGIN}${localeHref(post.locale, `/blog/${post.slug}`)}`
    : CANONICAL_ORIGIN;

  useDocumentTitle(post?.title, {
    description: post?.description,
    type: 'article',
    noindex: !post,
    // Only the languages this post was written in. Naming one it does not have
    // would tell search engines to send those readers here, to prose they
    // cannot read.
    alternates: post
      ? // Paths, not URLs: documentTitle adds the origin, as it does for the
        // default set. Passing a whole URL here emitted every blog hreflang
        // with the origin twice over.
        post.locales.map((other) => ({
          locale: other,
          href: localeHref(other, `/blog/${post.slug}`),
        }))
      : [],
    jsonLd: post
      ? [
          articleSchema({
            headline: post.title,
            description: post.description,
            url: postUrl,
            image: `${CANONICAL_ORIGIN}/og/default.png`,
            datePublished: post.date,
            dateModified: post.updated,
            locale: contentLocale,
            origin: CANONICAL_ORIGIN,
            siteName,
          }),
          breadcrumbSchema(CANONICAL_ORIGIN, [
            { name: t.nav.blog, path: localeHref(post.locale, '/blog') },
            { name: post.title, path: localeHref(post.locale, `/blog/${post.slug}`) },
          ]),
          ...(faqLd ? [faqLd] : []),
        ]
      : undefined,
  });

  if (!post) {
    /*
     * A slug that exists in another language is not a missing page. Most of
     * the insurance writing is Persian only — the products, the regulator and
     * the readers are — so an English visitor following a link to one should
     * be handed the Persian edition rather than a dead end.
     */
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title={elsewhere.length > 0 ? t.blog.otherLanguageTitle : t.blog.notFoundTitle}
          description={elsewhere.length > 0 ? t.blog.otherLanguageBody : t.blog.notFoundBody}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {elsewhere.map((other) => (
            <a key={other} href={localeHref(other, `/blog/${slug}`)}>
              <Button variant="outline">{LOCALE_NAMES[other]}</Button>
            </a>
          ))}
          <Link to="/blog">
            <Button variant={elsewhere.length > 0 ? 'ghost' : 'outline'}>{t.blog.backToBlog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <AnimatedSection className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.blog.backToBlog}
        </Link>
      </AnimatedSection>

      <AnimatedSection className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-text-primary sm:text-4xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {t.blog.updatedOn} {post.dateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {t.blog.minutes.replace('{n}', String(post.readingMinutes))}
          </span>
        </div>
        <p className="mt-4 text-lg leading-8 text-text-secondary">{post.description}</p>
      </AnimatedSection>

      <AnimatedSection delay={0.05}>
        <Markdown blocks={post.blocks} />
      </AnimatedSection>

      <AnimatedSection delay={0.08} className="mt-12">
        <Card glass className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-green-500" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t.blog.ctaTitle}</h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">{t.blog.ctaBody}</p>
            </div>
          </div>
          <Link to="/insurance" className="shrink-0">
            <Button>
              {t.blog.ctaButton}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </Card>
      </AnimatedSection>
    </div>
  );
}
