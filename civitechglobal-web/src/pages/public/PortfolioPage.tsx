import { ProjectGallery } from '@/components/showcase/ProjectGallery';
import { useMemo, useState } from 'react';
import { Code2, ExternalLink, Star } from 'lucide-react';
import { Github } from '@/components/ui/BrandIcons';
import {
  showcaseImageSrc,
  usePublicProjects,
  type ProjectFilter,
  type ShowcaseProject,
  type ShowcaseProjectStatus,
} from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { BandCta } from '@/components/marketing/BandCta';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

const FILTERS: ProjectFilter[] = ['all', 'current', 'completed'];

function statusVariant(status: ShowcaseProjectStatus): BadgeVariant {
  switch (status) {
    case 'IN_PROGRESS':
      return 'info';
    case 'PLANNING':
      return 'warning';
    case 'LAUNCHED':
    case 'MAINTAINED':
      return 'success';
    default:
      return 'default';
  }
}

const PAGE_SIZE = 12;

/** One outcome number on a case card: "40%", "faster checkout". */
interface ProjectMetric {
  label: string;
  value: string;
}

/**
 * What the company is building, and what it has delivered.
 *
 * The filter lives in the URL, so "our current projects" is a link somebody
 * can send — which is usually how this page gets visited.
 */
export default function PortfolioPage() {
  const { t } = useLocale();
  useDocumentTitle(t.showcase.projectsTitle, { description: t.seo.portfolio });

  const controls = useListControls({
    defaultView: 'cards',
    pageSize: PAGE_SIZE,
    filters: { filter: 'all', technology: '' },
  });
  const raw = controls.filters.filter;
  const filter: ProjectFilter = raw === 'current' || raw === 'completed' ? raw : 'all';

  // The status filter is the server's — it decides which projects are current
  // — and the rest is done here, over the set it sent back.
  const { data, isLoading, isFetching } = usePublicProjects(filter);
  const list = useClientList(data, controls, {
    searchFields: (project) => [
      project.title,
      project.summary,
      project.category,
      project.client?.name,
      ...project.technologies,
    ],
    filters: { technology: (project, value) => project.technologies.includes(value) },
    pageSize: PAGE_SIZE,
  });

  const technologies = useMemo(
    () => [...new Set((data ?? []).flatMap((project) => project.technologies))].sort(),
    [data]
  );
  const labels: Record<ProjectFilter, string> = {
    all: t.showcase.filterAll,
    current: t.showcase.filterCurrent,
    completed: t.showcase.filterCompleted,
  };

  return (
    <div className="page-frame !pt-0">
      <header className="hero-canvas bagh-ground -mx-4 mb-10 px-4 pb-14 pt-12 text-center sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <AnimatedSection>
          <p className="eyebrow justify-center">{t.home.workEyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold text-text-primary sm:text-5xl">
            {t.showcase.projectsTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-loose text-text-secondary">
            {t.showcase.projectsSubtitle}
          </p>
        </AnimatedSection>
      </header>

      <div className="mb-8 flex justify-center">
        <div role="group" aria-label={t.common.filter} className="inline-flex flex-wrap gap-1 rounded-xl border border-border-default p-1">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => controls.setFilter('filter', value)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                filter === value
                  ? 'bg-brand-green-500/15 text-brand-green-700 dark:text-brand-green-300'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {labels[value]}
            </button>
          ))}
        </div>
      </div>

      <ListToolbar
        className="mb-6"
        controls={controls}
        searchPlaceholder={t.showcase.searchPlaceholder}
        total={list.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          technologies.length > 0 ? (
            <Select
              className="w-48"
              value={controls.filters.technology}
              aria-label={t.showcase.filterTechnology}
              onChange={(e) => controls.setFilter('technology', e.target.value)}
            >
              <option value="">{t.showcase.filterTechnologyAll}</option>
              {technologies.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ) : null
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && list.total === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.showcase.projectsEmpty}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      <ul
        className={cn(
          controls.view === 'cards'
            ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-3',
          // Kept visible while a new filter loads, just dimmed, so the grid
          // does not collapse to a spinner and jump back.
          isFetching && !isLoading && 'opacity-60 transition-opacity'
        )}
      >
        {list.items.map((project, index) => (
          <li key={project.id}>
            <AnimatedSection delay={Math.min(index, 6) * 0.04} className="h-full">
              <ProjectCard project={project} />
            </AnimatedSection>
          </li>
        ))}
      </ul>

      {list.totalPages > 1 && (
        <div className="mt-8">
          <Pagination page={controls.page} totalPages={list.totalPages} onPageChange={controls.setPage} />
        </div>
      )}

      {!isLoading && (
        <BandCta
          title={t.showcase.ctaTitle}
          body={t.showcase.ctaBody}
          primaryLabel={t.nav.startProject}
          primaryTo="/start-project"
          secondaryLabel={t.home.heroCtaSecondary}
          secondaryTo="/contact"
        />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: ShowcaseProject }) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const cover = showcaseImageSrc(project.coverUrl);
  const clientLogo = showcaseImageSrc(project.client?.logoUrl ?? null);

  /**
   * Outcome metrics are not part of the showcase API yet. The card reserves
   * the slot — a stat line under the summary, the reference anatomy's metric
   * row — and renders it the day the field arrives; until then nothing
   * renders, so a project without data shows no empty chrome.
   */
  const metrics = (project as ShowcaseProject & { metrics?: ProjectMetric[] | null }).metrics;

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      {cover ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="aspect-video w-full border-b border-border-default object-cover"
        />
      ) : (
        <div
          className="hero-canvas flex aspect-video w-full items-center justify-center border-b border-border-default"
          aria-hidden="true"
        >
          <Code2 className="size-10 text-brand-green-500/70 dark:text-brand-green-400/70" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-text-primary">{project.title}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(project.status)}>
            {t.showcase.projectStatuses[project.status]}
          </Badge>
          {project.featured && (
            <Badge variant="success">
              <Star className="size-3" aria-hidden="true" />
              {t.showcase.featured}
            </Badge>
          )}
          {project.category && <span className="bagh-chip text-xs">{project.category}</span>}
        </div>

        {/* The two-line outcome summary; the full description expands below. */}
        <p
          className={cn(
            'text-sm leading-6 text-text-secondary',
            project.description && !expanded && 'line-clamp-2'
          )}
        >
          {project.summary}
        </p>

        {metrics && metrics.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-xs text-text-muted">{metric.label}</dt>
                <dd className="text-base font-bold tabular-nums text-brand-green-700 dark:text-brand-green-300">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {project.description && (
          <>
            {expanded && (
              <p className="whitespace-pre-line text-sm leading-6 text-text-secondary">
                {project.description}
              </p>
            )}
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              className="w-fit text-sm font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
            >
              {expanded ? t.showcase.readLess : t.showcase.readMore}
            </button>
          </>
        )}

        {project.screenshots.length > 0 && (
          <ProjectGallery shots={project.screenshots} title={project.title} />
        )}

        {project.technologies.length > 0 && (
          <div>
            <p className="sr-only">{t.showcase.builtWith}</p>
            <ul className="flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <li
                  key={tech}
                  className="ltr rounded-md border border-border-default bg-surface-100 px-2 py-0.5 text-xs text-text-secondary"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-xs">
          {project.client && (
            <div className="col-span-2 flex items-center gap-2">
              <dt className="sr-only">{t.showcase.client}</dt>
              {clientLogo && (
                <img src={clientLogo} alt="" className="size-6 rounded bg-white object-contain p-0.5" />
              )}
              <dd className="text-text-primary">{project.client.name}</dd>
            </div>
          )}
          {project.startedAt && (
            <div>
              <dt className="text-text-muted">{t.showcase.startedAt}</dt>
              <dd className="text-text-primary">{formatDate(project.startedAt, locale)}</dd>
            </div>
          )}
          {project.completedAt && (
            <div>
              <dt className="text-text-muted">{t.showcase.completedAt}</dt>
              <dd className="text-text-primary">{formatDate(project.completedAt, locale)}</dd>
            </div>
          )}
        </dl>

        {(project.projectUrl || project.repositoryUrl) && (
          <div className="flex flex-wrap gap-3">
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t.showcase.visitProject}
              </a>
            )}
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                <Github className="size-3.5" aria-hidden="true" />
                {t.showcase.sourceCode}
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
