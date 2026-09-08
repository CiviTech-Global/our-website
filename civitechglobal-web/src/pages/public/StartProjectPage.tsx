import { useState } from 'react';
import { ApiError } from '@/config/api';
import { Link } from 'react-router';
import { CheckCircle2, Copy, FileUp, Info, Paperclip, Send, X } from 'lucide-react';
import { useSubmitProjectRequest } from '@/api/projects';
import { useLocale } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { formatThousands, normalizePersianDigits } from '@/lib/persian';
import type {
  EngagementModel,
  Platform,
  ProjectRequestPayload,
  ProjectType,
  ProjectUrgency,
} from '@/types/project';

const MAX_FILES = 8;
const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 25;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.md,.csv';

const PROJECT_TYPES: ProjectType[] = [
  'NEW_BUILD',
  'REBUILD',
  'WEB_APP',
  'MOBILE_APP',
  'INTEGRATION',
  'DATA_PLATFORM',
  'AUTOMATION',
  'MAINTENANCE',
  'CONSULTING',
  'OTHER',
];
const PLATFORMS: Platform[] = ['web', 'ios', 'android', 'desktop', 'api', 'embedded'];
const URGENCIES: ProjectUrgency[] = ['EXPLORING', 'NEXT_QUARTER', 'NEXT_MONTH', 'URGENT'];
const ENGAGEMENTS: EngagementModel[] = [
  'NOT_SURE',
  'FIXED_PRICE',
  'TIME_AND_MATERIALS',
  'RETAINER',
];

type Errors = Record<string, string>;

/** Digits only, for the money inputs. Stored unformatted, displayed grouped. */
const digitsOnly = (value: string) => normalizePersianDigits(value).replace(/\D/g, '');

