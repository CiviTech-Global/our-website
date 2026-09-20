import { Link } from 'react-router';
import { Star, Users } from 'lucide-react';
import { usePublicProjects, type ProjectBoardSort } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';

const PAGE_SIZE = 20;

/**
 * The freelance board.
 *
 * Each card shows how many offers a project has drawn, and nothing about them.
 * That is the sealed-bid rule made visible: a count says there is competition
 * without handing the next bidder somebody else's number to undercut.
 */
export default function FreelanceProjectsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.projectsTitle, { description: t.seo.freelance });

  // Rows by default, like the job board: a brief has no picture, and the row
  // shows the budget and the bid count together — which is what somebody
  // deciding whether to bid is weighing.
  const controls = useListControls({
    defaultView: 'table',
    defaultSort: 'newest',
    pageSize: PAGE_SIZE,
    filters: { category: '', skills: '', budgetMin: '', budgetMax: '' },
    typedFilters: ['category', 'skills', 'budgetMin', 'budgetMax'],
  });

  const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');
  const skillsList = controls.filters.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const { data, isLoading } = usePublicProjects({
    page: controls.page,
    pageSize: PAGE_SIZE,
    search: controls.search || undefined,
    category: controls.filters.category.trim() || undefined,
    skills: skillsList.length > 0 ? skillsList : undefined,
    budgetMin: digitsOnly(controls.filters.budgetMin) || undefined,
    budgetMax: digitsOnly(controls.filters.budgetMax) || undefined,
    sort: controls.sort as ProjectBoardSort,
  });

  const count = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.market.projectsTitle}</h1>
        <p className="mt-2 text-text-secondary">{t.market.projectsSubtitle}</p>
      </header>

      <ListToolbar
        className="mb-3"
        controls={controls}
        searchPlaceholder={t.market.searchProjects}
        total={data?.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          <Select
            className="w-48"
            value={controls.sort}
            aria-label={t.market.sortLabel}
            onChange={(e) => controls.setSort(e.target.value)}
          >
            <option value="newest">{t.market.sortNewest}</option>
            <option value="budgetAsc">{t.market.sortBudgetAsc}</option>
            <option value="budgetDesc">{t.market.sortBudgetDesc}</option>
          </Select>
        }
      />

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-surface-200 p-3 sm:flex-row sm:flex-wrap sm:items-center dark:border-surface-300">
        <Input
          className="sm:w-44"
          value={controls.filterInput('category')}
          placeholder={t.market.category}
          aria-label={t.market.category}
          onChange={(e) => controls.setFilter('category', e.target.value)}
        />
        <Input
          className="sm:w-52"
          value={controls.filterInput('skills')}
          placeholder={t.market.skillsFilterPlaceholder}
          aria-label={t.market.skillsFilter}
          onChange={(e) => controls.setFilter('skills', e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Input
            className="w-28"
            value={controls.filterInput('budgetMin')}
            inputMode="numeric"
            placeholder={t.market.minLabel}
            aria-label={`${t.market.budgetRange} — ${t.market.minLabel}`}
            onChange={(e) => controls.setFilter('budgetMin', e.target.value)}
          />
          <span className="text-sm text-text-muted">{t.market.to}</span>
          <Input
            className="w-28"
            value={controls.filterInput('budgetMax')}
            inputMode="numeric"
            placeholder={t.market.maxLabel}
            aria-label={`${t.market.budgetRange} — ${t.market.maxLabel}`}
            onChange={(e) => controls.setFilter('budgetMax', e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.market.noProjects}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      <ul
        className={
          controls.view === 'cards'
            ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
            : 'flex flex-col gap-3'
        }
      >
        {data?.items.map((project) => {
          const budget = project.budgetUnknown
            ? t.market.budgetUnknown
            : formatRange(project.budgetMin, project.budgetMax, locale, t);

          return (
            <li key={project.id}>
              <Card className="transition hover:border-brand-green-500/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/projects/${project.code}`}
                        className="text-lg font-semibold text-text-primary hover:underline"
                      >
                        {project.title}
                      </Link>
                      {project.featured && (
                        <Badge variant="warning">
                          <Star className="ms-0 size-3" aria-hidden />
                          {t.market.featuredBadge}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                      {project.companyName && <span>{project.companyName}</span>}
                      {project.category && <Badge>{project.category}</Badge>}
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <Users className="size-3.5" aria-hidden="true" />
                        {count(project._count.bids)} {t.market.bidCount}
                      </span>
                    </div>
                    {project.authorProfile && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <Link
                          to={`/profiles/${project.authorProfile.username}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          @{project.authorProfile.username}
                        </Link>
                        {project.authorProfile.verified && <VerifiedBadge />}
                        <RatingStars
                          avg={project.authorProfile.ratingAvg}
                          count={project.authorProfile.ratingCount}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {budget && <p className="text-sm font-medium text-text-primary">{budget}</p>}
                    {project.publishedAt && (
                      <p className="text-xs text-text-muted">
                        {t.market.postedOn} {formatDate(project.publishedAt, locale)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {data && data.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={controls.page}
            totalPages={data.totalPages}
            onPageChange={controls.setPage}
          />
        </div>
      )}
    </div>
  );
}
