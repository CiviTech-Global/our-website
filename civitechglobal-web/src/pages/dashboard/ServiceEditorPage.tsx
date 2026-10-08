import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ImagePlus, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { serviceImagePath, useOwnService, useSaveService, useSubmitService, useWorkCategories } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { languageName } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';
import { CurrencySelect } from '@/components/jobs/GeoFields';
import { WorkCategorySelect } from '@/components/work/WorkUi';
import {
  PACKAGE_TIERS,
  UNLIMITED_REVISIONS,
  WORK_LANGUAGES,
  type OwnService,
  type PackageTier,
  type ServiceExtra,
  type ServiceFaq,
  type ServicePayload,
} from '@/types/work';

const MAX_IMAGES = 6;

interface PackageDraft {
  offered: boolean;
  name: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string;
}

const emptyPackage = (offered: boolean): PackageDraft => ({
  offered,
  name: '',
  description: '',
  price: '',
  deliveryDays: '3',
  revisions: '1',
  features: '',
});

interface Draft {
  title: string;
  description: string;
  workCategoryId: string;
  skills: string;
  languages: string[];
  currency: string;
  packages: Record<PackageTier, PackageDraft>;
  extras: ServiceExtra[];
  faqs: ServiceFaq[];
  requirements: string[];
}

const EMPTY: Draft = {
  title: '',
  description: '',
  workCategoryId: '',
  skills: '',
  languages: ['fa'],
  currency: 'IRT',
  packages: { BASIC: emptyPackage(true), STANDARD: emptyPackage(false), PREMIUM: emptyPackage(false) },
  extras: [],
  faqs: [],
  requirements: [],
};

function fromService(service: OwnService): Draft {
  const packages = { ...EMPTY.packages };
  for (const pkg of service.packages) {
    packages[pkg.tier] = {
      offered: true,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      deliveryDays: String(pkg.deliveryDays),
      revisions: String(pkg.revisions),
      features: pkg.features.join('\n'),
    };
  }
  return {
    title: service.title,
    description: service.description,
    workCategoryId: service.workCategoryId ?? '',
    skills: service.skills.join(', '),
    languages: service.languages,
    currency: service.packages[0]?.currency ?? 'IRT',
    packages,
    extras: service.extras.map((extra) => ({ title: extra.title, price: extra.price, extraDays: extra.extraDays })),
    faqs: service.faqs,
    requirements: service.requirements,
  };
}

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9-]/g, '');

/**
 * Creating or editing a service, Fiverr's gig editor on one page: the
 * overview, the gallery, up to three packages side by side, extras, FAQs and
 * the questions the buyer answers when ordering.
 */
