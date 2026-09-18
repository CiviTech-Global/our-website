import { apiAssetSrc } from '@/lib/apiAsset';
import { Link, useParams } from 'react-router';
import { BookOpen, Info, MapPin } from 'lucide-react';
import { usePublicBook } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { bookListingSchema, breadcrumbSchema } from '@/lib/structuredData';
import { localeHref } from '@/i18n/localePath';
import { LOCALE_TAGS } from '@/i18n/locales';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { AuthorCard } from '@/components/marketplace/AuthorCard';
import { CompanyBadge } from '@/components/marketplace/CompanyBadge';

/**
 * One book.
 *
 * The cover and the facts sit side by side, the description below. There is
 * deliberately no "buy" button: this market takes no money yet, and the page
 * says so in place of the button rather than leaving a reader to hunt for one.
 */
export default function BookDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { t, locale } = useLocale();
  const { data: book, isLoading, isError } = usePublicBook(code);

  const jsonLd = book
    ? [
        bookListingSchema(book, {
          url: `${CANONICAL_ORIGIN}${localeHref(locale, `/books/${book.code}`)}`,
          locale: LOCALE_TAGS[locale],
          // Absolute: a crawler reading the markup alone cannot resolve a
          // path relative to the API client.
          imageUrl: book.coverUrl ? `${CANONICAL_ORIGIN}${apiAssetSrc(book.coverUrl)}` : null,
          sellerName: book.postedByCompany
            ? SITE_NAME.en
            : (book.sellerProfile?.username ?? SITE_NAME.en),
        }),
        breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.books.title, path: localeHref(locale, '/books') },
          { name: book.title, path: localeHref(locale, `/books/${book.code}`) },
        ]),
      ].filter((entry): entry is object => entry !== null)
    : undefined;

  useDocumentTitle(book?.title ?? t.books.title, {
    description: book?.description.replace(/\s+/g, ' ').slice(0, 155) ?? t.books.metaDescription,
    type: 'article',
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.books.notFound}</p>
        <Link to="/books" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.books.backToMarket}
        </Link>
      </div>
    );
  }

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));
  // A year is a name, not a quantity: grouping it gives "2,017".
  const year = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  // "English" beats "en" for a reader, and Intl already knows every language's
  // name in every language we serve. An unrecognised tag falls back to itself.
  const languageName = (tag: string) => {
    try {
      return new Intl.DisplayNames([LOCALE_TAGS[locale]], { type: 'language' }).of(tag) ?? tag;
    } catch {
      return tag;
    }
  };
  const price = formatMoney(book.price, locale);
  const where = [book.city, book.province].filter(Boolean).join('، ');

  const facts: Array<{ label: string; value: string }> = [
    ...(book.publisher ? [{ label: t.books.publisher, value: book.publisher }] : []),
    ...(book.publishYear ? [{ label: t.books.publishYear, value: year(book.publishYear) }] : []),
    ...(book.language ? [{ label: t.books.language, value: languageName(book.language) }] : []),
    ...(book.pageCount ? [{ label: t.books.pages, value: number(book.pageCount) }] : []),
    ...(book.isbn ? [{ label: t.books.isbn, value: book.isbn }] : []),
    ...(where ? [{ label: t.books.location, value: where }] : []),
    ...(book.publishedAt
      ? [{ label: t.books.listedOn, value: formatDate(book.publishedAt, locale) }]
      : []),
    { label: t.books.views, value: number(book.viewCount) },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/books" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
        {t.books.backToMarket}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,260px)_1fr]">
        <div>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface-muted">
            {book.coverUrl ? (
              <img src={apiAssetSrc(book.coverUrl)} alt={book.title} className="size-full object-contain" />
            ) : (
              <div className="flex size-full items-center justify-center text-text-muted">
                <BookOpen className="size-12" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={book.condition === 'NEW' ? 'success' : 'default'}>
              {t.books.conditions[book.condition]}
            </Badge>
            {book.category && <Badge>{book.category}</Badge>}
            {book.postedByCompany && <CompanyBadge />}
          </div>

          <h1 className="mt-3 text-3xl font-bold text-text-primary">{book.title}</h1>
          <p className="mt-1 text-text-secondary">{t.books.by.replace('{author}', book.bookAuthor)}</p>

          {price && (
            <p className="mt-4 text-2xl font-semibold text-text-primary">
              {price} <span className="text-base font-normal">{t.market.currency}</span>
              {book.negotiable && (
                <span className="ms-2 text-sm font-normal text-text-muted">{t.books.negotiable}</span>
              )}
            </p>
          )}

          {where && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-text-muted">
              <MapPin className="size-4" aria-hidden="true" />
              {where}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-6 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-text-muted">{fact.label}</dt>
                <dd className="mt-0.5 text-sm text-text-primary" dir={fact.label === t.books.isbn ? 'ltr' : undefined}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">{t.books.fieldDescription}</h2>
            <p className="whitespace-pre-line text-text-secondary">{book.description}</p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* Where a shop would put the basket. Saying what this is beats
              leaving a reader to work out why there is no way to pay. */}
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Info className="size-4 text-text-muted" aria-hidden="true" />
              {t.books.noCheckoutTitle}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">{t.books.noCheckoutBody}</p>
          </Card>

          {book.sellerProfile && <AuthorCard profile={book.sellerProfile} />}
        </div>
      </div>
    </div>
  );
}
