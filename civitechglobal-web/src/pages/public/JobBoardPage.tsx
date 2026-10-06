import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BellPlus, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { usePublicJobs, type JobBoardSort } from '@/api/marketplace';
import { useCreateJobAlert, useJobCategories, useRecommendedJobs } from '@/api/jobs';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { LOCALE_TAGS } from '@/i18n/locales';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { IRAN_PROVINCES, provinceBySlug, provinceLabel } from '@/lib/iranProvinces';
import { categoryName, fill, formatNumber } from '@/lib/jobFormat';
import { breadcrumbSchema, faqPageSchema } from '@/lib/structuredData';
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
import { JobCategorySelect, JobRow } from '@/components/jobs/JobUi';
import { CountrySelect, CurrencySelect } from '@/components/jobs/GeoFields';
import { COUNTRY_CODES, DEFAULT_CURRENCY, POPULAR_COUNTRIES, countryName } from '@/lib/geo';
import { JOB_BENEFITS, SENIORITY_LEVELS, type AlertQuery } from '@/types/jobs';
import type { JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

const PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 40, 60];
const EMPLOYMENT: JobEmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'];
const ARRANGEMENT: JobWorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE'];
const EXPERIENCE = ['0', '2', '5', '10'];
const POSTED_WITHIN = ['1', '3', '7', '30'];
/** The benefits shown before "show all": the ones Iranian boards put first. */
const TOP_BENEFITS = 6;

/**
 * The job board.
 *
 * One page for three addresses: the board itself (/jobs), a province's jobs
 * (/jobs/in/:province) and a category's (/jobs/category/:slug). A landing page
 * is the board with one filter fixed by its address, its own heading, and the
 * questions and links search engines reward a landing page for having.
 *
 * Laid out the way the boards Iranian job-seekers already use are: search and
 * place across the top, filters down the side, results as compact rows. On a
 * phone the filters fold behind one button so the first result is on screen.
 */