export default function ServiceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: categories } = useWorkCategories();
  const { data: existing, isLoading } = useOwnService(id);
  const save = useSaveService();
  const submit = useSubmitService();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [images, setImages] = useState<File[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  useDocumentTitle(id ? t.work.editService : t.work.newService);
  useEffect(() => {
    if (existing) setDraft(fromService(existing));
  }, [existing]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setPackage = (tier: PackageTier, patch: Partial<PackageDraft>) =>
    setDraft((current) => ({ ...current, packages: { ...current.packages, [tier]: { ...current.packages[tier], ...patch } } }));

  const keptImages = (existing?.images ?? []).filter((image) => !removeImageIds.includes(image.id));
  const roomForImages = MAX_IMAGES - keptImages.length - images.length;

  function payload(): ServicePayload {
    return {
      title: draft.title.trim(),
      description: draft.description.trim(),
      workCategoryId: draft.workCategoryId || null,
      skills: [...new Set(draft.skills.split(/[,،\n]/).map((skill) => skill.trim()).filter(Boolean))].slice(0, 15),
      languages: draft.languages,
      faqs: draft.faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
      requirements: draft.requirements.map((question) => question.trim()).filter(Boolean),
      currency: draft.currency,
      packages: PACKAGE_TIERS.filter((tier) => draft.packages[tier].offered).map((tier) => {
        const pkg = draft.packages[tier];
        return {
          tier,
          name: pkg.name.trim(),
          description: pkg.description.trim(),
          price: digits(pkg.price),
          deliveryDays: Number(digits(pkg.deliveryDays)) || 1,
          revisions: Number(digits(pkg.revisions)),
          features: pkg.features.split('\n').map((line) => line.trim()).filter(Boolean),
        };
      }),
      extras: draft.extras
        .filter((extra) => extra.title.trim() && digits(extra.price))
        .map((extra) => ({ title: extra.title.trim(), price: digits(extra.price), extraDays: Number(extra.extraDays) || 0 })),
      removeImageIds,
    };
  }

  async function handleSave(event: FormEvent, andSubmit = false) {
    event.preventDefault();
    try {
      const result = await save.mutateAsync({ id, payload: payload(), images, onProgress: setProgress });
      if (andSubmit) {
        await submit.mutateAsync(result.id);
        showToast(t.work.serviceSubmitted, 'success');
      } else {
        showToast(t.work.serviceSaved, 'success');
      }
      navigate('/dashboard/services');
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

  const section = (title: string, children: ReactNode, hint?: string) => (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-text-primary">{title}</h2>
        {hint && <p className="text-sm text-text-tertiary">{hint}</p>}
      </div>
      {children}
    </Card>
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSave(event)}>
      <PageHeader title={id ? t.work.editService : t.work.newService} />
      {existing?.moderationStatus === 'APPROVED' && (
        <p className="rounded-xl bg-brand-amber-50 p-3 text-sm text-brand-amber-900 dark:bg-brand-amber-900/30 dark:text-brand-amber-200">
          {t.work.liveEditWarning}
        </p>
      )}

      {section(
        t.work.aboutService,
        <>
          <FormField label={t.work.serviceTitleLabel} htmlFor="s-title" hint={t.work.serviceTitleHint}>
            <Input id="s-title" required minLength={15} maxLength={120} value={draft.title} onChange={(e) => set('title', e.target.value)} />
          </FormField>
          <FormField label={t.work.categoryLabel} htmlFor="s-category">
            <WorkCategorySelect
              id="s-category"
              categories={categories}
              value={draft.workCategoryId}
              onChange={(value) => set('workCategoryId', value)}
              placeholder={t.work.chooseCategory}
            />
          </FormField>
          <FormField label={t.work.serviceDescriptionLabel} htmlFor="s-description">
            <TextArea
              id="s-description"
              required
              minLength={120}
              maxLength={12_000}
              rows={10}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </FormField>
          <FormField label={t.work.skillsLabel} htmlFor="s-skills">
            <Input id="s-skills" value={draft.skills} onChange={(e) => set('skills', e.target.value)} />
          </FormField>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.languagesLabel}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WORK_LANGUAGES.map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border-default"
                    checked={draft.languages.includes(code)}
                    onChange={() =>
                      set('languages', draft.languages.includes(code) ? draft.languages.filter((item) => item !== code) : [...draft.languages, code])
                    }
                  />
                  {languageName(code, locale)}
                </label>
              ))}
            </div>
          </fieldset>
        </>,
      )}

      {section(
        t.work.galleryLabel,
        <div className="flex flex-wrap gap-3">
          {keptImages.map((image) => (
            <div key={image.id} className="relative h-24 w-36 overflow-hidden rounded-xl bg-surface-muted">
              <StaffImage path={serviceImagePath(image.id, 'own')} alt={image.originalName} className="size-full object-cover" fallback={null} />
              <button
                type="button"
                className="absolute end-1 top-1 rounded-full bg-surface-default/90 p-1"
                aria-label={t.common.delete}
                onClick={() => setRemoveImageIds([...removeImageIds, image.id])}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {images.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative h-24 w-36 overflow-hidden rounded-xl bg-surface-muted">
              <img src={URL.createObjectURL(file)} alt={file.name} className="size-full object-cover" />
              <button
                type="button"
                className="absolute end-1 top-1 rounded-full bg-surface-default/90 p-1"
                aria-label={t.common.delete}
                onClick={() => setImages(images.filter((_, i) => i !== index))}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {roomForImages > 0 && (
            <label className="flex h-24 w-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-default text-sm text-text-tertiary hover:border-border-strong">
              <ImagePlus className="size-5" aria-hidden="true" />
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                multiple
                className="sr-only"
                onChange={(e) => setImages([...images, ...Array.from(e.target.files ?? [])].slice(0, MAX_IMAGES - keptImages.length))}
              />
              {t.work.galleryLabel.split('(')[0].trim()}
            </label>
          )}
        </div>,
      )}

      {section(
        t.work.packages,
        <>
          <CurrencySelect className="w-40" aria-label={t.work.currencyLabel} value={draft.currency} onChange={(value) => set('currency', value)} />
          <div className="grid gap-4 lg:grid-cols-3">
            {PACKAGE_TIERS.map((tier) => {
              const pkg = draft.packages[tier];
              return (
                <fieldset key={tier} className={cn('flex flex-col gap-3 rounded-xl border p-3', pkg.offered ? 'border-border-strong' : 'border-dashed border-border-default')}>
                  <legend className="px-1 font-semibold text-text-primary">{t.work.tiers[tier]}</legend>
                  {tier !== 'BASIC' && (
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input type="checkbox" className="size-4 rounded" checked={pkg.offered} onChange={(e) => setPackage(tier, { offered: e.target.checked })} />
                      {t.work.offerPackage}
                    </label>
                  )}
                  {pkg.offered && (
                    <>
                      <Input aria-label={t.work.packageName} placeholder={t.work.packageName} required maxLength={60} value={pkg.name} onChange={(e) => setPackage(tier, { name: e.target.value })} />
                      <TextArea aria-label={t.work.packageDescription} placeholder={t.work.packageDescription} required rows={3} maxLength={600} value={pkg.description} onChange={(e) => setPackage(tier, { description: e.target.value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <FormField label={t.work.packagePrice} htmlFor={`${tier}-price`}>
                          <Input id={`${tier}-price`} required inputMode="numeric" className="ltr" value={pkg.price} onChange={(e) => setPackage(tier, { price: e.target.value })} />
                        </FormField>
                        <FormField label={t.work.packageDays} htmlFor={`${tier}-days`}>
                          <Input id={`${tier}-days`} required type="number" min={1} max={365} className="ltr" value={pkg.deliveryDays} onChange={(e) => setPackage(tier, { deliveryDays: e.target.value })} />
                        </FormField>
                        <FormField label={t.work.packageRevisions} htmlFor={`${tier}-revisions`}>
                          <select
                            id={`${tier}-revisions`}
                            className="w-full rounded-lg border border-border-default bg-surface-default px-2 py-2 text-sm"
                            value={pkg.revisions}
                            onChange={(e) => setPackage(tier, { revisions: e.target.value })}
                          >
                            {[0, 1, 2, 3, 5, 10].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                            <option value={UNLIMITED_REVISIONS}>{t.work.unlimitedRevisions}</option>
                          </select>
                        </FormField>
                      </div>
                      <FormField label={t.work.packageFeatures} htmlFor={`${tier}-features`}>
                        <TextArea id={`${tier}-features`} rows={4} value={pkg.features} onChange={(e) => setPackage(tier, { features: e.target.value })} />
                      </FormField>
                    </>
                  )}
                </fieldset>
              );
            })}
          </div>
        </>,
      )}

      {section(
        t.work.extras,
        <ListEditor
          items={draft.extras}
          empty={{ title: '', price: '', extraDays: 0 }}
          max={8}
          addLabel={t.work.addExtra}
          onChange={(extras) => set('extras', extras)}
          render={(extra, update) => (
            <div className="grid flex-1 grid-cols-[1fr_8rem_6rem] gap-2">
              <Input aria-label={t.work.extraTitle} placeholder={t.work.extraTitle} value={extra.title} onChange={(e) => update({ ...extra, title: e.target.value })} />
              <Input aria-label={t.work.extraPrice} placeholder={t.work.extraPrice} inputMode="numeric" className="ltr" value={extra.price} onChange={(e) => update({ ...extra, price: e.target.value })} />
              <Input aria-label={t.work.packageDays} placeholder={t.work.packageDays} type="number" min={0} className="ltr" value={extra.extraDays} onChange={(e) => update({ ...extra, extraDays: Number(e.target.value) })} />
            </div>
          )}
        />,
      )}

      {section(
        t.work.faq,
        <ListEditor
          items={draft.faqs}
          empty={{ question: '', answer: '' }}
          max={10}
          addLabel={t.work.addFaq}
          onChange={(faqs) => set('faqs', faqs)}
          render={(faq, update) => (
            <div className="flex flex-1 flex-col gap-2">
              <Input aria-label={t.work.faqQuestion} placeholder={t.work.faqQuestion} value={faq.question} onChange={(e) => update({ ...faq, question: e.target.value })} />
              <TextArea aria-label={t.work.faqAnswer} placeholder={t.work.faqAnswer} rows={2} value={faq.answer} onChange={(e) => update({ ...faq, answer: e.target.value })} />
            </div>
          )}
        />,
      )}

      {section(
        t.work.requirementsLabel,
        <ListEditor
          items={draft.requirements}
          empty=""
          max={8}
          addLabel={t.work.addRequirement}
          onChange={(requirements) => set('requirements', requirements)}
          render={(question, update) => (
            <Input className="flex-1" aria-label={t.work.requirementsLabel} value={question} onChange={(e) => update(e.target.value)} />
          )}
        />,
        t.work.requirementsTitle,
      )}

      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-brand-green-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Link to="/dashboard/services">
          <Button type="button" variant="ghost">
            {t.common.cancel}
          </Button>
        </Link>
        <Button type="submit" variant="outline" isLoading={save.isPending && !submit.isPending}>
          <Save className="size-4" aria-hidden="true" />
          {t.work.saveDraft}
        </Button>
        {existing?.moderationStatus !== 'APPROVED' && (
          <Button type="button" isLoading={submit.isPending} onClick={(event) => void handleSave(event as unknown as FormEvent, true)}>
            <Send className="size-4" aria-hidden="true" />
            {t.work.submitForReview}
          </Button>
        )}
      </div>
    </form>
  );
}

/** A short editable list: rows with a remove button, and an add button under them. */
function ListEditor<T>({
  items,
  empty,
  max,
  addLabel,
  onChange,
  render,
}: {
  items: T[];
  empty: T;
  max: number;
  addLabel: string;
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void) => ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          {render(item, (next) => onChange(items.map((row, i) => (i === index ? next : row))))}
          <button
            type="button"
            className="rounded-lg p-2 text-text-tertiary hover:bg-surface-muted"
            aria-label={t.common.delete}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange([...items, empty])}>
          <Plus className="size-4" aria-hidden="true" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
