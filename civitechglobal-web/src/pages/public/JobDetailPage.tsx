import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Briefcase, MapPin, ShieldCheck } from 'lucide-react';
import { useApply, useOwnVerification, usePublicJob } from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema, jobPostingSchema } from '@/lib/structuredData';
import { localeHref } from '@/i18n/localePath';
import { LOCALE_TAGS } from '@/i18n/locales';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/i18n/utils';
import { formatRange } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { AuthorCard } from '@/components/marketplace/AuthorCard';
import { ListingStats } from '@/components/marketplace/ListingStats';
import { SimilarListings } from '@/components/marketplace/SimilarListings';

/**
 * One posting, and the form to answer it.
 *
 * The apply form is only reachable once two things are true — signed in, and
 * verified — and each is said plainly with the way out of it, rather than
 * letting somebody write a cover letter and then meet a 403.
 */
export default function JobDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: job, isLoading, isError } = usePublicJob(code);
  const { data: verification } = useOwnVerification(Boolean(user));
  const apply = useApply();

  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [done, setDone] = useState(false);

  /**
   * A job opening is the one page here with a search surface of its own:
   * Google's job panel reads JobPosting markup directly, and a listing without
   * it is a plain blue link next to competitors that appear as cards.
   */
  const jsonLd = job
    ? [
        jobPostingSchema(job, {
          origin: CANONICAL_ORIGIN,
          url: `${CANONICAL_ORIGIN}${localeHref(locale, `/jobs/${job.code}`)}`,
          locale: LOCALE_TAGS[locale],
          siteName: SITE_NAME.en,
        }),
        breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.market.jobsTitle, path: localeHref(locale, '/jobs') },
          { name: job.title, path: localeHref(locale, `/jobs/${job.code}`) },
        ]),
      ].filter((entry): entry is object => entry !== null)
    : undefined;

  useDocumentTitle(job?.title ?? t.market.jobsTitle, {
    // The posting's own text, trimmed to what a result will show. Falling back
    // to the board's description would give every opening the same summary.
    description: job?.description.replace(/s+/g, ' ').slice(0, 155) ?? t.seo.jobs,
    type: 'article',
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/jobs" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.market.backToJobs}
        </Link>
      </div>
    );
  }

  const pay = job.salaryUndisclosed
    ? t.market.salaryUndisclosed
    : formatRange(job.salaryMin, job.salaryMax, locale, t);
  const where = [job.city, job.province].filter(Boolean).join('، ');
  const isVerified = verification?.status === 'APPROVED';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!job) return;

    try {
      await apply.mutateAsync({
        jobId: job.id,
        // Empty strings are not an answer — the server's schema treats an
        // absent optional and a blank one differently, and blank is the one
        // that fails validation.
        payload: {
          coverLetter: coverLetter.trim() || undefined,
          expectedSalary: expectedSalary.replace(/[^0-9]/g, '') || undefined,
        },
        cv,
      });
      setDone(true);
      showToast(t.market.applied, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.market.backToJobs}
      </Link>

      <Card>
        <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          {job.companyName && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-3.5" aria-hidden="true" />
              {job.companyName}
            </span>
          )}
          {where && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {where}
            </span>
          )}
          <span className="ltr font-mono text-xs text-text-muted">{job.code}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="info">{t.market[job.employmentType]}</Badge>
          <Badge>{t.market[job.workArrangement]}</Badge>
          {pay && <Badge variant="success">{pay}</Badge>}
          {job.category && <Badge>{job.category}</Badge>}
        </div>

        <div className="mt-3">
          <ListingStats
            views={job.viewCount}
            responses={job._count.applications}
            variant="applications"
            responsesLabel={t.market.applicationsLabel}
          />
        </div>

        <p className="mt-6 whitespace-pre-line leading-7 text-text-primary">{job.description}</p>

        {job.skills.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-text-secondary">{t.market.skills}</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {job.closesAt && (
          <p className="mt-6 text-sm text-text-muted">
            {t.market.closesAt}: {formatDate(job.closesAt, locale)}
          </p>
        )}
      </Card>

      {job.authorProfile && (
        <div className="mt-6">
          <AuthorCard profile={job.authorProfile} />
        </div>
      )}

      {job.similar.length > 0 && (
        <div className="mt-6">
          <SimilarListings title={t.market.similarJobs} basePath="/jobs" items={job.similar} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.market.apply}</CardTitle>
        </CardHeader>

        {!user && (
          <Link to="/login">
            <Button variant="outline">{t.market.loginToApply}</Button>
          </Link>
        )}

        {user && !isVerified && (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t.market.verificationRequired}
            </p>
            <Link to="/dashboard/verification">
              <Button variant="outline">{t.market.goToVerification}</Button>
            </Link>
          </div>
        )}

        {user && isVerified && done && (
          <p className="text-sm text-brand-green-600">{t.market.applied}</p>
        )}

        {user && isVerified && !done && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormField label={t.market.coverLetter} htmlFor="coverLetter">
              <TextArea
                id="coverLetter"
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </FormField>

            <FormField label={t.market.expectedSalary} htmlFor="expectedSalary">
              <Input
                id="expectedSalary"
                inputMode="numeric"
                className="ltr"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
              />
            </FormField>

            <FormField label={t.market.cv} htmlFor="cv">
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              />
            </FormField>

            <div>
              <Button type="submit" isLoading={apply.isPending}>
                {t.market.apply}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
