import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BadgeCheck, ImagePlus, Save, Search, Send, X } from 'lucide-react';
import { offerPhotoPath, useBookCategories, useCatalogSearch, useOwnOffers, useSaveOffer, useSubmitOffer } from '@/api/bookshop';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { IRAN_PROVINCES, provinceLabel } from '@/lib/iranProvinces';
import { languageName, money } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';
import { CurrencySelect } from '@/components/jobs/GeoFields';
import { BookCategorySelect, BookCover } from '@/components/books/BookUi';
import { namesText } from '@/lib/bookFormat';
import {
  BOOK_BINDINGS,
  BOOK_DELIVERY,
  BOOK_GRADES,
  BOOK_LANGUAGES,
  BOOK_TRIM_SIZES,
  type BookDelivery,
  type BookFactsPayload,
  type BookFactsSummary,
  type BookGrade,
  type OfferPayload,
} from '@/types/bookshop';

const MAX_PHOTOS = 6;
const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');
const lines = (value: string) => value.split(/[\n,،]/).map((item) => item.trim()).filter(Boolean);

const EMPTY_FACTS: BookFactsPayload = {
  title: '',
  authors: [],
  translators: [],
  yearCalendar: 'SOLAR',
  language: 'fa',
  currency: 'IRT',
  tags: [],
};

/**
 * Selling a copy.
 *
 * First the book: by ISBN or title, so a copy joins the page the book already
 * has instead of starting a second one — the whole point of a catalogue. Only
 * a book nobody has listed needs its details typed. Then the copy itself:
 * its condition on the trade's scale, what is particular about it, the price
 * (measured against the cover price, as a buyer will), how it can be
 * delivered, and photographs of this copy, not a cover from the internet.
 */
