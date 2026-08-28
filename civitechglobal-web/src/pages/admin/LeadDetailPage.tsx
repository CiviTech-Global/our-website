import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useLead, useUpdateLeadStatus } from '@/api/leads';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LEAD_STATUSES, leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import type { LeadStatus } from '@/types/leads';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: lead, isLoading, isError } = useLead(id);
  const updateStatus = useUpdateLeadStatus(id ?? '');
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const BackIcon = locale === 'fa' ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !lead) {
    return <Card className="border-brand-red-500/30 text-sm text-text-secondary">{t.errors.networkError}</Card>;
  }

  const selectedStatus = pendingStatus ?? lead.status;

  async function handleSave() {
    if (!pendingStatus || pendingStatus === lead!.status) return;
    try {
      await updateStatus.mutateAsync(pendingStatus);
      showToast(t.admin.statusUpdated, 'success');
      setPendingStatus(null);
    } catch {
      showToast(t.errors.networkError, 'error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/admin/leads')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <BackIcon className="size-4" aria-hidden="true" />
        {t.common.back}
      </button>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{lead.fullName}</CardTitle>
          <Badge variant={leadStatusBadgeVariant(lead.status)}>{leadStatusLabel(t, lead.status)}</Badge>
        </CardHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.admin.contactInfo}</h3>
            <dl className="space-y-1.5 text-sm">
              <Row label={t.admin.phone} value={<span className="ltr">{lead.phoneNumber}</span>} />
              <Row label={t.admin.city} value={lead.city} />
              <Row label={t.admin.preferredContactTime} value={lead.preferredContactTime ?? '—'} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.admin.telegramInfo}</h3>
            <dl className="space-y-1.5 text-sm">
              <Row label="Telegram ID" value={<span className="ltr">{lead.telegramUserId}</span>} />
              <Row label="Username" value={lead.telegramUsername ? `@${lead.telegramUsername}` : '—'} />
              <Row label={t.admin.createdAt} value={formatDate(lead.createdAt, locale)} />
            </dl>
          </section>

          <section className="sm:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              {lead.category.emoji} {lead.category.title} / {lead.subcategory.title}
            </h3>
          </section>

          {lead.notes && (
            <section className="sm:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.admin.notes}</h3>
              <p className="rounded-lg bg-surface-200/50 p-3 text-sm text-text-secondary">{lead.notes}</p>
            </section>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-border-subtle pt-6">
          <div className="w-56">
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-text-primary">
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
            disabled={!pendingStatus || pendingStatus === lead.status}
          >
            {t.common.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-text-primary">{value}</dd>
    </div>
  );
}
