import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { useSubmitProject } from '@/api/marketplace';
import { useCreateProjectV2, useOwnProjectsV2, useUpdateProjectV2, useWorkCategories } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { countryName } from '@/lib/geo';
import { IRAN_PROVINCES, provinceLabel } from '@/lib/iranProvinces';
import { languageName } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { CountrySelect, CurrencySelect } from '@/components/jobs/GeoFields';
import { ProjectCard, WorkCategorySelect } from '@/components/work/WorkUi';
import {
  EXPERIENCE_LEVELS,
  PROJECT_DURATIONS,
  WEEKLY_HOURS,
  WORK_LANGUAGES,
  type ExperienceLevel,
  type OwnProjectV2,
  type ProjectDuration,
  type ProjectPayloadV2,
  type ProjectPricing,
  type ProjectVisibility,
  type WeeklyHours,
} from '@/types/work';

const STEPS = ['basics', 'scope', 'budget', 'details', 'options', 'review'] as const;
type Step = (typeof STEPS)[number];
const MAX_QUESTIONS = 5;
const MAX_FILES = 5;

interface Draft {
  title: string;
  workCategoryId: string;
  skills: string;
  experienceLevel: ExperienceLevel | '';
  duration: ProjectDuration | '';
  freelancersNeeded: number;
  contractToHire: boolean;
  pricingType: ProjectPricing;
  budgetMin: string;
  budgetMax: string;
  budgetUnknown: boolean;
  currency: string;
  weeklyHours: WeeklyHours | '';
  description: string;
  deliverBy: string;
  closesAt: string;
  screeningQuestions: string[];
  visibility: ProjectVisibility;
  sealed: boolean;
  nda: boolean;
  urgent: boolean;
  onsite: boolean;
  country: string;
  province: string;
  city: string;
  preferredCountries: string[];
  languages: string[];
  openToCompanyOffer: boolean;
}

const EMPTY: Draft = {
  title: '',
  workCategoryId: '',
  skills: '',
  experienceLevel: '',
  duration: '',
  freelancersNeeded: 1,
  contractToHire: false,
  pricingType: 'FIXED',
  budgetMin: '',
  budgetMax: '',
  budgetUnknown: false,
  currency: 'IRT',
  weeklyHours: '',
  description: '',
  deliverBy: '',
  closesAt: '',
  screeningQuestions: [],
  visibility: 'PUBLIC',
  sealed: true,
  nda: false,
  urgent: false,
  onsite: false,
  country: 'IR',
  province: '',
  city: '',
  preferredCountries: [],
  languages: ['fa'],
  openToCompanyOffer: true,
};

function fromProject(project: OwnProjectV2): Draft {
  return {
    title: project.title,
    workCategoryId: project.workCategoryId ?? '',
    skills: project.skills.join(', '),
    experienceLevel: project.experienceLevel ?? '',
    duration: project.duration ?? '',
    freelancersNeeded: project.freelancersNeeded ?? 1,
    contractToHire: project.contractToHire ?? false,
    pricingType: project.pricingType ?? 'FIXED',
    budgetMin: project.budgetMin ?? '',
    budgetMax: project.budgetMax ?? '',
    budgetUnknown: project.budgetUnknown,
    currency: project.currency,
    weeklyHours: project.weeklyHours ?? '',
    description: project.description ?? '',
    deliverBy: project.deliverBy?.slice(0, 10) ?? '',
    closesAt: project.closesAt?.slice(0, 10) ?? '',
    screeningQuestions: project.screeningQuestions ?? [],
    visibility: project.visibility ?? 'PUBLIC',
    sealed: project.sealed ?? true,
    nda: project.nda ?? false,
    urgent: project.urgent ?? false,
    onsite: project.onsite ?? false,
    country: project.country ?? 'IR',
    province: project.province ?? '',
    city: project.city ?? '',
    preferredCountries: project.preferredCountries ?? [],
    languages: project.languages ?? [],
    openToCompanyOffer: project.openToCompanyOffer,
  };
}

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