export default function SellBookPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: categories } = useBookCategories();
  const { data: own, isLoading } = useOwnOffers();
  const editing = id ? own?.find((offer) => offer.id === id) : undefined;
  const save = useSaveOffer();
  const submit = useSubmitOffer();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const { data: hits, isFetching } = useCatalogSearch(debounced);
  const [picked, setPicked] = useState<BookFactsSummary | null>(null);
  const [newBook, setNewBook] = useState(false);
  const [facts, setFacts] = useState<BookFactsPayload>(EMPTY_FACTS);
  const [authorsText, setAuthorsText] = useState('');
  const [translatorsText, setTranslatorsText] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [grade, setGrade] = useState<BookGrade>('VERY_GOOD');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [delivery, setDelivery] = useState<BookDelivery[]>(['IN_PERSON', 'POST']);
  const [shipping, setShipping] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [removePhotoIds, setRemovePhotoIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  useDocumentTitle(id ? t.bookshop.editOfferTitle : t.bookshop.sellTitle);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!editing) return;
    setPicked(editing.book);
    setGrade(editing.grade ?? 'GOOD');
    setNotes(editing.conditionNotes ?? '');
    setPrice(editing.price);
    setNegotiable(editing.negotiable);
    setQuantity(editing.quantity || 1);
    setDelivery(editing.deliveryOptions.length ? editing.deliveryOptions : ['IN_PERSON']);
    setShipping(editing.shippingCost ?? '');
    setProvince(editing.province ?? '');
    setCity(editing.city ?? '');
  }, [editing]);

  const set = <K extends keyof BookFactsPayload>(key: K, value: BookFactsPayload[K]) => setFacts((current) => ({ ...current, [key]: value }));
  const keptPhotos = (editing?.photos ?? []).filter((photo) => !removePhotoIds.includes(photo.id));
  const room = MAX_PHOTOS - keptPhotos.length - photos.length;
  const coverPrice = picked?.listPrice ? BigInt(picked.listPrice) : digits(facts.listPrice ?? '') ? BigInt(digits(facts.listPrice ?? '')) : null;
  const priceValue = digits(price) ? BigInt(digits(price)) : null;
  const belowCover = coverPrice && priceValue !== null && priceValue < coverPrice ? Number(((coverPrice - priceValue) * 100n) / coverPrice) : 0;
  const bookReady = Boolean(picked) || (newBook && facts.title.trim() && lines(authorsText).length > 0);

  function payload(): OfferPayload {
    const base = {
      grade,
      conditionNotes: notes.trim() || undefined,
      price: digits(price),
      negotiable,
      quantity,
      deliveryOptions: delivery,
      shippingCost: digits(shipping) || (shipping.trim() === '0' ? '0' : undefined),
      province: province || undefined,
      city: city.trim() || undefined,
      removePhotoIds,
    };
    if (picked) return { ...base, bookId: picked.id };
    return {
      ...base,
      book: {
        ...facts,
        title: facts.title.trim(),
        authors: lines(authorsText),
        translators: lines(translatorsText),
        tags: lines(tagsText),
        publishYear: digits(facts.publishYear ?? '') || undefined,
        edition: digits(facts.edition ?? '') || undefined,
        printRun: digits(facts.printRun ?? '') || undefined,
        pageCount: digits(facts.pageCount ?? '') || undefined,
        seriesNumber: digits(facts.seriesNumber ?? '') || undefined,
        weightGrams: digits(facts.weightGrams ?? '') || undefined,
        listPrice: digits(facts.listPrice ?? '') || undefined,
      },
    };
  }

  async function handleSave(andSubmit: boolean) {
    try {
      const result = await save.mutateAsync({ id, payload: payload(), photos, onProgress: setProgress });
      if (andSubmit) {
        await submit.mutateAsync(result.id);
        showToast(t.bookshop.submitted, 'success');
      } else {
        showToast(t.bookshop.draftSaved, 'success');
      }
      navigate('/dashboard/books');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    } finally {
      setProgress(null);
    }
  }

  if (id && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const text = (key: keyof BookFactsPayload, label: string, props: { inputMode?: 'numeric'; className?: string; hint?: string } = {}) => (
    <FormField label={label} htmlFor={`f-${key}`} hint={props.hint}>
      <Input
        id={`f-${key}`}
        inputMode={props.inputMode}
        className={props.className}
        value={(facts[key] as string | undefined) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </FormField>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={id ? t.bookshop.editOfferTitle : t.bookshop.sellTitle} />

      {/* 1. The book */}
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold text-text-primary">1. {t.bookshop.stepFind}</h2>
        {picked ? (
          <div className="flex items-start gap-4">
            <div className="w-20 shrink-0">
              <BookCover url={picked.coverUrl} title={picked.title} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-tertiary">{t.bookshop.pickedBook}</p>
              <p className="font-semibold text-text-primary">{picked.title}</p>
              <p className="text-sm text-text-secondary">{namesText(picked.authors, locale)}</p>
              <p className="text-xs text-text-tertiary">
                {[picked.publisher, picked.isbn, picked.listPrice ? `${t.bookshop.listPrice}: ${money(picked.listPrice, picked.currency, locale, t)}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {!id && (
              <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
                {t.bookshop.changeBook}
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">{t.bookshop.findHint}</p>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
              <Input className="ps-9" placeholder={t.bookshop.findPlaceholder} aria-label={t.bookshop.findPlaceholder} value={query} onChange={(e) => { setQuery(e.target.value); setNewBook(false); }} />
            </div>
            {isFetching && <Spinner label={t.common.loading} />}
            {hits && hits.length > 0 && !newBook && (
              <ul className="flex flex-col gap-2">
                {hits.map((hit) => (
                  <li key={hit.id} className="flex items-center gap-3 rounded-xl border border-border-default p-2">
                    <div className="w-12 shrink-0">
                      <BookCover url={hit.coverUrl} title={hit.title} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex items-center gap-1 font-medium text-text-primary">
                        {hit.title}
                        {hit.verified && <BadgeCheck className="size-3.5 text-brand-green-600" aria-label={t.bookshop.verifiedBook} />}
                      </p>
                      <p className="text-text-secondary">{namesText(hit.authors, locale)}</p>
                      <p className="text-xs text-text-tertiary">
                        {[hit.publisher, hit.publishYear ? formatNumber(hit.publishYear, locale) : null, hit.isbn, fill(t.bookshop.offersCount, { count: formatNumber(hit._count.listings, locale) })].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setPicked(hit)}>
                      {t.bookshop.pickThis}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!newBook && (
              <Button variant="ghost" className="self-start" onClick={() => { setNewBook(true); if (/\d{9,}/.test(digits(query))) set('isbn', digits(query)); else set('title', query); }}>
                {t.bookshop.notListed}
              </Button>
            )}
          </>
        )}
      </Card>

      {/* 2. Its details, only for a book the catalogue does not have */}
      {newBook && !picked && (
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">2. {t.bookshop.stepFacts}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('title', t.bookshop.titleLabel)}
            {text('subtitle', t.bookshop.subtitleLabel)}
            <FormField label={t.bookshop.authorsLabel} htmlFor="f-authors" hint={t.bookshop.namesHint}>
              <TextArea id="f-authors" rows={2} value={authorsText} onChange={(e) => setAuthorsText(e.target.value)} />
            </FormField>
            <FormField label={t.bookshop.translatorsLabel} htmlFor="f-translators" hint={t.bookshop.namesHint}>
              <TextArea id="f-translators" rows={2} value={translatorsText} onChange={(e) => setTranslatorsText(e.target.value)} />
            </FormField>
            {text('publisher', t.bookshop.publisher)}
            {text('isbn', t.bookshop.isbn, { className: 'ltr', hint: t.bookshop.isbnHint })}
            <div className="grid grid-cols-2 gap-2">
              {text('publishYear', t.bookshop.yearLabel, { inputMode: 'numeric', className: 'ltr' })}
              <FormField label={t.bookshop.calendarLabel} htmlFor="f-calendar">
                <Select id="f-calendar" value={facts.yearCalendar} onChange={(e) => set('yearCalendar', e.target.value as 'SOLAR' | 'GREGORIAN')}>
                  <option value="SOLAR">{t.bookshop.calendars.SOLAR}</option>
                  <option value="GREGORIAN">{t.bookshop.calendars.GREGORIAN}</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {text('edition', t.bookshop.editionLabel, { inputMode: 'numeric', className: 'ltr' })}
              {text('printRun', t.bookshop.printRunLabel, { inputMode: 'numeric', className: 'ltr' })}
            </div>
            {text('pageCount', t.bookshop.pagesLabel, { inputMode: 'numeric', className: 'ltr' })}
            <FormField label={t.bookshop.languageLabel} htmlFor="f-language">
              <Select id="f-language" value={facts.language} onChange={(e) => set('language', e.target.value)}>
                {BOOK_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code, locale)}
                  </option>
                ))}
              </Select>
            </FormField>
            {translatorsText.trim() && (
              <>
                {text('originalTitle', t.bookshop.originalTitleLabel)}
                <FormField label={t.bookshop.originalLanguageLabel} htmlFor="f-original-language">
                  <Select id="f-original-language" value={facts.originalLanguage ?? ''} onChange={(e) => set('originalLanguage', e.target.value || undefined)}>
                    <option value="">—</option>
                    {['en', 'fr', 'de', 'ru', 'es', 'it', 'ar', 'tr', 'ja', 'he', 'zh'].map((code) => (
                      <option key={code} value={code}>
                        {languageName(code, locale)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            )}
            <FormField label={t.bookshop.binding} htmlFor="f-binding">
              <Select id="f-binding" value={facts.binding ?? ''} onChange={(e) => set('binding', (e.target.value || undefined) as never)}>
                <option value="">—</option>
                {BOOK_BINDINGS.map((value) => (
                  <option key={value} value={value}>
                    {t.bookshop.bindings[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.bookshop.trimSize} htmlFor="f-trim">
              <Select id="f-trim" value={facts.trimSize ?? ''} onChange={(e) => set('trimSize', (e.target.value || undefined) as never)}>
                <option value="">—</option>
                {BOOK_TRIM_SIZES.map((value) => (
                  <option key={value} value={value}>
                    {t.bookshop.trimSizes[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              {text('listPrice', t.bookshop.listPriceLabel, { inputMode: 'numeric', className: 'ltr' })}
              <FormField label={t.work.currencyLabel} htmlFor="f-currency">
                <CurrencySelect id="f-currency" value={facts.currency} onChange={(value) => set('currency', value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              {text('series', t.bookshop.seriesLabel)}
              {text('seriesNumber', t.bookshop.seriesNumberLabel, { inputMode: 'numeric', className: 'ltr' })}
            </div>
            {text('weightGrams', t.bookshop.weightLabel, { inputMode: 'numeric', className: 'ltr' })}
            <FormField label={t.bookshop.shelfLabel} htmlFor="f-shelf">
              <BookCategorySelect id="f-shelf" categories={categories} value={facts.categoryId ?? ''} onChange={(value) => set('categoryId', value || undefined)} placeholder="—" />
            </FormField>
            <FormField label={t.bookshop.tagsLabel} htmlFor="f-tags" hint={t.bookshop.tagsHint}>
              <Input id="f-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </FormField>
          </div>
          <FormField label={t.bookshop.descriptionLabel} htmlFor="f-description">
            <TextArea id="f-description" rows={5} maxLength={10_000} value={facts.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </FormField>
        </Card>
      )}

      {/* 3. The copy */}
      {bookReady && (
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">{newBook && !picked ? 3 : 2}. {t.bookshop.stepCopy}</h2>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">{t.bookshop.gradeLabel}</legend>
            <div className="grid gap-2 sm:grid-cols-5">
              {BOOK_GRADES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={grade === value}
                  onClick={() => setGrade(value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl border p-3 text-start',
                    grade === value ? 'border-brand-green-600 bg-brand-green-50 ring-1 ring-brand-green-600 dark:bg-brand-green-900/20' : 'border-border-default hover:border-border-strong',
                  )}
                >
                  <span className="text-sm font-medium text-text-primary">{t.bookshop.grades[value]}</span>
                  <span className="text-xs text-text-tertiary">{t.bookshop.gradeHints[value]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <FormField label={t.bookshop.conditionNotesLabel} htmlFor="c-notes" hint={t.bookshop.conditionNotesHint}>
            <TextArea id="c-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t.bookshop.priceLabel} htmlFor="c-price" hint={belowCover > 0 ? fill(t.bookshop.priceVsCover, { percent: formatNumber(belowCover, locale) }) : undefined}>
              <Input id="c-price" required inputMode="numeric" className="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
            </FormField>
            <FormField label={t.bookshop.quantityLabel} htmlFor="c-qty">
              <Input id="c-qty" type="number" min={1} max={999} className="ltr" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </FormField>
            <label className="flex items-end gap-2 pb-2 text-sm text-text-secondary">
              <input type="checkbox" className="size-4 rounded border-border-default" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />
              {t.bookshop.negotiableLabel}
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">{t.bookshop.deliveryLabel}</legend>
            <div className="flex flex-wrap gap-4">
              {BOOK_DELIVERY.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border-default"
                    checked={delivery.includes(option)}
                    onChange={() => setDelivery(delivery.includes(option) ? delivery.filter((item) => item !== option) : [...delivery, option])}
                  />
                  {t.bookshop.delivery[option]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            {delivery.some((option) => option !== 'IN_PERSON') && (
              <FormField label={t.bookshop.shippingLabel} htmlFor="c-shipping" hint={t.bookshop.shippingHint}>
                <Input id="c-shipping" inputMode="numeric" className="ltr" value={shipping} onChange={(e) => setShipping(e.target.value)} />
              </FormField>
            )}
            <FormField label={t.market.province} htmlFor="c-province">
              <Select id="c-province" value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">—</option>
                {IRAN_PROVINCES.map((item) => (
                  <option key={item.slug} value={item.fa}>
                    {provinceLabel(item, locale)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.bookshop.cityLabel} htmlFor="c-city">
              <Input id="c-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
          </div>
        </Card>
      )}

      {/* 4. Photos */}
      {bookReady && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold text-text-primary">{newBook && !picked ? 4 : 3}. {t.bookshop.photosLabel}</h2>
          <p className="text-sm text-text-tertiary">{t.bookshop.photosHint}</p>
          <div className="flex flex-wrap gap-3">
            {keptPhotos.map((photo) => (
              <div key={photo.id} className="relative h-28 w-20 overflow-hidden rounded-lg bg-surface-muted">
                <StaffImage path={offerPhotoPath(photo.id, 'own')} alt={photo.originalName} className="size-full object-cover" fallback={null} />
                <button type="button" className="absolute end-1 top-1 rounded-full bg-surface-default/90 p-0.5" aria-label={t.common.delete} onClick={() => setRemovePhotoIds([...removePhotoIds, photo.id])}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {photos.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative h-28 w-20 overflow-hidden rounded-lg bg-surface-muted">
                <img src={URL.createObjectURL(file)} alt={file.name} className="size-full object-cover" />
                <button type="button" className="absolute end-1 top-1 rounded-full bg-surface-default/90 p-0.5" aria-label={t.common.delete} onClick={() => setPhotos(photos.filter((_, i) => i !== index))}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {room > 0 && (
              <label className="flex h-28 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-default text-text-tertiary hover:border-border-strong">
                <ImagePlus className="size-5" aria-hidden="true" />
                <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple capture="environment" className="sr-only" onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files ?? [])].slice(0, MAX_PHOTOS - keptPhotos.length))} />
              </label>
            )}
          </div>
          {progress !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand-green-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </Card>
      )}

      {bookReady && (
        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/dashboard/books">
            <Button variant="ghost">{t.common.cancel}</Button>
          </Link>
          <Button variant="outline" disabled={!digits(price) || delivery.length === 0} isLoading={save.isPending && !submit.isPending} onClick={() => void handleSave(false)}>
            <Save className="size-4" aria-hidden="true" />
            {t.bookshop.saveDraft}
          </Button>
          <Button disabled={!digits(price) || delivery.length === 0 || keptPhotos.length + photos.length === 0} isLoading={submit.isPending} onClick={() => void handleSave(true)}>
            <Send className="size-4" aria-hidden="true" />
            {t.bookshop.submitForReview}
          </Button>
        </div>
      )}
    </div>
  );
}
