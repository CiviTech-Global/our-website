import { Link, useLocation } from 'react-router';
import { Bookmark, BookmarkCheck, Briefcase, Building2, Clock, MapPin, Star, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiAssetSrc } from '@/lib/apiAsset';
import { apiMessage } from '@/lib/apiMessage';
import { categoryName, groupCategories, placeText, postedAgo, salaryText } from '@/lib/jobFormat';
import { cn } from '@/lib/utils';
import { useSavedJobIds, useToggleSavedJob } from '@/api/jobs';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { CompanySummary, JobCategory, JobSeniority } from '@/types/jobs';
import type { JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

/**
 * The pieces every job page shares: a company's logo, the bookmark, the
 * compact row a posting is listed as, and the category picker.
 */

/** A square logo, or the first letter of the name on a tint when there is none. */
export function CompanyLogo({
  name,
  logoUrl,
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  logoUrl: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = { sm: 'size-10 text-sm', md: 'size-12 text-base', lg: 'size-20 text-2xl' }[size];
  if (logoUrl) {
    return (
      <img
        src={apiAssetSrc(logoUrl)}
        alt=""
        loading="lazy"
        className={cn(box, 'shrink-0 rounded-lg border border-border-default bg-surface-default object-contain', className)}
      />
    );
  }
  const initial = name?.trim().charAt(0);
  return (
    <div
      aria-hidden="true"
      className={cn(
        box,
        'flex shrink-0 items-center justify-center rounded-lg bg-surface-muted font-semibold text-text-secondary',
        className,
      )}
    >
      {initial || <Building2 className="size-5" />}
    </div>
  );
}

/**
 * Save or unsave a posting. Signed out, it is a link to sign in that comes
 * back here — a bookmark that does nothing when tapped reads as broken.
 */
export function SaveJobButton({ jobId, className, withLabel = false }: { jobId: string; className?: string; withLabel?: boolean }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const { data: savedIds } = useSavedJobIds(Boolean(user));
  const toggle = useToggleSavedJob();
  const saved = Boolean(savedIds?.has(jobId));
  const label = saved ? t.jobs.unsave : t.jobs.save;
  const style = cn(
    'inline-flex items-center gap-1.5 rounded-lg p-2 text-sm transition hover:bg-surface-muted',
    saved ? 'text-brand-green-600' : 'text-text-secondary',
    className,
  );

  if (!user) {
    return (
      <Link
        to="/login"
        state={{ from: { pathname: location.pathname, search: location.search } }}
        className={style}
        aria-label={t.jobs.signInToSave}
        title={t.jobs.signInToSave}
      >
        <Bookmark className="size-5" aria-hidden="true" />
        {withLabel && t.jobs.save}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={style}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={(event) => {
        // Rows are links; the bookmark must not open the posting too.
        event.preventDefault();
        event.stopPropagation();
        toggle.mutate(
          { jobId, save: !saved },
          { onError: (error) => showToast(apiMessage(error, t.common.error), 'error') },
        );
      }}
    >
      {saved ? <BookmarkCheck className="size-5" aria-hidden="true" /> : <Bookmark className="size-5" aria-hidden="true" />}
      {withLabel && (saved ? t.jobs.saved : t.jobs.save)}
    </button>
  );
}

export interface JobRowData {
  id: string;
  code: string;
  title: string;
  companyName: string | null;
  company?: CompanySummary | null;
  employmentType: JobEmploymentType;
  workArrangement: JobWorkArrangement;
  province: string | null;
  city: string | null;
  seniority?: JobSeniority | null;
  urgent?: boolean;
  featured?: boolean;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryUndisclosed: boolean;
  publishedAt: string | null;
}

/**
 * One posting as a list row, the way the Iranian boards and LinkedIn list
 * them: logo, title, company, place, pay, and when — every fact in the same
 * spot on every row so a reader can run down a column of salaries.
 */
export function JobRow({
  job,
  match,
  className,
}: {
  job: JobRowData;
  /** "You have 3 of 5 skills", when known. */
  match?: { matched: number; total: number };
  className?: string;
}) {
  const { t, locale } = useLocale();
  const pay = salaryText(job, locale, t);
  const where = placeText(job, locale);
  const company = job.company?.name ?? job.companyName;

  return (
    <li className={className}>
      <Link
        to={`/jobs/${job.code}`}
        className="group flex gap-3 rounded-xl border border-border-default bg-surface-default p-3 transition hover:border-border-strong hover:shadow-sm sm:p-4"
      >
        <CompanyLogo name={company} logoUrl={job.company?.logoUrl} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-semibold text-text-primary group-hover:underline">{job.title}</h3>
            <SaveJobButton jobId={job.id} className="-m-1.5 shrink-0" />
          </div>

          {company && (
            <p className="flex items-center gap-1.5 truncate text-sm text-text-secondary">
              <Briefcase className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{company}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">
            {where && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {where}
              </span>
            )}
            {pay && <span className="font-medium text-text-primary">{pay}</span>}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {job.urgent && (
              <Badge variant="danger">
                <Zap className="size-3" aria-hidden="true" />
                {t.jobs.urgent}
              </Badge>
            )}
            {job.featured && (
              <Badge variant="warning">
                <Star className="size-3" aria-hidden="true" />
                {t.market.featuredBadge}
              </Badge>
            )}
            <Badge variant="info">{t.market[job.employmentType]}</Badge>
            {job.workArrangement !== 'ONSITE' && <Badge>{t.market[job.workArrangement]}</Badge>}
            {job.seniority && <Badge>{t.jobs.seniorityLevels[job.seniority]}</Badge>}
            {match && match.total > 0 && (
              <Badge variant={match.matched > 0 ? 'success' : 'default'}>
                {t.jobs.skillFit.replace('{matched}', String(match.matched)).replace('{total}', String(match.total))}
              </Badge>
            )}
            {job.publishedAt && (
              <span className="ms-auto flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="size-3" aria-hidden="true" />
                {postedAgo(job.publishedAt, locale, t)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Categories grouped under their parents; choosing a parent matches its children. */
export function JobCategorySelect({
  categories,
  value,
  onChange,
  placeholder,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  categories: JobCategory[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const { locale } = useLocale();
  return (
    <Select id={id} className={className} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {groupCategories(categories).map(({ parent, children }) => (
        <optgroup key={parent.id} label={categoryName(parent, locale)}>
          <option value={parent.id}>{categoryName(parent, locale)}</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {'  '}
              {categoryName(child, locale)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
