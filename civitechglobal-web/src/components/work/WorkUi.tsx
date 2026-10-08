import { Link, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import {
  Award,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CalendarClock,
  Clock,
  Eye,
  FileLock2,
  Gauge,
  Globe2,
  Hourglass,
  Languages,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
  Timer,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiAssetSrc } from '@/lib/apiAsset';
import { apiMessage } from '@/lib/apiMessage';
import { categoryName, daysUntil, fill, formatNumber } from '@/lib/jobFormat';
import { countryName } from '@/lib/geo';
import { agoText, budgetText, groupWorkCategories, languageName, money, percent } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { serviceImagePath, useSavedProjectIds, useToggleSavedProject } from '@/api/work';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type {
  ClientStats,
  FreelancerLevel,
  FreelancerStats,
  ProjectActivity,
  ProjectCard as ProjectCardData,
  ServiceCard as ServiceCardData,
  TalentRow,
  WorkCategory,
} from '@/types/work';

/**
 * The pieces every freelance page shares.
 *
 * The cards follow what the samples put in front of a freelancer before they
 * spend a proposal: Upwork's job tile (pricing type, experience level,
 * duration and hours, "payment verified", what the client has spent, where
 * they are, how many proposals), Freelancer.com's (the bid count, the average
 * bid, days left, NDA and urgent upgrades), and Fiverr's gig tile for
 * services (cover, seller level, rating, "from" price, delivery).
 */

// ---- Small parts ------------------------------------------------------------------

export function Stars({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const { locale } = useLocale();
  const icon = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <span className="inline-flex items-center gap-1 text-text-secondary">
      <Star className={cn(icon, 'fill-brand-amber-400 text-brand-amber-400')} aria-hidden="true" />
      <span className="font-semibold text-text-primary">{formatNumber(Math.round(value * 10) / 10, locale)}</span>
      {count !== undefined && <span className="text-text-tertiary">({formatNumber(count, locale)})</span>}
    </span>
  );
}

const LEVEL_TONE: Record<FreelancerLevel, 'default' | 'info' | 'success' | 'warning'> = {
  NEW: 'default',
  RISING: 'info',
  ESTABLISHED: 'success',
  TOP_RATED: 'warning',
};

export function LevelBadge({ level }: { level: FreelancerLevel }) {
  const { t } = useLocale();
  return (
    <Badge variant={LEVEL_TONE[level]}>
      {level === 'TOP_RATED' ? (
        <Award className="size-3" aria-hidden="true" />
      ) : level === 'RISING' ? (
        <TrendingUp className="size-3" aria-hidden="true" />
      ) : null}
      {t.work.levels[level]}
    </Badge>
  );
}

/** Categories grouped under their parents; choosing a parent matches its children. */
export function WorkCategorySelect({
  categories,
  value,
  onChange,
  placeholder,
  id,
  className,
  required,
  'aria-label': ariaLabel,
  counts,
}: {
  categories: WorkCategory[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  className?: string;
  required?: boolean;
  'aria-label'?: string;
  /** Show how many open projects or live services each category holds. */
  counts?: 'projects' | 'services';
}) {
  const { locale } = useLocale();
  const label = (category: WorkCategory) => {
    const name = categoryName(category, locale);
    if (!counts) return name;
    const n = counts === 'projects' ? category.projectCount : category.serviceCount;
    return n > 0 ? `${name} (${formatNumber(n, locale)})` : name;
  };
  return (
    <Select
      id={id}
      className={className}
      value={value}
      required={required}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groupWorkCategories(categories).map(({ parent, children }) => (
        <optgroup key={parent.id} label={categoryName(parent, locale)}>
          <option value={parent.id}>{label(parent)}</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {label(child)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

/**
 * Save or unsave a project. Signed out, it is a link to sign in that comes back
 * here — a bookmark that does nothing when tapped reads as broken.
 */
export function SaveProjectButton({
  projectId,
  className,
  withLabel = false,
}: {
  projectId: string;
  className?: string;
  withLabel?: boolean;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const { data: savedIds } = useSavedProjectIds(Boolean(user));
  const toggle = useToggleSavedProject();
  const saved = Boolean(savedIds?.includes(projectId));
  const label = saved ? t.work.savedProject : t.work.saveProject;
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
        {withLabel && t.work.saveProject}
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
        event.preventDefault();
        event.stopPropagation();
        toggle.mutate(
          { projectId, save: !saved },
          { onError: (error) => showToast(apiMessage(error, t.common.error), 'error') },
        );
      }}
    >
      {saved ? <BookmarkCheck className="size-5" aria-hidden="true" /> : <Bookmark className="size-5" aria-hidden="true" />}
      {withLabel && label}
    </button>
  );
}

/** Posted within the last two days. */
function isNew(publishedAt: string | null): boolean {
  return Boolean(publishedAt) && Date.now() - new Date(publishedAt!).getTime() < 2 * 86_400_000;
}

/** The bid deadline as a card says it. */
function deadlineText(closesAt: string | null | undefined, t: ReturnType<typeof useLocale>['t'], locale: ReturnType<typeof useLocale>['locale']) {
  if (!closesAt) return null;
  if (new Date(closesAt).getTime() <= Date.now()) return t.work.closed;
  const left = daysUntil(closesAt);
  if (left === null) return null;
  return left === 0 ? t.work.closesToday : fill(t.work.closesIn, { days: formatNumber(left, locale) });
}

// ---- The project card -------------------------------------------------------------

/**
 * One project, the same everywhere a project is listed.
 *
 * The whole card opens the project (the title's link is stretched over it);
 * the bookmark sits above that link. `compact` keeps the first lines only.
 */
export function ProjectCard({
  project,
  variant = 'detailed',
  className,
  footer,
}: {
  project: ProjectCardData;
  variant?: 'detailed' | 'compact';
  className?: string;
  /** Extra line under the card, e.g. "saved 3 days ago" or the reader's own bid. */
  footer?: ReactNode;
}) {
  const { t, locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const compact = variant === 'compact';
  const titleId = `project-${project.id}-title`;
  const client = project.client;
  const activity = project.activity;
  const deadline = deadlineText(project.closesAt, t, locale);
  const bidCount = activity?.bidCount ?? project._count.bids;

  // The line Upwork leads a tile with: how it pays, how senior, how long.
  const terms: string[] = [
    t.work.pricing[project.pricingType ?? 'FIXED'],
    ...(project.experienceLevel ? [t.work.experience[project.experienceLevel]] : []),
    ...(project.duration ? [t.work.durations[project.duration]] : []),
    ...(project.weeklyHours ? [t.work.weeklyHours[project.weeklyHours]] : []),
  ];
  const place = project.onsite
    ? [project.city, project.country ? countryName(project.country, locale) : null].filter(Boolean).join('، ')
    : null;

  return (
    <li className={className}>
      <article
        aria-labelledby={titleId}
        className={cn(
          'group relative flex flex-col gap-2 rounded-2xl border bg-surface-default transition hover:border-border-strong hover:shadow-md',
          compact ? 'p-3' : 'p-4 sm:p-5',
          project.urgent ? 'border-border-default border-s-4 border-s-brand-red-500' : 'border-border-default',
          project.featured &&
            !project.urgent &&
            'bg-brand-amber-50/40 ring-1 ring-brand-amber-200 dark:bg-brand-amber-900/10 dark:ring-brand-amber-800/40',
        )}
      >
        {(project.featured || project.urgent || project.nda || isNew(project.publishedAt) || project.contractToHire) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {project.urgent && (
              <Badge variant="danger">
                <Zap className="size-3" aria-hidden="true" />
                {t.work.urgent}
              </Badge>
            )}
            {project.featured && (
              <Badge variant="warning">
                <Star className="size-3" aria-hidden="true" />
                {t.work.featured}
              </Badge>
            )}
            {project.nda && (
              <Badge variant="default">
                <FileLock2 className="size-3" aria-hidden="true" />
                {t.work.nda}
              </Badge>
            )}
            {project.contractToHire && <Badge variant="success">{t.work.contractToHire}</Badge>}
            {isNew(project.publishedAt) && <Badge variant="info">{t.jobs.newBadge}</Badge>}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <h3 id={titleId} className={cn('font-semibold leading-snug text-text-primary', compact ? 'text-sm' : 'text-base')}>
            <Link
              to={`/projects/${project.code}`}
              className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:underline focus-visible:outline-none"
            >
              {project.title}
            </Link>
          </h3>
          <SaveProjectButton projectId={project.id} className="relative z-10 -m-1.5 shrink-0" />
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span className="flex items-center gap-1 font-semibold text-text-primary">
            <Wallet className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
            {budgetText(project, locale, t)}
          </span>
          <span className="text-xs text-text-tertiary">{terms.join(' · ')}</span>
        </p>

        {!compact && project.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">{project.excerpt}</p>
        )}
        {!compact && project.nda && (
          <p className="flex items-center gap-1.5 text-sm text-text-tertiary">
            <Lock className="size-3.5" aria-hidden="true" />
            {t.work.briefLocked}
          </p>
        )}

        {!compact && project.skills.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {project.skills.slice(0, 8).map((skill) => (
              <li key={skill} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-text-secondary">
                {skill}
              </li>
            ))}
            {project.skills.length > 8 && (
              <li className="px-1 text-xs text-text-tertiary">+{number(project.skills.length - 8)}</li>
            )}
          </ul>
        )}

        {/* The client and the competition, the line a freelancer reads last and decides on. */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary [&_svg]:size-3.5 [&_svg]:shrink-0">
          {client && (
            <li className={cn('flex items-center gap-1', client.verified && 'text-brand-green-700 dark:text-brand-green-400')}>
              <ShieldCheck aria-hidden="true" />
              {client.verified ? t.work.clientVerified : t.work.clientUnverified}
            </li>
          )}
          {client && client.ratingCount > 0 && (
            <li>
              <Stars value={client.ratingAvg} count={client.ratingCount} />
            </li>
          )}
          {client && client.hires > 0 && (
            <li className="flex items-center gap-1">
              <Users aria-hidden="true" />
              {fill(t.work.hiresCount, { count: number(client.hires) })}
            </li>
          )}
          {client && (
            <li className="flex items-center gap-1">
              <MapPin aria-hidden="true" />
              {countryName(client.country, locale)}
            </li>
          )}
          {place && (
            <li className="flex items-center gap-1">
              <Briefcase aria-hidden="true" />
              {t.work.onsite}: {place}
            </li>
          )}
          <li className="flex items-center gap-1">
            <MessageSquare aria-hidden="true" />
            {activity
              ? `${t.work.proposals}: ${t.work.proposalRange[activity.proposalRange]}`
              : fill(t.work.proposalsCount, { count: number(bidCount) })}
          </li>
          {activity?.averageBid && (
            <li className="flex items-center gap-1">
              <Gauge aria-hidden="true" />
              {t.work.averageBid}: {money(activity.averageBid, project.currency, locale, t)}
            </li>
          )}
          {project.publishedAt && (
            <li className="flex items-center gap-1">
              <Clock aria-hidden="true" />
              {fill(t.work.postedAgo, { ago: agoText(project.publishedAt, locale, t) })}
            </li>
          )}
          {deadline && (
            <li className="flex items-center gap-1">
              <Hourglass aria-hidden="true" />
              {deadline}
            </li>
          )}
          {project.match && project.match.total > 0 && (
            <li className="flex items-center gap-1 text-brand-green-700 dark:text-brand-green-400">
              <BadgeCheck aria-hidden="true" />
              {fill(t.work.yourMatch, { matched: number(project.match.matched), total: number(project.match.total) })}
            </li>
          )}
        </ul>

        {footer && <div className="relative z-10 border-t border-border-default pt-2 text-sm">{footer}</div>}
      </article>
    </li>
  );
}

// ---- Panels ---------------------------------------------------------------------------

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-text-secondary [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-text-tertiary">
      {icon}
      <span>{children}</span>
    </li>
  );
}

/** "About the client": Upwork's sidebar, with what this platform actually knows. */
export function ClientPanel({ client, companyName }: { client: ClientStats; companyName?: string | null }) {
  const { t, locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const where = [client.city, countryName(client.country, locale)].filter(Boolean).join('، ');
  return (
    <section className="rounded-2xl border border-border-default bg-surface-default p-4" aria-labelledby="about-client">
      <h2 id="about-client" className="mb-3 font-semibold text-text-primary">
        {t.work.aboutClient}
      </h2>
      {(client.companyName ?? companyName) && (
        <p className="mb-2 font-medium text-text-primary">{client.companyName ?? companyName}</p>
      )}
      <ul className="flex flex-col gap-2">
        <Fact icon={<ShieldCheck className={client.verified ? 'text-brand-green-600' : undefined} />}>
          {client.verified ? t.work.clientVerified : t.work.clientUnverified}
        </Fact>
        <Fact icon={<Star />}>
          {client.ratingCount > 0 ? (
            <Stars value={client.ratingAvg} count={client.ratingCount} />
          ) : (
            t.work.noReviewsYet
          )}
        </Fact>
        <Fact icon={<MapPin />}>{where}</Fact>
        <Fact icon={<Briefcase />}>
          {fill(t.work.projectsPosted, { count: number(client.projectsPosted) })}
          {client.openProjects > 0 && ` · ${fill(t.work.openProjectsCount, { count: number(client.openProjects) })}`}
        </Fact>
        <Fact icon={<Users />}>
          {fill(t.work.hiresCount, { count: number(client.hires) })}
          {client.hireRate !== null && ` · ${fill(t.work.hireRate, { rate: number(client.hireRate) })}`}
        </Fact>
        {client.committed.length > 0 && (
          <Fact icon={<Wallet />}>
            {t.work.committed}:{' '}
            {client.committed.map((row) => money(row.amount, row.currency, locale, t)).join(' + ')}
          </Fact>
        )}
        <Fact icon={<CalendarClock />}>{fill(t.work.memberSince, { date: formatDate(client.memberSince, locale) })}</Fact>
        {client.lastActiveAt && (
          <Fact icon={<Eye />}>{fill(t.work.activeAgo, { ago: agoText(client.lastActiveAt, locale, t) })}</Fact>
        )}
      </ul>
      {client.username && (
        <Link to={`/profiles/${client.username}`} className="mt-3 inline-block text-sm text-brand-green-600 hover:underline">
          {t.work.viewProfile}
        </Link>
      )}
    </section>
  );
}

/** "Activity on this project": the competition, counted, never itemised. */
export function ActivityPanel({ activity, currency }: { activity: ProjectActivity; currency: string }) {
  const { t, locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const rows: Array<[string, string]> = [
    [t.work.proposals, t.work.proposalRange[activity.proposalRange]],
    [t.work.interviewing, number(activity.interviewing)],
    [t.work.invitesSent, number(activity.invitesSent)],
    [t.work.unansweredInvites, number(activity.unansweredInvites)],
    [t.work.hired, number(activity.hired)],
    [
      t.work.lastViewed,
      activity.lastViewedByClient ? agoText(activity.lastViewedByClient, locale, t) : t.work.neverViewed,
    ],
  ];
  return (
    <section className="rounded-2xl border border-border-default bg-surface-default p-4" aria-labelledby="project-activity">
      <h2 id="project-activity" className="mb-3 font-semibold text-text-primary">
        {t.work.activity}
      </h2>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-end font-medium text-text-primary">{value}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="text-text-secondary">{t.work.averageBid}</dt>
          <dd className="text-end font-medium text-text-primary">
            {activity.averageBid ? (
              money(activity.averageBid, currency, locale, t)
            ) : (
              <span className="inline-flex items-center gap-1 text-text-tertiary" title={t.work.sealedBidsHint}>
                <Lock className="size-3.5" aria-hidden="true" />
                {t.work.sealedBids}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** A freelancer's earned record in one line: level, rating, job success, on time, completed. */
export function FreelancerFacts({ stats, className }: { stats: FreelancerStats; className?: string }) {
  const { t, locale } = useLocale();
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary [&_svg]:size-3.5', className)}>
      <li>
        <LevelBadge level={stats.level} />
      </li>
      {stats.verified && (
        <li className="flex items-center gap-1 text-brand-green-700 dark:text-brand-green-400">
          <ShieldCheck aria-hidden="true" />
          {t.market.verifiedBadge}
        </li>
      )}
      {stats.ratingCount > 0 && (
        <li>
          <Stars value={stats.ratingAvg} count={stats.ratingCount} />
        </li>
      )}
      {stats.jobSuccess !== null && (
        <li className="flex items-center gap-1">
          <TrendingUp aria-hidden="true" />
          {t.work.jobSuccess}: {percent(stats.jobSuccess, locale)}
        </li>
      )}
      {stats.onTime !== null && (
        <li className="flex items-center gap-1">
          <Timer aria-hidden="true" />
          {t.work.onTime}: {percent(stats.onTime, locale)}
        </li>
      )}
      <li className="flex items-center gap-1">
        <Layers aria-hidden="true" />
        {fill(t.work.completedContracts, { count: formatNumber(stats.completed, locale) })}
      </li>
      <li className="flex items-center gap-1">
        <MapPin aria-hidden="true" />
        {countryName(stats.country, locale)}
      </li>
      {stats.hourlyRate && (
        <li className="flex items-center gap-1 font-medium text-text-secondary">
          <Wallet aria-hidden="true" />
          {money(stats.hourlyRate, stats.hourlyCurrency, locale, t)} {t.work.perHour}
        </li>
      )}
      {stats.languages.length > 0 && (
        <li className="flex items-center gap-1">
          <Languages aria-hidden="true" />
          {stats.languages.map((code) => languageName(code, locale)).join('، ')}
        </li>
      )}
      {stats.lastActiveAt && (
        <li className="flex items-center gap-1">
          <Eye aria-hidden="true" />
          {fill(t.work.activeAgo, { ago: agoText(stats.lastActiveAt, locale, t) })}
        </li>
      )}
    </ul>
  );
}

// ---- Services and talent ----------------------------------------------------------------

/** One service as the catalogue shows it: cover, seller, rating, "from" price. */
export function ServiceCard({ service, className }: { service: ServiceCardData; className?: string }) {
  const { t, locale } = useLocale();
  const titleId = `service-${service.id}-title`;
  return (
    <li className={className}>
      <article
        aria-labelledby={titleId}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-default transition hover:border-border-strong hover:shadow-md',
          service.featured && 'ring-1 ring-brand-amber-200 dark:ring-brand-amber-800/40',
        )}
      >
        <div className="aspect-[16/10] bg-surface-muted">
          {service.coverImageId ? (
            <img
              src={apiAssetSrc(serviceImagePath(service.coverImageId))}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-text-tertiary">
              <Layers className="size-8" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
            {service.seller.username && <span className="font-medium text-text-primary">{service.seller.username}</span>}
            <LevelBadge level={service.seller.level} />
            {service.seller.verified && <ShieldCheck className="size-3.5 text-brand-green-600" aria-label={t.work.clientVerified} />}
          </div>
          <h3 id={titleId} className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">
            <Link
              to={`/freelance-services/${service.code}`}
              className="after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none"
            >
              {service.title}
            </Link>
          </h3>
          <div className="flex items-center gap-2 text-xs">
            {service.rating.count > 0 ? (
              <Stars value={service.rating.avg} count={service.rating.count} />
            ) : (
              <span className="text-text-tertiary">{t.work.noReviewsYet}</span>
            )}
            {service.ordersCompleted > 0 && (
              <span className="text-text-tertiary">· {fill(t.work.ordersCompleted, { count: formatNumber(service.ordersCompleted, locale) })}</span>
            )}
          </div>
          <div className="mt-auto flex items-end justify-between gap-2 border-t border-border-default pt-2">
            {service.fastestDelivery !== null && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="size-3.5" aria-hidden="true" />
                {fill(t.work.deliveryIn, { days: formatNumber(service.fastestDelivery, locale) })}
              </span>
            )}
            <span className="text-end text-sm">
              <span className="text-xs text-text-tertiary">{t.work.startingAt} </span>
              <span className="font-semibold text-text-primary">{money(service.startingPrice, service.currency, locale, t)}</span>
            </span>
          </div>
        </div>
      </article>
    </li>
  );
}

/** One freelancer in the talent directory. */
export function TalentCard({ row, onInvite }: { row: TalentRow; onInvite?: (username: string) => void }) {
  const { t, locale } = useLocale();
  const stats = row.stats;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-default p-4 sm:flex-row sm:items-start">
      <div
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-semibold text-text-secondary"
      >
        {row.displayName.charAt(0)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link to={`/profiles/${row.username}`} className="font-semibold text-text-primary hover:underline">
            {row.displayName}
          </Link>
          <span className="text-xs text-text-tertiary">@{row.username}</span>
          <span
            className={cn(
              'text-xs',
              stats.availability === 'AVAILABLE'
                ? 'text-brand-green-700 dark:text-brand-green-400'
                : stats.availability === 'LIMITED'
                  ? 'text-brand-amber-700 dark:text-brand-amber-400'
                  : 'text-text-tertiary',
            )}
          >
            · {t.work.availability[stats.availability]}
          </span>
        </div>
        {row.headline && <p className="text-sm text-text-secondary">{row.headline}</p>}
        <FreelancerFacts stats={stats} />
        {stats.skills.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {stats.skills.slice(0, 10).map((skill) => (
              <li key={skill} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-text-secondary">
                {skill}
              </li>
            ))}
          </ul>
        )}
        {row.serviceCount > 0 && (
          <Link
            to={`/freelance-services?sellerUsername=${encodeURIComponent(row.username)}`}
            className="text-xs text-brand-green-600 hover:underline"
          >
            {fill(t.work.servicesCount, { count: formatNumber(row.serviceCount, locale) })}
          </Link>
        )}
      </div>
      {onInvite && (
        <button
          type="button"
          onClick={() => onInvite(row.username)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-border-default px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-muted"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {t.work.invite}
        </button>
      )}
    </li>
  );
}

/** The project facts block on a project page: pricing, level, duration, languages, place. */
export function ProjectTerms({ project }: { project: ProjectCardData }) {
  const { t, locale } = useLocale();
  const items: Array<{ key: string; icon: ReactNode; label: string; value: string }> = [
    { key: 'pricing', icon: <Wallet />, label: t.work.pricingLabel, value: t.work.pricing[project.pricingType ?? 'FIXED'] },
  ];
  if (project.experienceLevel) {
    items.push({
      key: 'experience',
      icon: <Layers />,
      label: t.work.experience[project.experienceLevel],
      value: t.work.experienceHint[project.experienceLevel],
    });
  }
  if (project.duration) items.push({ key: 'duration', icon: <CalendarClock />, label: t.work.durationLabel, value: t.work.durations[project.duration] });
  if (project.weeklyHours) items.push({ key: 'hours', icon: <Clock />, label: t.work.weeklyHoursLabel, value: t.work.weeklyHours[project.weeklyHours] });
  if ((project.freelancersNeeded ?? 1) > 1) {
    items.push({ key: 'needed', icon: <Users />, label: t.work.freelancersNeededLabel, value: formatNumber(project.freelancersNeeded!, locale) });
  }
  items.push({
    key: 'where',
    icon: project.onsite ? <MapPin /> : <Globe2 />,
    label: t.work.locationLabel,
    value: project.onsite
      ? [project.city, project.province, project.country ? countryName(project.country, locale) : null].filter(Boolean).join('، ')
      : t.work.remote,
  });
  items.push({
    key: 'from',
    icon: <Send />,
    label: t.work.preferredLocation,
    value: project.preferredCountries?.length
      ? project.preferredCountries.map((code) => countryName(code, locale)).join('، ')
      : t.work.anywhere,
  });
  if (project.languages?.length) {
    items.push({
      key: 'languages',
      icon: <Languages />,
      label: t.work.languagesLabel,
      value: project.languages.map((code) => languageName(code, locale)).join('، '),
    });
  }
  if (project.deliverBy) {
    items.push({ key: 'deliver', icon: <Hourglass />, label: t.market.deliverBy, value: formatDate(project.deliverBy, locale) });
  }
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.key} className="flex gap-2.5">
          <span className="mt-0.5 text-text-tertiary [&>svg]:size-5" aria-hidden="true">
            {item.icon}
          </span>
          <div>
            <dt className="text-sm font-medium text-text-primary">{item.label}</dt>
            <dd className="text-sm text-text-secondary">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

