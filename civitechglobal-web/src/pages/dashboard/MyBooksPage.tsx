import { StaffImage } from '@/components/ui/StaffImage';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { BookOpen, Eye, Plus } from 'lucide-react';
import {
  useCloseBook,
  useCreateBook,
  useOwnBooks,
  useOwnVerification,
  useSubmitBook,
  useUpdateBook,
} from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant, stateVariant } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { CompanyBadge } from '@/components/marketplace/CompanyBadge';
import { CoverField } from '@/components/marketplace/CoverField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { BookCondition, OwnBook } from '@/types/marketplace';

const EMPTY_DRAFT = {
  title: '',
  bookAuthor: '',
  description: '',
  condition: 'USED' as BookCondition,
  price: '',
  negotiable: false,
  publisher: '',
  isbn: '',
  publishYear: '',
  language: '',
  pageCount: '',
  category: '',
  province: '',
  city: '',
};

/**
 * What a seller sees of their own listings.
 *
 * Drafts included, which the market never shows — this is the only place the
 * moderation state is visible to the person it concerns, with the reviewer's
 * note when one came back.
 *
 * A listing cannot be submitted without a cover, so the form refuses to send
 * one rather than letting the server reject it after the upload.
 */
export default function MyBooksPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  useDocumentTitle(t.books.myBooks);
  const { showToast } = useToast();

  const { data: verification } = useOwnVerification();
  const { data: books, isLoading } = useOwnBooks();
  const create = useCreateBook();
  const update = useUpdateBook();
  const submit = useSubmitBook();
  const close = useCloseBook();

  const [editing, setEditing] = useState<'new' | OwnBook | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [cover, setCover] = useState<File | null>(null);

  // Staff post as the company and are not asked to verify an identity — see
  // the note in books.service.createBook. Gating the button on verification
  // anyway would leave an administrator staring at a prompt to verify
  // themselves before they could list one of the company's own books.
  const staff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const canPost = staff || verification?.status === 'APPROVED';
  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = (name: keyof typeof draft) => (value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setCover(null);
    setEditing('new');
  }

  const digits = (value: string) => value.replace(/[^0-9]/g, '');
  const optionalNumber = (value: string) => (digits(value) ? Number(digits(value)) : undefined);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (editing === 'new' && !cover) {
      showToast(t.books.coverRequired, 'error');
      return;
    }

    const payload = {
      title: draft.title.trim(),
      bookAuthor: draft.bookAuthor.trim(),
      description: draft.description.trim(),
      condition: draft.condition,
      price: digits(draft.price),
      negotiable: draft.negotiable,
      publisher: draft.publisher.trim() || undefined,
      isbn: draft.isbn.trim() || undefined,
      publishYear: optionalNumber(draft.publishYear),
      language: draft.language.trim() || undefined,
      pageCount: optionalNumber(draft.pageCount),
      category: draft.category.trim() || undefined,
      province: draft.province.trim() || undefined,
      city: draft.city.trim() || undefined,
    };

    try {
      if (editing === 'new') {
        await create.mutateAsync({ payload, cover: cover! });
        showToast(t.books.created, 'success');
      } else if (editing) {
        await update.mutateAsync({ id: editing.id, payload, cover });
        showToast(t.books.saved, 'success');
      }
      setEditing(null);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.books.myBooks}
        description={t.books.myBooksDescription}
        className="mb-2"
        actions={
          canPost && (
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.books.newBook}
            </Button>
          )
        }
      />

      {!canPost && (
        <Card>
          <p className="text-body text-app-text-3">{t.books.verifyFirst}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.market.verificationTitle}</Button>
          </Link>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && books?.length === 0 && canPost && (
        <EmptyState
          title={t.books.noBooks}
          description={t.books.noBooksBody}
          icon={<BookOpen aria-hidden="true" />}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.books.newBook}
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {books?.map((book) => {
          const price = formatMoney(book.price, locale);
          // Only a draft or a listing sent back for changes can still be
          // edited; the queue's copy is what a reviewer looked at.
          const editable = book.moderationStatus === 'DRAFT' || book.moderationStatus === 'CHANGES_REQUESTED';

          return (
            <li key={book.id}>
              <Card>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded border border-app-border-light bg-app-subtle">
                    <StaffImage
                      path={book.coverUrl ? `/market/me/books/${book.id}/cover` : null}
                      alt=""
                      className="size-full object-contain"
                      fallback={
                        <div className="flex size-full items-center justify-center text-app-text-4">
                          <BookOpen className="size-5" aria-hidden="true" />
                        </div>
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-title-sm font-semibold text-app-text">{book.title}</p>
                      <Badge variant={moderationVariant(book.moderationStatus)}>
                        {t.market[book.moderationStatus]}
                      </Badge>
                      {book.moderationStatus === 'APPROVED' && (
                        <Badge variant={stateVariant(book.state)}>{t.market[book.state]}</Badge>
                      )}
                      {book.postedByCompany && <CompanyBadge short />}
                    </div>
                    <p className="mt-0.5 text-body text-app-text-3">
                      {t.books.by.replace('{author}', book.bookAuthor)}
                    </p>
                    <p className="mt-1 text-body text-app-text">
                      {price && `${price} ${t.market.currency}`}
                      <span className="ms-2 text-label text-app-text-3">
                        {t.books.conditions[book.condition]}
                      </span>
                    </p>

                    {book.reviewNote && (
                      <p className="mt-2 rounded border border-status-warning-border bg-status-warning-bg px-3 py-2 text-body text-app-text">
                        <span className="font-medium">{t.books.reviewNote}: </span>
                        {book.reviewNote}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-label text-app-text-3">
                      {book.publishedAt && <span>{formatDate(book.publishedAt, locale)}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3" aria-hidden="true" />
                        {number(book.viewCount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {editable && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraft({
                              ...EMPTY_DRAFT,
                              title: book.title,
                              bookAuthor: book.bookAuthor,
                              condition: book.condition,
                              price: book.price,
                            });
                            setCover(null);
                            setEditing(book);
                          }}
                        >
                          {t.common.edit}
                        </Button>
                        <Button
                          size="sm"
                          isLoading={submit.isPending}
                          onClick={() => void run(submit.mutateAsync(book.id), t.books.submitted)}
                        >
                          {t.books.submitForReview}
                        </Button>
                      </>
                    )}
                    {book.moderationStatus === 'APPROVED' && book.state === 'OPEN' && (
                      <>
                        <Link to={`/books/${book.code}`}>
                          <Button variant="outline" size="sm">
                            {t.common.view}
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void run(close.mutateAsync(book.id), t.books.closed)}
                        >
                          {t.books.closeListing}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.books.newBook : t.books.editBook}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <CoverField
            value={cover}
            previewUrl={editing !== null && editing !== 'new' ? editing.coverUrl : null}
            onChange={setCover}
            onError={(message) => showToast(message, 'error')}
          />

          <FormField label={t.books.fieldTitle} htmlFor="book-title">
            <Input
              id="book-title"
              required
              value={draft.title}
              onChange={(e) => set('title')(e.target.value)}
            />
          </FormField>

          <FormField label={t.books.fieldAuthor} htmlFor="book-author">
            <Input
              id="book-author"
              required
              value={draft.bookAuthor}
              onChange={(e) => set('bookAuthor')(e.target.value)}
            />
          </FormField>

          <FormField
            label={t.books.fieldDescription}
            htmlFor="book-description"
            hint={t.books.fieldDescriptionHint}
          >
            <TextArea
              id="book-description"
              required
              rows={4}
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.books.fieldCondition} htmlFor="book-condition">
              <Select
                id="book-condition"
                value={draft.condition}
                onChange={(e) => set('condition')(e.target.value)}
              >
                <option value="USED">{t.books.conditions.USED}</option>
                <option value="NEW">{t.books.conditions.NEW}</option>
              </Select>
            </FormField>

            <FormField label={t.books.fieldPrice} htmlFor="book-price">
              <Input
                id="book-price"
                required
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => set('price')(e.target.value)}
              />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-body text-app-text">
            <input
              type="checkbox"
              className="size-4 rounded border-app-border"
              checked={draft.negotiable}
              onChange={(e) => set('negotiable')(e.target.checked)}
            />
            {t.books.fieldNegotiable}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.books.fieldPublisher} htmlFor="book-publisher">
              <Input
                id="book-publisher"
                value={draft.publisher}
                onChange={(e) => set('publisher')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldIsbn} htmlFor="book-isbn" hint={t.books.fieldIsbnHint}>
              <Input id="book-isbn" dir="ltr" value={draft.isbn} onChange={(e) => set('isbn')(e.target.value)} />
            </FormField>

            <FormField label={t.books.fieldPublishYear} htmlFor="book-year">
              <Input
                id="book-year"
                inputMode="numeric"
                value={draft.publishYear}
                onChange={(e) => set('publishYear')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldLanguage} htmlFor="book-language">
              <Input
                id="book-language"
                value={draft.language}
                onChange={(e) => set('language')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldPages} htmlFor="book-pages">
              <Input
                id="book-pages"
                inputMode="numeric"
                value={draft.pageCount}
                onChange={(e) => set('pageCount')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldCategory} htmlFor="book-category">
              <Input
                id="book-category"
                value={draft.category}
                onChange={(e) => set('category')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldProvince} htmlFor="book-province">
              <Input
                id="book-province"
                value={draft.province}
                onChange={(e) => set('province')(e.target.value)}
              />
            </FormField>

            <FormField label={t.books.fieldCity} htmlFor="book-city">
              <Input id="book-city" value={draft.city} onChange={(e) => set('city')(e.target.value)} />
            </FormField>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" isLoading={create.isPending || update.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
