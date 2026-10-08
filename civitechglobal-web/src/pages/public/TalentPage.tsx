import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTalent, useWorkCategories } from '@/api/work';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
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
import { CountrySelect } from '@/components/jobs/GeoFields';
import { TalentCard, WorkCategorySelect } from '@/components/work/WorkUi';
import { InviteModal } from '@/components/work/InviteModal';
import { AVAILABILITY, FREELANCER_LEVELS, WORK_LANGUAGES } from '@/types/work';

/**
 * The talent directory: Upwork's "Browse talent" and Freelancer.com's "Hire
 * freelancers", over the people here with a public profile who offer
 * something. Every card can be invited straight to one of the reader's open
 * projects.
 */
export default function TalentPage() {
  const { t, locale } = useLocale();
  const { data: categories } = useWorkCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const controls = useListControls({
    defaultSort: 'relevance',
    pageSize: 20,
    pageSizeOptions: [10, 20, 40],
    filters: {
      workCategoryId: '',
      country: '',
      language: '',
      availability: '',
      level: '',
      minRating: '',
      verified: '',
    },
  });
  const { filters } = controls;
  const { data, isLoading } = useTalent({
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    sort: controls.sort,
    workCategoryId: filters.workCategoryId || undefined,
    country: filters.country || undefined,
    language: filters.language || undefined,
    availability: filters.availability || undefined,
    level: filters.level || undefined,
    minRating: filters.minRating || undefined,
    verified: filters.verified === 'true',
  });

  useDocumentTitle(t.work.talentTitle, { description: t.work.talentSubtitle });

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <FormField label={t.work.categoryLabel} htmlFor="t-category">
        <WorkCategorySelect
          id="t-category"
          categories={categories}
          value={filters.workCategoryId}
          onChange={(value) => controls.setFilter('workCategoryId', value)}
          placeholder={t.jobs.allCategories}
        />
      </FormField>
      <FormField label={t.work.levelAtLeast} htmlFor="t-level">
        <Select id="t-level" value={filters.level} onChange={(e) => controls.setFilter('level', e.target.value)}>
          <option value="">{t.work.anyLevel}</option>
          {FREELANCER_LEVELS.filter((level) => level !== 'NEW').map((level) => (
            <option key={level} value={level}>
              {t.work.levels[level]}+
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t.work.minRating} htmlFor="t-rating">
        <Select id="t-rating" value={filters.minRating} onChange={(e) => controls.setFilter('minRating', e.target.value)}>
          <option value="">{t.work.anyRating}</option>
          {['4.5', '4', '3'].map((value) => (
            <option key={value} value={value}>
              {formatNumber(Number(value), locale)}+ ★
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t.work.availabilityLabel} htmlFor="t-availability">
        <Select id="t-availability" value={filters.availability} onChange={(e) => controls.setFilter('availability', e.target.value)}>
          <option value="">{t.list.allOption}</option>
          {AVAILABILITY.map((value) => (
            <option key={value} value={value}>
              {t.work.availability[value]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t.work.countryLabel} htmlFor="t-country">
        <CountrySelect id="t-country" value={filters.country} placeholder={t.work.anywhere} onChange={(value) => controls.setFilter('country', value)} />
      </FormField>
      <FormField label={t.work.languagesLabel} htmlFor="t-language">
        <Select id="t-language" value={filters.language} onChange={(e) => controls.setFilter('language', e.target.value)}>
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
          checked={filters.verified === 'true'}
          onChange={() => controls.setFilter('verified', filters.verified === 'true' ? '' : 'true')}
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
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{t.work.talentTitle}</h1>
        <p className="mt-2 text-text-secondary">{t.work.talentSubtitle}</p>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <Input
            className="ps-9"
            value={controls.searchInput}
            placeholder={t.work.talentSearchPlaceholder}
            aria-label={t.work.talentSearchPlaceholder}
            onChange={(e) => controls.setSearch(e.target.value)}
          />
        </div>
        <Select className="sm:w-48" value={controls.sort} aria-label={t.market.sortLabel} onChange={(e) => controls.setSort(e.target.value)}>
          <option value="relevance">{t.work.sortRelevance}</option>
          <option value="rating">{t.work.sortRating}</option>
          <option value="newest">{t.work.sortNewestMembers}</option>
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
        <section className="min-w-0 flex-1" id="talent-results">
          <p className="mb-4 text-sm text-text-secondary" aria-live="polite">
            {data && fill(t.jobs.resultsCount, { count: formatNumber(data.total, locale) })}
          </p>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}
          {!isLoading && data?.items.length === 0 && <EmptyState title={t.list.noResults} />}
          <ul className="flex flex-col gap-3">
            {data?.items.map((row) => (
              <TalentCard key={row.username} row={row} onInvite={setInviting} />
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
                document.getElementById('talent-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              pageSizeOptions={controls.pageSizeOptions}
              onPageSizeChange={controls.setPageSize}
            />
          )}
        </section>
      </div>

      {inviting && <InviteModal username={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}
