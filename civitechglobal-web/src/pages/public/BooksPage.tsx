import { apiAssetSrc } from '@/lib/apiAsset';
import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, MapPin, Search, Star } from 'lucide-react';
import { usePublicBooks, type BookSort } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { toPersianDigits } from '@/i18n/utils';
import { formatMoney } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { CompanyBadge } from '@/components/marketplace/CompanyBadge';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import type { BookCondition, PublicBookSummary } from '@/types/marketplace';

const PAGE_SIZE = 24;
const CONDITIONS: BookCondition[] = ['NEW', 'USED'];

/**
 * The public book market.
 *
 * A grid rather than the list the job and project boards use: a book is
 * recognised by its cover long before its title is read, so the picture is the
 * primary thing and the text hangs off it. Everything here has been through
 * moderation.
 */
export default function BooksPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.books.title, { description: t.books.metaDescription });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState<BookSort>('newest');

  const { data, isLoading } = usePublicBooks({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    condition: condition || undefined,
    sort,
  });

  // Any filter change puts you back on the first page; see JobsPage.
  const reset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));
  const filtered = Boolean(search.trim() || condition);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.books.title}</h1>
        <p className="mt-2 text-text-secondary">{t.books.subtitle}</p>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            className="ps-9"
            value={search}
            placeholder={t.books.searchPlaceholder}
            aria-label={t.books.searchLabel}
            onChange={(e) => reset(setSearch)(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-40"
          value={condition}
          aria-label={t.books.filterCondition}
          onChange={(e) => reset(setCondition)(e.target.value)}
        >
          <option value="">{t.books.filterAll}</option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {t.books.conditions[value]}
            </option>
          ))}
        </Select>
        <Select
          className="sm:w-48"
          value={sort}
          aria-label={t.books.sortLabel}
          onChange={(e) => reset(setSort)(e.target.value as BookSort)}
        >
          {(['newest', 'price-asc', 'price-desc', 'title'] as const).map((value) => (
            <option key={value} value={value}>
              {t.books.sorts[value]}
            </option>
          ))}
        </Select>
      </div>

      {data && data.total > 0 && (
        <p className="mb-4 text-sm text-text-muted">
          {data.total === 1
            ? t.books.resultCountOne
            : t.books.resultCount.replace('{count}', number(data.total))}
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState title={filtered ? t.books.empty : t.books.emptyAll} />
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data?.items.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-8">
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

function BookCard({ book }: { book: PublicBookSummary }) {
  const { t, locale } = useLocale();
  const price = formatMoney(book.price, locale);
  const where = [book.city, book.province].filter(Boolean).join('، ');

  return (
    <li>
      <Link
        to={`/books/${book.code}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-brand-green-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/40"
      >
        {/* A fixed aspect box, so a grid of covers lines up whatever shape each
            photograph is. object-contain rather than cover: cropping a book
            cover cuts off the title, which is the one thing it is for. */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-muted">
          {book.coverUrl ? (
            <img
              src={apiAssetSrc(book.coverUrl)}
              alt=""
              loading="lazy"
              className="size-full object-contain transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <BookOpen className="size-10" aria-hidden="true" />
            </div>
          )}
          {book.featured && (
            <span className="absolute end-2 top-2">
              <Badge variant="warning">
                <Star className="size-3" aria-hidden="true" />
                {t.market.featuredBadge}
              </Badge>
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <h2 className="line-clamp-2 text-sm font-semibold text-text-primary group-hover:underline">
            {book.title}
          </h2>
          <p className="line-clamp-1 text-xs text-text-secondary">
            {t.books.by.replace('{author}', book.bookAuthor)}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            <Badge variant={book.condition === 'NEW' ? 'success' : 'default'}>
              {t.books.conditions[book.condition]}
            </Badge>
            {book.postedByCompany && <CompanyBadge short />}
            {!book.postedByCompany && book.sellerProfile?.verified && <VerifiedBadge />}
          </div>

          {price && (
            <p className="text-sm font-semibold text-text-primary">
              {price} {t.market.currency}
              {book.negotiable && (
                <span className="ms-1 text-xs font-normal text-text-muted">{t.books.negotiable}</span>
              )}
            </p>
          )}
          {where && (
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="size-3" aria-hidden="true" />
              {where}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
