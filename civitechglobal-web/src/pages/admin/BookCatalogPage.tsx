import { useState, type FormEvent } from 'react';
import { BadgeCheck, BookOpen, GitMerge, Pencil } from 'lucide-react';
import { useBookCategories, useMergeBooks, useStaffCatalog, useUpdateCatalogBook } from '@/api/bookshop';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { fill, formatNumber } from '@/lib/jobFormat';
import { languageName, money } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { BookCategorySelect, BookCover } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import { BOOK_BINDINGS, BOOK_LANGUAGES, BOOK_TRIM_SIZES, type StaffCatalogRow } from '@/types/bookshop';

const PAGE_SIZE = 20;
type VerifiedFilter = 'all' | 'false' | 'true';

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');
const list = (value: string) => value.split(/[\n,،]/).map((item) => item.trim()).filter(Boolean);
const numberOrNull = (value: string) => (digits(value) ? Number(digits(value)) : undefined);

/**
 * The shared catalogue, for staff.
 *
 * Sellers type a book's facts once, when the first copy is listed; everyone
 * after them joins that entry. So the facts are worth checking — a wrong
 * ISBN or author follows every copy — and duplicates are worth merging, since
 * two entries for one edition split its copies across two pages. Unverified
 * entries come first.
 */
export default function BookCatalogPage() {
  const { t } = useLocale();
  useDocumentTitle(t.bookshop.catalogTitle);
  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { verified: 'false' } });
  const verified = (controls.filters.verified as VerifiedFilter) || 'all';
  const { data, isLoading } = useStaffCatalog({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    verified: verified === 'all' ? undefined : verified,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.bookshop.catalogTitle} description={t.bookshop.catalogIntro} className="mb-2" />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.bookshop.searchPlaceholder}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<VerifiedFilter>
            label={t.bookshop.verifiedBook}
            value={verified}
            segments={[
              { value: 'false', label: t.bookshop.unverifiedOnly },
              { value: 'true', label: t.bookshop.verifiedOnly },
              { value: 'all', label: t.bookshop.allEntries },
            ]}
            onChange={(value) => controls.setFilter('verified', value)}
          />
        }
      />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.items.length === 0 && <EmptyState title={t.list.noResults} icon={<BookOpen aria-hidden="true" />} />}
      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <CatalogRow key={row.id} row={row} />
        ))}
      </ul>
      {data && data.totalPages > 1 && <Pagination page={controls.page} totalPages={data.totalPages} onPageChange={controls.setPage} />}
    </div>
  );
}

