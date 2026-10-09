import { Link } from 'react-router';
import { useBookRequests } from '@/api/bookshop';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { BookRequestCard } from '@/components/books/BookRequestCard';

/** The buyer's side: every book the reader asked to buy, and where each stands. */
export default function BookPurchasesPage() {
  const { t } = useLocale();
  const { data, isLoading } = useBookRequests('buyer');
  useDocumentTitle(t.bookshop.purchasesTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.bookshop.purchasesTitle} />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.bookshop.purchasesEmpty}
          action={
            <Link to="/books">
              <Button variant="outline">{t.bookshop.browseBooks}</Button>
            </Link>
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {data?.map((request) => (
          <BookRequestCard key={request.id} request={request} side="buyer" />
        ))}
      </ul>
    </div>
  );
}
