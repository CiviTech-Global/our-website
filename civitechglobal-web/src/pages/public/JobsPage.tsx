import { useState } from 'react';
import { Link } from 'react-router';
import { Briefcase, MapPin, Search } from 'lucide-react';
import { usePublicJobs } from '@/api/marketplace';
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
 * worth reading — so the page does not need to warn about anything, and it
 * shows no author identity, because a board that names who placed each advert
 * publishes a list of verified accounts.
 */
export default function JobsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.jobsTitle);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');

  const { data, isLoading } = usePublicJobs({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    employmentType: employmentType || undefined,
    workArrangement: workArrangement || undefined,
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
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
                    <Link
                      to={`/jobs/${job.code}`}
                      className="text-lg font-semibold text-text-primary hover:underline"
                    >
                      {job.title}
                    </Link>
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
