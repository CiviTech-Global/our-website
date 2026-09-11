import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, Download, Mail, Phone } from 'lucide-react';
import { downloadResume, useAdminResume, useUpdateResumeStatus } from '@/api/resumes';
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
  const { data, isLoading, isError, refetch } = useAdminResume(id);
  const update = useUpdateResumeStatus();

  useDocumentTitle(data?.fullName ?? t.join.adminTitle);

  // Staff to assign to. Deactivated accounts are filtered by the endpoint.
  const { data: users } = useAdminUsers(1, 100);

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
        <p className="text-sm text-text-secondary">{t.join.adminNotFound}</p>
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

  const standing = data.identity.blocked
    ? 'blocked'
    : data.identity.trusted
      ? 'trusted'
      : 'normal';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        to="/admin/resumes"
        className="inline-flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.join.adminTitle}
      </Link>

      {/* Who, and how to reach them ---------------------------------------- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text-primary">{data.fullName}</h1>
            <p className="mt-1 text-xs text-text-muted">
              <span className="ltr font-mono">{data.trackingCode}</span>
              {` · ${formatDate(data.createdAt, locale)}`}
            </p>
          </div>
          <Badge variant="info">{t.join.statuses[data.status]}</Badge>
        </div>

        {/* Contact first, and as links: the point of this screen is reaching
            the applicant, so it should take one click rather than a copy. */}
        <div className="mt-5 flex flex-wrap gap-4">
          <a
            href={`mailto:${data.email}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
          >
            <Mail className="size-4" aria-hidden="true" />
            <span className="ltr">{data.email}</span>
          </a>
          <a
            href={`tel:${data.phone}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
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

        <div className="mt-5 border-t border-border-subtle pt-4">
          <p className="mb-2 text-xs text-text-muted">{t.identity.title}</p>
          <IdentityStandingControl
            identityId={data.identity.id}
            standing={standing}
            requestCount={data.identity.requestCount}
          />
        </div>
      </Card>

      {/* The CV and anything they wrote ------------------------------------ */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-text-primary">{t.join.sectionResume}</h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                await downloadResume(data.id, `${data.fullName}-${data.trackingCode}`);
              } catch (error) {
                showToast(apiMessage(error, t.join.downloadFailed), 'error');
              }
            }}
          >
            <Download className="size-4" />
            {t.join.download}
          </Button>
          <span className="ltr text-xs text-text-muted">
            {data.resumeOriginalName} · {(data.resumeSizeBytes / 1024).toFixed(0)} kB
          </span>
        </div>

        {data.coverNote && (
          <div className="mt-5">
            <p className="text-xs text-text-muted">{t.join.coverNote}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{data.coverNote}</p>
          </div>
        )}
      </Card>

      {/* Handling ---------------------------------------------------------- */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-text-primary">{t.join.adminHandling}</h2>

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
              {users?.data.map((member) => (
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary">{value || '—'}</dd>
    </div>
  );
}
