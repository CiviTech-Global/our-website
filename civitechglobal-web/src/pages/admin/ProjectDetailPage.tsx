import { useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { Link, useParams } from 'react-router';
import { ChevronLeft, Eye, FileText, Paperclip, Send, ShieldAlert } from 'lucide-react';
import {
  projectAttachmentUrl,
  useAdminProject,
  useCreateProposal,
  useSendProposal,
  useUpdateProjectStatus,
  useUpdateProposal,
} from '@/api/projects';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { IdentityStandingControl } from '@/components/admin/IdentityStandingControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilePreview } from '@/components/ui/FilePreview';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { formatThousands } from '@/lib/persian';
import { PROJECT_STATUSES, projectStatusBadgeVariant, projectStatusLabel } from '@/lib/projectStatus';
import type { AdminProposal, EngagementModel, ProjectRequestStatus, ProposalPayload } from '@/types/project';

const ENGAGEMENTS: EngagementModel[] = [
  'FIXED_PRICE',
  'TIME_AND_MATERIALS',
  'RETAINER',
  'NOT_SURE',
];

/** Newline-separated textarea <-> string[], which is how these lists are written. */
const toLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data, isLoading, refetch } = useAdminProject(id);

  const updateStatus = useUpdateProjectStatus(id ?? '');
  const createProposal = useCreateProposal(id ?? '');
  const updateProposal = useUpdateProposal();
  const sendProposal = useSendProposal();

  const [composerOpen, setComposerOpen] = useState(false);
  const [previewing, setPreviewing] = useState<{ url: string; filename: string } | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }
  if (!data) return <p className="text-app-text-4">{t.common.error}</p>;

  const money = (value: string | null) =>
    value ? `${formatThousands(value)} ${t.project.currency}` : '—';

  const draft = data.proposals.find((p) => p.status === 'DRAFT') ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/admin/projects"
        className="inline-flex w-fit items-center gap-1 text-body text-app-text-3 hover:text-app-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.proposal.adminTitle}
      </Link>

      {/* Header ---------------------------------------------------------- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-title font-semibold text-app-text">{data.title}</h1>
            <p className="mt-1 text-body text-app-text-4">
              <span className="ltr font-mono">{data.trackingCode}</span>
              {' · '}
              {formatDate(data.createdAt, locale)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data.ndaRequired && (
              <Badge variant="warning">
                <ShieldAlert className="me-1 inline size-3.5" aria-hidden="true" />
                {t.proposal.ndaRequested}
              </Badge>
            )}
            <Badge variant={projectStatusBadgeVariant(data.status)}>
              {projectStatusLabel(t, data.status)}
            </Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <FormField label={t.admin.status} htmlFor="status" className="w-52">
            <Select
              id="status"
              value={data.status}
              onChange={async (e) => {
                await updateStatus.mutateAsync({
                  status: e.target.value as ProjectRequestStatus,
                });
                showToast(t.admin.statusUpdated, 'success');
                refetch();
              }}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {projectStatusLabel(t, s)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      {/* Contact and identity -------------------------------------------- */}
      <Card>
        <h2 className="mb-4 text-body font-semibold text-app-text">{t.project.sectionYou}</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t.project.contactName} value={data.contactName} />
          <Field label={t.project.contactRole} value={data.contactRole} />
          <Field label={t.project.organization} value={data.organizationName} />
          <Field label={t.project.email} value={data.email} ltr />
          <Field label={t.project.phone} value={data.phone} ltr />
          <Field label={t.project.website} value={data.website} ltr />
        </dl>

        {/* How many briefs this (email, phone) pair has filed. A first-time
            enquiry and a tenth one deserve different reading. */}
        <div className="mt-4 border-t border-app-border-light pt-4">
          <p className="mb-2 text-label text-app-text-4">
            {t.proposal.identitySeen
              .replace('{n}', String(data.identity.requestCount))
              .replace('{date}', formatDate(data.identity.createdAt, locale))}
          </p>
          <IdentityStandingControl
            identityId={data.identity.id}
            standing={
              data.identity.blocked ? 'blocked' : data.identity.trusted ? 'trusted' : 'normal'
            }
          />
        </div>
      </Card>

      {/* The brief -------------------------------------------------------- */}
      <Card>
        <h2 className="mb-4 text-body font-semibold text-app-text">{t.proposal.theBrief}</h2>
        <Block label={t.project.summary} value={data.summary} />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Block label={t.project.goals} value={data.goals} />
          <Block label={t.project.targetUsers} value={data.targetUsers} />
          <Block label={t.project.existingSystems} value={data.existingSystems} />
          <Block label={t.project.constraints} value={data.constraints} />
          <Block label={t.project.outOfScope} value={data.outOfScope} />
          <Block label={t.project.clientNotes} value={data.clientNotes} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-app-border-light pt-4 sm:grid-cols-4">
          <Field label={t.project.projectType} value={t.project.types[data.projectType]} />
          <Field label={t.project.urgency} value={t.project.urgencies[data.urgency]} />
          <Field label={t.project.engagement} value={t.project.engagements[data.engagementModel]} />
          <Field
            label={t.project.platforms}
            value={data.platforms.map((p) => t.project.platformNames[p]).join('، ') || null}
          />
          <Field
            label={t.project.desiredStart}
            value={data.desiredStartAt ? formatDate(data.desiredStartAt, locale) : null}
          />
          <Field
            label={t.project.deadline}
            value={data.deadlineAt ? formatDate(data.deadlineAt, locale) : null}
          />
          <Field
            label={t.project.sectionBudget}
            value={
              data.budgetUnknown
                ? t.proposal.budgetUnknown
                : `${money(data.budgetMin)} – ${money(data.budgetMax)}`
            }
          />
          <Field label={t.project.suggestedPrice} value={money(data.suggestedPrice)} />
        </dl>
      </Card>

      {/* Attachments ------------------------------------------------------ */}
      {data.attachments.length > 0 && (
        <Card>
          <h2 className="mb-3 text-body font-semibold text-app-text">
            {t.project.sectionFiles} ({data.attachments.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {data.attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded border border-app-border-light p-2.5 text-body"
              >
                <Paperclip className="size-4 shrink-0 text-app-text-4" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-app-text">
                  {file.originalName}
                </span>
                <span className="shrink-0 text-label text-app-text-4">
                  {(file.sizeBytes / 1024).toFixed(0)} KB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t.common.file.preview}
                  onClick={() =>
                    setPreviewing({
                      url: projectAttachmentUrl(file.id),
                      filename: file.originalName,
                    })
                  }
                >
                  <Eye className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-label text-app-text-4">{t.proposal.attachmentWarning}</p>

          {previewing && (
            <FilePreview
              url={previewing.url}
              filename={previewing.filename}
              onClose={() => setPreviewing(null)}
            />
          )}
        </Card>
      )}

      {/* Proposals -------------------------------------------------------- */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-body font-semibold text-app-text">{t.proposal.proposals}</h2>
          {!composerOpen && (
            <Button type="button" onClick={() => setComposerOpen(true)}>
              {draft ? t.proposal.editDraft : t.proposal.newProposal}
            </Button>
          )}
        </div>

        {data.proposals.length === 0 && !composerOpen && (
          <p className="text-body text-app-text-4">{t.proposal.noneYet}</p>
        )}

        <ul className="flex flex-col gap-3">
          {data.proposals.map((proposal) => (
            <li
              key={proposal.id}
              className="flex flex-wrap items-center gap-3 rounded border border-app-border-light p-3"
            >
              <span className="text-body font-medium text-app-text">v{proposal.version}</span>
              <Badge variant={proposal.status === 'SENT' ? 'info' : 'default'}>
                {t.proposal.proposalStatuses[proposal.status]}
              </Badge>
              <span className="text-body text-app-text-3">{money(proposal.priceLikely)}</span>
              {proposal.pertHours !== null && (
                <span className="text-label text-app-text-4">
                  {proposal.pertHours} {t.proposal.hours}
                </span>
              )}
              <span className="flex-1" />
              {/* Opens in a new tab: printing replaces what is on screen, and
                  losing an unsaved composer to a print preview would be its own
                  small disaster. */}
              <a
                href={`/proposal/preview/${proposal.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button type="button" variant="secondary">
                  <FileText className="size-4" />
                  {t.proposal.previewDocument}
                </Button>
              </a>
              {proposal.status === 'DRAFT' && (
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await sendProposal.mutateAsync(proposal.id);
                      showToast(t.proposal.sent, 'success');
                      refetch();
                    } catch (err) {
                      showToast(apiMessage(err, t.common.error), 'error');
                    }
                  }}
                  isLoading={sendProposal.isPending}
                >
                  <Send className="size-4" />
                  {t.proposal.send}
                </Button>
              )}
            </li>
          ))}
        </ul>

        {composerOpen && (
          <ProposalComposer
            existing={draft}
            onCancel={() => setComposerOpen(false)}
            onSubmit={async (payload) => {
              try {
                if (draft) {
                  await updateProposal.mutateAsync({ proposalId: draft.id, payload });
                } else {
                  await createProposal.mutateAsync(payload);
                }
                showToast(t.proposal.saved, 'success');
                setComposerOpen(false);
                refetch();
              } catch (err) {
                throw new Error(apiMessage(err, t.common.error));
              }
            }}
          />
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-label text-app-text-4">{label}</dt>
      <dd className={`mt-0.5 text-body text-app-text ${ltr ? 'ltr text-start' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label text-app-text-4">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-body leading-6 text-app-text-3">{value}</p>
    </div>
  );
}

/**
 * The proposal composer.
 *
 * Three deliberate frictions, each matching a rule the server enforces:
 * exclusions cannot be left empty, the three effort points are entered
 * together, and the PERT figure is shown live so whoever is writing the
 * proposal sees what the client will see.
 */
function ProposalComposer({
  existing,
  onCancel,
  onSubmit,
}: {
  existing: AdminProposal | null;
  onCancel: () => void;
  onSubmit: (payload: ProposalPayload) => Promise<void>;
}) {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    scopeSummary: existing?.scopeSummary ?? '',
    deliverables: (existing?.deliverables ?? []).join('\n'),
    assumptions: (existing?.assumptions ?? []).join('\n'),
    exclusions: (existing?.exclusions ?? []).join('\n'),
    engagementModel: existing?.engagementModel ?? ('FIXED_PRICE' as EngagementModel),
    optimisticHours: existing?.optimisticHours?.toString() ?? '',
    likelyHours: existing?.likelyHours?.toString() ?? '',
    pessimisticHours: existing?.pessimisticHours?.toString() ?? '',
    priceMin: existing?.priceMin ?? '',
    priceLikely: existing?.priceLikely ?? '',
    priceMax: existing?.priceMax ?? '',
    hourlyRate: existing?.hourlyRate ?? '',
    discoveryRequired: existing?.discoveryRequired ?? false,
    discoveryPrice: existing?.discoveryPrice ?? '',
    discoveryDays: existing?.discoveryDays?.toString() ?? '',
    timelineWeeksMin: existing?.timelineWeeksMin?.toString() ?? '',
    timelineWeeksMax: existing?.timelineWeeksMax?.toString() ?? '',
    message: existing?.message ?? '',
    internalNotes: existing?.internalNotes ?? '',
    validUntil: existing?.validUntil?.slice(0, 10) ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const num = (value: string) => (value.trim() === '' ? undefined : Number(value));
  const cash = (value: string) => (value.trim() === '' ? undefined : value.replace(/\D/g, ''));

  // Shown live: the number the client will read, and the range it came from.
  const o = num(form.optimisticHours);
  const m = num(form.likelyHours);
  const p = num(form.pessimisticHours);
  const pert =
    o !== undefined && m !== undefined && p !== undefined
      ? Math.round((o + 4 * m + p) / 6)
      : null;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        scopeSummary: form.scopeSummary.trim(),
        deliverables: toLines(form.deliverables),
        assumptions: toLines(form.assumptions),
        exclusions: toLines(form.exclusions),
        engagementModel: form.engagementModel,
        optimisticHours: o,
        likelyHours: m,
        pessimisticHours: p,
        priceMin: cash(form.priceMin),
        priceLikely: cash(form.priceLikely),
        priceMax: cash(form.priceMax),
        hourlyRate: cash(form.hourlyRate),
        discoveryRequired: form.discoveryRequired,
        discoveryPrice: form.discoveryRequired ? cash(form.discoveryPrice) : undefined,
        discoveryDays: form.discoveryRequired ? num(form.discoveryDays) : undefined,
        timelineWeeksMin: num(form.timelineWeeksMin),
        timelineWeeksMax: num(form.timelineWeeksMax),
        message: form.message.trim() || undefined,
        internalNotes: form.internalNotes.trim() || undefined,
        validUntil: form.validUntil || undefined,
        currency: 'IRT',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-app-border-light pt-5">
      <FormField label={t.proposal.scope} htmlFor="scopeSummary" hint={t.proposal.scopeHint}>
        <TextArea
          id="scopeSummary"
          rows={4}
          value={form.scopeSummary}
          onChange={(e) => set('scopeSummary', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label={t.proposal.deliverables} htmlFor="deliverables" hint={t.proposal.onePerLine}>
          <TextArea
            id="deliverables"
            rows={5}
            value={form.deliverables}
            onChange={(e) => set('deliverables', e.target.value)}
          />
        </FormField>
        <FormField label={t.proposal.assumptions} htmlFor="assumptions" hint={t.proposal.onePerLine}>
          <TextArea
            id="assumptions"
            rows={5}
            value={form.assumptions}
            onChange={(e) => set('assumptions', e.target.value)}
          />
        </FormField>
        {/* Required by the server, and the reason is on the label rather than
            hidden in an error message. */}
        <FormField
          label={t.proposal.exclusions}
          htmlFor="exclusions"
          hint={t.proposal.exclusionsRequired}
        >
          <TextArea
            id="exclusions"
            rows={5}
            value={form.exclusions}
            onChange={(e) => set('exclusions', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <FormField label={t.proposal.optimistic} htmlFor="optimisticHours">
          <Input
            id="optimisticHours"
            inputMode="numeric"
            value={form.optimisticHours}
            onChange={(e) => set('optimisticHours', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.likely} htmlFor="likelyHours">
          <Input
            id="likelyHours"
            inputMode="numeric"
            value={form.likelyHours}
            onChange={(e) => set('likelyHours', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.pessimistic} htmlFor="pessimisticHours">
          <Input
            id="pessimisticHours"
            inputMode="numeric"
            value={form.pessimisticHours}
            onChange={(e) => set('pessimisticHours', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <div className="flex flex-col justify-end">
          <p className="text-label text-app-text-4">{t.proposal.pert}</p>
          <p className="text-title-sm font-semibold text-app-text">
            {pert ?? '—'} <span className="text-label font-normal">{t.proposal.hours}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <FormField label={t.proposal.priceMin} htmlFor="priceMin">
          <Input
            id="priceMin"
            inputMode="numeric"
            className="ltr text-start"
            value={formatThousands(form.priceMin)}
            onChange={(e) => set('priceMin', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.priceLikely} htmlFor="priceLikely">
          <Input
            id="priceLikely"
            inputMode="numeric"
            className="ltr text-start"
            value={formatThousands(form.priceLikely)}
            onChange={(e) => set('priceLikely', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.priceMax} htmlFor="priceMax">
          <Input
            id="priceMax"
            inputMode="numeric"
            className="ltr text-start"
            value={formatThousands(form.priceMax)}
            onChange={(e) => set('priceMax', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.project.engagement} htmlFor="engagementModel">
          <Select
            id="engagementModel"
            value={form.engagementModel}
            onChange={(e) => set('engagementModel', e.target.value as EngagementModel)}
          >
            {ENGAGEMENTS.map((model) => (
              <option key={model} value={model}>
                {t.project.engagements[model]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {form.engagementModel === 'TIME_AND_MATERIALS' && (
        <FormField label={t.proposal.hourlyRate} htmlFor="hourlyRate" hint={t.proposal.hourlyRateHint}>
          <Input
            id="hourlyRate"
            inputMode="numeric"
            className="ltr text-start"
            value={formatThousands(form.hourlyRate)}
            onChange={(e) => set('hourlyRate', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
      )}

      <label className="flex items-center gap-2 text-body text-app-text-3">
        <input
          type="checkbox"
          checked={form.discoveryRequired}
          onChange={(e) => set('discoveryRequired', e.target.checked)}
          className="size-4 accent-[var(--color-app-primary)]"
        />
        {t.proposal.discoveryRequired}
      </label>

      {form.discoveryRequired && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.proposal.discoveryPrice} htmlFor="discoveryPrice">
            <Input
              id="discoveryPrice"
              inputMode="numeric"
              className="ltr text-start"
              value={formatThousands(form.discoveryPrice)}
              onChange={(e) => set('discoveryPrice', e.target.value.replace(/\D/g, ''))}
            />
          </FormField>
          <FormField label={t.proposal.discoveryDays} htmlFor="discoveryDays">
            <Input
              id="discoveryDays"
              inputMode="numeric"
              value={form.discoveryDays}
              onChange={(e) => set('discoveryDays', e.target.value.replace(/\D/g, ''))}
            />
          </FormField>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label={t.proposal.weeksMin} htmlFor="timelineWeeksMin">
          <Input
            id="timelineWeeksMin"
            inputMode="numeric"
            value={form.timelineWeeksMin}
            onChange={(e) => set('timelineWeeksMin', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.weeksMax} htmlFor="timelineWeeksMax">
          <Input
            id="timelineWeeksMax"
            inputMode="numeric"
            value={form.timelineWeeksMax}
            onChange={(e) => set('timelineWeeksMax', e.target.value.replace(/\D/g, ''))}
          />
        </FormField>
        <FormField label={t.proposal.validUntil} htmlFor="validUntil" hint={t.proposal.validUntilHint}>
          <DateField
            id="validUntil"
            value={form.validUntil}
            onChange={(next) => set('validUntil', next)}
          />
        </FormField>
      </div>

      <FormField label={t.proposal.messageToClient} htmlFor="message">
        <TextArea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
        />
      </FormField>

      <FormField
        label={t.proposal.internalNotes}
        htmlFor="internalNotes"
        hint={t.proposal.internalNotesHint}
      >
        <TextArea
          id="internalNotes"
          rows={2}
          value={form.internalNotes}
          onChange={(e) => set('internalNotes', e.target.value)}
        />
      </FormField>

      {error && (
        <p className="text-body text-status-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleSave} isLoading={saving}>
          {t.proposal.saveDraft}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
