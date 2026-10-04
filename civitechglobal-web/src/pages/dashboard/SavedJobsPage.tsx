import { useSavedJobs } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill } from '@/lib/jobFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { JobRow } from '@/components/jobs/JobUi';

/**
 * The roles somebody bookmarked. Closed ones stay, marked, so a role that went
 * does not just vanish from a list its owner was keeping.
 */
export default function SavedJobsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.jobs.savedJobsTitle);
  const { data, isLoading } = useSavedJobs();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.jobs.savedJobsTitle} className="mb-2" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.jobs.savedEmpty} />}

      <div className="flex flex-col gap-4">
        {data?.map((entry) => (
          <div key={entry.job.id} className={entry.open ? undefined : 'opacity-70'}>
            <div className="mb-1 flex items-center gap-2 text-label text-app-text-4">
              {fill(t.jobs.savedOn, { date: formatDate(entry.savedAt, locale) })}
              {!entry.open && <Badge>{t.jobs.closedBadge}</Badge>}
            </div>
            <ul>
              <JobRow job={entry.job} />
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
