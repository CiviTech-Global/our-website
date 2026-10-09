import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PlusCircle, Search, SlidersHorizontal } from 'lucide-react';
import { useBookBoard, useBookCategories } from '@/api/bookshop';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { IRAN_PROVINCES, provinceLabel } from '@/lib/iranProvinces';
import { languageName } from '@/lib/workFormat';
import { useListControls } from '@/lib/useListControls';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ListPager } from '@/components/ui/ListPager';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { BookCategorySelect, BookTile } from '@/components/books/BookUi';
import { BOOK_BINDINGS, BOOK_DELIVERY, BOOK_GRADES, BOOK_LANGUAGES, BOOK_TRIM_SIZES } from '@/types/bookshop';

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

/**
 * The book market, second generation: one tile per book, summarised from every
 * copy for sale, the way Bookshop.org and BookBub show a book — cover, title,
 * author, the lowest price against the cover price.
 *
 * One page for the market (/books) and each shelf's landing page
 * (/books/shelf/:slug). Filters for what a buyer here asks: shelf, condition,
 * price, binding and the trade's trim sizes, language and translations, the
 * seller's province and how the book can reach them.
 */
export default function BookshopPage() {
  const { t, locale } = useLocale();
  const params = useParams<{ shelf?: string }>();
  const { data: categories } = useBookCategories();
  const fixedShelf = params.shelf ? categories?.find((category) => category.slug === params.shelf) : undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);

  const controls = useListControls({
    defaultSort: 'newest',
    pageSize: 24,
    pageSizeOptions: [12, 24, 48],
    filters: {
      categoryId: '',
      grade: '',
      language: '',
      binding: '',
      trimSize: '',
      priceMin: '',
      priceMax: '',
      province: '',
      delivery: '',
      author: '',
      translator: '',
      publisher: '',
      yearFrom: '',
      yearTo: '',
      discounted: '',
      translated: '',
      freeShipping: '',
    },
    typedFilters: ['priceMin', 'priceMax', 'author', 'translator', 'publisher', 'yearFrom', 'yearTo'],
  });
  const { filters } = controls;
  const flag = (name: 'discounted' | 'translated' | 'freeShipping') => filters[name] === 'true';
  const categoryId = fixedShelf?.id ?? filters.categoryId;
  const waiting = Boolean(params.shelf) && !categories;

  const { data, isLoading } = useBookBoard(
    {
      page: controls.page,
      pageSize: controls.pageSize,
      search: controls.search || undefined,
      sort: controls.sort,
      categoryId: categoryId || undefined,
      grade: filters.grade || undefined,
      language: filters.language || undefined,
      binding: filters.binding || undefined,
      trimSize: filters.trimSize || undefined,
      priceMin: digits(filters.priceMin) || undefined,
      priceMax: digits(filters.priceMax) || undefined,
      province: filters.province || undefined,
      delivery: filters.delivery || undefined,
      author: filters.author.trim() || undefined,
      translator: filters.translator.trim() || undefined,
      publisher: filters.publisher.trim() || undefined,
      yearFrom: digits(filters.yearFrom) || undefined,
      yearTo: digits(filters.yearTo) || undefined,
      discounted: flag('discounted'),
      translated: flag('translated'),
      freeShipping: flag('freeShipping'),
    },
    !waiting,
  );

  const shelfLabel = fixedShelf ? categoryName(fixedShelf, locale) : '';
  useDocumentTitle(fixedShelf ? `${t.bookshop.title}: ${shelfLabel}` : t.bookshop.title, { description: t.bookshop.subtitle });

  if (params.shelf && categories && !fixedShelf) {
    return (
      <div className="page-frame page-frame-reading text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/books" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.bookshop.title}
        </Link>
      </div>
    );
  }

  const parents = (categories ?? []).filter((category) => category.parentId === null);
  const select = (name: keyof typeof filters, options: readonly string[], label: (value: string) => string, any: string) => (
    <Select id={`b-${name}`} value={filters[name]} onChange={(e) => controls.setFilter(name, e.target.value)}>
      <option value="">{any}</option>
      {options.map((value) => (
        <option key={value} value={value}>
          {label(value)}
        </option>
      ))}
    </Select>
  );

  const filterPanel = (
    <div className="flex flex-col gap-5">
      {!fixedShelf && (
        <FormField label={t.bookshop.shelves} htmlFor="b-shelf">
          <BookCategorySelect
            id="b-shelf"
            categories={categories}
            value={filters.categoryId}
            onChange={(value) => controls.setFilter('categoryId', value)}
            placeholder={t.bookshop.allShelves}
            counts
          />
        </FormField>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.bookshop.conditionAtLeast}</legend>
        <div className="flex flex-col gap-1.5">
          {['', ...BOOK_GRADES].map((value) => (
            <label key={value || 'any'} className="flex items-center gap-2 text-sm text-text-secondary" title={value ? t.bookshop.gradeHints[value as keyof typeof t.bookshop.gradeHints] : undefined}>
              <input type="radio" name="b-grade" checked={filters.grade === value} onChange={() => controls.setFilter('grade', value)} />
              {value ? t.bookshop.grades[value as keyof typeof t.bookshop.grades] : t.bookshop.anyCondition}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label={t.bookshop.price} htmlFor="b-price-min">
        <div className="flex gap-2">
          <Input id="b-price-min" inputMode="numeric" className="ltr min-w-0 flex-1" placeholder={t.work.budgetMinLabel} aria-label={t.work.budgetMinLabel} value={controls.filterInput('priceMin')} onChange={(e) => controls.setFilter('priceMin', e.target.value)} />
          <Input inputMode="numeric" className="ltr min-w-0 flex-1" placeholder={t.work.budgetMaxLabel} aria-label={t.work.budgetMaxLabel} value={controls.filterInput('priceMax')} onChange={(e) => controls.setFilter('priceMax', e.target.value)} />
        </div>
      </FormField>

      <FormField label={t.bookshop.language} htmlFor="b-language">
        {select('language', BOOK_LANGUAGES, (code) => languageName(code, locale), t.list.allOption)}
      </FormField>
      <FormField label={t.bookshop.binding} htmlFor="b-binding">
        {select('binding', BOOK_BINDINGS, (value) => t.bookshop.bindings[value as keyof typeof t.bookshop.bindings], t.list.allOption)}
      </FormField>
      <FormField label={t.bookshop.trimSize} htmlFor="b-trimSize">
        {select('trimSize', BOOK_TRIM_SIZES, (value) => t.bookshop.trimSizes[value as keyof typeof t.bookshop.trimSizes], t.list.allOption)}
      </FormField>
      <FormField label={t.bookshop.deliveryMethod} htmlFor="b-delivery">
        {select('delivery', BOOK_DELIVERY, (value) => t.bookshop.delivery[value as keyof typeof t.bookshop.delivery], t.list.allOption)}
      </FormField>
      <FormField label={t.bookshop.province} htmlFor="b-province">
        <Select id="b-province" value={filters.province} onChange={(e) => controls.setFilter('province', e.target.value)}>
          <option value="">{t.jobs.allProvinces}</option>
          {IRAN_PROVINCES.map((item) => (
            <option key={item.slug} value={item.fa}>
              {provinceLabel(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>

      {(['author', 'translator', 'publisher'] as const).map((name) => (
        <FormField key={name} label={t.bookshop[name]} htmlFor={`b-${name}`}>
          <Input id={`b-${name}`} value={controls.filterInput(name)} onChange={(e) => controls.setFilter(name, e.target.value)} />
        </FormField>
      ))}

      <FormField label={t.bookshop.yearFrom} htmlFor="b-year-from">
        <div className="flex items-center gap-2">
          <Input id="b-year-from" inputMode="numeric" className="ltr min-w-0 flex-1" value={controls.filterInput('yearFrom')} onChange={(e) => controls.setFilter('yearFrom', e.target.value)} />
          <span className="text-sm text-text-tertiary">{t.bookshop.yearTo}</span>
          <Input inputMode="numeric" className="ltr min-w-0 flex-1" aria-label={t.bookshop.yearTo} value={controls.filterInput('yearTo')} onChange={(e) => controls.setFilter('yearTo', e.target.value)} />
        </div>
      </FormField>

      <fieldset className="flex flex-col gap-2">
        {(
          [
            ['discounted', t.bookshop.onlyDiscounted],
            ['translated', t.bookshop.onlyTranslated],
            ['freeShipping', t.bookshop.onlyFreeShipping],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="size-4 rounded border-border-default" checked={flag(name)} onChange={() => controls.setFilter(name, flag(name) ? '' : 'true')} />
            {label}
          </label>
        ))}
      </fieldset>

      {controls.activeCount > 0 && (
        <Button variant="outline" onClick={controls.clear}>
          {t.jobs.clearFilters}
        </Button>
      )}
    </div>
  );

  return (
    <div className="page-frame">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{fixedShelf ? shelfLabel : t.bookshop.title}</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">{t.bookshop.subtitle}</p>
        </div>
        <Link to="/dashboard/books/sell">
          <Button>
            <PlusCircle className="size-4" aria-hidden="true" />
            {t.bookshop.sellBook}
          </Button>
        </Link>
      </header>

      {parents.length > 0 && (
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label={t.bookshop.shelves}>
          <Link
            to="/books"
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-sm',
              !fixedShelf ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300' : 'border-border-default text-text-secondary hover:border-border-strong',
            )}
          >
            {t.bookshop.allShelves}
          </Link>
          {parents.map((category) => (
            <Link
              key={category.id}
              to={`/books/shelf/${category.slug}`}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-sm',
                fixedShelf?.id === category.id
                  ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                  : 'border-border-default text-text-secondary hover:border-border-strong',
              )}
            >
              {categoryName(category, locale)}
              {category.bookCount > 0 && <span className="ms-1 text-text-tertiary">{formatNumber(category.bookCount, locale)}</span>}
            </Link>
          ))}
        </nav>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <Input className="ps-9" value={controls.searchInput} placeholder={t.bookshop.searchPlaceholder} aria-label={t.bookshop.searchPlaceholder} onChange={(e) => controls.setSearch(e.target.value)} />
        </div>
        <Select className="sm:w-52" value={controls.sort} aria-label={t.market.sortLabel} onChange={(e) => controls.setSort(e.target.value)}>
          <option value="newest">{t.bookshop.sortNewest}</option>
          <option value="priceAsc">{t.bookshop.sortPriceAsc}</option>
          <option value="priceDesc">{t.bookshop.sortPriceDesc}</option>
          <option value="discount">{t.bookshop.sortDiscount}</option>
          <option value="mostOffers">{t.bookshop.sortMostOffers}</option>
          <option value="popular">{t.bookshop.sortPopular}</option>
          <option value="title">{t.bookshop.sortTitle}</option>
        </Select>
        <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtersOpen ? t.jobs.hideFilters : t.jobs.showFilters}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'rounded-2xl border border-border-default bg-surface-default p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto',
            filtersOpen ? 'block' : 'hidden',
          )}
          aria-label={t.jobs.filters}
        >
          {filterPanel}
        </aside>
        <section className="min-w-0 flex-1" id="book-results">
          <p className="mb-4 text-sm text-text-secondary" aria-live="polite">
            {data && fill(t.bookshop.booksCount, { count: formatNumber(data.total, locale) })}
          </p>
          {(isLoading || waiting) && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}
          {!isLoading && !waiting && data?.items.length === 0 && <EmptyState title={t.bookshop.emptyBoard} />}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
            {data?.items.map((book) => (
              <BookTile key={book.id} book={book} />
            ))}
          </ul>
          {data && (
            <ListPager
              className="mt-8"
              page={controls.page}
              pageSize={controls.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={(next) => {
                controls.setPage(next);
                document.getElementById('book-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              pageSizeOptions={controls.pageSizeOptions}
              onPageSizeChange={controls.setPageSize}
            />
          )}
        </section>
      </div>
    </div>
  );
}
