import { useState } from 'react';
import { Link } from 'react-router';
import { Briefcase, Search, SlidersHorizontal } from 'lucide-react';
import { useServices, useWorkCategories } from '@/api/work';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
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
import { CountrySelect, CurrencySelect } from '@/components/jobs/GeoFields';
import { ServiceCard, WorkCategorySelect } from '@/components/work/WorkUi';
import { FREELANCER_LEVELS, WORK_LANGUAGES } from '@/types/work';

const PAGE_SIZES = [12, 24, 48];
const DELIVERY = ['1', '3', '7', '14', '30'];

/**
 * The service catalogue: ready-made work at a fixed price, Fiverr's shape.
 *
 * A grid of tiles rather than a list of rows, because a service is chosen as
 * much by its picture and its seller as by its words; filters for the things
 * Fiverr filters by — category, budget, delivery time, seller level, seller
 * location and language.
 */
export default function ServiceCatalogPage() {
  const { t, locale } = useLocale();
  const { data: categories } = useWorkCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const controls = useListControls({
    defaultSort: 'recommended',
    pageSize: 24,
    pageSizeOptions: PAGE_SIZES,
    filters: {
      workCategoryId: '',
      priceMin: '',
      priceMax: '',
      currency: '',
      deliveryDays: '',
      language: '',
      sellerCountry: '',
      sellerLevel: '',
      verifiedSeller: '',
      sellerUsername: '',
    },
    typedFilters: ['priceMin', 'priceMax'],
  });
  const { filters } = controls;
  const priceMin = toLatinDigits(filters.priceMin).replace(/[^0-9]/g, '');
  const priceMax = toLatinDigits(filters.priceMax).replace(/[^0-9]/g, '');
  const currency = filters.currency || 'IRT';

  const { data, isLoading } = useServices({
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    sort: controls.sort,
    workCategoryId: filters.workCategoryId || undefined,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    currency: priceMin || priceMax ? currency : undefined,
    deliveryDays: filters.deliveryDays || undefined,
    language: filters.language || undefined,
    sellerCountry: filters.sellerCountry || undefined,
    sellerLevel: filters.sellerLevel || undefined,
    verifiedSeller: filters.verifiedSeller === 'true',
    sellerUsername: filters.sellerUsername || undefined,
  });

  useDocumentTitle(t.work.servicesTitle, { description: t.work.servicesSubtitle });
  const parents = (categories ?? []).filter((category) => category.parentId === null);

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <FormField label={t.work.categoryLabel} htmlFor="s-category">
        <WorkCategorySelect
          id="s-category"
          categories={categories}
          value={filters.workCategoryId}
          onChange={(value) => controls.setFilter('workCategoryId', value)}
          placeholder={t.jobs.allCategories}
          counts="services"
        />
      </FormField>

      <FormField label={t.work.priceRange} htmlFor="s-price-min">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              id="s-price-min"
              inputMode="numeric"
              className="ltr min-w-0 flex-1"
              placeholder={t.work.budgetMinLabel}
              aria-label={t.work.budgetMinLabel}
              value={controls.filterInput('priceMin')}
              onChange={(e) => controls.setFilter('priceMin', e.target.value)}
            />
            <Input
              inputMode="numeric"
              className="ltr min-w-0 flex-1"
              placeholder={t.work.budgetMaxLabel}
              aria-label={t.work.budgetMaxLabel}
              value={controls.filterInput('priceMax')}
              onChange={(e) => controls.setFilter('priceMax', e.target.value)}
            />
          </div>
          <CurrencySelect aria-label={t.work.currencyLabel} value={currency} onChange={(value) => controls.setFilter('currency', value)} />
        </div>
      </FormField>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.deliveryTime}</legend>
        <div className="flex flex-col gap-1.5">
          {['', ...DELIVERY].map((value) => (
            <label key={value || 'any'} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="radio"
                name="s-delivery"
                checked={filters.deliveryDays === value}
                onChange={() => controls.setFilter('deliveryDays', value)}
              />
              {value ? fill(t.work.upToDays, { days: formatNumber(Number(value), locale) }) : t.work.anyDelivery}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label={t.work.sellerLevel} htmlFor="s-level">
        <Select id="s-level" value={filters.sellerLevel} onChange={(e) => controls.setFilter('sellerLevel', e.target.value)}>
          <option value="">{t.work.anyLevel}</option>
          {FREELANCER_LEVELS.filter((level) => level !== 'NEW').map((level) => (
            <option key={level} value={level}>
              {t.work.levels[level]}+
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.work.sellerCountry} htmlFor="s-country">
        <CountrySelect
          id="s-country"
          value={filters.sellerCountry}
          placeholder={t.work.anywhere}
          onChange={(value) => controls.setFilter('sellerCountry', value)}
        />
      </FormField>

      <FormField label={t.work.languagesLabel} htmlFor="s-language">
        <Select id="s-language" value={filters.language} onChange={(e) => controls.setFilter('language', e.target.value)}>
          <option value="">{t.list.allOption}</option>
          {WORK_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {languageName(code, locale)}
            </option>
          ))}
        </Select>
      </FormField>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="size-4 rounded border-border-default"
          checked={filters.verifiedSeller === 'true'}
          onChange={() => controls.setFilter('verifiedSeller', filters.verifiedSeller === 'true' ? '' : 'true')}
        />
        {t.work.verifiedOnly}
      </label>

      {controls.activeCount > 0 && (
        <Button variant="outline" onClick={controls.clear}>
          {t.jobs.clearFilters}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t.work.servicesTitle}</h1>
          <p className="mt-2 text-text-secondary">{t.work.servicesSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects">
            <Button variant="outline">
              <Briefcase className="size-4" aria-hidden="true" />
              {t.work.boardTitle}
            </Button>
          </Link>
          <Link to="/dashboard/services/new">
            <Button>{t.work.newService}</Button>
          </Link>
        </div>
      </header>

      {parents.length > 0 && (
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label={t.work.categoryLabel}>
          {parents.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => controls.setFilter('workCategoryId', filters.workCategoryId === category.id ? '' : category.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-sm',
                filters.workCategoryId === category.id
                  ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                  : 'border-border-default text-text-secondary hover:border-border-strong',
              )}
            >
              {categoryName(category, locale)}
            </button>
          ))}
        </nav>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <Input
            className="ps-9"
            value={controls.searchInput}
            placeholder={t.work.servicesSearchPlaceholder}
            aria-label={t.work.servicesSearchPlaceholder}
            onChange={(e) => controls.setSearch(e.target.value)}
          />
        </div>
        <Select className="sm:w-56" value={controls.sort} aria-label={t.market.sortLabel} onChange={(e) => controls.setSort(e.target.value)}>
          <option value="recommended">{t.work.sortRecommended}</option>
          <option value="bestSelling">{t.work.sortBestSelling}</option>
          <option value="rating">{t.work.sortTopRated}</option>
          <option value="newest">{t.market.sortNewest}</option>
          <option value="priceAsc">{t.work.sortPriceLow}</option>
          <option value="priceDesc">{t.work.sortPriceHigh}</option>
        </Select>
        <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtersOpen ? t.jobs.hideFilters : t.jobs.showFilters}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'rounded-2xl border border-border-default bg-surface-default p-4 lg:sticky lg:top-24 lg:block lg:w-64 lg:shrink-0',
            filtersOpen ? 'block' : 'hidden',
          )}
          aria-label={t.jobs.filters}
        >
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1" id="service-results">
          <p className="mb-4 text-sm text-text-secondary" aria-live="polite">
            {data && fill(t.jobs.resultsCount, { count: formatNumber(data.total, locale) })}
          </p>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}
          {!isLoading && data?.items.length === 0 && <EmptyState title={t.list.noResults} />}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </ul>
          {data && (
            <ListPager
              className="mt-6"
              page={controls.page}
              pageSize={controls.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={(next) => {
                controls.setPage(next);
                document.getElementById('service-results')?.scrollIntoView({ behavior: 'smooth' });
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
