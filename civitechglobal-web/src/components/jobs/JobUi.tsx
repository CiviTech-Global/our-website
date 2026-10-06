import { Link, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Gift,
  GraduationCap,
  Home,
  Hourglass,
  Layers,
  MapPin,
  Shield,
  ShieldCheck,
  Star,
  Timer,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiAssetSrc } from '@/lib/apiAsset';
import { apiMessage } from '@/lib/apiMessage';
import { categoryName, daysUntil, formatNumber, groupCategories, placeText, postedAgo, salaryText } from '@/lib/jobFormat';
import { cn } from '@/lib/utils';
import { useSavedJobIds, useToggleSavedJob } from '@/api/jobs';
import { useOwnApplications, useOwnProfile } from '@/api/marketplace';
import { features } from '@/lib/features';
import { useViewedJobs } from '@/lib/viewedJobs';
import { countryName } from '@/lib/geo';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { CompanySummary, JobCategory, JobSeniority } from '@/types/jobs';
import type { AuthorProfile, JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

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
  country?: string;
  remoteWorldwide?: boolean;
  currency?: string;
  salaryPeriod?: 'HOUR' | 'MONTH' | 'YEAR';
  seniority?: JobSeniority | null;
  minExperienceYears?: number | null;
  urgent?: boolean;
  featured?: boolean;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryUndisclosed: boolean;
  publishedAt: string | null;
  closesAt?: string | null;
  skills?: string[];
  benefits?: string[];
  openings?: number;
  amriehEligible?: boolean;
  disabilityFriendly?: boolean;
  jobCategory?: { name: string; nameEn: string } | null;
  authorProfile?: AuthorProfile | null;
  applicantCount?: number;
  reviewingNow?: boolean;
  responsiveEmployer?: boolean;
}

/** Posted within the last two days. */
function isNew(publishedAt: string | null): boolean {
  return Boolean(publishedAt) && Date.now() - new Date(publishedAt!).getTime() < 2 * 86_400_000;
}

const skillKey = (skill: string) => skill.trim().toLowerCase();

/**
 * One posting as a card, the same everywhere a job is listed.
 *
 * Detailed by default, because the samples this follows — JobVision, Jobinja,
 * IranTalent, e-estekhdam — all put a lot on a card and readers decide from it
 * whether to open the posting at all: the company and how it rates, place and
 * pay, how long ago, and the signals ("urgent", "the employer answers",
 * "reviewing CVs", "interns welcome") that the Iranian boards lead with. Then
 * what LinkedIn adds: the reader's own fit, and whether they have already seen
 * or applied to it.
 *
 * The whole card opens the posting (the title's link is stretched over it);
 * the company link, the bookmark and "Apply" sit above that link, so nothing
 * is a link inside a link. `compact` keeps the first lines only, for narrow
 * places — a dashboard panel, the "similar jobs" column.
 */
