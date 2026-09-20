import { apiAssetSrc } from '@/lib/apiAsset';
import { Link } from 'react-router';
import { BookOpen, MapPin, Star } from 'lucide-react';
import { usePublicBooks, type BookSort } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { useListControls } from '@/lib/useListControls';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
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
 * Cards by default: a book is recognised by its cover long before its title is
 * read, so the picture is the primary thing and the text hangs off it. The row
 * view is for the other way of shopping — comparing prices down a column,
 * which a grid of covers makes impossible. Everything here has been through
 * moderation.
 */
export default function BooksPage() {
  const { t } = useLocale();
  useDocumentTitle(t.books.title, { description: t.books.metaDescription });

  const controls = useListControls({
    defaultView: 'cards',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    filters: { condition: '' },
  });

  const { data, isLoading } = usePublicBooks({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    condition: controls.filters.condition || undefined,
    sort: controls.sort as BookSort,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.books.title}</h1>
        <p className="mt-2 text-text-secondary">{t.books.subtitle}</p>
      </header>

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={t.books.searchPlaceholder}
        searchLabel={t.books.searchLabel}
        total={data?.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          <>
            <Select
              className="w-40"
              value={controls.filters.condition}
              aria-label={t.books.filterCondition}
              onChange={(e) => controls.setFilter('condition', e.target.value)}
            >
              <option value="">{t.books.filterAll}</option>
              {CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {t.books.conditions[value]}
                </option>
              ))}
            </Select>
            <Select
              className="w-48"
              value={controls.sort}
              aria-label={t.books.sortLabel}
              onChange={(e) => controls.setSort(e.target.value)}
            >
              {(['newest', 'price-asc', 'price-desc', 'title'] as const).map((value) => (
                <option key={value} value={value}>
                  {t.books.sorts[value]}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.books.emptyAll}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      {!isLoading && controls.view === 'cards' && (data?.items.length ?? 0) > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data?.items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </ul>
      )}

      {!isLoading && controls.view === 'table' && (data?.items.length ?? 0) > 0 && (
        <ul className="flex flex-col divide-y divide-border-default overflow-hidden rounded-xl border border-border-default">
          {data?.items.map((book) => (
            <BookRow key={book.id} book={book} />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            page={controls.page}
            totalPages={data.totalPages}
            onPageChange={controls.setPage}
          />
        </div>
      )}
    </div>
  );
}

/** The cover, or the placeholder that stands in for a missing one. */
function Cover({ book, className }: { book: PublicBookSummary; className?: string }) {
  const { t } = useLocale();
  return book.coverUrl ? (
    <img
      src={apiAssetSrc(book.coverUrl)}
      alt=""
      loading="lazy"
      className={className}
      // object-contain rather than cover: cropping a book cover cuts off the
      // title, which is the one thing it is for.
    />
  ) : (
    <div className="flex size-full items-center justify-center text-text-muted">
      <BookOpen className="size-10" aria-hidden="true" />
      <span className="sr-only">{t.books.noCover}</span>
    </div>
  );
}

function Price({ book }: { book: PublicBookSummary }) {
  const { t, locale } = useLocale();
  const price = formatMoney(book.price, locale);
  if (!price) return null;

  return (
    <p className="text-sm font-semibold text-text-primary">
      {price} {t.market.currency}
      {book.negotiable && (
        <span className="ms-1 text-xs font-normal text-text-muted">{t.books.negotiable}</span>
      )}
    </p>
  );
}

function BookCard({ book }: { book: PublicBookSummary }) {
  const { t } = useLocale();
  const where = [book.city, book.province].filter(Boolean).join('، ');

  return (
    <li>
      <Link
        to={`/books/${book.code}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-brand-green-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/40"
      >
        {/* A fixed aspect box, so a grid of covers lines up whatever shape each
            photograph is. */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-muted">
          <Cover
            book={book}
            className="size-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
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

          <Price book={book} />
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

/**
 * One book as a row.
 *
 * The cover stays, at thumbnail size — without it the list is unrecognisable
 * as a bookshelf — but the price moves to the end of the row, where a column
 * of them can be read down at a glance.
 */
function BookRow({ book }: { book: PublicBookSummary }) {
  const { t } = useLocale();
  const where = [book.city, book.province].filter(Boolean).join('، ');

  return (
    <li>
      <Link
        to={`/books/${book.code}`}
        className="group flex items-center gap-4 bg-surface p-3 transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green-500/40"
      >
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-surface-muted">
          <Cover book={book} className="size-full object-contain" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-text-primary group-hover:underline">
            {book.title}
          </h2>
          <p className="truncate text-xs text-text-secondary">
            {t.books.by.replace('{author}', book.bookAuthor)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={book.condition === 'NEW' ? 'success' : 'default'}>
              {t.books.conditions[book.condition]}
            </Badge>
            {book.featured && (
              <Badge variant="warning">
                <Star className="size-3" aria-hidden="true" />
                {t.market.featuredBadge}
              </Badge>
            )}
            {book.postedByCompany && <CompanyBadge short />}
            {!book.postedByCompany && book.sellerProfile?.verified && <VerifiedBadge />}
            {where && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <MapPin className="size-3" aria-hidden="true" />
                {where}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-end">
          <Price book={book} />
        </div>
      </Link>
    </li>
  );
}
