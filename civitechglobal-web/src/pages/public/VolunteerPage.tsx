import { useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileUp,
  GraduationCap,
  HeartHandshake,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { apiErrorBody, apiMessage } from '@/lib/apiMessage';
import { checkResumeAllowance, useSubmitResume } from '@/api/resumes';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { normalizePersianDigits } from '@/lib/persian';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';
import {
  TALENT_DISCIPLINES,
  type ResumeAllowance,
  type ResumePayload,
  type TalentDiscipline,
  type WorkArrangement,
} from '@/types/resume';

const ACCEPT = '.pdf,.docx,.tex';
const MAX_MB = 10;
const ARRANGEMENTS: WorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE'];

type ProgrammeTrack = 'VOLUNTEER' | 'INTERNSHIP';
type Errors = Record<string, string>;

const digitsOnly = (value: string) => normalizePersianDigits(value).replace(/\D/g, '');
const isHttpUrl = (value: string) => /^https?:\/\/\S+\.\S+/i.test(value);

/** "TypeScript, React ،SQL" → ['TypeScript', 'React', 'SQL'], with the Persian comma too. */
const splitList = (value: string) =>
  value
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

/**
 * Joining as a volunteer or an intern.
 *
 * A separate page from "send your CV", because it is a different decision for
 * the person reading it — they are not answering a vacancy, they are asking
 * whether there is room to learn — but it sends to the same intake, so the
 * identity rules, the virus scan and the tracking code are the ones that
 * already work.
 *
 * It asks what a placement actually turns on: what kind of work, how many
 * hours, from when, and for how long. Only the first two are required. A
 * student who does not yet know how many months they can give should still be
 * able to apply.
 */
export default function VolunteerPage() {
  const { t } = useLocale();
  useDocumentTitle(t.volunteer.title, { description: t.seo.volunteer });
  const submit = useSubmitResume();

  const [track, setTrack] = useState<ProgrammeTrack>('INTERNSHIP');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    birthYear: '',
    discipline: '' as TalentDiscipline | '',
    hoursPerWeek: '',
    availableFrom: '',
    durationMonths: '',
    arrangement: '' as WorkArrangement | '',
    university: '',
    fieldOfStudy: '',
    skills: '',
    githubUrl: '',
    portfolioUrl: '',
    linkedinUrl: '',
    coverNote: '',
  });
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [allowance, setAllowance] = useState<ResumeAllowance | null>(null);
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: '' } : prev));
  };

  /** Advisory, on blur of the email. The server decides on submit either way. */
  async function checkAllowance(nextTrack: ProgrammeTrack = track) {
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    try {
      setAllowance(await checkResumeAllowance(email, nextTrack));
    } catch {
      setAllowance(null);
    }
  }

  function pickFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, resume: t.join.errFileBig }));
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx', 'tex'].includes(ext)) {
      setErrors((prev) => ({ ...prev, resume: t.join.errFileType }));
      return;
    }
    setResume(file);
    setErrors((prev) => ({ ...prev, resume: '' }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (form.fullName.trim().length < 2) next.fullName = t.join.errRequired;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = t.join.errEmail;
    if (digitsOnly(form.phone).length < 10) next.phone = t.join.errPhone;
    if (!form.discipline) next.discipline = t.volunteer.errDiscipline;

    const hours = Number(digitsOnly(form.hoursPerWeek));
    if (!hours || hours < 1 || hours > 60) next.hoursPerWeek = t.volunteer.errHours;

    for (const key of ['githubUrl', 'portfolioUrl', 'linkedinUrl'] as const) {
      const value = form[key].trim();
      if (value && !isHttpUrl(value)) next[key] = t.volunteer.errUrl;
    }

    if (!resume) next.resume = t.join.errFileRequired;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || !resume) {
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ block: 'center' });
      return;
    }

    const num = (value: string) => (value.trim() === '' ? undefined : Number(digitsOnly(value)));
    const text = (value: string) => value.trim() || undefined;

    const payload: ResumePayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: digitsOnly(form.phone),
      city: text(form.city),
      birthYear: num(form.birthYear),
      coverNote: text(form.coverNote),
      track,
      discipline: form.discipline || undefined,
      hoursPerWeek: num(form.hoursPerWeek),
      availableFrom: form.availableFrom || undefined,
      durationMonths: num(form.durationMonths),
      arrangement: form.arrangement || undefined,
      university: text(form.university),
      fieldOfStudy: text(form.fieldOfStudy),
      skills: splitList(form.skills),
      githubUrl: text(form.githubUrl),
      portfolioUrl: text(form.portfolioUrl),
      linkedinUrl: text(form.linkedinUrl),
    };

    try {
      const res = await submit.mutateAsync({ payload, resume });
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      // Map the server's per-field complaints back onto the fields, so a URL
      // it refused is marked where it was typed rather than in a banner.
      const fieldErrors = Object.fromEntries(
        (apiErrorBody(error)?.errors ?? []).map((issue) => [issue.path, issue.message])
      );
      setErrors({ ...fieldErrors, submit: apiMessage(error, t.join.errSubmit) });
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <AnimatedSection>
          <Card className="text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-brand-green-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-text-primary">{t.volunteer.successTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.volunteer.successBody}</p>

            <div className="mx-auto mt-6 max-w-xs rounded-xl border border-border-default bg-surface-50 p-4">
              <p className="text-xs text-text-muted">{t.join.trackingCode}</p>
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
                {copied ? t.join.copied : t.join.copy}
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={`/track?code=${result.trackingCode}`}>
                <Button variant="outline">{t.join.goTrack}</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost">{t.join.goHome}</Button>
              </Link>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  const exhausted =
    allowance?.known && allowance.daysAllowed !== null && allowance.daysUsed >= allowance.daysAllowed;

  const input = (key: keyof typeof form, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={key}
      value={form[key]}
      invalid={!!errors[key]}
      data-invalid={!!errors[key]}
      onChange={(e) => set(key, e.target.value as never)}
      {...props}
    />
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.volunteer.title}</h1>
        <p className="mt-3 text-text-secondary">{t.volunteer.subtitle}</p>
      </AnimatedSection>

      <AnimatedSection delay={0.05} className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <GraduationCap className="size-4 text-brand-green-500" aria-hidden="true" />
            {t.volunteer.forWhomTitle}
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-text-secondary">
            <li>{t.volunteer.forWhom1}</li>
            <li>{t.volunteer.forWhom2}</li>
            <li>{t.volunteer.forWhom3}</li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Sparkles className="size-4 text-brand-green-500" aria-hidden="true" />
            {t.volunteer.offerTitle}
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-text-secondary">
            <li>{t.volunteer.offer1}</li>
            <li>{t.volunteer.offer2}</li>
            <li>{t.volunteer.offer3}</li>
          </ul>
        </Card>
      </AnimatedSection>

      {exhausted && (
        <AnimatedSection className="mb-8">
          <Card className="border-brand-amber-500/40 bg-brand-amber-500/5">
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-amber-500" aria-hidden="true" />
              {t.join.exhausted}
            </p>
          </Card>
        </AnimatedSection>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Which programme ---------------------------------------------------- */}
        <Section title={t.volunteer.trackLabel}>
          <div role="radiogroup" aria-label={t.volunteer.trackLabel} className="grid gap-3 sm:grid-cols-2">
            {(['INTERNSHIP', 'VOLUNTEER'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={track === value}
                onClick={() => {
                  setTrack(value);
                  // The allowance is per track, so the answer may change.
                  void checkAllowance(value);
                }}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-4 text-start transition-colors',
                  track === value
                    ? 'border-brand-green-500 bg-brand-green-500/5'
                    : 'border-border-default hover:border-brand-green-500/50'
                )}
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  {value === 'INTERNSHIP' ? (
                    <GraduationCap className="size-4 text-brand-green-500" aria-hidden="true" />
                  ) : (
                    <HeartHandshake className="size-4 text-brand-green-500" aria-hidden="true" />
                  )}
                  {t.volunteer.tracks[value]}
                </span>
                <span className="text-sm text-text-secondary">
                  {value === 'INTERNSHIP' ? t.volunteer.trackInternshipDesc : t.volunteer.trackVolunteerDesc}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* Who ---------------------------------------------------------------- */}
        <Section title={t.join.sectionYou}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.join.fullName} htmlFor="fullName" error={errors.fullName}>
              {input('fullName')}
            </FormField>
            <FormField label={t.join.email} htmlFor="email" error={errors.email} hint={t.join.identityHint}>
              {input('email', {
                type: 'email',
                dir: 'ltr',
                className: 'ltr text-start',
                onBlur: () => void checkAllowance(),
              })}
            </FormField>
            <FormField label={t.join.phone} htmlFor="phone" error={errors.phone}>
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
            <FormField label={t.join.city} htmlFor="city">
              {input('city')}
            </FormField>
            <FormField label={t.join.birthYear} htmlFor="birthYear">
              <Input
                id="birthYear"
                inputMode="numeric"
                placeholder="2003"
                className="ltr text-start"
                value={form.birthYear}
                onChange={(e) => set('birthYear', digitsOnly(e.target.value).slice(0, 4))}
              />
            </FormField>
          </div>
        </Section>

        {/* The placement -------------------------------------------------------- */}
        <Section title={t.volunteer.sectionPlacement}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.volunteer.discipline} htmlFor="discipline" error={errors.discipline}>
              <Select
                id="discipline"
                value={form.discipline}
                invalid={!!errors.discipline}
                data-invalid={!!errors.discipline}
                onChange={(e) => set('discipline', e.target.value as TalentDiscipline | '')}
              >
                <option value="">{t.volunteer.choose}</option>
                {TALENT_DISCIPLINES.map((value) => (
                  <option key={value} value={value}>
                    {t.volunteer.disciplines[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={t.volunteer.hoursPerWeek}
              htmlFor="hoursPerWeek"
              error={errors.hoursPerWeek}
              hint={t.volunteer.hoursHint}
            >
              <Input
                id="hoursPerWeek"
                inputMode="numeric"
                placeholder="20"
                className="ltr text-start"
                value={form.hoursPerWeek}
                invalid={!!errors.hoursPerWeek}
                data-invalid={!!errors.hoursPerWeek}
                onChange={(e) => set('hoursPerWeek', digitsOnly(e.target.value).slice(0, 2))}
              />
            </FormField>
            <FormField label={t.volunteer.availableFrom} htmlFor="availableFrom">
              <DateField
                id="availableFrom"
                value={form.availableFrom}
                onChange={(next) => set('availableFrom', next)}
              />
            </FormField>
            <FormField
              label={t.volunteer.durationMonths}
              htmlFor="durationMonths"
              hint={t.volunteer.durationHint}
            >
              <Input
                id="durationMonths"
                inputMode="numeric"
                placeholder="6"
                className="ltr text-start"
                value={form.durationMonths}
                onChange={(e) => {
                  const value = digitsOnly(e.target.value).slice(0, 2);
                  set('durationMonths', value && Number(value) > 24 ? '24' : value);
                }}
              />
            </FormField>
            <FormField label={t.volunteer.arrangement} htmlFor="arrangement">
              <Select
                id="arrangement"
                value={form.arrangement}
                onChange={(e) => set('arrangement', e.target.value as WorkArrangement | '')}
              >
                <option value="">{t.volunteer.noPreference}</option>
                {ARRANGEMENTS.map((value) => (
                  <option key={value} value={value}>
                    {t.volunteer.arrangements[value]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </Section>

        {/* Study and skills ---------------------------------------------------- */}
        <Section title={t.volunteer.sectionStudy}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.volunteer.university} htmlFor="university">
              {input('university')}
            </FormField>
            <FormField label={t.volunteer.fieldOfStudy} htmlFor="fieldOfStudy">
              {input('fieldOfStudy')}
            </FormField>
          </div>
          <FormField label={t.volunteer.skills} htmlFor="skills" hint={t.volunteer.skillsHint}>
            {input('skills')}
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['githubUrl', 'portfolioUrl', 'linkedinUrl'] as const).map((key) => (
              <FormField key={key} label={t.volunteer[key]} htmlFor={key} error={errors[key]}>
                {input(key, { dir: 'ltr', placeholder: 'https://', className: 'ltr text-start' })}
              </FormField>
            ))}
          </div>
        </Section>

        {/* The CV --------------------------------------------------------------- */}
        <Section title={t.join.sectionResume} hint={t.join.resumeHint}>
          <label
            htmlFor="resume"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-default p-6 text-center transition-colors hover:border-brand-green-500/50"
          >
            <FileUp className="size-6 text-brand-green-500" aria-hidden="true" />
            <span className="text-sm font-medium text-text-primary">{t.join.chooseFile}</span>
            <span className="text-xs text-text-muted">{t.join.fileRules}</span>
            <input
              id="resume"
              type="file"
              accept={ACCEPT}
              className="hidden"
              data-invalid={!!errors.resume}
              onChange={(e) => {
                pickFile(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {errors.resume && (
            <p className="text-xs text-brand-red-500" role="alert">
              {errors.resume}
            </p>
          )}

          {resume && (
            <div className="flex items-center gap-3 rounded-lg border border-border-default p-2.5 text-sm">
              <Paperclip className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-text-primary">{resume.name}</span>
              <span className="shrink-0 text-xs text-text-muted">{(resume.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                aria-label={t.join.removeFile}
                onClick={() => setResume(null)}
                className="shrink-0 text-text-muted hover:text-brand-red-500"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <FormField label={t.join.coverNote} htmlFor="coverNote">
            <TextArea
              id="coverNote"
              rows={4}
              value={form.coverNote}
              onChange={(e) => set('coverNote', e.target.value)}
            />
          </FormField>
        </Section>

        {errors.submit && (
          <p
            className="rounded-lg border border-brand-red-500/40 bg-brand-red-500/5 p-3 text-sm text-brand-red-500"
            role="alert"
          >
            {errors.submit}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" isLoading={submit.isPending}>
            <Send className="size-4" />
            {t.volunteer.submit}
          </Button>
          <p className="text-xs text-text-muted">{t.join.submitHint}</p>
        </div>
      </form>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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
