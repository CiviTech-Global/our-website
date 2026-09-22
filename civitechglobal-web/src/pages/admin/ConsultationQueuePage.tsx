import { useState } from 'react';
import { CalendarClock, MessageCircle, Phone, User } from 'lucide-react';
import {
  useConsultationQueue,
  useUpdateConsultation,
  type ConsultationRow,
  type ConsultationStatus,
} from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/i18n/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';

const PAGE_SIZE = 20;
const STATUSES: ConsultationStatus[] = [
  'NEW',
  'CONTACTED',
  'SCHEDULED',
  'COMPLETED',
  'NO_ANSWER',
  'CANCELLED',
];

/** Colour carries the same meaning as everywhere else on the app surface. */
function statusVariant(status: ConsultationStatus) {
  switch (status) {
    case 'NEW':
      return 'warning' as const;
    case 'CONTACTED':
    case 'SCHEDULED':
      return 'info' as const;
    case 'COMPLETED':
      return 'success' as const;
    case 'CANCELLED':
    case 'NO_ANSWER':
      return 'danger' as const;
    default:
      return 'default' as const;
  }
}

/**
 * The consultation queue.
 *
 * Everything needed to pick up the phone is on the card: what they want, where
 * they are now, and — the reason the windows are rows rather than free text —
 * exactly when they said they could talk.
 */
export default function ConsultationQueuePage() {
  const { t } = useLocale();
  useDocumentTitle(t.consult.queueTitle);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'NEW' },
  });

  const { data, isLoading } = useConsultationQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.consult.queueTitle}
        description={t.consult.queueDescription}
        className="mb-2"
      />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.consult.searchQueue}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<ConsultationStatus>
            label={t.consult.filterStatus}
            value={controls.filters.status as ConsultationStatus}
            segments={STATUSES.map((value) => ({ value, label: t.consult.statuses[value] }))}
            onChange={(value) => controls.setFilter('status', value)}
          />
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.consult.queueEmpty}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
          icon={<MessageCircle aria-hidden="true" />}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <RequestCard row={row} />
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <Pagination page={controls.page} totalPages={data.totalPages} onPageChange={controls.setPage} />
      )}
    </div>
  );
}

function RequestCard({ row }: { row: ConsultationRow }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const update = useUpdateConsultation();

  const [status, setStatus] = useState<ConsultationStatus>(row.status);
  const [staffNote, setStaffNote] = useState(row.staffNote ?? '');
  // datetime-local wants a value with no zone; the stored value is UTC.
  const [scheduledAt, setScheduledAt] = useState(
    row.scheduledAt ? new Date(row.scheduledAt).toISOString().slice(0, 16) : '',
  );

  async function save() {
    try {
      await update.mutateAsync({
        id: row.id,
        status,
        staffNote: staffNote.trim() || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      showToast(t.consult.saved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-title-sm font-semibold text-app-text">{row.fullName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-label text-app-text-4">
            <span className="ltr inline-flex items-center gap-1 font-mono">
              <Phone className="size-3" aria-hidden="true" />
              {row.phoneNumber}
            </span>
            {row.email && <span className="ltr">{row.email}</span>}
            <span className="ltr font-mono">{row.trackingCode}</span>
            <span>
              {t.consult.asked}: {formatDate(row.createdAt, locale)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusVariant(row.status)}>{t.consult.statuses[row.status]}</Badge>
          <Badge>{t.consult.modes[row.preferredMode]}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-label text-app-text-4">{t.consult.wants}</p>
          <p className="text-body text-app-text">{t.consult.topics[row.topic]}</p>
          {row.goal && <p className="mt-1 whitespace-pre-line text-body text-app-text-3">{row.goal}</p>}
        </div>

        <div>
          {row.background && (
            <>
              <p className="text-label text-app-text-4">{t.consult.background}</p>
              <p className="text-body text-app-text-3">{row.background}</p>
            </>
          )}
          {row.expert && (
            <p className="mt-2 flex items-center gap-1.5 text-body text-app-text-3">
              <User className="size-3.5" aria-hidden="true" />
              {t.consult.askedFor}: {row.expert.fullName}
            </p>
          )}
          {row.assignedTo && (
            <p className="mt-1 text-label text-app-text-4">
              {t.consult.handledBy}: {row.assignedTo.firstName} {row.assignedTo.lastName}
            </p>
          )}
        </div>
      </div>

      {/* The reason the windows are rows and not free text: this is what
          somebody reads before dialling. */}
      <div className="mt-3">
        <p className="flex items-center gap-1.5 text-label text-app-text-4">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {t.consult.availableAt}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {row.availability.map((window) => (
            <Badge key={`${window.day}-${window.part}`} variant="info">
              {formatDate(window.day, locale)} — {t.consult.parts[window.part]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-app-border-light pt-4 sm:grid-cols-2">
        <FormField label={t.consult.filterStatus} htmlFor={`status-${row.id}`}>
          <Select
            id={`status-${row.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as ConsultationStatus)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t.consult.statuses[value]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t.consult.setSchedule} htmlFor={`when-${row.id}`}>
          <Input
            id={`when-${row.id}`}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </FormField>

        <FormField
          label={t.consult.staffNote}
          htmlFor={`note-${row.id}`}
          hint={t.consult.staffNoteHint}
          className="sm:col-span-2"
        >
          <TextArea
            id={`note-${row.id}`}
            rows={2}
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
          />
        </FormField>
      </div>

      <div className="mt-3">
        <Button size="sm" isLoading={update.isPending} onClick={() => void save()}>
          {t.consult.save}
        </Button>
      </div>
    </Card>
  );
}
