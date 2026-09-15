import { useState } from 'react';
import { Link } from 'react-router';
import { Briefcase, MapPin, Search, Star } from 'lucide-react';
import { usePublicJobs, type JobBoardSort } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import type { JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

const PAGE_SIZE = 20;

const EMPLOYMENT: JobEmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
];
const ARRANGEMENT: JobWorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE'];

/**
 * The public job board.
 *
 * Everything here has been through moderation, which is the whole reason it is
 * worth reading — so the page does not need to warn about anything. Authors
 * who chose a username show a profile card; the rest stay anonymous by design.
 */
export default function JobsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.jobsTitle, { description: t.seo.jobs });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [sort, setSort] = useState<JobBoardSort>('newest');

  // Money crosses as a plain digit string; anything else the user typed
  // (grouping separators, words) is stripped, and an empty box means "no bound".
  const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');
  const skillsList = skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const { data, isLoading } = usePublicJobs({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    employmentType: employmentType || undefined,
    workArrangement: workArrangement || undefined,
    category: category.trim() || undefined,
    skills: skillsList.length > 0 ? skillsList : undefined,
    salaryMin: digitsOnly(salaryMin) || undefined,
    salaryMax: digitsOnly(salaryMax) || undefined,
    sort,
  });

  // Any filter change puts you back on the first page. Staying on page four of
  // a result set that now has one page shows an empty list and looks broken.
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.market.jobsTitle}</h1>
        <p className="mt-2 text-text-secondary">{t.market.jobsSubtitle}</p>
      </header>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-text-muted start-3"
            aria-hidden="true"
          />
          <Input
            className="ps-9"
            value={search}
            placeholder={t.market.searchJobs}
            aria-label={t.market.searchJobs}
            onChange={(e) => reset(setSearch)(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          value={employmentType}
          aria-label={t.market.employmentType}
          onChange={(e) => reset(setEmploymentType)(e.target.value)}
        >
          <option value="">{t.market.employmentType}</option>
          {EMPLOYMENT.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
        <Select
          className="sm:w-48"
          value={workArrangement}
          aria-label={t.market.workArrangement}
          onChange={(e) => reset(setWorkArrangement)(e.target.value)}
        >
          <option value="">{t.market.workArrangement}</option>
          {ARRANGEMENT.map((value) => (
            <option key={value} value={value}>
              {t.market[value]}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-surface-200 p-3 sm:flex-row sm:flex-wrap sm:items-center dark:border-surface-300">
        <Input
          className="sm:w-44"
          value={category}
          placeholder={t.market.category}
          aria-label={t.market.category}
          onChange={(e) => reset(setCategory)(e.target.value)}
        />
        <Input
          className="sm:w-52"
          value={skills}
          placeholder={t.market.skillsFilterPlaceholder}
          aria-label={t.market.skillsFilter}
          onChange={(e) => reset(setSkills)(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Input
            className="w-28"
            value={salaryMin}
            inputMode="numeric"
            placeholder={t.market.minLabel}
            aria-label={`${t.market.salaryRange} — ${t.market.minLabel}`}
            onChange={(e) => reset(setSalaryMin)(e.target.value)}
          />
          <span className="text-sm text-text-muted">{t.market.to}</span>
          <Input
            className="w-28"
            value={salaryMax}
            inputMode="numeric"
            placeholder={t.market.maxLabel}
            aria-label={`${t.market.salaryRange} — ${t.market.maxLabel}`}
            onChange={(e) => reset(setSalaryMax)(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          value={sort}
          aria-label={t.market.sortLabel}
          onChange={(e) => reset(setSort)(e.target.value as JobBoardSort)}
        >
          <option value="newest">{t.market.sortNewest}</option>
          <option value="salaryAsc">{t.market.sortSalaryAsc}</option>
          <option value="salaryDesc">{t.market.sortSalaryDesc}</option>
          <option value="closingSoon">{t.market.sortClosingSoon}</option>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.noJobs} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((job) => {
          const pay = job.salaryUndisclosed
            ? t.market.salaryUndisclosed
            : formatRange(job.salaryMin, job.salaryMax, locale, t);
          const where = [job.city, job.province].filter(Boolean).join('، ');

          return (
            <li key={job.id}>
              <Card className="transition hover:border-brand-green-500/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/jobs/${job.code}`}
                        className="text-lg font-semibold text-text-primary hover:underline"
                      >
                        {job.title}
                      </Link>
                      {job.featured && (
                        <Badge variant="warning">
                          <Star className="ms-0 size-3" aria-hidden />
                          {t.market.featuredBadge}
                        </Badge>
                      )}
                      {job.category && <Badge>{job.category}</Badge>}
                    </div>
                    {job.companyName && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
                        <Briefcase className="size-3.5" aria-hidden="true" />
                        {job.companyName}
                      </p>
                    )}
                    {where && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-muted">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {where}
                      </p>
                    )}
                    {job.authorProfile && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <Link
                          to={`/profiles/${job.authorProfile.username}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          @{job.authorProfile.username}
                        </Link>
                        {job.authorProfile.verified && <VerifiedBadge />}
                        <RatingStars
                          avg={job.authorProfile.ratingAvg}
                          count={job.authorProfile.ratingCount}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge variant="info">{t.market[job.employmentType]}</Badge>
                      <Badge>{t.market[job.workArrangement]}</Badge>
                    </div>
                    {pay && <p className="text-sm font-medium text-text-primary">{pay}</p>}
                    {job.publishedAt && (
                      <p className="text-xs text-text-muted">
                        {t.market.postedOn} {formatDate(job.publishedAt, locale)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
