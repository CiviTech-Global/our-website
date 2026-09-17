import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Plus, Users } from 'lucide-react';
import {
  useCloseJob,
  useCreateJob,
  useJobApplications,
  useOwnJobs,
  useOwnVerification,
  useSetApplicationOutcome,
  useSubmitJob,
} from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant, outcomeVariant, stateVariant } from '@/lib/marketplace';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

const EMPLOYMENT: JobEmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
];
const ARRANGEMENT: JobWorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE'];

/**
 * What an employer sees of their own postings.
 *
 * Drafts included, which the public board never shows — this is the only place
 * the moderation state is visible to the person it concerns, along with the
 * reviewer's note when one came back.
 */
export default function MyJobsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.myJobs);
  const { showToast } = useToast();

  const { data: verification } = useOwnVerification();
  const { data: jobs, isLoading } = useOwnJobs();
  const create = useCreateJob();
  const submitJob = useSubmitJob();
  const closeJob = useCloseJob();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openApplicants, setOpenApplicants] = useState<string | null>(null);

  const isVerified = verification?.status === 'APPROVED';
  const num = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  const [draft, setDraft] = useState({
    title: '',
    description: '',
    employmentType: 'FULL_TIME' as JobEmploymentType,
    workArrangement: 'ONSITE' as JobWorkArrangement,
    province: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    salaryUndisclosed: false,
    skills: '',
  });

  const set = (name: keyof typeof draft) => (value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({
        title: draft.title.trim(),
        description: draft.description.trim(),
        employmentType: draft.employmentType,
        workArrangement: draft.workArrangement,
        province: draft.province.trim() || undefined,
        city: draft.city.trim() || undefined,
        salaryUndisclosed: draft.salaryUndisclosed,
        // Suppressed rather than merely ignored when the salary is negotiable:
        // sending a number alongside "undisclosed" states two different things.
        salaryMin: draft.salaryUndisclosed
          ? undefined
          : draft.salaryMin.replace(/[^0-9]/g, '') || undefined,
        salaryMax: draft.salaryUndisclosed
          ? undefined
          : draft.salaryMax.replace(/[^0-9]/g, '') || undefined,
        skills: draft.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      });
      setIsFormOpen(false);
      showToast(t.market.draftCreated, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-page font-semibold text-app-text">{t.market.myJobs}</h1>
        {isVerified && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t.market.newJob}
          </Button>
        )}
      </div>

      {!isVerified && (
        <Card>
          <p className="text-body text-app-text-3">{t.market.verificationRequired}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.market.goToVerification}</Button>
          </Link>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && isVerified && jobs?.length === 0 && <EmptyState title={t.market.noJobs} />}

      <ul className="flex flex-col gap-3">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{job.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">{job.code}</span>
                    {' · '}
                    {formatDate(job.createdAt, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={moderationVariant(job.moderationStatus)}>
                    {t.market[job.moderationStatus]}
                  </Badge>
                  <Badge variant={stateVariant(job.state)}>{t.market[job.state]}</Badge>
                </div>
              </div>

              {job.reviewNote && (
                <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                  <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
                  <p className="mt-1 text-body text-app-text">{job.reviewNote}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(job.moderationStatus === 'DRAFT' ||
                  job.moderationStatus === 'CHANGES_REQUESTED') && (
                  <Button
                    size="sm"
                    isLoading={submitJob.isPending}
                    onClick={() =>
                      void run(submitJob.mutateAsync(job.id), t.market.sentForReview)
                    }
                  >
                    {t.market.submitForReview}
                  </Button>
                )}

                {job.moderationStatus === 'APPROVED' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenApplicants(job.id)}
                    >
                      <Users className="size-4" aria-hidden="true" />
                      {t.market.applicants} ({num(job._count.applications)})
                    </Button>
                    {job.state === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void run(closeJob.mutateAsync(job.id), t.market.CLOSED)}
                      >
                        {t.market.closeListing}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={t.market.newJob}>
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <FormField label={t.market.title} htmlFor="title">
            <Input
              id="title"
              required
              value={draft.title}
              onChange={(e) => set('title')(e.target.value)}
            />
          </FormField>

          <FormField label={t.market.description} htmlFor="description">
            <TextArea
              id="description"
              required
              rows={6}
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.market.employmentType} htmlFor="employmentType">
              <Select
                id="employmentType"
                value={draft.employmentType}
                onChange={(e) => set('employmentType')(e.target.value)}
              >
                {EMPLOYMENT.map((value) => (
                  <option key={value} value={value}>
                    {t.market[value]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t.market.workArrangement} htmlFor="workArrangement">
              <Select
                id="workArrangement"
                value={draft.workArrangement}
                onChange={(e) => set('workArrangement')(e.target.value)}
              >
                {ARRANGEMENT.map((value) => (
                  <option key={value} value={value}>
                    {t.market[value]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t.market.province} htmlFor="province">
              <Input
                id="province"
                value={draft.province}
                onChange={(e) => set('province')(e.target.value)}
              />
            </FormField>

            <FormField label={t.market.city} htmlFor="city">
              <Input id="city" value={draft.city} onChange={(e) => set('city')(e.target.value)} />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="size-4 rounded border-app-border"
              checked={draft.salaryUndisclosed}
              onChange={(e) => set('salaryUndisclosed')(e.target.checked)}
            />
            {t.market.salaryUndisclosed}
          </label>

          {!draft.salaryUndisclosed && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={`${t.market.salary} (${t.market.from})`} htmlFor="salaryMin">
                <Input
                  id="salaryMin"
                  inputMode="numeric"
                  className="ltr"
                  value={draft.salaryMin}
                  onChange={(e) => set('salaryMin')(e.target.value)}
                />
              </FormField>
              <FormField label={`${t.market.salary} (${t.market.to})`} htmlFor="salaryMax">
                <Input
                  id="salaryMax"
                  inputMode="numeric"
                  className="ltr"
                  value={draft.salaryMax}
                  onChange={(e) => set('salaryMax')(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <FormField label={t.market.skills} htmlFor="skills" hint="node, postgres, react">
            <Input
              id="skills"
              value={draft.skills}
              onChange={(e) => set('skills')(e.target.value)}
            />
          </FormField>

          <p className="text-label text-app-text-4">{t.market.submitWarning}</p>

          <div className="flex gap-2">
            <Button type="submit" isLoading={create.isPending}>
              {t.market.saveDraft}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </Modal>

      {openApplicants && (
        <ApplicantsModal jobId={openApplicants} onClose={() => setOpenApplicants(null)} />
      )}
    </div>
  );
}

/** The employer's inbox for one posting. Approved applications only. */
function ApplicantsModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data, isLoading } = useJobApplications(jobId);
  const setOutcome = useSetApplicationOutcome();

  async function decide(id: string, outcome: 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED') {
    try {
      await setOutcome.mutateAsync({ id, outcome });
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.market.applicants}>
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.market.noApplicants} />}

      <ul className="flex flex-col gap-3">
        {data?.map((application) => (
          <li key={application.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">
                    {application.applicant.firstName} {application.applicant.lastName}
                  </p>
                  <p className="ltr text-label text-app-text-4">{application.applicant.email}</p>
                  {application.applicantProfile && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-label">
                      <Link
                        to={`/profiles/${application.applicantProfile.username}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        @{application.applicantProfile.username}
                      </Link>
                      {application.applicantProfile.verified && <VerifiedBadge />}
                      <RatingStars
                        avg={application.applicantProfile.ratingAvg}
                        count={application.applicantProfile.ratingCount}
                      />
                    </div>
                  )}
                </div>
                <Badge variant={outcomeVariant(application.outcome)}>
                  {t.market[application.outcome]}
                </Badge>
              </div>

              {application.expectedSalary && (
                <p className="mt-2 text-body text-app-text-3">
                  {t.market.expectedSalary}: {formatMoney(application.expectedSalary, locale)}{' '}
                  {t.market.currency}
                </p>
              )}

              {application.coverLetter && (
                <p className="mt-2 whitespace-pre-line text-body text-app-text">
                  {application.coverLetter}
                </p>
              )}

              {application.cvOriginalName && (
                <p className="mt-2 text-label text-app-text-4">
                  {t.market.cv}: {application.cvOriginalName}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/dashboard/messages/a/${application.id}`}>
                  <Button size="sm" variant="outline">
                    {t.market.sendMessageCta}
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => void decide(application.id, 'SHORTLISTED')}>
                  {t.market.shortlist}
                </Button>
                <Button size="sm" onClick={() => void decide(application.id, 'ACCEPTED')}>
                  {t.market.accept}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void decide(application.id, 'DECLINED')}>
                  {t.market.decline}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
