import { useState } from 'react';
import { Link } from 'react-router';
import { Eye } from 'lucide-react';
import { resumeFileUrl, useAdminResumes, useUpdateResumeStatus } from '@/api/resumes';
import { FilePreview } from '@/components/ui/FilePreview';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeFilter>('VOLUNTEER,INTERNSHIP');
  const track: string = programme ? programmeFilter : ('JOB' satisfies TalentTrack);
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [previewing, setPreviewing] = useState<{ url: string; filename: string } | null>(null);
  const [status, setStatus] = useState<ResumeStatus | 'ALL'>('ALL');

  const { data, isLoading } = useAdminResumes({ page, pageSize: PAGE_SIZE, status, track });
  const update = useUpdateResumeStatus();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {programme ? t.volunteer.adminSubtitle : t.join.adminSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        {programme && (
          <Select
            value={programmeFilter}
            className="w-auto"
            aria-label={t.volunteer.programme}
            onChange={(e) => {
              setProgrammeFilter(e.target.value as ProgrammeFilter);
              setPage(1);
            }}
          >
            <option value="VOLUNTEER,INTERNSHIP">{t.volunteer.bothTracks}</option>
            <option value="INTERNSHIP">{t.volunteer.tracks.INTERNSHIP}</option>
            <option value="VOLUNTEER">{t.volunteer.tracks.VOLUNTEER}</option>
          </Select>
        )}
        <Select
          value={status}
          className="w-auto"
          aria-label={t.admin.status}
          onChange={(e) => {
            setStatus(e.target.value as ResumeStatus | 'ALL');
            setPage(1);
          }}
        >
          <option value="ALL">{t.common.all}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.join.statuses[s]}
            </option>
          ))}
        </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && <EmptyState title={programme ? t.volunteer.adminEmpty : t.join.adminEmpty} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((cv) => (
          <li key={cv.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/resumes/${cv.id}`}
                    className="font-medium text-text-primary hover:underline"
                  >
                    {cv.fullName}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-muted">
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
                  <span className="text-xs text-text-muted">
                    {t.join.matchedRole}: {cv.matchedRole}
                  </span>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
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