function toPayload(draft: Draft): ProjectPayloadV2 {
  const skills = [...new Set(draft.skills.split(/[,،\n]/).map((skill) => skill.trim()).filter(Boolean))].slice(0, 20);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    skills,
    budgetMin: draft.budgetUnknown ? undefined : digits(draft.budgetMin) || undefined,
    budgetMax: draft.budgetUnknown ? undefined : digits(draft.budgetMax) || undefined,
    budgetUnknown: draft.budgetUnknown,
    currency: draft.currency,
    deliverBy: draft.deliverBy || undefined,
    closesAt: draft.closesAt || undefined,
    openToCompanyOffer: draft.openToCompanyOffer,
    workCategoryId: draft.workCategoryId || undefined,
    pricingType: draft.pricingType,
    experienceLevel: draft.experienceLevel || undefined,
    duration: draft.duration || undefined,
    weeklyHours: draft.pricingType === 'HOURLY' ? draft.weeklyHours || undefined : undefined,
    urgent: draft.urgent,
    sealed: draft.sealed,
    nda: draft.nda,
    visibility: draft.visibility,
    preferredCountries: draft.preferredCountries,
    languages: draft.languages,
    screeningQuestions: draft.screeningQuestions.map((question) => question.trim()).filter(Boolean),
    contractToHire: draft.contractToHire,
    freelancersNeeded: draft.freelancersNeeded,
    onsite: draft.onsite,
    country: draft.onsite ? draft.country : undefined,
    province: draft.onsite ? draft.province || undefined : undefined,
    city: draft.onsite ? draft.city.trim() || undefined : undefined,
  };
}

/**
 * Posting a project, one question at a time — Upwork's job-post flow: title
 * and category, scope, budget, the brief, then who may see it and the
 * extras, and a review that shows the card exactly as freelancers will see it.
 *
 * The same form edits a draft or a project sent back for changes.
 */
