import { PageHeader } from '@/components/app/PageHeader';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Eye, Mail, Phone } from 'lucide-react';
import { resumeFileUrl, useAdminResume, useUpdateResumeStatus } from '@/api/resumes';
import { FilePreview } from '@/components/ui/FilePreview';
import { useAdminUsers } from '@/api/admin';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { IdentityStandingControl } from '@/components/admin/IdentityStandingControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { ResumeStatus } from '@/types/resume';

const STATUSES: ResumeStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'SHORTLISTED',
  'MATCHED',
  'ON_HOLD',
  'DECLINED',
  'WITHDRAWN',
];

/**
 * One application, in full.
 *
 * The list showed a name, a city and a date. Everything else the intake
 * collects — the applicant's email and phone above all — was returned by the
 * API and reachable from nowhere, which meant staff could read a CV and had no
 * way to contact the person who sent it. That is the one thing the form
 * promises: "we will contact you once you match a position."
 */
export default function ResumeDetailPage() {
  const { id } = useParams();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useAdminResume(id);
  const update = useUpdateResumeStatus();

  useDocumentTitle(data?.fullName ?? t.join.adminTitle);

  // Staff to assign to. Deactivated accounts are filtered by the endpoint.
  const { data: users } = useAdminUsers({ page: 1, limit: 100 });

  const [status, setStatus] = useState<ResumeStatus>('RECEIVED');
  const [matchedRole, setMatchedRole] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // Seeded from the record once it arrives, and re-seeded if it is refetched.
  // Editing state initialised at declaration would be blank on first paint and
  // then silently overwrite whatever is stored on the first save.
  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setMatchedRole(data.matchedRole ?? '');
    setInternalNotes(data.internalNotes ?? '');
    setAssignedToId(data.assignedToId ?? '');
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <p className="text-body text-app-text-3">{t.join.adminNotFound}</p>
        <Link to="/admin/resumes" className="mt-4 inline-block">
          <Button variant="secondary">{t.common.back}</Button>
        </Link>
      </Card>
    );
  }

  async function save() {
    try {
      await update.mutateAsync({
        id: data!.id,
        status,
        matchedRole: matchedRole.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        // Empty select means unassigned, which is an explicit null rather than
        // "leave it alone" — the API distinguishes the two.
        assignedToId: assignedToId || null,
      });
      showToast(t.admin.statusUpdated, 'success');
      refetch();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const isProgramme = data.track !== 'JOB';

  const standing = data.identity.blocked
    ? 'blocked'
    : data.identity.trusted
      ? 'trusted'
      : 'normal';

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <PageHeader
        title={data.fullName}
        className="mb-2"
        titleAdornment={<Badge variant="info">{t.join.statuses[data.status]}</Badge>}
        description={
          <>
            <span className="ltr font-mono">{data.trackingCode}</span>
            {` · ${formatDate(data.createdAt, locale)}`}
          </>
        }
      />

      {/* Who, and how to reach them ---------------------------------------- */}
      <Card>
        {/* Contact first, and as links: the point of this screen is reaching
            the applicant, so it should take one click rather than a copy. */}
        <div className="flex flex-wrap gap-4">
          <a
            href={`mailto:${data.email}`}
            className="inline-flex items-center gap-2 text-body font-medium text-app-primary hover:underline"
          >
            <Mail className="size-4" aria-hidden="true" />
            <span className="ltr">{data.email}</span>
          </a>
          <a
            href={`tel:${data.phone}`}
            className="inline-flex items-center gap-2 text-body font-medium text-app-primary hover:underline"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span className="ltr">{data.phone}</span>
          </a>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t.join.city} value={[data.city, data.province].filter(Boolean).join('، ')} />
          <Field label={t.join.birthYear} value={data.birthYear ? String(data.birthYear) : null} />
          <Field label={t.join.updatedAt} value={formatDate(data.updatedAt, locale)} />
        </dl>

        <div className="mt-5 border-t border-app-border-light pt-4">
          <p className="mb-2 text-label text-app-text-4">{t.identity.title}</p>
          <IdentityStandingControl
            identityId={data.identity.id}
            standing={standing}
            requestCount={data.identity.requestCount}
          />
        </div>
      </Card>

      {/* The placement they asked for -------------------------------------- */}
      {isProgramme && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-body font-semibold text-app-text">{t.volunteer.sectionPlacement}</h2>
            <Badge variant="success">{t.volunteer.tracks[data.track]}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label={t.volunteer.discipline}
              value={data.discipline ? t.volunteer.disciplines[data.discipline] : null}
            />
            <Field
              label={t.volunteer.hoursPerWeek}
              value={data.hoursPerWeek ? String(data.hoursPerWeek) : null}
            />
            <Field
              label={t.volunteer.availableFrom}
              value={data.availableFrom ? formatDate(data.availableFrom, locale) : null}
            />
            <Field
              label={t.volunteer.durationMonths}
              value={data.durationMonths ? `${data.durationMonths} ${t.volunteer.monthsUnit}` : null}
            />
            <Field
              label={t.volunteer.arrangement}
              value={data.arrangement ? t.volunteer.arrangements[data.arrangement] : t.volunteer.noPreference}
            />
            <Field label={t.volunteer.university} value={data.university} />
            <Field label={t.volunteer.fieldOfStudy} value={data.fieldOfStudy} />
          </dl>

          {data.skills.length > 0 && (
            <div className="mt-4">
              <p className="text-label text-app-text-4">{t.volunteer.skills}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <li key={skill} className="rounded-md border border-app-border-light px-2 py-0.5 text-label text-app-text">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.githubUrl || data.portfolioUrl || data.linkedinUrl) && (
            <div className="mt-4">
              <p className="text-label text-app-text-4">{t.volunteer.links}</p>
              <div className="mt-1 flex flex-wrap gap-4">
                {(
                  [
                    [data.githubUrl, t.volunteer.githubUrl],
                    [data.portfolioUrl, t.volunteer.portfolioUrl],
                    [data.linkedinUrl, t.volunteer.linkedinUrl],
                  ] as const
                )
                  .filter(([href]) => href)
                  .map(([href, label]) => (
                    <a
                      key={label}
                      href={href!}
                      target="_blank"
                      // Applicant-supplied links: never hand them the opener
                      // or the admin URL they were clicked from.
                      rel="noopener noreferrer"
                      className="text-body font-medium text-app-primary hover:underline"
                    >
                      {label}
                    </a>
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* The CV and anything they wrote ------------------------------------ */}
      <Card>
        <h2 className="mb-4 text-body font-semibold text-app-text">{t.join.sectionResume}</h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="size-4" />
            {t.common.file.preview}
          </Button>
          <span className="ltr text-label text-app-text-4">
            {data.resumeOriginalName} · {(data.resumeSizeBytes / 1024).toFixed(0)} kB
          </span>
        </div>

        {data.coverNote && (
          <div className="mt-5">
            <p className="text-label text-app-text-4">{t.join.coverNote}</p>
            <p className="mt-1 whitespace-pre-wrap text-body text-app-text">{data.coverNote}</p>
          </div>
        )}
      </Card>

      {/* Handling ---------------------------------------------------------- */}
      <Card>
        <h2 className="mb-4 text-body font-semibold text-app-text">{t.join.adminHandling}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.admin.status} htmlFor="resume-status">
            <Select
              id="resume-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ResumeStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t.join.statuses[value]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t.join.assignedTo} htmlFor="resume-assignee">
            <Select
              id="resume-assignee"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">{t.join.unassigned}</option>
              {users?.items.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          label={t.join.matchedRole}
          htmlFor="resume-role"
          hint={t.join.matchedRoleHint}
          className="mt-4"
        >
          <Input
            id="resume-role"
            value={matchedRole}
            onChange={(e) => setMatchedRole(e.target.value)}
          />
        </FormField>

        <FormField
          label={t.join.internalNotes}
          htmlFor="resume-notes"
          hint={t.join.internalNotesHint}
          className="mt-4"
        >
          <TextArea
            id="resume-notes"
            rows={5}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </FormField>

        <Button
          type="button"
          onClick={save}
          isLoading={update.isPending}
          className="mt-4 w-fit"
        >
          {t.common.save}
        </Button>
      </Card>

      {isPreviewOpen && (
        <FilePreview
          url={resumeFileUrl(data.id)}
          filename={`${data.fullName}-${data.trackingCode}`}
          title={data.resumeOriginalName}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-label text-app-text-4">{label}</dt>
      <dd className="mt-1 text-body text-app-text">{value || '—'}</dd>
    </div>
  );
}
