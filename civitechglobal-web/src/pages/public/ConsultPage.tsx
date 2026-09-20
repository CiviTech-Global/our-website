import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarClock, CheckCircle2, Copy, Plus, Sparkles, X } from 'lucide-react';
import {
  usePublicExperts,
  useRequestConsultation,
  type AvailabilityWindow,
  type ConsultationMode,
  type ConsultationTopic,
  type DayPart,
} from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { normalizeIranMobile, normalizePersianDigits } from '@/lib/persian';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

const TOPICS: ConsultationTopic[] = ['CAREER', 'TECHNICAL', 'STARTING_OUT', 'HIRING', 'OTHER'];
const MODES: ConsultationMode[] = ['ONLINE', 'PHONE', 'IN_PERSON'];
const PARTS: DayPart[] = ['MORNING', 'AFTERNOON', 'EVENING'];
const MAX_WINDOWS = 6;

/**
 * Asking for a consultation.
 *
 * No account, no calendar to hunt through, and no message afterwards — so the
 * page ends on the tracking code, which is the only thread back to the
 * request. It says that plainly rather than burying it in a confirmation
 * sentence people skim.
 *
 * Availability is asked for as a few rough windows rather than an exact time:
 * an exact time from a stranger whose week we cannot see has usually moved by
 * the time anybody rings, while "Tuesday afternoon" survives.
 */