export default function PostProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: categories } = useWorkCategories();
  const { data: own, isLoading } = useOwnProjectsV2(Boolean(id));
  const editing = id ? own?.find((project) => project.id === id) : undefined;
  const create = useCreateProjectV2();
  const update = useUpdateProjectV2();
  const submit = useSubmitProject();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<Step>('basics');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(id ?? null);

  useDocumentTitle(id ? t.work.editProjectTitle : t.work.wizardTitle);

  useEffect(() => {
    if (editing) setDraft(fromProject(editing));
  }, [editing]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const index = STEPS.indexOf(step);

  const problems: Partial<Record<Step, string>> = {};
  if (draft.title.trim().length < 5) problems.basics = t.work.titleHint;
  if (!draft.budgetUnknown && !digits(draft.budgetMin) && !digits(draft.budgetMax)) problems.budget = t.work.budgetNeeded;
  if (
    !draft.budgetUnknown &&
    digits(draft.budgetMin) &&
    digits(draft.budgetMax) &&
    BigInt(digits(draft.budgetMin)) > BigInt(digits(draft.budgetMax))
  ) {
    problems.budget = t.work.budgetOrder;
  }
  if (draft.description.trim().length < 50) problems.details = t.work.descriptionHint;

  async function save(andSubmit: boolean) {
    const payload = toPayload(draft);
    try {
      let projectId = savedId;
      if (projectId) {
        await update.mutateAsync({ id: projectId, payload });
      } else {
        const created = await create.mutateAsync({ payload, attachments: files, onProgress: setProgress });
        projectId = created.id;
        setSavedId(created.id);
      }
      if (andSubmit) {
        await submit.mutateAsync(projectId);
        showToast(t.work.submitted, 'success');
      } else {
        showToast(t.work.draftSaved, 'success');
      }
      navigate('/dashboard/projects');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    } finally {
      setProgress(null);
    }
  }

  if (id && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const field = (label: string, htmlFor: string, child: ReactNode, hint?: string) => (
    <FormField label={label} htmlFor={htmlFor} hint={hint}>
      {child}
    </FormField>
  );

  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void, hint?: string) => (
    <label className="flex items-start gap-3 rounded-xl border border-border-default p-3">
      <input type="checkbox" className="mt-0.5 size-4 rounded border-border-default" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {hint && <span className="block text-xs text-text-tertiary">{hint}</span>}
      </span>
    </label>
  );

  const choice = <V extends string>(value: V, current: V | '', label: string, hint: string | undefined, onPick: (value: V) => void) => (
    <button
      key={value}
      type="button"
      onClick={() => onPick(value)}
      aria-pressed={current === value}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition',
        current === value
          ? 'border-brand-green-600 bg-brand-green-50 ring-1 ring-brand-green-600 dark:bg-brand-green-900/20'
          : 'border-border-default hover:border-border-strong',
      )}
    >
      <span className="text-sm font-medium text-text-primary">{label}</span>
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
    </button>
  );

  const preview = {
    id: 'preview',
    code: '',
    ...toPayload(draft),
    excerpt: draft.nda ? null : draft.description.slice(0, 320),
    companyName: null,
    category: null,
    workCategory: categories?.find((category) => category.id === draft.workCategoryId) ?? null,
    featured: false,
    budgetMin: digits(draft.budgetMin) || null,
    budgetMax: digits(draft.budgetMax) || null,
    publishedAt: new Date().toISOString(),
    closesAt: draft.closesAt || null,
    _count: { bids: 0 },
    authorProfile: null,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={id ? t.work.editProjectTitle : t.work.wizardTitle}
        description={fill(t.work.stepOf, { step: formatNumber(index + 1, locale), total: formatNumber(STEPS.length, locale) })}
      />

      <ol className="flex flex-wrap gap-2" aria-label={t.work.wizardTitle}>
        {STEPS.map((name, position) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => setStep(name)}
              aria-current={name === step ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
                name === step
                  ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                  : position < index
                    ? 'border-border-default text-text-secondary'
                    : 'border-border-default text-text-tertiary',
              )}
            >
              {position < index && !problems[name] ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">{formatNumber(position + 1, locale)}</span>
              )}
              {
                {
                  basics: t.work.stepBasics,
                  scope: t.work.stepScope,
                  budget: t.work.stepBudget,
                  details: t.work.stepDetails,
                  options: t.work.stepOptions,
                  review: t.work.stepReview,
                }[name]
              }
            </button>
          </li>
        ))}
      </ol>

      <Card className="flex flex-col gap-5">
        {step === 'basics' && (
          <>
            {field(
              t.work.titleLabel,
              'p-title',
              <Input id="p-title" required maxLength={160} value={draft.title} onChange={(e) => set('title', e.target.value)} />,
              t.work.titleHint,
            )}
            {field(
              t.work.categoryLabel,
              'p-category',
              <WorkCategorySelect
                id="p-category"
                categories={categories}
                value={draft.workCategoryId}
                onChange={(value) => set('workCategoryId', value)}
                placeholder={t.work.chooseCategory}
              />,
            )}
            {field(
              t.work.skillsLabel,
              'p-skills',
              <Input id="p-skills" value={draft.skills} onChange={(e) => set('skills', e.target.value)} placeholder="React, Node.js, Figma" />,
              t.work.skillsHint,
            )}
          </>
        )}

        {step === 'scope' && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.experienceLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {EXPERIENCE_LEVELS.map((level) =>
                  choice(level, draft.experienceLevel, t.work.experience[level], t.work.experienceHint[level], (value) => set('experienceLevel', value)),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.durationLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PROJECT_DURATIONS.map((value) =>
                  choice(value, draft.duration, t.work.durations[value], undefined, (picked) => set('duration', picked)),
                )}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                t.work.freelancersNeededLabel,
                'p-needed',
                <Input
                  id="p-needed"
                  type="number"
                  min={1}
                  max={50}
                  className="ltr"
                  value={draft.freelancersNeeded}
                  onChange={(e) => set('freelancersNeeded', Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                />,
              )}
            </div>
            {toggle(t.work.contractToHireLabel, draft.contractToHire, (value) => set('contractToHire', value))}
          </>
        )}

        {step === 'budget' && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.pricingLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['FIXED', 'HOURLY'] as const).map((value) =>
                  choice(value, draft.pricingType, t.work.pricing[value], undefined, (picked) => set('pricingType', picked)),
                )}
              </div>
            </fieldset>
            <fieldset disabled={draft.budgetUnknown} className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium text-text-primary">
                {draft.pricingType === 'HOURLY' ? t.work.budgetHourlyLabel : t.work.budgetFixedLabel}
              </legend>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
                <Input
                  aria-label={t.work.budgetMinLabel}
                  placeholder={t.work.budgetMinLabel}
                  inputMode="numeric"
                  className="ltr"
                  value={draft.budgetMin}
                  onChange={(e) => set('budgetMin', e.target.value)}
                />
                <Input
                  aria-label={t.work.budgetMaxLabel}
                  placeholder={t.work.budgetMaxLabel}
                  inputMode="numeric"
                  className="ltr"
                  value={draft.budgetMax}
                  onChange={(e) => set('budgetMax', e.target.value)}
                />
                <CurrencySelect aria-label={t.work.currencyLabel} value={draft.currency} onChange={(value) => set('currency', value)} />
              </div>
            </fieldset>
            {toggle(t.work.budgetUnknownLabel, draft.budgetUnknown, (value) => set('budgetUnknown', value))}
            {draft.pricingType === 'HOURLY' && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.weeklyHoursLabel}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {WEEKLY_HOURS.map((value) =>
                    choice(value, draft.weeklyHours, t.work.weeklyHours[value], undefined, (picked) => set('weeklyHours', picked)),
                  )}
                </div>
              </fieldset>
            )}
          </>
        )}

        {step === 'details' && (
          <>
            {field(
              t.work.descriptionLabel,
              'p-description',
              <TextArea
                id="p-description"
                rows={12}
                maxLength={10_000}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
              />,
              `${t.work.descriptionHint} ${formatNumber(draft.description.trim().length, locale)} / 10,000`,
            )}
            <p className="rounded-xl bg-surface-muted p-3 text-sm text-text-secondary">{t.work.descriptionTips}</p>
            {!savedId && (
              <FormField label={t.work.attachmentsLabel} htmlFor="p-files">
                <input
                  id="p-files"
                  type="file"
                  multiple
                  className="text-sm text-text-secondary file:me-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5"
                  onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, MAX_FILES))}
                />
                {files.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {files.map((file, position) => (
                      <li key={`${file.name}-${position}`} className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1 text-xs text-text-secondary">
                        {file.name}
                        <button type="button" aria-label={t.common.delete} onClick={() => setFiles(files.filter((_, i) => i !== position))}>
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                t.work.deliverByLabel,
                'p-deliver',
                <Input id="p-deliver" type="date" className="ltr" value={draft.deliverBy} onChange={(e) => set('deliverBy', e.target.value)} />,
              )}
              {field(
                t.work.closesAtLabel,
                'p-closes',
                <Input id="p-closes" type="date" className="ltr" value={draft.closesAt} onChange={(e) => set('closesAt', e.target.value)} />,
              )}
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-text-primary">{t.work.questionsLabel}</legend>
              <p className="text-xs text-text-tertiary">{t.work.questionsHint}</p>
              {draft.screeningQuestions.map((question, position) => (
                <div key={position} className="flex gap-2">
                  <Input
                    aria-label={`${t.work.questionsLabel} ${position + 1}`}
                    placeholder={t.work.questionPlaceholder}
                    maxLength={300}
                    value={question}
                    onChange={(e) =>
                      set(
                        'screeningQuestions',
                        draft.screeningQuestions.map((row, i) => (i === position ? e.target.value : row)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="rounded-lg p-2 text-text-tertiary hover:bg-surface-muted"
                    aria-label={t.common.delete}
                    onClick={() => set('screeningQuestions', draft.screeningQuestions.filter((_, i) => i !== position))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {draft.screeningQuestions.length < MAX_QUESTIONS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => set('screeningQuestions', [...draft.screeningQuestions, ''])}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t.work.addQuestion}
                </Button>
              )}
            </fieldset>
          </>
        )}

        {step === 'options' && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.visibilityLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['PUBLIC', 'SIGNED_IN', 'INVITE_ONLY'] as const).map((value) =>
                  choice(value, draft.visibility, t.work.visibility[value], t.work.visibilityHint[value], (picked) => set('visibility', picked)),
                )}
              </div>
            </fieldset>
            <div className="grid gap-2 sm:grid-cols-2">
              {toggle(t.work.sealedLabel, draft.sealed, (value) => set('sealed', value), t.work.sealedHint)}
              {toggle(t.work.ndaLabel, draft.nda, (value) => set('nda', value), t.work.ndaLabelHint)}
              {toggle(t.work.urgentLabel, draft.urgent, (value) => set('urgent', value), t.work.urgentHint)}
              {toggle(t.work.companyOfferLabel, draft.openToCompanyOffer, (value) => set('openToCompanyOffer', value))}
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.locationLabel}</legend>
              <div className="mb-3 flex gap-4 text-sm text-text-secondary">
                <label className="flex items-center gap-2">
                  <input type="radio" name="p-onsite" checked={!draft.onsite} onChange={() => set('onsite', false)} />
                  {t.work.remoteWork}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="p-onsite" checked={draft.onsite} onChange={() => set('onsite', true)} />
                  {t.work.onsiteWork}
                </label>
              </div>
              {draft.onsite && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <CountrySelect aria-label={t.jobs.country} value={draft.country} onChange={(value) => set('country', value)} />
                  {draft.country === 'IR' ? (
                    <Select aria-label={t.market.province} value={draft.province} onChange={(e) => set('province', e.target.value)}>
                      <option value="">{t.jobs.allProvinces}</option>
                      {IRAN_PROVINCES.map((item) => (
                        <option key={item.slug} value={item.fa}>
                          {provinceLabel(item, locale)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input aria-label={t.market.province} placeholder={t.market.province} value={draft.province} onChange={(e) => set('province', e.target.value)} />
                  )}
                  <Input aria-label={t.market.city} placeholder={t.market.city} value={draft.city} onChange={(e) => set('city', e.target.value)} />
                </div>
              )}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-text-primary">{t.work.countriesLabel}</legend>
              <p className="mb-2 text-xs text-text-tertiary">{t.work.countriesHint}</p>
              <div className="flex flex-wrap items-center gap-2">
                {draft.preferredCountries.map((code) => (
                  <span key={code} className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-sm text-text-secondary">
                    {countryName(code, locale)}
                    <button
                      type="button"
                      aria-label={t.common.delete}
                      onClick={() => set('preferredCountries', draft.preferredCountries.filter((item) => item !== code))}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <CountrySelect
                  className="w-56"
                  aria-label={t.work.countriesLabel}
                  value=""
                  placeholder={`+ ${t.jobs.country}`}
                  onChange={(code) => code && set('preferredCountries', [...new Set([...draft.preferredCountries, code])])}
                />
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.workLanguagesLabel}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WORK_LANGUAGES.map((code) => (
                  <label key={code} className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border-default"
                      checked={draft.languages.includes(code)}
                      onChange={() =>
                        set(
                          'languages',
                          draft.languages.includes(code) ? draft.languages.filter((item) => item !== code) : [...draft.languages, code],
                        )
                      }
                    />
                    {languageName(code, locale)}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 'review' && (
          <>
            <p className="text-sm text-text-secondary">{t.work.reviewSummary}</p>
            {Object.values(problems).length > 0 && (
              <ul className="flex flex-col gap-1 rounded-xl bg-brand-red-50 p-3 text-sm text-brand-red-800 dark:bg-brand-red-900/30 dark:text-brand-red-200">
                {Object.entries(problems).map(([name, problem]) => (
                  <li key={name}>
                    <button type="button" className="underline" onClick={() => setStep(name as Step)}>
                      {problem}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ul>
              <ProjectCard project={preview} />
            </ul>
            {progress !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-brand-green-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={() => setStep(STEPS[index - 1])}>
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.common.previous}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/projects">
            <Button variant="ghost">{t.common.cancel}</Button>
          </Link>
          <Button
            variant="outline"
            disabled={draft.title.trim().length < 5 || draft.description.trim().length < 50}
            isLoading={(create.isPending || update.isPending) && !submit.isPending}
            onClick={() => void save(false)}
          >
            <Save className="size-4" aria-hidden="true" />
            {t.work.saveDraft}
          </Button>
          {step === 'review' ? (
            <Button disabled={Object.values(problems).length > 0} isLoading={submit.isPending} onClick={() => void save(true)}>
              <Send className="size-4" aria-hidden="true" />
              {t.work.submitForReview}
            </Button>
          ) : (
            <Button onClick={() => setStep(STEPS[index + 1])}>
              {t.common.next}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