function CatalogRow({ row }: { row: StaffCatalogRow }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const update = useUpdateCatalogBook();
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);

  async function setVerified(value: boolean) {
    try {
      await update.mutateAsync({ id: row.id, payload: { verified: value } });
      showToast(t.bookshop.saved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const facts = [
    row.publisher,
    row.publishYear ? `${formatNumber(row.publishYear, locale)} ${t.bookshop.calendars[row.yearCalendar]}` : null,
    row.edition ? fill(t.bookshop.editionNth, { n: formatNumber(row.edition, locale) }) : null,
    row.pageCount ? `${formatNumber(row.pageCount, locale)} ${t.bookshop.pages}` : null,
    languageName(row.language, locale),
    row.binding ? t.bookshop.bindings[row.binding] : null,
    row.trimSize ? t.bookshop.trimSizes[row.trimSize] : null,
    row.listPrice ? `${t.bookshop.listPrice}: ${money(row.listPrice, row.currency, locale, t)}` : null,
  ].filter(Boolean);

  return (
    <li>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="w-16 shrink-0">
          <BookCover url={row.coverUrl} title={row.title} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {row.verified ? (
              <Badge variant="success">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {t.bookshop.verifiedOnly}
              </Badge>
            ) : (
              <Badge variant="warning">{t.bookshop.unverifiedOnly}</Badge>
            )}
            <span className="ltr font-mono text-xs text-text-tertiary">{row.code}</span>
            <span className="text-xs text-text-tertiary">{fill(t.bookshop.offersCountShort, { n: formatNumber(row._count.listings, locale) })}</span>
          </div>
          <h2 className="font-semibold text-text-primary">
            {row.title}
            {row.subtitle && <span className="font-normal text-text-secondary"> — {row.subtitle}</span>}
          </h2>
          <p className="text-sm text-text-secondary">
            {namesText(row.authors, locale)}
            {row.translators.length > 0 && ` · ${fill(t.bookshop.translatedBy, { names: namesText(row.translators, locale) })}`}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">{facts.join(' · ')}</p>
          {row.isbn && <p className="ltr mt-0.5 text-start font-mono text-xs text-text-tertiary">ISBN {row.isbn}</p>}
          {row.createdBy && (
            <p className="mt-1 text-xs text-text-tertiary">
              {t.bookshop.createdBy}: {row.createdBy.firstName} {row.createdBy.lastName} <span className="ltr">({row.createdBy.email})</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Button size="sm" variant={row.verified ? 'ghost' : 'primary'} isLoading={update.isPending} onClick={() => void setVerified(!row.verified)}>
            <BadgeCheck className="size-4" aria-hidden="true" />
            {row.verified ? t.bookshop.unverify : t.bookshop.verify}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            {t.common.edit}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMerging(true)}>
            <GitMerge className="size-4" aria-hidden="true" />
            {t.bookshop.merge}
          </Button>
        </div>
      </Card>
      {editing && <EditModal row={row} onClose={() => setEditing(false)} />}
      {merging && <MergeModal row={row} onClose={() => setMerging(false)} />}
    </li>
  );
}

function EditModal({ row, onClose }: { row: StaffCatalogRow; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const update = useUpdateCatalogBook();
  const { data: categories } = useBookCategories();
  const [form, setForm] = useState({
    title: row.title,
    subtitle: row.subtitle ?? '',
    authors: row.authors.join('\n'),
    translators: row.translators.join('\n'),
    publisher: row.publisher ?? '',
    isbn: row.isbn ?? '',
    publishYear: row.publishYear?.toString() ?? '',
    yearCalendar: row.yearCalendar,
    edition: row.edition?.toString() ?? '',
    printRun: row.printRun?.toString() ?? '',
    pageCount: row.pageCount?.toString() ?? '',
    language: row.language,
    originalTitle: row.originalTitle ?? '',
    series: row.series ?? '',
    seriesNumber: row.seriesNumber?.toString() ?? '',
    binding: row.binding ?? '',
    trimSize: row.trimSize ?? '',
    listPrice: row.listPrice ?? '',
    categoryId: row.categoryId ?? '',
    tags: row.tags.join('، '),
    description: row.description ?? '',
  });
  const [cover, setCover] = useState<File | null>(null);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      authors: list(form.authors),
      translators: list(form.translators),
      publisher: form.publisher.trim(),
      isbn: form.isbn.trim(),
      publishYear: numberOrNull(form.publishYear),
      yearCalendar: form.yearCalendar,
      edition: numberOrNull(form.edition),
      printRun: numberOrNull(form.printRun),
      pageCount: numberOrNull(form.pageCount),
      language: form.language,
      originalTitle: form.originalTitle.trim(),
      series: form.series.trim(),
      seriesNumber: numberOrNull(form.seriesNumber),
      binding: form.binding || undefined,
      trimSize: form.trimSize || undefined,
      listPrice: digits(form.listPrice) || undefined,
      categoryId: form.categoryId || undefined,
      tags: list(form.tags),
      description: form.description.trim(),
    };
    try {
      await update.mutateAsync({ id: row.id, payload, cover });
      showToast(t.bookshop.saved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const field = (key: keyof typeof form, label: string, ltr = false) => (
    <FormField label={label} htmlFor={`e-${key}`}>
      <Input id={`e-${key}`} className={ltr ? 'ltr' : undefined} value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </FormField>
  );

  return (
    <Modal isOpen onClose={onClose} title={row.title} className="max-w-3xl">
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('title', t.bookshop.titleLabel)}
          {field('subtitle', t.bookshop.subtitleLabel)}
          <FormField label={t.bookshop.authorsLabel} htmlFor="e-authors" hint={t.bookshop.namesHint}>
            <TextArea id="e-authors" rows={2} required value={form.authors} onChange={(e) => set('authors', e.target.value)} />
          </FormField>
          <FormField label={t.bookshop.translatorsLabel} htmlFor="e-translators" hint={t.bookshop.namesHint}>
            <TextArea id="e-translators" rows={2} value={form.translators} onChange={(e) => set('translators', e.target.value)} />
          </FormField>
          {field('publisher', t.bookshop.publisher)}
          {field('isbn', t.bookshop.isbn, true)}
          <div className="grid grid-cols-2 gap-2">
            {field('publishYear', t.bookshop.yearLabel, true)}
            <FormField label={t.bookshop.calendarLabel} htmlFor="e-calendar">
              <Select id="e-calendar" value={form.yearCalendar} onChange={(e) => set('yearCalendar', e.target.value)}>
                <option value="SOLAR">{t.bookshop.calendars.SOLAR}</option>
                <option value="GREGORIAN">{t.bookshop.calendars.GREGORIAN}</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {field('edition', t.bookshop.edition, true)}
            {field('printRun', t.bookshop.printRun, true)}
            {field('pageCount', t.bookshop.pagesLabel, true)}
          </div>
          <FormField label={t.bookshop.languageLabel} htmlFor="e-language">
            <Select id="e-language" value={form.language} onChange={(e) => set('language', e.target.value)}>
              {BOOK_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {languageName(code, locale)}
                </option>
              ))}
            </Select>
          </FormField>
          {field('originalTitle', t.bookshop.originalTitleLabel)}
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            {field('series', t.bookshop.seriesLabel)}
            {field('seriesNumber', t.bookshop.seriesNumberLabel, true)}
          </div>
          {field('listPrice', t.bookshop.listPriceLabel, true)}
          <FormField label={t.bookshop.binding} htmlFor="e-binding">
            <Select id="e-binding" value={form.binding} onChange={(e) => set('binding', e.target.value)}>
              <option value="">—</option>
              {BOOK_BINDINGS.map((value) => (
                <option key={value} value={value}>
                  {t.bookshop.bindings[value]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.bookshop.trimSize} htmlFor="e-trim">
            <Select id="e-trim" value={form.trimSize} onChange={(e) => set('trimSize', e.target.value)}>
              <option value="">—</option>
              {BOOK_TRIM_SIZES.map((value) => (
                <option key={value} value={value}>
                  {t.bookshop.trimSizes[value]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.bookshop.shelfLabel} htmlFor="e-shelf">
            <BookCategorySelect id="e-shelf" categories={categories} value={form.categoryId} onChange={(value) => set('categoryId', value)} placeholder="—" />
          </FormField>
          <FormField label={t.bookshop.tagsLabel} htmlFor="e-tags" hint={t.bookshop.tagsHint}>
            <Input id="e-tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </FormField>
          <FormField label={t.bookshop.coverLabel} htmlFor="e-cover">
            <Input id="e-cover" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </FormField>
        </div>
        <FormField label={t.bookshop.descriptionLabel} htmlFor="e-description">
          <TextArea id="e-description" rows={5} maxLength={10_000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" isLoading={update.isPending}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Pick the entry to keep; this one's copies move there and it is deleted. */
function MergeModal({ row, onClose }: { row: StaffCatalogRow; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const merge = useMergeBooks();
  const [search, setSearch] = useState('');
  const { data } = useStaffCatalog({ page: 1, pageSize: 8, search: search.trim() || undefined });
  const candidates = search.trim().length >= 2 ? (data?.items ?? []).filter((item) => item.id !== row.id) : [];

  async function into(keep: StaffCatalogRow) {
    try {
      await merge.mutateAsync({ keepId: keep.id, dropId: row.id });
      showToast(t.bookshop.merged, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.bookshop.merge}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">{t.bookshop.mergeHint}</p>
        <Input placeholder={t.bookshop.searchPlaceholder} aria-label={t.bookshop.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li key={candidate.id} className="flex items-center gap-3 rounded-xl border border-border-default p-2">
              <div className="w-10 shrink-0">
                <BookCover url={candidate.coverUrl} title={candidate.title} size="sm" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-text-primary">{candidate.title}</p>
                <p className="text-xs text-text-tertiary">
                  {[namesText(candidate.authors, locale), candidate.publisher, candidate.isbn, candidate.code].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button size="sm" isLoading={merge.isPending} onClick={() => void into(candidate)}>
                {t.bookshop.merge}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
