import { useState } from 'react';
import { Link } from 'react-router';
import { BadgeCheck, BookOpen } from 'lucide-react';
import { offerPhotoPath, useStaffOffers } from '@/api/bookshop';
import { useReviewBook } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { fill, formatNumber } from '@/lib/jobFormat';
import { moderationVariant } from '@/lib/marketplace';
import { money } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { CompanyBadge } from '@/components/marketplace/CompanyBadge';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { BookCover, GradeBadge } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import type { ModerationStatus } from '@/types/marketplace';
import type { StaffOfferRow } from '@/types/bookshop';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];

/**
 * The book queue, second generation: a copy is judged against the catalogue
 * entry it joins. The reviewer sees the seller's photographs beside the
 * book's facts — is this that edition, is it in the condition claimed — and
 * a link to the entry, where wrong facts are corrected once for every copy.
 */
export default function BookOfferQueuePage() {
  const { t } = useLocale();
  useDocumentTitle(t.books.queueTitle);
  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: 'PENDING_REVIEW' } });
  const { data, isLoading } = useStaffOffers({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.books.queueTitle}
        description={t.books.queueDescription}
        className="mb-2"
        actions={
          <Link to="/admin/book-catalog" className="text-sm font-medium text-brand-600 hover:underline">
            {t.bookshop.catalogTitle}
          </Link>
        }
      />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.books.searchQueue}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<ModerationStatus>
            label={t.app.filterByStatus}
            value={controls.filters.status as ModerationStatus}
            segments={STATUSES.map((value) => ({ value, label: t.market[value] }))}
            onChange={(value) => controls.setFilter('status', value)}
          />
        }
      />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.books.queueEmpty}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
          icon={<BookOpen aria-hidden="true" />}
        />
      )}
      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <OfferCard row={row} />
          </li>
        ))}
      </ul>
      {data && data.totalPages > 1 && <Pagination page={controls.page} totalPages={data.totalPages} onPageChange={controls.setPage} />}
    </div>
  );
}

function OfferCard({ row }: { row: StaffOfferRow }) {
  const { t, locale } = useLocale();
  const review = useReviewBook();
  const [enlarged, setEnlarged] = useState<string | null>(row.photos[0]?.id ?? null);
  const book = row.book;
  const where = [row.city, row.province].filter(Boolean).join('، ');

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex shrink-0 gap-3">
          <div className="h-56 w-40 overflow-hidden rounded-lg border border-border-default bg-surface-muted">
            {enlarged ? (
              <StaffImage path={offerPhotoPath(enlarged, 'staff')} alt="" className="size-full object-contain" fallback={null} />
            ) : (
              <div className="flex size-full items-center justify-center text-text-tertiary">
                <BookOpen className="size-6" aria-hidden="true" />
              </div>
            )}
          </div>
          {row.photos.length > 1 && (
            <div className="flex flex-col gap-1.5">
              {row.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  aria-pressed={enlarged === photo.id}
                  onClick={() => setEnlarged(photo.id)}
                  className="h-12 w-9 overflow-hidden rounded border border-border-default aria-pressed:ring-2 aria-pressed:ring-brand-green-600"
                >
                  <StaffImage path={offerPhotoPath(photo.id, 'staff')} alt={photo.originalName} className="size-full object-cover" fallback={null} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={moderationVariant(row.moderationStatus)}>{t.market[row.moderationStatus]}</Badge>
            {row.grade && <GradeBadge grade={row.grade} withHint />}
            {row.postedByCompany && <CompanyBadge short />}
            <span className="ltr font-mono text-xs text-text-tertiary">{row.code}</span>
            {row.submittedAt && <span className="text-xs text-text-tertiary">{formatDate(row.submittedAt, locale)}</span>}
          </div>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-semibold text-text-primary">{money(row.price, row.currency, locale, t)}</span>
            {row.negotiable && <span className="text-text-secondary">{t.bookshop.negotiable}</span>}
            <span className="text-text-secondary">{fill(t.bookshop.quantityLeft, { n: formatNumber(row.quantity, locale) })}</span>
            <span className="text-text-secondary">{row.deliveryOptions.map((option) => t.bookshop.delivery[option]).join('، ')}</span>
            {where && <span className="text-text-secondary">{where}</span>}
          </p>
          {row.conditionNotes && <p className="mt-2 whitespace-pre-line text-sm text-text-primary">{row.conditionNotes}</p>}
          {!row.postedByCompany && (
            <p className="mt-2 text-xs text-text-tertiary">
              {t.books.queueSeller}: {row.seller.firstName} {row.seller.lastName} <span className="ltr">({row.seller.email})</span>
            </p>
          )}

          {book && (
            <div className="mt-3 flex gap-3 rounded-xl border border-border-default p-3">
              <div className="w-12 shrink-0">
                <BookCover url={book.coverUrl} title={book.title} size="sm" />
              </div>
              <div className="min-w-0 text-sm">
                <p className="flex items-center gap-1 font-medium text-text-primary">
                  {book.title}
                  {book.verified && <BadgeCheck className="size-3.5 text-brand-green-600" aria-label={t.bookshop.verifiedBook} />}
                </p>
                <p className="text-text-secondary">{namesText(book.authors, locale)}</p>
                <p className="text-xs text-text-tertiary">
                  {[book.publisher, book.publishYear ? formatNumber(book.publishYear, locale) : null, book.isbn, fill(t.bookshop.offersCountShort, { n: formatNumber(book._count.listings, locale) })]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <Link to={`/admin/book-catalog?q=${encodeURIComponent(book.code)}`} className="text-xs font-medium text-brand-600 hover:underline">
                  {t.bookshop.catalogTitle} · <span className="ltr font-mono">{book.code}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <ReviewActions isPending={review.isPending} onReview={(input) => review.mutateAsync({ id: row.id, ...input })} />
    </Card>
  );
}
