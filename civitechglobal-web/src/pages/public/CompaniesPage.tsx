import { Link } from 'react-router';
import { Briefcase, MapPin, Search } from 'lucide-react';
import { useCompanies } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { IRAN_PROVINCES, displayProvince, provinceLabel } from '@/lib/iranProvinces';
import { fill, formatNumber } from '@/lib/jobFormat';
import { useListControls } from '@/lib/useListControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListPager } from '@/components/ui/ListPager';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { CompanyLogo } from '@/components/jobs/JobUi';
import { COMPANY_INDUSTRIES } from '@/types/jobs';

const PAGE_SIZE = 24;
const PAGE_SIZES = [12, 24, 48, 60];

/**
 * The directory of verified employers, those with the most open roles first.
 *
 * A company page is where a job-seeker goes to decide whether they want to
 * work somewhere at all, before any one posting — the sample boards all have
 * one, and it is what turns a list of adverts into a list of employers.
 */
export default function CompaniesPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.jobs.companiesTitle, { description: t.jobs.companiesSubtitle });

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
    filters: { industry: '', province: '' },
  });

  const { data, isLoading } = useCompanies({
    page: controls.page,
    pageSize: controls.pageSize,
    search: controls.search || undefined,
    industry: controls.filters.industry || undefined,
    province: controls.filters.province || undefined,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{t.jobs.companiesTitle}</h1>
        <p className="mt-2 text-text-secondary">{t.jobs.companiesSubtitle}</p>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <Input
            className="ps-9"
            value={controls.searchInput}
            placeholder={t.jobs.searchCompanies}
            aria-label={t.jobs.searchCompanies}
            onChange={(e) => controls.setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-56"
          value={controls.filters.industry}
          aria-label={t.jobs.industry}
          onChange={(e) => controls.setFilter('industry', e.target.value)}
        >
          <option value="">{t.jobs.allIndustries}</option>
          {COMPANY_INDUSTRIES.map((key) => (
            <option key={key} value={key}>
              {t.jobs.industries[key]}
            </option>
          ))}
        </Select>
        <Select
          className="sm:w-48"
          value={controls.filters.province}
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
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.jobs.noCompanies} />}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((company) => {
          const where = [company.city, displayProvince(company.province, locale)].filter(Boolean).join('، ');
          return (
            <li key={company.id}>
              <Link
                to={`/companies/${encodeURIComponent(company.slug)}`}
                className="flex h-full gap-3 rounded-xl border border-border-default bg-surface-default p-4 transition hover:border-border-strong hover:shadow-sm"
              >
                <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="truncate font-semibold text-text-primary">{company.name}</h2>
                  {company.tagline && <p className="line-clamp-2 text-sm text-text-secondary">{company.tagline}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-text-tertiary">
                    {company.industry && <span>{t.jobs.industries[company.industry]}</span>}
                    {where && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden="true" />
                        {where}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium text-brand-green-600">
                      <Briefcase className="size-3" aria-hidden="true" />
                      {fill(t.jobs.openJobsCount, { count: formatNumber(company.openJobs, locale) })}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {data && (
        <ListPager
          className="mt-6"
          page={controls.page}
          pageSize={controls.pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
          pageSizeOptions={controls.pageSizeOptions}
          onPageSizeChange={controls.setPageSize}
        />
      )}
    </div>
  );
}