export default function StartProjectPage() {
  const { t } = useLocale();
  const submit = useSubmitProjectRequest();

  const [form, setForm] = useState({
    contactName: '',
    contactRole: '',
    organizationName: '',
    website: '',
    email: '',
    phone: '',
    title: '',
    summary: '',
    projectType: 'NEW_BUILD' as ProjectType,
    platforms: [] as Platform[],
    goals: '',
    targetUsers: '',
    existingSystems: '',
    constraints: '',
    outOfScope: '',
    urgency: 'EXPLORING' as ProjectUrgency,
    desiredStartAt: '',
    deadlineAt: '',
    budgetUnknown: false,
    budgetMin: '',
    budgetMax: '',
    suggestedPrice: '',
    engagementModel: 'NOT_SURE' as EngagementModel,
    ndaRequired: false,
    clientNotes: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<{ trackingCode: string; attachmentCount: number } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: '' } : prev));
  };

  const togglePlatform = (platform: Platform) =>
    set(
      'platforms',
      form.platforms.includes(platform)
        ? form.platforms.filter((p) => p !== platform)
        : [...form.platforms, platform]
    );

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    const rejected: string[] = [];

    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        rejected.push(t.project.fileTooMany);
        break;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        rejected.push(`${file.name}: ${t.project.fileTooBig}`);
        continue;
      }
      next.push(file);
    }

    const total = next.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, files: t.project.filesTooBig }));
      return;
    }

    setFiles(next);
    setErrors((prev) => ({ ...prev, files: rejected[0] ?? '' }));
  }

  /**
   * Client-side validation mirrors the server's schema. The server is still the
   * authority — this only saves a round trip and puts the message next to the
   * field that caused it.
   */
  function validate(): boolean {
    const next: Errors = {};
    if (form.contactName.trim().length < 2) next.contactName = t.project.errRequired;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = t.project.errEmail;
    if (digitsOnly(form.phone).length < 10) next.phone = t.project.errPhone;
    if (form.title.trim().length < 4) next.title = t.project.errRequired;
    if (form.summary.trim().length < 40) next.summary = t.project.errSummary;
    if (!form.budgetUnknown && !form.budgetMin && !form.budgetMax) {
      next.budgetMin = t.project.errBudget;
    }
    if (
      !form.budgetUnknown &&
      form.budgetMin &&
      form.budgetMax &&
      BigInt(form.budgetMin) > BigInt(form.budgetMax)
    ) {
      next.budgetMax = t.project.errBudgetOrder;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ block: 'center' });
      return;
    }

    const payload: ProjectRequestPayload = {
      contactName: form.contactName.trim(),
      contactRole: form.contactRole.trim() || undefined,
      organizationName: form.organizationName.trim() || undefined,
      website: form.website.trim() || undefined,
      email: form.email.trim(),
      phone: digitsOnly(form.phone),
      title: form.title.trim(),
      summary: form.summary.trim(),
      projectType: form.projectType,
      platforms: form.platforms,
      goals: form.goals.trim() || undefined,
      targetUsers: form.targetUsers.trim() || undefined,
      existingSystems: form.existingSystems.trim() || undefined,
      constraints: form.constraints.trim() || undefined,
      outOfScope: form.outOfScope.trim() || undefined,
      urgency: form.urgency,
      desiredStartAt: form.desiredStartAt || undefined,
      deadlineAt: form.deadlineAt || undefined,
      budgetUnknown: form.budgetUnknown,
      budgetMin: form.budgetUnknown ? undefined : form.budgetMin || undefined,
      budgetMax: form.budgetUnknown ? undefined : form.budgetMax || undefined,
      suggestedPrice: form.budgetUnknown ? undefined : form.suggestedPrice || undefined,
      engagementModel: form.engagementModel,
      ndaRequired: form.ndaRequired,
      clientNotes: form.clientNotes.trim() || undefined,
    };

    try {
      const res = await submit.mutateAsync({ payload, files });
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? ((error.response?.data as { message?: string } | undefined)?.message ??
            t.project.errSubmit)
          : t.project.errSubmit;
      setErrors({ submit: message });
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <AnimatedSection>
          <Card className="text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-brand-green-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-text-primary">{t.project.successTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.project.successBody}</p>

            <div className="mx-auto mt-6 max-w-xs rounded-xl border border-border-default bg-surface-50 p-4">
              <p className="text-xs text-text-muted">{t.project.trackingCode}</p>
              <p className="ltr mt-1 text-2xl font-semibold tracking-[0.3em] text-text-primary">
                {result.trackingCode}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.trackingCode);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Copy className="size-4" />
                {copied ? t.project.copied : t.project.copy}
              </Button>
            </div>

            {result.attachmentCount > 0 && (
              <p className="mt-4 text-sm text-text-muted">
                {t.project.attachedCount.replace('{n}', String(result.attachmentCount))}
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/track">
                <Button variant="outline">{t.project.goTrack}</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost">{t.project.goHome}</Button>
              </Link>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.project.title}</h1>
        <p className="mt-3 text-text-secondary">{t.project.subtitle}</p>
      </AnimatedSection>

      {/* What happens next. Setting the expectation up front is why the brief
          gets filled in properly: people answer more carefully when they know
          the answer comes back as a costed proposal rather than a sales call. */}
      <AnimatedSection delay={0.05} className="mb-8">
        <Card className="border-brand-green-500/30 bg-brand-green-500/5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Info className="size-4 text-brand-green-500" aria-hidden="true" />
            {t.project.processTitle}
          </h2>
          <ol className="flex flex-col gap-1.5 text-sm text-text-secondary">
            {[t.project.step1, t.project.step2, t.project.step3, t.project.step4].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="text-text-muted">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </AnimatedSection>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* ---- Who ---- */}
        <Section title={t.project.sectionYou}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.project.contactName} htmlFor="contactName" error={errors.contactName}>
              <Input
                id="contactName"
                value={form.contactName}
                invalid={!!errors.contactName}
                data-invalid={!!errors.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.contactRole} htmlFor="contactRole">
              <Input
                id="contactRole"
                value={form.contactRole}
                onChange={(e) => set('contactRole', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.organization} htmlFor="organizationName">
              <Input
                id="organizationName"
                value={form.organizationName}
                onChange={(e) => set('organizationName', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.website} htmlFor="website">
              <Input
                id="website"
                dir="ltr"
                placeholder="https://"
                className="ltr text-start"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
              />
            </FormField>
            <FormField
              label={t.project.email}
              htmlFor="email"
              error={errors.email}
              hint={t.project.identityHint}
            >
              <Input
                id="email"
                type="email"
                dir="ltr"
                className="ltr text-start"
                value={form.email}
                invalid={!!errors.email}
                data-invalid={!!errors.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.phone} htmlFor="phone" error={errors.phone}>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder="09121234567"
                className="ltr text-start"
                value={form.phone}
                invalid={!!errors.phone}
                data-invalid={!!errors.phone}
                onChange={(e) => set('phone', normalizePersianDigits(e.target.value))}
              />
            </FormField>
          </div>
        </Section>

        {/* ---- What ---- */}
        <Section title={t.project.sectionProject}>
          <FormField label={t.project.projectTitle} htmlFor="title" error={errors.title}>
            <Input
              id="title"
              value={form.title}
              invalid={!!errors.title}
              data-invalid={!!errors.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </FormField>

          <FormField
            label={t.project.summary}
            htmlFor="summary"
            error={errors.summary}
            hint={t.project.summaryHint}
          >
            <TextArea
              id="summary"
              rows={6}
              value={form.summary}
              invalid={!!errors.summary}
              data-invalid={!!errors.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.project.projectType} htmlFor="projectType">
              <Select
                id="projectType"
                value={form.projectType}
                onChange={(e) => set('projectType', e.target.value as ProjectType)}
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t.project.types[type]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.project.engagement} htmlFor="engagementModel" hint={t.project.engagementHint}>
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

          <FormField label={t.project.platforms} htmlFor="platforms">
            <div className="flex flex-wrap gap-2" id="platforms">
              {PLATFORMS.map((platform) => {
                const active = form.platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(platform)}
                    className={
                      active
                        ? 'rounded-full border border-brand-green-500 bg-brand-green-500/10 px-4 py-1.5 text-sm text-brand-green-600 dark:text-brand-green-400'
                        : 'rounded-full border border-border-default px-4 py-1.5 text-sm text-text-secondary hover:border-brand-green-500/40'
                    }
                  >
                    {t.project.platformNames[platform]}
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.project.goals} htmlFor="goals">
              <TextArea id="goals" rows={3} value={form.goals} onChange={(e) => set('goals', e.target.value)} />
            </FormField>
            <FormField label={t.project.targetUsers} htmlFor="targetUsers">
              <TextArea
                id="targetUsers"
                rows={3}
                value={form.targetUsers}
                onChange={(e) => set('targetUsers', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.existingSystems} htmlFor="existingSystems">
              <TextArea
                id="existingSystems"
                rows={3}
                value={form.existingSystems}
                onChange={(e) => set('existingSystems', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.constraints} htmlFor="constraints">
              <TextArea
                id="constraints"
                rows={3}
                value={form.constraints}
                onChange={(e) => set('constraints', e.target.value)}
              />
            </FormField>
          </div>

          {/* Asking the client what they consider out of scope is unusual and
              worth it: it is the cheapest possible way to find a disagreement
              about scope, and it happens before anyone has quoted a price. */}
          <FormField label={t.project.outOfScope} htmlFor="outOfScope" hint={t.project.outOfScopeHint}>
            <TextArea
              id="outOfScope"
              rows={2}
              value={form.outOfScope}
              onChange={(e) => set('outOfScope', e.target.value)}
            />
          </FormField>
        </Section>

        {/* ---- When ---- */}
        <Section title={t.project.sectionTiming}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t.project.urgency} htmlFor="urgency">
              <Select
                id="urgency"
                value={form.urgency}
                onChange={(e) => set('urgency', e.target.value as ProjectUrgency)}
              >
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {t.project.urgencies[u]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.project.desiredStart} htmlFor="desiredStartAt">
              <Input
                id="desiredStartAt"
                type="date"
                value={form.desiredStartAt}
                onChange={(e) => set('desiredStartAt', e.target.value)}
              />
            </FormField>
            <FormField label={t.project.deadline} htmlFor="deadlineAt">
              <Input
                id="deadlineAt"
                type="date"
                value={form.deadlineAt}
                onChange={(e) => set('deadlineAt', e.target.value)}
              />
            </FormField>
          </div>
        </Section>

        {/* ---- Money ---- */}
        <Section title={t.project.sectionBudget} hint={t.project.budgetWhy}>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.budgetUnknown}
              onChange={(e) => set('budgetUnknown', e.target.checked)}
              className="size-4 accent-[var(--color-brand-green-500)]"
            />
            {t.project.budgetUnknown}
          </label>

          {!form.budgetUnknown && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MoneyField
                id="budgetMin"
                label={t.project.budgetMin}
                value={form.budgetMin}
                error={errors.budgetMin}
                currency={t.project.currency}
                onChange={(v) => set('budgetMin', v)}
              />
              <MoneyField
                id="budgetMax"
                label={t.project.budgetMax}
                value={form.budgetMax}
                error={errors.budgetMax}
                currency={t.project.currency}
                onChange={(v) => set('budgetMax', v)}
              />
              <MoneyField
                id="suggestedPrice"
                label={t.project.suggestedPrice}
                value={form.suggestedPrice}
                currency={t.project.currency}
                hint={t.project.suggestedPriceHint}
                onChange={(v) => set('suggestedPrice', v)}
              />
            </div>
          )}
        </Section>

        {/* ---- Files ---- */}
        <Section title={t.project.sectionFiles} hint={t.project.filesHint}>
          <label
            htmlFor="files"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-default p-6 text-center transition-colors hover:border-brand-green-500/50"
          >
            <FileUp className="size-6 text-brand-green-500" aria-hidden="true" />
            <span className="text-sm font-medium text-text-primary">{t.project.chooseFiles}</span>
            <span className="text-xs text-text-muted">{t.project.fileRules}</span>
            <input
              id="files"
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {errors.files && (
            <p className="text-xs text-brand-red-500" role="alert">
              {errors.files}
            </p>
          )}

          {files.length > 0 && (
            <ul className="flex flex-col gap-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-border-default p-2.5 text-sm"
                >
                  <Paperclip className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-text-primary">{file.name}</span>
                  <span className="shrink-0 text-xs text-text-muted">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    aria-label={t.project.removeFile}
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    className="shrink-0 text-text-muted hover:text-brand-red-500"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.ndaRequired}
              onChange={(e) => set('ndaRequired', e.target.checked)}
              className="size-4 accent-[var(--color-brand-green-500)]"
            />
            {t.project.nda}
          </label>

          <FormField label={t.project.clientNotes} htmlFor="clientNotes">
            <TextArea
              id="clientNotes"
              rows={3}
              value={form.clientNotes}
              onChange={(e) => set('clientNotes', e.target.value)}
            />
          </FormField>
        </Section>

        {errors.submit && (
          <p className="rounded-lg border border-brand-red-500/40 bg-brand-red-500/5 p-3 text-sm text-brand-red-500" role="alert">
            {errors.submit}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" isLoading={submit.isPending}>
            <Send className="size-4" />
            {t.project.submit}
          </Button>
          <p className="text-xs text-text-muted">{t.project.submitHint}</p>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatedSection>
      <Card>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {hint && <p className="mt-1 text-sm text-text-muted">{hint}</p>}
        <div className="mt-4 flex flex-col gap-4">{children}</div>
      </Card>
    </AnimatedSection>
  );
}

/** Grouped for reading, unformatted in state — the wire wants plain digits. */
function MoneyField({
  id,
  label,
  value,
  error,
  hint,
  currency,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  currency: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          dir="ltr"
          className="ltr text-start pe-14"
          value={formatThousands(value)}
          invalid={!!error}
          data-invalid={!!error}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
        />
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-text-muted">
          {currency}
        </span>
      </div>
    </FormField>
  );
}
