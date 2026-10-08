import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BellPlus, Layers, PlusCircle, Search, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import type { ProjectBoardSort } from '@/api/marketplace';
import { useCreateProjectAlert, useProjectBoard, useRecommendedProjects, useWorkCategories } from '@/api/work';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { languageName } from '@/lib/workFormat';
import { breadcrumbSchema } from '@/lib/structuredData';
import { useListControls } from '@/lib/useListControls';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ListPager } from '@/components/ui/ListPager';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { CountrySelect, CurrencySelect } from '@/components/jobs/GeoFields';
import { ProjectCard, WorkCategorySelect } from '@/components/work/WorkUi';
import {
  EXPERIENCE_LEVELS,
  PROJECT_DURATIONS,
  WEEKLY_HOURS,
  WORK_LANGUAGES,
  type ExperienceLevel,
  type ProjectAlertQuery,
  type ProjectPricing,
} from '@/types/work';

const PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 40, 60];
const MAX_BIDS = ['5', '10', '20'];
const POSTED_WITHIN = ['1', '3', '7', '14', '30'];

/**
 * The project board, second generation.
 *
 * One page for two addresses: the board (/projects) and a category's
 * landing page (/projects/category/:slug). Laid out like the job board —
 * search across the top, filters down the side, cards down the middle — with
 * the filters the leading freelance boards offer: fixed or hourly, budget,
 * experience level, duration and hours, the client's record, how crowded a
 * project already is, NDA, urgent, on-site, language and country.
 */