export default function ConsultPage() {
  const { t } = useLocale();
  useDocumentTitle(t.consult.title, { description: t.consult.metaDescription });

  const [params] = useSearchParams();
  const { data: experts } = usePublicExperts();
  const submit = useRequestConsultation();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    topic: 'CAREER' as ConsultationTopic,
    preferredMode: 'ONLINE' as ConsultationMode,
    goal: '',
    background: '',
    // Pre-selected when somebody arrives from a profile page.
    expertSlug: params.get('expert') ?? '',
  });
  const [windows, setWindows] = useState<AvailabilityWindow[]>([{ day: '', part: 'MORNING' }]);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ trackingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (name: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const bookable = (experts ?? []).filter((expert) => expert.acceptsConsultations);

  function setWindow(index: number, patch: Partial<AvailabilityWindow>) {
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const filled = windows.filter((w) => w.day);
    if (filled.length === 0) {
      setError(t.consult.needWindow);
      return;
    }

    const phone = normalizeIranMobile(form.phone);
    if (!phone) {
      setError(t.insurance.phoneInvalid);
      return;
    }

    try {
      const result = await submit.mutateAsync({
        fullName: form.fullName.trim(),
        phone,
        // Blank is not the same as absent to the server's schema, and blank is
        // the one that fails.
        email: form.email.trim() || undefined,
        topic: form.topic,
        preferredMode: form.preferredMode,
        goal: form.goal.trim() || undefined,
        background: form.background.trim() || undefined,
        expertSlug: form.expertSlug || undefined,
        availability: filled,
      });
      setReceipt(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(apiMessage(err, t.consult.errSubmit));
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <AnimatedSection>
          <Card className="text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-brand-green-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-text-primary">{t.consult.doneTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.consult.doneBody}</p>

            <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border-default bg-surface-muted p-4">
              <p className="text-xs text-text-muted">{t.consult.codeLabel}</p>
              <p className="ltr mt-1 font-mono text-2xl font-bold tracking-widest text-text-primary">
                {receipt.trackingCode}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  void navigator.clipboard?.writeText(receipt.trackingCode).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                <Copy className="size-4" aria-hidden="true" />
                {copied ? t.upload.copied : t.upload.copyDetails}
              </Button>
            </div>

            {/* The code is the whole thread back: no message is coming. */}
            <p className="mx-auto mt-4 max-w-md text-sm text-text-secondary">{t.consult.codeKeep}</p>

            <Link to="/track" className="mt-6 inline-block">
              <Button variant="outline">{t.consult.trackCta}</Button>
            </Link>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t.consult.title}</h1>
        <p className="mt-2 text-text-secondary">{t.consult.subtitle}</p>
      </header>

      <Card className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sparkles className="size-4 text-brand-green-500" aria-hidden="true" />
          {t.consult.howTitle}
        </h2>
        <ol className="flex flex-col gap-2 text-sm text-text-secondary">
          <li>۱ — {t.consult.howSteps.one}</li>
          <li>۲ — {t.consult.howSteps.two}</li>
          <li>۳ — {t.consult.howSteps.three}</li>
        </ol>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <FormField label={t.consult.topicLabel} htmlFor="topic">
            <Select id="topic" value={form.topic} onChange={(e) => set('topic')(e.target.value)}>
              {TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {t.consult.topics[topic]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t.consult.goalLabel} htmlFor="goal" hint={t.consult.goalHint}>
            <TextArea id="goal" rows={3} value={form.goal} onChange={(e) => set('goal')(e.target.value)} />
          </FormField>

          <FormField
            label={t.consult.backgroundLabel}
            htmlFor="background"
            hint={t.consult.backgroundHint}
          >
            <Input
              id="background"
              value={form.background}
              onChange={(e) => set('background')(e.target.value)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.consult.modeLabel} htmlFor="mode">
              <Select
                id="mode"
                value={form.preferredMode}
                onChange={(e) => set('preferredMode')(e.target.value)}
              >
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t.consult.modes[mode]}
                  </option>
                ))}
              </Select>
            </FormField>

            {bookable.length > 0 && (
              <FormField label={t.consult.expertLabel} htmlFor="expert">
                <Select
                  id="expert"
                  value={form.expertSlug}
                  onChange={(e) => set('expertSlug')(e.target.value)}
                >
                  <option value="">{t.consult.expertAny}</option>
                  {bookable.map((expert) => (
                    <option key={expert.slug} value={expert.slug}>
                      {expert.fullName}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <CalendarClock className="size-4 text-brand-green-500" aria-hidden="true" />
              {t.consult.availabilityTitle}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t.consult.availabilityHint}</p>
          </div>

          <ul className="flex flex-col gap-3">
            {windows.map((window, index) => (
              <li key={index} className="flex flex-wrap items-end gap-3">
                <FormField label={t.consult.dayLabel} htmlFor={`day-${index}`} className="min-w-44 flex-1">
                  <DateField
                    id={`day-${index}`}
                    value={window.day}
                    onChange={(next) => setWindow(index, { day: next })}
                  />
                </FormField>

                <FormField
                  label={t.consult.partLabel}
                  htmlFor={`part-${index}`}
                  className="min-w-36 flex-1"
                >
                  <Select
                    id={`part-${index}`}
                    value={window.part}
                    onChange={(e) => setWindow(index, { part: e.target.value as DayPart })}
                  >
                    {PARTS.map((part) => (
                      <option key={part} value={part}>
                        {t.consult.parts[part]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {windows.length > 1 && (
                  <button
                    type="button"
                    aria-label={t.consult.removeWindow}
                    className="mb-1 rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary"
                    onClick={() => setWindows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {windows.length < MAX_WINDOWS && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWindows((prev) => [...prev, { day: '', part: 'MORNING' }])}
              >
                <Plus className="size-4" aria-hidden="true" />
                {t.consult.addWindow}
              </Button>
              <p className="mt-2 text-xs text-text-muted">
                {t.consult.windowsLeft.replace('{count}', String(MAX_WINDOWS - windows.length))}
              </p>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.consult.nameLabel} htmlFor="fullName">
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => set('fullName')(e.target.value)}
              />
            </FormField>

            <FormField label={t.consult.phoneLabel} htmlFor="phone" hint={t.consult.phoneHint}>
              <Input
                id="phone"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09xxxxxxxxx"
                value={form.phone}
                // Persian digits are what an Iranian keyboard produces; the
                // server wants ASCII.
                onChange={(e) => set('phone')(normalizePersianDigits(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label={t.consult.emailLabel} htmlFor="email">
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          </FormField>
        </Card>

        {error && (
          <p className="rounded-lg border border-brand-red-500/40 bg-brand-red-500/5 px-4 py-3 text-sm text-brand-red-500" role="alert">
            {error}
          </p>
        )}

        <div>
          <Button type="submit" size="lg" isLoading={submit.isPending}>
            {submit.isPending ? t.consult.submitting : t.consult.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
