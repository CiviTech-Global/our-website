import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useTrackRequest, useTrackedRequests, useUntrackRequest, type TrackedRequest } from '@/api/workspace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import { projectStatusBadgeVariant, projectStatusLabel } from '@/lib/projectStatus';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type fa from '@/i18n/fa';
import type { LeadStatus } from '@/types/requests';

/** A request's kind and state in the reader's words, using the tracking page's own labels. */
function describe(t: typeof fa, state: NonNullable<TrackedRequest['state']>): { kind: string; status: string; variant: BadgeVariant } {
  const status = String(state.status ?? '');
  switch (state.kind) {
    case 'insurance':
      return {
        kind: t.workspace.kindInsurance,
        status: leadStatusLabel(t, status as LeadStatus),
        variant: leadStatusBadgeVariant(status as LeadStatus),
      };
    case 'project':
      return {
        kind: t.workspace.kindProject,
        status: projectStatusLabel(t, status as never),
        variant: projectStatusBadgeVariant(status as never),
      };
    case 'resume':
      return {
        kind: t.workspace.kindResume,
        status: t.join.statuses[status as keyof typeof t.join.statuses] ?? status,
        variant: 'info',
      };
    default:
      return {
        kind: t.workspace.kindConsultation,
        status: t.consult.statuses[status as keyof typeof t.consult.statuses] ?? status,
        variant: status === 'CANCELLED' ? 'danger' : status === 'COMPLETED' ? 'success' : 'info',
      };
  }
}

/**
 * The requests a member made through the account-less intakes — insurance,
 * projects, consultations, CVs — kept by tracking code, each with where it
 * stands now. The full detail stays on the tracking page, one click away.
 */
export default function MyRequestsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.workspace.requestsTitle);
  const { showToast } = useToast();
  const { data, isLoading } = useTrackedRequests();
  const track = useTrackRequest();
  const untrack = useUntrackRequest();
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await track.mutateAsync({ code: code.trim(), label: label.trim() || undefined });
      setCode('');
      setLabel('');
      showToast(t.workspace.added, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.workspace.requestsTitle} description={t.workspace.requestsIntro} className="mb-2" />

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={add}>
          <FormField label={t.workspace.codeLabel} htmlFor="track-code" className="sm:w-56">
            <Input
              id="track-code"
              required
              minLength={6}
              maxLength={20}
              className="ltr font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </FormField>
          <FormField label={t.workspace.labelOptional} htmlFor="track-label" className="flex-1">
            <Input id="track-label" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
          </FormField>
          <Button type="submit" isLoading={track.isPending}>
            <Plus className="size-4" aria-hidden="true" />
            {t.workspace.add}
          </Button>
        </form>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.workspace.noRequests} />}

      <ul className="flex flex-col gap-3">
        {data?.map((row) => {
          const info = row.state ? describe(t, row.state) : null;
          return (
            <li key={row.code}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-app-text">{row.label ?? info?.kind ?? row.code}</p>
                    <p className="mt-0.5 text-label text-app-text-4">
                      {info && row.label && `${info.kind} · `}
                      <span className="ltr font-mono">{row.code}</span> · {formatDate(row.createdAt, locale)}
                    </p>
                  </div>
                  {info ? (
                    <Badge variant={info.variant}>{info.status}</Badge>
                  ) : (
                    <Badge>{t.workspace.notFoundState}</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/track?code=${encodeURIComponent(row.code)}`}>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="size-4" aria-hidden="true" />
                      {t.workspace.openDetails}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      untrack.mutate(row.code, {
                        onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t.workspace.remove}
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