export default function ProjectBoardPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams<{ category?: string }>();
  const { data: categories } = useWorkCategories();
  const fixedCategory = params.category ? categories?.find((category) => category.slug === params.category) : undefined;
  const landing = Boolean(params.category);

  const controls = useListControls({
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    filters: {
      workCategoryId: '',
      pricingType: '',
      experienceLevel: '',
      duration: '',
      weeklyHours: '',
      budgetMin: '',
      budgetMax: '',
      currency: '',
      maxBids: '',
      postedWithinDays: '',
      clientVerified: '',
      clientHired: '',
      urgent: '',
      featured: '',
      nda: '',
      onsite: '',
      contractToHire: '',
      country: '',
      language: '',
    },
    typedFilters: ['budgetMin', 'budgetMax'],
  });
  const { filters } = controls;

  const workCategoryId = fixedCategory?.id ?? filters.workCategoryId;
  const budgetMin = toLatinDigits(filters.budgetMin).replace(/[^0-9]/g, '');
  const budgetMax = toLatinDigits(filters.budgetMax).replace(/[^0-9]/g, '');
  const currency = filters.currency || 'IRT';
  const flag = (name: keyof typeof filters) => filters[name] === 'true';

  const query = {
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    sort: controls.sort as ProjectBoardSort,
    workCategoryId: workCategoryId || undefined,
    pricingType: filters.pricingType || undefined,
    experienceLevel: filters.experienceLevel || undefined,
    duration: filters.duration || undefined,
    weeklyHours: filters.pricingType === 'HOURLY' ? filters.weeklyHours || undefined : undefined,
    budgetMin: budgetMin || undefined,
    budgetMax: budgetMax || undefined,
    // A budget means something only in one currency at a time.
    currency: budgetMin || budgetMax ? currency : undefined,
    maxBids: filters.maxBids || undefined,
    postedWithinDays: filters.postedWithinDays || undefined,
    clientVerified: flag('clientVerified'),
    clientHired: flag('clientHired'),
    urgent: flag('urgent'),
    featured: flag('featured'),
    nda: flag('nda'),
    onsite: flag('onsite'),
    contractToHire: flag('contractToHire'),
    country: filters.country || undefined,
    language: filters.language || undefined,
  };
  const waitingForCategory = landing && !categories;
  const { data, isLoading } = useProjectBoard(query, !waitingForCategory);

  const showRecommended = Boolean(user) && !landing && controls.page === 1 && controls.activeCount === 0;
  const recommended = useRecommendedProjects(showRecommended);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const categoryLabel = fixedCategory ? categoryName(fixedCategory, locale) : '';
  const title = fixedCategory ? `${t.work.boardTitle}: ${categoryLabel}` : t.work.boardTitle;
  useDocumentTitle(title, {
    description: t.work.boardSubtitle,
    jsonLd: landing
      ? [
          breadcrumbSchema(CANONICAL_ORIGIN, [
            { name: t.nav.home, path: localeHref(locale, '/') },
            { name: t.work.boardTitle, path: localeHref(locale, '/projects') },
            { name: title, path: localeHref(locale, location.pathname) },
          ]),
        ].filter((entry): entry is object => entry !== null)
      : undefined,
  });

  if (landing && categories && !fixedCategory) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/projects" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.work.boardTitle}
        </Link>
      </div>
    );
  }

  const toggle = (name: keyof typeof filters) => controls.setFilter(name, filters[name] === 'true' ? '' : 'true');

  const radio = (name: 'pricingType' | 'experienceLevel', values: readonly string[], label: (value: string) => string) => (
    <div className="flex flex-col gap-1.5">
      {['', ...values].map((value) => (
        <label key={value || 'any'} className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="radio"
            name={`f-${name}`}
            className="size-4 border-border-default"
            checked={filters[name] === value}
            onChange={() => controls.setFilter(name, value)}
          />
          {value ? label(value) : t.list.allOption}
        </label>
      ))}
    </div>
  );

  const filterPanel = (
    <div className="flex flex-col gap-5">
      {!fixedCategory && (
        <FormField label={t.work.categoryLabel} htmlFor="f-category">
          <WorkCategorySelect
            id="f-category"
            categories={categories}
            value={filters.workCategoryId}
            onChange={(value) => controls.setFilter('workCategoryId', value)}
            placeholder={t.jobs.allCategories}
            counts="projects"
          />
        </FormField>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.pricingLabel}</legend>
        {radio('pricingType', ['FIXED', 'HOURLY'], (value) => t.work.pricing[value as ProjectPricing])}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.experienceLabel}</legend>
        {radio('experienceLevel', EXPERIENCE_LEVELS, (value) => t.work.experience[value as ExperienceLevel])}
      </fieldset>

      <FormField label={filters.pricingType === 'HOURLY' ? t.work.budgetHourlyLabel : t.work.budgetFixedLabel} htmlFor="f-budget-min">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              id="f-budget-min"
              inputMode="numeric"
              className="ltr min-w-0 flex-1"
              placeholder={t.work.budgetMinLabel}
              aria-label={t.work.budgetMinLabel}
              value={controls.filterInput('budgetMin')}
              onChange={(e) => controls.setFilter('budgetMin', e.target.value)}
            />
            <Input
              inputMode="numeric"
              className="ltr min-w-0 flex-1"
              placeholder={t.work.budgetMaxLabel}
              aria-label={t.work.budgetMaxLabel}
              value={controls.filterInput('budgetMax')}
              onChange={(e) => controls.setFilter('budgetMax', e.target.value)}
            />
          </div>
          <CurrencySelect
            aria-label={t.work.currencyLabel}
            value={currency}
            onChange={(value) => controls.setFilter('currency', value)}
          />
        </div>
      </FormField>

      <FormField label={t.work.durationLabel} htmlFor="f-duration">
        <Select id="f-duration" value={filters.duration} onChange={(e) => controls.setFilter('duration', e.target.value)}>
          <option value="">{t.list.allOption}</option>
          {PROJECT_DURATIONS.map((value) => (
            <option key={value} value={value}>
              {t.work.durations[value]}
            </option>
          ))}
        </Select>
      </FormField>

      {filters.pricingType === 'HOURLY' && (
        <FormField label={t.work.weeklyHoursLabel} htmlFor="f-hours">
          <Select id="f-hours" value={filters.weeklyHours} onChange={(e) => controls.setFilter('weeklyHours', e.target.value)}>
            <option value="">{t.list.allOption}</option>
            {WEEKLY_HOURS.map((value) => (
              <option key={value} value={value}>
                {t.work.weeklyHours[value]}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label={t.work.proposals} htmlFor="f-bids">
        <Select id="f-bids" value={filters.maxBids} onChange={(e) => controls.setFilter('maxBids', e.target.value)}>
          <option value="">{t.list.allOption}</option>
          {MAX_BIDS.map((value) => (
            <option key={value} value={value}>
              {fill(t.work.maxProposals, { count: formatNumber(Number(value), locale) })}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.jobs.postedWithin} htmlFor="f-posted">
        <Select
          id="f-posted"
          value={filters.postedWithinDays}
          onChange={(e) => controls.setFilter('postedWithinDays', e.target.value)}
        >
          <option value="">{t.jobs.anyTime}</option>
          {POSTED_WITHIN.map((value) => (
            <option key={value} value={value}>
              {value === '1' ? t.jobs.last24h : fill(t.jobs.lastDays, { n: formatNumber(Number(value), locale) })}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.work.countriesLabel.replace(/\s*\([^)]*\)/, '')} htmlFor="f-country">
        <CountrySelect
          id="f-country"
          value={filters.country}
          placeholder={t.work.anywhere}
          onChange={(value) => controls.setFilter('country', value)}
        />
      </FormField>

      <FormField label={t.work.languagesLabel} htmlFor="f-language">
        <Select id="f-language" value={filters.language} onChange={(e) => controls.setFilter('language', e.target.value)}>
          <option value="">{t.list.allOption}</option>
          {WORK_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {languageName(code, locale)}
            </option>
          ))}
        </Select>
      </FormField>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.aboutClient}</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ['clientVerified', t.work.clientVerified],
              ['clientHired', t.work.clientHasHired],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" className="size-4 rounded border-border-default" checked={flag(name)} onChange={() => toggle(name)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.jobs.special}</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ['urgent', t.work.urgent],
              ['featured', t.work.featured],
              ['nda', t.work.nda],
              ['onsite', t.work.onsite],
              ['contractToHire', t.work.contractToHire],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" className="size-4 rounded border-border-default" checked={flag(name)} onChange={() => toggle(name)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

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
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          <p className="mt-2 text-text-secondary">{t.work.boardSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/freelance-services">
            <Button variant="outline">
              <Layers className="size-4" aria-hidden="true" />
              {t.work.servicesTitle}
            </Button>
          </Link>
          <Link to="/freelancers">
            <Button variant="outline">
              <Users className="size-4" aria-hidden="true" />
              {t.work.talentTitle}
            </Button>
          </Link>
          <Link to="/dashboard/projects/new">
            <Button>
              <PlusCircle className="size-4" aria-hidden="true" />
              {t.work.postProject}
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <Input
            className="ps-9"
            value={controls.searchInput}
            placeholder={t.work.searchProjects}
            aria-label={t.work.searchProjects}
            onChange={(e) => controls.setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="lg:hidden"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtersOpen ? t.jobs.hideFilters : t.jobs.showFilters}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'rounded-2xl border border-border-default bg-surface-default p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto',
            filtersOpen ? 'block' : 'hidden',
          )}
          aria-label={t.jobs.filters}
        >
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1" id="project-results">
          {showRecommended && <RecommendedStrip query={recommended} />}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {data && fill(t.jobs.resultsCount, { count: formatNumber(data.total, locale) })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAlertOpen(true)}>
                <BellPlus className="size-4" aria-hidden="true" />
                {t.work.saveSearch}
              </Button>
              <Select
                className="w-48"
                value={controls.sort}
                aria-label={t.market.sortLabel}
                onChange={(e) => controls.setSort(e.target.value)}
              >
                <option value="newest">{t.market.sortNewest}</option>
                <option value="fewestBids">{t.work.fewestProposals}</option>
                <option value="budgetDesc">{t.market.sortBudgetDesc}</option>
                <option value="budgetAsc">{t.market.sortBudgetAsc}</option>
                <option value="closingSoon">{t.market.sortClosingSoon}</option>
              </Select>
            </div>
          </div>

          {(isLoading || waitingForCategory) && (
            <div className="flex justify-center py-16">
              <Spinner label={t.common.loading} />
            </div>
          )}

          {!isLoading && !waitingForCategory && data?.items.length === 0 && (
            <EmptyState
              title={controls.activeCount > 0 || landing ? t.list.noResults : t.market.noProjects}
              description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
            />
          )}

          <ul className="flex flex-col gap-3">
            {data?.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
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
                document.getElementById('project-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              pageSizeOptions={controls.pageSizeOptions}
              onPageSizeChange={controls.setPageSize}
            />
          )}
        </section>
      </div>

      <CategoryLinks />

      {alertOpen && (
        <SaveSearchModal
          onClose={() => setAlertOpen(false)}
          defaultName={controls.search || categoryLabel || t.work.boardTitle}
          query={{
            search: controls.search || undefined,
            workCategoryId: workCategoryId || undefined,
            pricingType: (filters.pricingType || undefined) as ProjectPricing | undefined,
            experienceLevel: (filters.experienceLevel || undefined) as ExperienceLevel | undefined,
            budgetMin: currency === 'IRT' ? budgetMin || undefined : undefined,
            country: filters.country || undefined,
            language: filters.language || undefined,
          }}
        />
      )}
    </div>
  );
}

function RecommendedStrip({ query }: { query: ReturnType<typeof useRecommendedProjects> }) {
  const { t } = useLocale();
  if (!query.data) return null;
  if (query.data.basis === 'none') {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border-default p-4">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Sparkles className="size-4 text-brand-green-600" aria-hidden="true" />
          {t.work.addSkillsPrompt}
        </p>
        <Link to="/dashboard/profile" className="text-sm font-medium text-brand-green-600 hover:underline">
          {t.jobs.editProfile}
        </Link>
      </div>
    );
  }
  if (query.data.items.length === 0) return null;
  return (
    <section className="mb-8" aria-labelledby="recommended-projects">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="recommended-projects" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Sparkles className="size-4 text-brand-green-600" aria-hidden="true" />
          {t.work.recommendedTitle}
        </h2>
        <p className="text-xs text-text-tertiary">
          {query.data.basis === 'skills' ? t.work.recommendedBasisSkills : t.work.recommendedBasisActivity}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {query.data.items.slice(0, 3).map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </ul>
    </section>
  );
}

/** Turn the current search into a project alert. Signed out, it asks for a sign-in first. */
function SaveSearchModal({
  onClose,
  defaultName,
  query,
}: {
  onClose: () => void;
  defaultName: string;
  query: ProjectAlertQuery;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const create = useCreateProjectAlert();
  const [name, setName] = useState(defaultName.slice(0, 80));
  const cleanQuery = useMemo(
    () => Object.fromEntries(Object.entries(query).filter(([, value]) => value)) as ProjectAlertQuery,
    [query],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({ name: name.trim(), query: cleanQuery });
      showToast(t.work.alertCreated, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.work.saveSearch}>
      {!user ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-text-secondary">{t.jobs.signInToSave}</p>
          <Link to="/login" state={{ from: { pathname: location.pathname, search: location.search } }}>
            <Button>{t.nav.login}</Button>
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <FormField label={t.work.alertName} htmlFor="project-alert-name">
            <Input id="project-alert-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" isLoading={create.isPending}>
              <BellPlus className="size-4" aria-hidden="true" />
              {t.work.saveSearch}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Links to every category's landing page, for readers and for search engines. */
function CategoryLinks() {
  const { t, locale } = useLocale();
  const { data: categories } = useWorkCategories();
  const parents = (categories ?? []).filter((category) => category.parentId === null);
  if (parents.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="mb-3 text-lg font-semibold text-text-primary">{t.jobs.browseByCategory}</h2>
      <ul className="flex flex-wrap gap-2">
        {parents.map((category) => (
          <li key={category.id}>
            <Link
              to={`/projects/category/${category.slug}`}
              className="inline-block rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
            >
              {categoryName(category, locale)}
              {category.projectCount > 0 && (
                <span className="ms-1 text-text-tertiary">({formatNumber(category.projectCount, locale)})</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
