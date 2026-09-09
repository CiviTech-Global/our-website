import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2, Copy, FileUp, Info, Paperclip, Send, X } from 'lucide-react';
import { ApiError } from '@/config/api';
import { checkResumeAllowance, useSubmitResume } from '@/api/resumes';
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
  EmploymentType,
  ResumeAllowance,
  ResumePayload,
  WorkArrangement,
} from '@/types/resume';

const ACCEPT = '.pdf,.docx,.tex';
const MAX_MB = 10;

const EMPLOYMENT: EmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'VOLUNTEER',
];
const ARRANGEMENTS: WorkArrangement[] = ['ANY', 'ONSITE', 'HYBRID', 'REMOTE'];

type Errors = Record<string, string>;

const digitsOnly = (value: string) => normalizePersianDigits(value).replace(/\D/g, '');

export default function JoinUsPage() {
  const { t } = useLocale();
  const submit = useSubmitResume();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    province: '',
    birthYear: '',
    headline: '',
    yearsOfExperience: '',
    skills: '',
    desiredRole: '',
    employmentType: '' as EmploymentType | '',
    workArrangement: 'ANY' as WorkArrangement,
    expectedSalary: '',
    availableFrom: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
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

  /**
   * Asked when the email field loses focus. Someone who has spent their two
   * days should learn it here, not after filling a page and attaching a file.
   */
  async function checkAllowance() {
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    try {
      setAllowance(await checkResumeAllowance(email));
    } catch {
      // Advisory only. The server decides on submit either way, so a failure
      // here must not block anybody from trying.
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

    const payload: ResumePayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: digitsOnly(form.phone),
      city: form.city.trim() || undefined,
      province: form.province.trim() || undefined,
      birthYear: num(form.birthYear),
      headline: form.headline.trim() || undefined,
      yearsOfExperience: num(form.yearsOfExperience),
      // Comma or newline separated, whichever the person reaches for.
      skills: form.skills
        .split(/[,\n،]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30),
      desiredRole: form.desiredRole.trim() || undefined,
      employmentType: form.employmentType || undefined,
      workArrangement: form.workArrangement,
      expectedSalary: form.expectedSalary || undefined,
      availableFrom: form.availableFrom || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      githubUrl: form.githubUrl.trim() || undefined,
      portfolioUrl: form.portfolioUrl.trim() || undefined,
      coverNote: form.coverNote.trim() || undefined,
    };

    try {
      const res = await submit.mutateAsync({ payload, resume });
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setErrors({
        submit: error instanceof ApiError ? error.message : t.join.errSubmit,
      });
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <AnimatedSection>
          <Card className="text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-brand-green-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-text-primary">{t.join.successTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.join.successBody}</p>

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
              <Link to="/track">
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
    allowance?.known &&
    allowance.daysAllowed !== null &&
    allowance.daysUsed >= allowance.daysAllowed;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.join.title}</h1>
        <p className="mt-3 text-text-secondary">{t.join.subtitle}</p>
      </AnimatedSection>

      <AnimatedSection delay={0.05} className="mb-8">
        <Card className="border-brand-green-500/30 bg-brand-green-500/5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Info className="size-4 text-brand-green-500" aria-hidden="true" />
            {t.join.processTitle}
          </h2>
          <ol className="flex flex-col gap-1.5 text-sm text-text-secondary">
            {[t.join.step1, t.join.step2, t.join.step3].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="text-text-muted">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-text-muted">{t.join.limitNote}</p>
        </Card>
      </AnimatedSection>

      {/* The allowance warning, once the email is known. */}
      {exhausted && (
        <AnimatedSection className="mb-8">
          <Card className="border-brand-amber-500/40 bg-brand-amber-500/5">
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-brand-amber-500"
                aria-hidden="true"
              />
              {t.join.exhausted}
            </p>
          </Card>
        </AnimatedSection>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Section title={t.join.sectionYou}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.join.fullName} htmlFor="fullName" error={errors.fullName}>
              <Input
                id="fullName"
                value={form.fullName}
                invalid={!!errors.fullName}
                data-invalid={!!errors.fullName}
                onChange={(e) => set('fullName', e.target.value)}
              />
            </FormField>
            <FormField
              label={t.join.email}
              htmlFor="email"
              error={errors.email}
              hint={t.join.identityHint}
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
                onBlur={checkAllowance}
              />
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
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </FormField>
            <FormField label={t.join.birthYear} htmlFor="birthYear">
              <Input
                id="birthYear"
                inputMode="numeric"
                placeholder="1995"
                className="ltr text-start"
                value={form.birthYear}
                onChange={(e) => set('birthYear', digitsOnly(e.target.value).slice(0, 4))}
              />
            </FormField>
          </div>
        </Section>

        <Section title={t.join.sectionWork}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.join.headline} htmlFor="headline" hint={t.join.headlineHint}>
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => set('headline', e.target.value)}
              />
            </FormField>
            <FormField label={t.join.desiredRole} htmlFor="desiredRole">
              <Input
                id="desiredRole"
                value={form.desiredRole}
                onChange={(e) => set('desiredRole', e.target.value)}
              />
            </FormField>
            <FormField label={t.join.years} htmlFor="yearsOfExperience">
              <Input
                id="yearsOfExperience"
                inputMode="numeric"
                className="ltr text-start"
                value={form.yearsOfExperience}
                onChange={(e) => set('yearsOfExperience', digitsOnly(e.target.value).slice(0, 2))}
              />
            </FormField>
            <FormField label={t.join.employment} htmlFor="employmentType">
              <Select
                id="employmentType"
                value={form.employmentType}
                onChange={(e) => set('employmentType', e.target.value as EmploymentType | '')}
              >
                <option value="">{t.join.notSpecified}</option>
                {EMPLOYMENT.map((value) => (
                  <option key={value} value={value}>
                    {t.join.employmentTypes[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.join.arrangement} htmlFor="workArrangement">
              <Select
                id="workArrangement"
                value={form.workArrangement}
                onChange={(e) => set('workArrangement', e.target.value as WorkArrangement)}
              >
                {ARRANGEMENTS.map((value) => (
                  <option key={value} value={value}>
                    {t.join.arrangements[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={t.join.expectedSalary}
              htmlFor="expectedSalary"
              hint={t.join.optional}
            >
              <div className="relative">
                <Input
                  id="expectedSalary"
                  inputMode="numeric"
                  dir="ltr"
                  className="ltr text-start pe-14"
                  value={formatThousands(form.expectedSalary)}
                  onChange={(e) => set('expectedSalary', digitsOnly(e.target.value))}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-text-muted">
                  {t.join.currency}
                </span>
              </div>
            </FormField>
          </div>

          <FormField label={t.join.skills} htmlFor="skills" hint={t.join.skillsHint}>
            <TextArea
              id="skills"
              rows={2}
              value={form.skills}
              onChange={(e) => set('skills', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="LinkedIn" htmlFor="linkedinUrl">
              <Input
                id="linkedinUrl"
                dir="ltr"
                placeholder="https://"
                className="ltr text-start"
                value={form.linkedinUrl}
                onChange={(e) => set('linkedinUrl', e.target.value)}
              />
            </FormField>
            <FormField label="GitHub" htmlFor="githubUrl">
              <Input
                id="githubUrl"
                dir="ltr"
                placeholder="https://"
                className="ltr text-start"
                value={form.githubUrl}
                onChange={(e) => set('githubUrl', e.target.value)}
              />
            </FormField>
            <FormField label={t.join.portfolio} htmlFor="portfolioUrl">
              <Input
                id="portfolioUrl"
                dir="ltr"
                placeholder="https://"
                className="ltr text-start"
                value={form.portfolioUrl}
                onChange={(e) => set('portfolioUrl', e.target.value)}
              />
            </FormField>
          </div>
        </Section>

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
              <span className="shrink-0 text-xs text-text-muted">
                {(resume.size / 1024).toFixed(0)} KB
              </span>
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
            {t.join.submit}
          </Button>
          <p className="text-xs text-text-muted">{t.join.submitHint}</p>
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