export function JobRow({
  job,
  match,
  variant = 'detailed',
  className,
}: {
  job: JobRowData;
  /** "You have 3 of 5 skills", when the server worked it out. Computed here otherwise. */
  match?: { matched: number; total: number };
  variant?: 'detailed' | 'compact';
  className?: string;
}) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const v2 = features.jobsV2;
  const { data: ownApplications } = useOwnApplications(Boolean(user) && v2);
  const { data: profile } = useOwnProfile(Boolean(user) && v2);
  const viewed = useViewedJobs();

  const pay = salaryText(job, locale, t);
  const company = job.company?.name ?? job.companyName;
  // Where it is, and for a remote role who may take it: anyone anywhere,
  // or anyone in the posting's own country.
  const remotePlace =
    job.workArrangement !== 'REMOTE'
      ? ''
      : job.remoteWorldwide
        ? t.jobs.remoteWorldwide
        : !job.country || job.country === 'IR'
          ? t.jobs.remoteAnywhere
          : t.jobs.remoteAnywhereIn.replace('{country}', countryName(job.country, locale));
  const place = job.remoteWorldwide ? remotePlace : placeText(job, locale) || remotePlace;
  const applied = ownApplications?.some((row) => row.job.code === job.code && row.outcome !== 'WITHDRAWN');
  const seen = !applied && viewed.has(job.code);
  const left = daysUntil(job.closesAt);
  const number = (value: number) => formatNumber(value, locale);
  const titleId = `job-${job.id}-title`;
  const compact = variant === 'compact';

  // The reader's fit: the server's figure when it sent one, otherwise their
  // profile skills against this posting's.
  const mine = new Set((profile?.skills ?? []).map(skillKey));
  const skills = job.skills ?? [];
  const fit =
    match ??
    (mine.size > 0 && skills.length > 0
      ? { matched: skills.filter((skill) => mine.has(skillKey(skill))).length, total: skills.length }
      : undefined);

  const signals: Array<{ key: string; label: string; icon: ReactNode; tone: 'success' | 'info' | 'warning' | 'default' }> = [];
  if (job.responsiveEmployer) {
    signals.push({ key: 'responsive', label: t.jobs.responsiveEmployer, icon: <BadgeCheck />, tone: 'success' });
  }
  if (job.reviewingNow) signals.push({ key: 'reviewing', label: t.jobs.reviewingNow, icon: <Eye />, tone: 'info' });
  if (job.employmentType === 'INTERNSHIP' || job.seniority === 'INTERN') {
    signals.push({ key: 'interns', label: t.jobs.internsWelcome, icon: <GraduationCap />, tone: 'default' });
  }
  if (job.amriehEligible) signals.push({ key: 'amrieh', label: t.jobs.amrieh, icon: <Shield />, tone: 'default' });
  if (job.disabilityFriendly) {
    signals.push({ key: 'access', label: t.jobs.disabilityFriendly, icon: <Accessibility />, tone: 'default' });
  }

  const benefits = (job.benefits ?? []).filter(
    (key): key is keyof typeof t.jobs.benefitLabels => key in t.jobs.benefitLabels,
  );

  const facts: Array<{ key: string; icon: ReactNode; text: string }> = [
    { key: 'type', icon: <Briefcase />, text: t.market[job.employmentType] },
  ];
  if (job.workArrangement !== 'ONSITE') facts.push({ key: 'arrangement', icon: <Home />, text: t.market[job.workArrangement] });
  if (job.seniority) facts.push({ key: 'seniority', icon: <Layers />, text: t.jobs.seniorityLevels[job.seniority] });
  if (job.minExperienceYears != null) {
    facts.push({
      key: 'experience',
      icon: <Timer />,
      text:
        job.minExperienceYears === 0
          ? t.jobs.noExperience
          : t.jobs.yearsOrMore.replace('{n}', number(job.minExperienceYears)),
    });
  }
  if ((job.openings ?? 1) > 1) {
    facts.push({ key: 'openings', icon: <Users />, text: t.jobs.openingsCount.replace('{count}', number(job.openings!)) });
  }

  return (
    <li className={className}>
      <article
        aria-labelledby={titleId}
        className={cn(
          'group relative flex gap-3 rounded-2xl border bg-surface-default transition hover:border-border-strong hover:shadow-md',
          compact ? 'p-3' : 'p-4 sm:p-5',
          // The samples mark an urgent posting down its leading edge, and a
          // promoted one with a tint; the badges say so in words as well.
          job.urgent ? 'border-border-default border-s-4 border-s-brand-red-500' : 'border-border-default',
          job.featured && !job.urgent && 'bg-brand-amber-50/40 ring-1 ring-brand-amber-200 dark:bg-brand-amber-900/10 dark:ring-brand-amber-800/40',
        )}
      >
        <CompanyLogo name={company} logoUrl={job.company?.logoUrl} size={compact ? 'sm' : 'md'} />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* What is special about it, before the title: the order the eye takes. */}
          {(job.featured || job.urgent || isNew(job.publishedAt) || applied || seen) && (
            <div className="flex flex-wrap items-center gap-1.5">
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
              {isNew(job.publishedAt) && <Badge variant="info">{t.jobs.newBadge}</Badge>}
              {applied && (
                <Badge variant="success">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {t.jobs.appliedBadge}
                </Badge>
              )}
              {seen && <span className="text-xs text-text-tertiary">{t.jobs.viewedBadge}</span>}
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <h3 id={titleId} className={cn('font-semibold leading-snug text-text-primary', compact ? 'text-sm' : 'text-base')}>
              <Link
                to={`/jobs/${job.code}`}
                className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:underline focus-visible:outline-none"
              >
                {job.title}
              </Link>
            </h3>
            <SaveJobButton jobId={job.id} className="relative z-10 -m-1.5 shrink-0" />
          </div>

          {company && (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text-secondary">
              {job.company ? (
                <Link
                  to={`/companies/${encodeURIComponent(job.company.slug)}`}
                  className="relative z-10 truncate font-medium hover:text-text-primary hover:underline"
                >
                  {company}
                </Link>
              ) : (
                <span className="truncate font-medium">{company}</span>
              )}
              {job.authorProfile?.verified && (
                <span className="inline-flex items-center gap-0.5 text-brand-green-600" title={t.jobs.verifiedEmployer}>
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">{t.jobs.verifiedEmployer}</span>
                </span>
              )}
              {(job.authorProfile?.ratingCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs text-text-tertiary">
                  <Star className="size-3 fill-brand-amber-400 text-brand-amber-400" aria-hidden="true" />
                  {formatNumber(Math.round(job.authorProfile!.ratingAvg * 10) / 10, locale)}
                  <span>({number(job.authorProfile!.ratingCount)})</span>
                </span>
              )}
              {!compact && job.jobCategory && (
                <span className="truncate text-xs text-text-tertiary">· {categoryName(job.jobCategory, locale)}</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
            {place && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                {place}
              </span>
            )}
            {pay && (
              <span className="flex items-center gap-1 font-semibold text-text-primary">
                <Wallet className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                {pay}
              </span>
            )}
          </div>

          {!compact && (
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary [&_svg]:size-3.5 [&_svg]:shrink-0">
              {facts.map((fact) => (
                <li key={fact.key} className="flex items-center gap-1">
                  {fact.icon}
                  {fact.text}
                </li>
              ))}
            </ul>
          )}

          {!compact && signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {signals.map((signal) => (
                <Badge key={signal.key} variant={signal.tone}>
                  <span className="[&_svg]:size-3" aria-hidden="true">
                    {signal.icon}
                  </span>
                  {signal.label}
                </Badge>
              ))}
            </div>
          )}

          {!compact && benefits.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
              <Gift className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
              {benefits.slice(0, 3).map((key) => t.jobs.benefitLabels[key]).join(locale === 'fa' ? '، ' : ', ')}
              {benefits.length > 3 && <span className="text-text-tertiary">+{number(benefits.length - 3)}</span>}
            </p>
          )}

          {!compact && skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {skills.slice(0, 5).map((skill) => {
                const have = mine.has(skillKey(skill));
                return (
                  <span
                    key={skill}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
                      have
                        ? 'border-brand-green-300 bg-brand-green-50 text-brand-green-800 dark:border-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                        : 'border-border-default text-text-secondary',
                    )}
                  >
                    {have && <Check className="size-3" aria-hidden="true" />}
                    {skill}
                  </span>
                );
              })}
              {skills.length > 5 && <span className="text-xs text-text-tertiary">+{number(skills.length - 5)}</span>}
              {fit && fit.total > 0 && (
                <span className="ms-1 text-xs font-medium text-brand-green-700 dark:text-brand-green-400">
                  {t.jobs.skillFit.replace('{matched}', number(fit.matched)).replace('{total}', number(fit.total))}
                </span>
              )}
            </div>
          )}

          {/* The foot: when, how many, how long — and the way to act. */}
          <div
            className={cn(
              'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary',
              !compact && 'border-t border-border-subtle pt-2.5',
            )}
          >
            {job.publishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                {postedAgo(job.publishedAt, locale, t)}
              </span>
            )}
            {!compact && job.applicantCount !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="size-3" aria-hidden="true" />
                {job.applicantCount === 0
                  ? t.jobs.earlyApplicant
                  : job.applicantCount === 1
                    ? t.jobs.applicantsOne
                    : t.jobs.applicantsCount.replace('{count}', number(job.applicantCount))}
              </span>
            )}
            {left !== null && left <= 7 && (
              <span className="flex items-center gap-1 font-medium text-brand-amber-700 dark:text-brand-amber-400">
                <Hourglass className="size-3" aria-hidden="true" />
                {left === 0
                  ? t.jobs.closesToday
                  : left === 1
                    ? t.jobs.closesTomorrow
                    : t.jobs.closesIn.replace('{n}', number(left))}
              </span>
            )}
            {!compact && v2 && !applied && (
              <Link
                to={`/jobs/${job.code}#apply`}
                className="relative z-10 ms-auto inline-flex items-center gap-1 rounded-lg bg-brand-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green-700"
              >
                {t.jobs.applyCta}
                <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </article>
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
