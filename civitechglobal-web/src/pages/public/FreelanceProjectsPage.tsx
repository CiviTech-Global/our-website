import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Users } from 'lucide-react';
import { usePublicProjects } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';

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
  useDocumentTitle(t.market.projectsTitle);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePublicProjects({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
  });

  const count = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.market.projectsTitle}</h1>
        <p className="mt-2 text-text-secondary">{t.market.projectsSubtitle}</p>
      </header>

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-text-muted start-3"
          aria-hidden="true"
        />
        <Input
          className="ps-9"
          value={search}
          placeholder={t.market.searchProjects}
          aria-label={t.market.searchProjects}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.noProjects} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((project) => {
          const budget = project.budgetUnknown
            ? t.market.budgetUnknown
            : formatRange(project.budgetMin, project.budgetMax, locale, t);

          return (
            <li key={project.id}>
              <Card className="transition hover:border-brand-green-500/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${project.code}`}
                      className="text-lg font-semibold text-text-primary hover:underline"
                    >
                      {project.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                      {project.companyName && <span>{project.companyName}</span>}
                      {project.category && <Badge>{project.category}</Badge>}
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <Users className="size-3.5" aria-hidden="true" />
                        {count(project._count.bids)} {t.market.bidCount}
                      </span>
                    </div>
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
