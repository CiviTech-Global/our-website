import { Link } from 'react-router';
import { useSavedProjects } from '@/api/work';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { agoText } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ProjectCard } from '@/components/work/WorkUi';

/** The projects the freelancer bookmarked, newest saved first; closed ones stay, marked as closed. */
export default function SavedProjectsPage() {
  const { t, locale } = useLocale();
  const { data, isLoading } = useSavedProjects();
  useDocumentTitle(t.work.navSavedProjects);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.work.navSavedProjects} />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.work.savedEmpty}
          action={
            <Link to="/projects">
              <Button variant="outline">{t.work.findWork}</Button>
            </Link>
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {data?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            footer={
              <span className="text-xs text-text-tertiary">
                {t.work.savedProject} · {agoText(project.savedAt, locale, t)}
                {project.state && project.state !== 'OPEN' && ` · ${t.work.closed}`}
              </span>
            }
          />
        ))}
      </ul>
    </div>
  );
}
