import { PageHeader } from '@/components/app/PageHeader';
import { useState } from 'react';
import type { Locale } from '@/i18n/locales';
import { useParams } from 'react-router';
import { AlertTriangle, Globe, Send } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import {
  useAssignRequest,
  useRequest,
  useScheduleCallback,
  useUpdateRequestStatus,
} from '@/api/requests';
import { useAdminUsers } from '@/api/admin';
import { apiMessage } from '@/lib/apiMessage';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LEAD_STATUSES, leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import { describeRequestCategory, describeRequestSubject, requestCategoryEmoji } from '@/lib/requestSubject';
import type { LeadStatus } from '@/types/requests';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data: detail, isLoading, isError } = useRequest(id);
  const updateStatus = useUpdateRequestStatus(id ?? '');
  const assign = useAssignRequest(id ?? '');
  const scheduleCallback = useScheduleCallback(id ?? '');
  const { data: users } = useAdminUsers(1, 100);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !detail) {
    return <Card className="border-status-error-border text-body text-app-text-3">{t.errors.networkError}</Card>;
  }

  const { request, answers, formChangedSinceSubmission } = detail;
  const selectedStatus = pendingStatus ?? request.status;
  const categoryLabel = describeRequestCategory(request, locale);
  const emoji = requestCategoryEmoji(request);

  async function handleSave() {
    if (!pendingStatus || pendingStatus === request.status) return;
    try {
      await updateStatus.mutateAsync(pendingStatus);
      showToast(t.admin.statusUpdated, 'success');
      setPendingStatus(null);
    } catch {
      showToast(t.errors.networkError, 'error');
    }
  }

  async function handleAssign(assignedToId: string | null) {
    try {
      await assign.mutateAsync(assignedToId);
      showToast(t.admin.assignUpdated, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.errors.networkError), 'error');
    }
  }

  async function handleCallback(value: string) {
    try {
      // The input is local time; the API takes an instant. Clearing the field
      // cancels the callback rather than scheduling one at the epoch.
      await scheduleCallback.mutateAsync(value ? new Date(value).toISOString() : null);
      showToast(value ? t.admin.callbackUpdated : t.admin.callbackCleared, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.errors.networkError), 'error');
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={request.fullName}
        titleAdornment={
          <>
            <Badge variant={leadStatusBadgeVariant(request.status)}>{leadStatusLabel(t, request.status)}</Badge>
            <Badge variant="default">
              {request.source === 'WEB' ? <Globe aria-hidden="true" /> : <Send aria-hidden="true" />}
              {request.source === 'WEB' ? t.admin.sourceWeb : t.admin.sourceTelegram}
            </Badge>
          </>
        }
        description={<span className="ltr font-mono">{request.trackingCode}</span>}
      />

      <Card>
        <div className="mb-6 rounded border border-app-border-light bg-app-subtle p-4">
          <p className="text-label text-app-text-4">{categoryLabel ?? t.admin.category}</p>
          <p className="mt-0.5 text-body-lg font-semibold text-app-text">
            {emoji && <span aria-hidden="true">{emoji} </span>}
            {describeRequestSubject(request, locale)}
          </p>
          <p className="ltr mt-2 font-mono text-label tracking-widest text-app-text-4">
            {request.trackingCode}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-body font-semibold text-app-text">{t.admin.contactInfo}</h3>
            <dl className="space-y-1.5 text-body">
              <Row
                label={t.admin.phone}
                value={
                  <span className="ltr inline-flex items-center gap-1.5">
                    {request.phoneNumber}
                    {request.phoneVerified && (
                      <span className="text-app-primary" title={t.admin.phoneVerified}>
                        ✓
                      </span>
                    )}
                  </span>
                }
              />
              {request.email && <Row label={t.admin.email} value={<span className="ltr">{request.email}</span>} />}
              {request.organizationName && (
                <Row label={t.admin.organization} value={request.organizationName} />
              )}
              <Row label={t.admin.city} value={request.city} />
              <Row label={t.admin.preferredContactTime} value={contactTimeLabel(request.preferredContactTime, locale)} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-body font-semibold text-app-text">
              {request.source === 'TELEGRAM' ? t.admin.telegramInfo : t.admin.submissionInfo}
            </h3>
            <dl className="space-y-1.5 text-body">
              {request.source === 'TELEGRAM' ? (
                <>
                  <Row label="Telegram ID" value={<span className="ltr">{request.telegramUserId ?? '—'}</span>} />
                  <Row
                    label="Username"
                    value={request.telegramUsername ? `@${request.telegramUsername}` : '—'}
                  />
                </>
              ) : (
                <Row label={t.admin.phoneVerified} value={request.phoneVerified ? t.common.yes : t.common.no} />
              )}
              <Row label={t.admin.createdAt} value={formatDate(request.createdAt, locale)} />
              {request.callbackScheduledAt && (
                <Row
                  label={t.admin.callbackScheduled}
                  value={formatDate(request.callbackScheduledAt, locale)}
                />
              )}
            </dl>
          </section>

          {/* The per-product answers. Bot and pre-refactor rows have none —
              those enquiries were only ever a request for a call. */}
          {answers.length > 0 && (
            <section className="sm:col-span-2">
              <h3 className="mb-2 text-body font-semibold text-app-text">{t.admin.formAnswers}</h3>

              {formChangedSinceSubmission && (
                <p className="mb-3 flex items-start gap-2 rounded border border-status-warning-border bg-status-warning-bg p-3 text-label text-app-text-3">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden="true" />
                  {t.admin.formChangedNotice}
                </p>
              )}

              <dl className="divide-y divide-app-border-light rounded border border-app-border-light">
                {answers.map((answer) => (
                  <div key={answer.name} className="flex flex-wrap justify-between gap-4 p-3 text-body">
                    <dt className="text-app-text-4">
                      {locale === 'fa' ? answer.label : answer.labelEn}
                      {answer.orphaned && (
                        <span className="ms-1 text-label text-status-warning" title={t.admin.orphanedAnswer}>
                          ⚠
                        </span>
                      )}
                    </dt>
                    <dd className="font-medium text-app-text">
                      {locale === 'fa' ? answer.display : answer.displayEn}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {request.notes && (
            <section className="sm:col-span-2">
              <h3 className="mb-2 text-body font-semibold text-app-text">{t.admin.notes}</h3>
              <p className="whitespace-pre-wrap rounded bg-app-subtle p-3 text-body text-app-text-3">
                {request.notes}
              </p>
            </section>
          )}
        </div>

        {/* Assignment and the callback time.
            Both endpoints and both hooks existed and nothing called them, so
            every enquiry stayed unassigned — which also made the per-user
            scoping on the list a no-op, since it shows a non-super-admin what
            is theirs OR unassigned. */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-app-border-light pt-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="assignee"
              className="mb-1.5 block text-body font-medium text-app-text"
            >
              {t.admin.assignedTo}
            </label>
            <Select
              id="assignee"
              value={request.assignedToId ?? ''}
              disabled={assign.isPending}
              onChange={(e) => handleAssign(e.target.value || null)}
            >
              <option value="">{t.admin.unassigned}</option>
              {users?.items.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label
              htmlFor="callback"
              className="mb-1.5 block text-body font-medium text-app-text"
            >
              {t.admin.callbackScheduled}
            </label>
            <Input
              id="callback"
              type="datetime-local"
              className="ltr text-start"
              disabled={scheduleCallback.isPending}
              defaultValue={toLocalInput(request.callbackScheduledAt)}
              onChange={(e) => handleCallback(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label htmlFor="status" className="mb-1.5 block text-body font-medium text-app-text">
              {t.admin.updateStatus}
            </label>
            <Select
              id="status"
              value={selectedStatus}
              onChange={(e) => setPendingStatus(e.target.value as LeadStatus)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {leadStatusLabel(t, s)}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={handleSave}
            isLoading={updateStatus.isPending}
            disabled={!pendingStatus || pendingStatus === request.status}
          >
            {t.common.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * An instant to what <input type="datetime-local"> wants.
 *
 * That control has no timezone: it reads and writes local wall-clock time, so
 * the ISO string has to be shifted by the offset before slicing, or the value
 * shown is the UTC one and every callback is booked hours out.
 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  return new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Bot and web rows both store the option code; render the human label. */
function contactTimeLabel(value: string | null | undefined, locale: Locale): string {
  const labels: Record<string, { fa: string; en: string }> = {
    morning: { fa: 'صبح (۹ تا ۱۲)', en: 'Morning (9–12)' },
    noon: { fa: 'ظهر (۱۲ تا ۱۶)', en: 'Midday (12–16)' },
    evening: { fa: 'عصر (۱۶ تا ۲۰)', en: 'Evening (16–20)' },
    any: { fa: 'فرقی ندارد', en: 'Any time' },
  };
  if (!value) return '—';
  // Pre-refactor rows stored the Persian word itself; show it as it was saved.
  //
  // These four are hard-coded rather than dictionary keys, so there is nothing
  // to translate into the newer languages; they fall to English, which is what
  // an admin reading a request in German would otherwise get anyway.
  return labels[value]?.[locale === 'fa' ? 'fa' : 'en'] ?? value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-app-text-4">{label}</dt>
      <dd className="font-medium text-app-text">{value}</dd>
    </div>
  );
}