export default function JobBoardPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams<{ province?: string; category?: string; country?: string }>();
  const fixedProvince = provinceBySlug(params.province);
  const countryParam = params.country?.toUpperCase();
  const fixedCountry = COUNTRY_CODES.find((code) => code === countryParam);
  const { data: categories } = useJobCategories();
  const fixedCategory = params.category ? categories?.find((category) => category.slug === params.category) : undefined;
  const landing = Boolean(params.province || params.category || params.country);

  const controls = useListControls({
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    filters: {
      province: '',
      jobCategoryId: '',
      employmentType: '',
      workArrangement: '',
      seniority: '',
      maxExperience: '',
      salaryMin: '',
      postedWithinDays: '',
      benefits: '',
      urgent: '',
      amriehEligible: '',
      disabilityFriendly: '',
      country: '',
      remoteWorldwide: '',
      currency: '',
    },
    typedFilters: ['salaryMin'],
  });
  const { filters } = controls;

  // The address's own filter wins over the query string: /jobs/in/qazvin is
  // Qazvin's page whatever ?province says.
  // A province is Iran's, so a province page is Iran's; otherwise the
  // address's country, or the reader's choice.
  const country = fixedProvince ? 'IR' : (fixedCountry ?? filters.country);
  // Provinces are Iran's: a province left over from before the country
  // changed would only ever return nothing.
  const provinceApplies = !country || country === 'IR';
  const province = fixedProvince?.fa ?? (provinceApplies ? filters.province : '');
  // The pay floor's currency: the reader's choice, else the chosen country's own.
  const floorCurrency = filters.currency || (country && DEFAULT_CURRENCY[country]) || 'IRT';
  const jobCategoryId = fixedCategory?.id ?? filters.jobCategoryId;
  const benefits = filters.benefits.split(',').filter(Boolean);
  const salaryMin = toLatinDigits(filters.salaryMin).replace(/[^0-9]/g, '');

  const query = {
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    sort: controls.sort as JobBoardSort,
    province: province || undefined,
    jobCategoryId: jobCategoryId || undefined,
    employmentType: filters.employmentType || undefined,
    workArrangement: filters.workArrangement || undefined,
    seniority: filters.seniority || undefined,
    maxExperience: filters.maxExperience || undefined,
    salaryMin: salaryMin || undefined,
    postedWithinDays: filters.postedWithinDays || undefined,
    benefits: benefits.length ? benefits : undefined,
    urgent: filters.urgent === 'true',
    amriehEligible: filters.amriehEligible === 'true',
    disabilityFriendly: filters.disabilityFriendly === 'true',
    country: country || undefined,
    remoteWorldwide: filters.remoteWorldwide === 'true',
    // The floor's currency travels with the floor, and only then.
    currency: salaryMin ? floorCurrency : undefined,
  };
  // A category page waits for the list that says which id its slug is, so it
  // never shows the unfiltered board for a moment first.
  const waitingForCategory = Boolean(params.category) && !categories;
  const { data, isLoading } = usePublicJobs(query, !waitingForCategory);

  // Recommendations only on the plain first page: once somebody is filtering,
  // they have said what they want and a strip of other things is in the way.
  const showRecommended = Boolean(user) && !landing && controls.page === 1 && controls.activeCount === 0;
  const recommended = useRecommendedJobs(showRecommended);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [showAllBenefits, setShowAllBenefits] = useState(false);

  // ---- Headings and search-engine description -------------------------------
  const placeName = fixedProvince ? provinceLabel(fixedProvince, locale) : '';
  const countryLabel = fixedCountry ? countryName(fixedCountry, locale) : '';
  const categoryLabel = fixedCategory ? categoryName(fixedCategory, locale) : '';
  const title = fixedProvince
    ? fill(t.jobs.landingProvinceTitle, { province: placeName })
    : fixedCountry
      ? fill(t.jobs.landingCountryTitle, { country: countryLabel })
      : fixedCategory
        ? fill(t.jobs.landingCategoryTitle, { category: categoryLabel })
        : t.jobs.boardTitle;
  const subtitle = fixedProvince
    ? fill(t.jobs.landingProvinceSubtitle, { province: placeName })
    : fixedCountry
      ? fill(t.jobs.landingCountrySubtitle, { country: countryLabel })
      : fixedCategory
        ? fill(t.jobs.landingCategorySubtitle, { category: categoryLabel })
        : t.jobs.boardSubtitle;

  const faqs = [
    { question: t.jobs.faq1q, answer: t.jobs.faq1a },
    { question: t.jobs.faq2q, answer: t.jobs.faq2a },
    { question: t.jobs.faq3q, answer: t.jobs.faq3a },
  ];
  useDocumentTitle(landing ? title : t.market.jobsTitle, {
    description: landing ? subtitle : t.seo.jobs,
    jsonLd: landing
      ? [
          breadcrumbSchema(CANONICAL_ORIGIN, [
            { name: t.nav.home, path: localeHref(locale, '/') },
            { name: t.market.jobsTitle, path: localeHref(locale, '/jobs') },
            { name: title, path: localeHref(locale, location.pathname) },
          ]),
          faqPageSchema(faqs, LOCALE_TAGS[locale]),
        ].filter((entry): entry is object => entry !== null)
      : undefined,
  });

  // A landing address that names nothing we have is a dead link, not the
  // whole board under a heading that promises something narrower.
  const unknownPlace = (Boolean(params.province) && !fixedProvince) || (Boolean(params.country) && !fixedCountry);
  const unknownCategory = Boolean(params.category) && Boolean(categories) && !fixedCategory;
  if (unknownPlace || unknownCategory) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/jobs" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.market.backToJobs}
        </Link>
      </div>
    );
  }

  const toggleBenefit = (key: string) => {
    const next = benefits.includes(key) ? benefits.filter((item) => item !== key) : [...benefits, key];
    controls.setFilter('benefits', next.join(','));
  };
  const toggleSwitch = (name: 'urgent' | 'amriehEligible' | 'disabilityFriendly' | 'remoteWorldwide') =>
    controls.setFilter(name, filters[name] === 'true' ? '' : 'true');

  const filterPanel = (
    <div className="flex flex-col gap-5">
      {!fixedCategory && (
        <FormField label={t.jobs.category} htmlFor="f-category">
          <JobCategorySelect
            id="f-category"
            categories={categories}
            value={filters.jobCategoryId}
            onChange={(value) => controls.setFilter('jobCategoryId', value)}
            placeholder={t.jobs.allCategories}
          />
        </FormField>
      )}

      <FormField label={t.market.employmentType} htmlFor="f-employment">
        <Select
          id="f-employment"
          value={filters.employmentType}
          onChange={(e) => controls.setFilter('employmentType', e.target.value)}
        >
          <option value="">{t.list.allOption}</option>
          {EMPLOYMENT.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.market.workArrangement} htmlFor="f-arrangement">
        <Select
          id="f-arrangement"
          value={filters.workArrangement}
          onChange={(e) => controls.setFilter('workArrangement', e.target.value)}
        >
          <option value="">{t.list.allOption}</option>
          {ARRANGEMENT.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.jobs.seniority} htmlFor="f-seniority">
        <Select id="f-seniority" value={filters.seniority} onChange={(e) => controls.setFilter('seniority', e.target.value)}>
          <option value="">{t.jobs.anySeniority}</option>
          {SENIORITY_LEVELS.map((value) => (
            <option key={value} value={value}>
              {t.jobs.seniorityLevels[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.jobs.experience} htmlFor="f-experience">
        <Select
          id="f-experience"
          value={filters.maxExperience}
          onChange={(e) => controls.setFilter('maxExperience', e.target.value)}
        >
          <option value="">{t.jobs.anyExperience}</option>
          {EXPERIENCE.map((value) => (
            <option key={value} value={value}>
              {value === '0' ? t.jobs.noExperience : fill(t.jobs.upToYears, { n: formatNumber(Number(value), locale) })}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t.jobs.minSalary.replace(/\s*\([^)]*\)/, '')} htmlFor="f-salary">
        <div className="flex gap-2">
          <Input
            id="f-salary"
            inputMode="numeric"
            className="ltr min-w-0 flex-1"
            value={controls.filterInput('salaryMin')}
            onChange={(e) => controls.setFilter('salaryMin', e.target.value)}
          />
          {/* A floor means something only in one currency at a time. */}
          <CurrencySelect
            className="w-28"
            aria-label={t.jobs.currencyLabel}
            value={floorCurrency}
            onChange={(value) => controls.setFilter('currency', value)}
          />
        </div>
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

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.jobs.benefits}</legend>
        <div className="flex flex-col gap-2">
          {(showAllBenefits ? JOB_BENEFITS : JOB_BENEFITS.slice(0, TOP_BENEFITS)).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                className="size-4 rounded border-border-default"
                checked={benefits.includes(key)}
                onChange={() => toggleBenefit(key)}
              />
              {t.jobs.benefitLabels[key]}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-sm text-brand-green-600 hover:underline"
          onClick={() => setShowAllBenefits((value) => !value)}
        >
          {showAllBenefits ? t.jobs.fewerBenefits : t.jobs.moreBenefits}
        </button>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-primary">{t.jobs.special}</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ['urgent', t.jobs.urgentOnly],
              ['amriehEligible', t.jobs.amriehOnly],
              ['disabilityFriendly', t.jobs.disabilityOnly],
              ['remoteWorldwide', t.jobs.remoteWorldwideOnly],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                className="size-4 rounded border-border-default"
                checked={filters[name] === 'true'}
                onChange={() => toggleSwitch(name)}
              />
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
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      </header>

      {/* What and where: the two things everybody searches by first. */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <Input
            className="ps-9"
            value={controls.searchInput}
            placeholder={t.jobs.searchPlaceholder}
            aria-label={t.jobs.searchPlaceholder}
            onChange={(e) => controls.setSearch(e.target.value)}
          />
        </div>
        {!fixedProvince && !fixedCountry && (
          <CountrySelect
            className="sm:w-48"
            value={filters.country}
            placeholder={t.jobs.allCountries}
            aria-label={t.jobs.country}
            onChange={(value) => controls.setFilter('country', value)}
          />
        )}
        {!fixedProvince && provinceApplies && (
          <Select
            className="sm:w-56"
            value={filters.province}
            aria-label={t.market.province}
            onChange={(e) => controls.setFilter('province', e.target.value)}
          >
            <option value="">{t.jobs.allProvinces}</option>
            {IRAN_PROVINCES.map((item) => (
              <option key={item.slug} value={item.fa}>
                {provinceLabel(item, locale)}
              </option>
            ))}
          </Select>
        )}
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
            'rounded-2xl border border-border-default bg-surface-default p-4 lg:sticky lg:top-24 lg:block lg:w-72 lg:shrink-0',
            filtersOpen ? 'block' : 'hidden',
          )}
          aria-label={t.jobs.filters}
        >
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1" id="job-results">
          {showRecommended && <RecommendedStrip query={recommended} />}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {data && fill(t.jobs.resultsCount, { count: formatNumber(data.total, locale) })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAlertOpen(true)}>
                <BellPlus className="size-4" aria-hidden="true" />
                {t.jobs.saveSearch}
              </Button>
              <Select
                className="w-48"
                value={controls.sort}
                aria-label={t.market.sortLabel}
                onChange={(e) => controls.setSort(e.target.value)}
              >
                <option value="newest">{t.market.sortNewest}</option>
                <option value="salaryDesc">{t.market.sortSalaryDesc}</option>
                <option value="salaryAsc">{t.market.sortSalaryAsc}</option>
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
              title={controls.activeCount > 0 || landing ? t.list.noResults : t.market.noJobs}
              description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
            />
          )}

          {!waitingForCategory && (
            <ul className="flex flex-col gap-3">
              {data?.items.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </ul>
          )}

          {data && !waitingForCategory && (
            <ListPager
              className="mt-6"
              page={controls.page}
              pageSize={controls.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={(next) => {
                controls.setPage(next);
                document.getElementById('job-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              pageSizeOptions={controls.pageSizeOptions}
              onPageSizeChange={controls.setPageSize}
            />
          )}

          <p className="mt-8 text-center text-sm text-text-secondary">
            <Link to="/companies" className="text-brand-green-600 hover:underline">
              {t.jobs.companiesTitle}
            </Link>
          </p>
        </section>
      </div>

      {landing && <LandingFooter faqs={faqs} />}

      {alertOpen && (
        <SaveSearchModal
          onClose={() => setAlertOpen(false)}
          defaultName={controls.search || categoryLabel || placeName || t.market.jobsTitle}
          query={{
            search: controls.search || undefined,
            country: country || undefined,
            province: province || undefined,
            jobCategoryId: jobCategoryId || undefined,
            employmentType: filters.employmentType || undefined,
            workArrangement: filters.workArrangement || undefined,
            seniority: filters.seniority || undefined,
            salaryMin: salaryMin || undefined,
          }}
        />
      )}
    </div>
  );
}

/** "Recommended for you", above the results, for somebody we know something about. */
function RecommendedStrip({ query }: { query: ReturnType<typeof useRecommendedJobs> }) {
  const { t } = useLocale();
  if (!query.data) return null;

  if (query.data.basis === 'none') {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border-default p-4">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Sparkles className="size-4 text-brand-green-600" aria-hidden="true" />
          {t.jobs.addSkillsPrompt}
        </p>
        <Link to="/dashboard/profile" className="text-sm font-medium text-brand-green-600 hover:underline">
          {t.jobs.editProfile}
        </Link>
      </div>
    );
  }
  if (query.data.items.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="recommended-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="recommended-heading" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Sparkles className="size-4 text-brand-green-600" aria-hidden="true" />
          {t.jobs.recommendedTitle}
        </h2>
        <p className="text-xs text-text-tertiary">
          {query.data.basis === 'skills' ? t.jobs.recommendedBasisSkills : t.jobs.recommendedBasisActivity}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {query.data.items.slice(0, 3).map((job) => (
          <JobRow key={job.id} job={job} match={job.match} />
        ))}
      </ul>
    </section>
  );
}

/** Turn the current search into an alert. Signed out, it asks for a sign-in first. */
function SaveSearchModal({
  onClose,
  defaultName,
  query,
}: {
  onClose: () => void;
  defaultName: string;
  query: AlertQuery;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const create = useCreateJobAlert();
  const [name, setName] = useState(defaultName.slice(0, 80));
  const cleanQuery = useMemo(
    () => Object.fromEntries(Object.entries(query).filter(([, value]) => value)) as AlertQuery,
    [query],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({ name: name.trim(), query: cleanQuery });
      showToast(t.jobs.alertCreated, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.jobs.saveSearch}>
      {!user ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-text-secondary">{t.jobs.signInToSave}</p>
          <Link to="/login" state={{ from: { pathname: location.pathname, search: location.search } }}>
            <Button>{t.nav.login}</Button>
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <FormField label={t.jobs.alertName} htmlFor="alert-name">
            <Input id="alert-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" isLoading={create.isPending}>
              <BellPlus className="size-4" aria-hidden="true" />
              {t.jobs.saveSearch}
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

/**
 * What a landing page carries beneath its results: the common questions, and
 * links across to the other provinces and categories — the internal links that
 * let a search engine find every landing page from any one of them.
 */
function LandingFooter({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const { t, locale } = useLocale();
  const { data: categories } = useJobCategories();
  const parents = (categories ?? []).filter((category) => category.parentId === null);

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-2">
      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">{t.jobs.faqTitle}</h2>
        <dl className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border-default p-4">
              <dt className="font-medium text-text-primary">{faq.question}</dt>
              <dd className="mt-1 text-sm text-text-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">{t.jobs.browseByCountry}</h2>
          <ul className="flex flex-wrap gap-2">
            {POPULAR_COUNTRIES.map((code) => (
              <li key={code}>
                <Link
                  to={`/jobs/country/${code.toLowerCase()}`}
                  className="inline-block rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
                >
                  {countryName(code, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">{t.jobs.browseByProvince}</h2>
          <ul className="flex flex-wrap gap-2">
            {IRAN_PROVINCES.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/jobs/in/${item.slug}`}
                  className="inline-block rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
                >
                  {provinceLabel(item, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">{t.jobs.browseByCategory}</h2>
          <ul className="flex flex-wrap gap-2">
            {parents.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/jobs/category/${category.slug}`}
                  className="inline-block rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
                >
                  {categoryName(category, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
