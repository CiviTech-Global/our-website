import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { useState } from 'react';
import { Link } from 'react-router';
import { Eye } from 'lucide-react';
import { resumeFileUrl, useAdminResumes, useUpdateResumeStatus } from '@/api/resumes';
import { FilePreview } from '@/components/ui/FilePreview';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { ResumeStatus, TalentTrack } from '@/types/resume';

type ProgrammeFilter = 'VOLUNTEER,INTERNSHIP' | 'VOLUNTEER' | 'INTERNSHIP';

const PAGE_SIZE = 20;

const STATUSES: ResumeStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'SHORTLISTED',
  'MATCHED',
  'ON_HOLD',
  'DECLINED',
  'WITHDRAWN',
];

function statusVariant(status: ResumeStatus): BadgeVariant {
  switch (status) {
    case 'MATCHED':
      return 'success';
    case 'SHORTLISTED':
      return 'info';
    case 'IN_REVIEW':
    case 'ON_HOLD':
      return 'warning';
    case 'DECLINED':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * The CV pile — or, with `programme`, the volunteer and internship pile.
 *
 * Both come through the same intake, so they are the same screen filtered two
 * ways. Kept apart in the sidebar all the same: whoever reads job CVs against
 * an opening is doing different work from whoever plans placements, and a
 * single mixed list would make both of them skip half of it.
 *
 * A list rather than a table: the useful signal in an application is the
 * headline, the years and the skills, and those do not fit a row without being
 * truncated into uselessness.
 */
export default function ResumesPage({ programme = false }: { programme?: boolean }) {
  const { t, locale } = useLocale();
  const title = programme ? t.volunteer.adminTitle : t.join.adminTitle;
  useDocumentTitle(title);
  const { showToast } = useToast();
  const [previewing, setPreviewing] = useState<{ url: string; filename: string } | null>(null);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'ALL', programme: 'VOLUNTEER,INTERNSHIP' },
  });
  const programmeFilter = controls.filters.programme as ProgrammeFilter;
  const track: string = programme ? programmeFilter : ('JOB' satisfies TalentTrack);

  const { data, isLoading } = useAdminResumes({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    track,
    search: controls.search || undefined,
  });
  const update = useUpdateResumeStatus();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={programme ? t.volunteer.adminSubtitle : t.join.adminSubtitle}
        className="mb-2"
      />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.join.searchResumes}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <>
            {programme && (
              <SegmentedControl<ProgrammeFilter>
                label={t.volunteer.programme}
                value={programmeFilter}
                onChange={(value) => controls.setFilter('programme', value)}
                segments={[
                  { value: 'VOLUNTEER,INTERNSHIP', label: t.volunteer.bothTracks },
                  { value: 'INTERNSHIP', label: t.volunteer.tracks.INTERNSHIP },
                  { value: 'VOLUNTEER', label: t.volunteer.tracks.VOLUNTEER },
                ]}
              />
            )}
            <Select
              value={controls.filters.status}
              className="w-auto min-w-40"
              aria-label={t.admin.status}
              onChange={(e) => controls.setFilter('status', e.target.value)}
            >
              <option value="ALL">{t.common.all}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.join.statuses[s]}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          title={
            controls.activeCount > 0
              ? t.list.noResults
              : programme
                ? t.volunteer.adminEmpty
                : t.join.adminEmpty
          }
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((cv) => (
          <li key={cv.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/resumes/${cv.id}`}
                    className="font-medium text-app-text hover:underline"
                  >
                    {cv.fullName}
                  </Link>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">{cv.trackingCode}</span>
                    {cv.city && ` · ${cv.city}`}
                    {programme && cv.track !== 'JOB' && ` · ${t.volunteer.tracks[cv.track]}`}
                    {cv.discipline && ` · ${t.volunteer.disciplines[cv.discipline]}`}
                    {cv.hoursPerWeek && ` · ${cv.hoursPerWeek} ${t.volunteer.hoursUnit}`}
                    {` · ${formatDate(cv.createdAt, locale)}`}
                  </p>
                </div>
                <Badge variant={statusVariant(cv.status)}>{t.join.statuses[cv.status]}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setPreviewing({
                      url: resumeFileUrl(cv.id),
                      filename: `${cv.fullName}-${cv.trackingCode}`,
                    })
                  }
                >
                  <Eye className="size-4" />
                  {t.common.file.preview}
                </Button>

                <Select
                  value={cv.status}
                  aria-label={t.admin.status}
                  className="w-auto"
                  onChange={async (e) => {
                    await update.mutateAsync({
                      id: cv.id,
                      status: e.target.value as ResumeStatus,
                    });
                    showToast(t.admin.statusUpdated, 'success');
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t.join.statuses[s]}
                    </option>
                  ))}
                </Select>

                {cv.matchedRole && (
                  <span className="text-label text-app-text-4">
                    {t.join.matchedRole}: {cv.matchedRole}
                  </span>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <Pagination
          page={controls.page}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
        />
      )}

      {previewing && (
        <FilePreview
          url={previewing.url}
          filename={previewing.filename}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
