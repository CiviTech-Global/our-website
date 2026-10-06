import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Eye, Pencil, Plus, Users } from 'lucide-react';
import {
  useCloseJob,
  useCreateJob,
  useUpdateJob,
  useJobApplications,
  useOwnJobs,
  useOwnVerification,
  useSetApplicationOutcome,
  useSubmitJob,
  reviewFileUrls,
} from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toLatinDigits, toPersianDigits } from '@/i18n/utils';
import { IRAN_PROVINCES, provinceLabel } from '@/lib/iranProvinces';
import { DateField } from '@/components/ui/DateField';
import { FilePreview } from '@/components/ui/FilePreview';
import { features } from '@/lib/features';
import { daysUntil, formatNumber, placeText, salaryText } from '@/lib/jobFormat';
import { cn } from '@/lib/utils';
import { EMPTY_EXTRAS, extrasFromJob, extrasPayload, type JobExtrasDraft } from '@/lib/jobForm';
import { JobFormExtras } from '@/components/jobs/JobFormExtras';
import { CountrySelect, CurrencySelect, RegionField } from '@/components/jobs/GeoFields';
import { DEFAULT_CURRENCY } from '@/lib/geo';
import { useEmployerNote, usePipelineCounts } from '@/api/jobs';
import { formatMoney, moderationVariant, outcomeVariant, stateVariant } from '@/lib/marketplace';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type {
  ModerationStatus,
  JobEmploymentType,
  JobWorkArrangement,
  OwnJob,
} from '@/types/marketplace';

const EMPLOYMENT: JobEmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
];
const ARRANGEMENT: JobWorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE'];

const EMPTY_DRAFT = {
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
  category: '',
  closesAt: '',
  openings: '1',
  country: 'IR',
  currency: 'IRT',
  salaryPeriod: 'MONTH' as 'HOUR' | 'MONTH' | 'YEAR',
  remoteWorldwide: false,
};

/** What somebody typed into a money box, as the digit string the API takes. */
const moneyDigits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

const PAGE_SIZE = 10;
const MODERATION_STATUSES: ModerationStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

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

  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: '' } });
  const list = useClientList(jobs, controls, {
    searchFields: (job) => [job.title, job.code],
    filters: { status: (row, value) => row.moderationStatus === value },
    pageSize: PAGE_SIZE,
  });
  const create = useCreateJob();
  const updateJob = useUpdateJob();
  const submitJob = useSubmitJob();
  const closeJob = useCloseJob();

  /**
   * The posting being written: 'new' for a fresh one, the row itself for an
   * edit, null while the form is shut.
   *
   * One form for both, rather than a second dialog holding a second copy of
   * the rules about salaries — that a number alongside "undisclosed" states
   * two different things, and that an empty box is not a zero.
   */
  const [editing, setEditing] = useState<OwnJob | 'new' | null>(null);
  const [openApplicants, setOpenApplicants] = useState<string | null>(null);

  const isVerified = verification?.status === 'APPROVED';
  const num = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [extras, setExtras] = useState<JobExtrasDraft>(EMPTY_EXTRAS);
  const { data: pipeline } = usePipelineCounts(features.jobsV2);

  const set = (name: keyof typeof draft) => (value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  /** Opens the form on a fresh posting, or on one that already exists. */
  function openForm(target: OwnJob | 'new') {
    setEditing(target);
    setExtras(target === 'new' ? EMPTY_EXTRAS : extrasFromJob(target));
    setDraft(
      target === 'new'
        ? EMPTY_DRAFT
        : {
            title: target.title,
            description: target.description,
            employmentType: target.employmentType,
            workArrangement: target.workArrangement,
            province: target.province ?? '',
            city: target.city ?? '',
            // Digit strings on the wire, and an absent salary stays absent
            // rather than becoming a zero nobody typed.
            salaryMin: target.salaryMin ?? '',
            salaryMax: target.salaryMax ?? '',
            salaryUndisclosed: target.salaryUndisclosed,
            skills: target.skills.join('، '),
            category: target.category ?? '',
            // The date part only: the field speaks yyyy-mm-dd.
            closesAt: target.closesAt ? target.closesAt.slice(0, 10) : '',
            openings: String(target.openings),
            country: target.country ?? 'IR',
            currency: target.currency ?? 'IRT',
            salaryPeriod: target.salaryPeriod ?? 'MONTH',
            remoteWorldwide: target.remoteWorldwide ?? false,
          }
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    try {
      // An emptied box means "remove it" on an edit and "not given" on a new
      // posting. The edit sends null so the server clears the old value; before,
      // both sent nothing, and an emptied city kept the city it used to have.
      const isEdit = editing !== null && editing !== 'new';
      const blank = isEdit ? null : undefined;
      const text = (value: string) => value.trim() || blank;
      const money = (value: string) => (draft.salaryUndisclosed ? blank : moneyDigits(value) || blank);
      const openings = Number(toLatinDigits(draft.openings));

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        employmentType: draft.employmentType,
        workArrangement: draft.workArrangement,
        province: text(draft.province),
        city: text(draft.city),
        category: text(draft.category),
        closesAt: draft.closesAt || blank,
        openings: Number.isInteger(openings) && openings >= 1 ? openings : 1,
        // Where and in what money: sent only on the new board, whose form shows them.
        ...(features.jobsV2
          ? {
              country: draft.country,
              currency: draft.currency,
              salaryPeriod: draft.salaryPeriod,
              remoteWorldwide: draft.workArrangement === 'REMOTE' && draft.remoteWorldwide,
            }
          : {}),
        salaryUndisclosed: draft.salaryUndisclosed,
        // Suppressed rather than merely ignored when the salary is negotiable:
        // sending a number alongside "undisclosed" states two different things.
        salaryMin: money(draft.salaryMin),
        salaryMax: money(draft.salaryMax),
        skills: draft.skills
          // Both commas: somebody typing Persian gets the Persian one, and a
          // list split on the Latin comma alone arrives as a single skill.
          .split(/[,،]/)
          .map((skill) => skill.trim())
          .filter(Boolean),
      };

      if (editing && editing !== 'new') {
        await updateJob.mutateAsync({
          id: editing.id,
          payload: { ...payload, ...(features.jobsV2 ? extrasPayload(extras, null) : {}) },
        });
      } else {
        const more = features.jobsV2 ? extrasPayload(extras, undefined) : {};
        await create.mutateAsync({
          ...(more as Record<string, unknown>),
          ...payload,
          province: payload.province ?? undefined,
          city: payload.city ?? undefined,
          category: payload.category ?? undefined,
          closesAt: payload.closesAt ?? undefined,
          salaryMin: payload.salaryMin ?? undefined,
          salaryMax: payload.salaryMax ?? undefined,
        });
      }

      setEditing(null);
      showToast(editing === 'new' ? t.market.draftCreated : t.market.draftUpdated, 'success');
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.market.myJobs}
        description={t.app.memberDescriptions.myJobs}
        className="mb-2"
        actions={
          isVerified && (
            <Button onClick={() => openForm('new')}>
              <Plus className="size-4" aria-hidden="true" />
              {t.market.newJob}
            </Button>
          )
        }
      />

      {!isVerified && (
        <Card>
          <p className="text-body text-app-text-3">{t.market.verificationRequired}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.market.goToVerification}</Button>
          </Link>
        </Card>
      )}

      {(jobs?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.market.searchMyJobs}
          total={list.total}
          isLoading={isLoading}
          filters={
            <Select
              className="w-48"
              value={controls.filters.status}
              aria-label={t.app.filterByStatus}
              onChange={(e) => controls.setFilter('status', e.target.value)}
            >
              <option value="">{t.list.allOption}</option>
              {MODERATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t.market[value]}
                </option>
              ))}
            </Select>
          }
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && controls.activeCount > 0 && list.total === 0 ? (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      ) : null}

      {!isLoading && controls.activeCount === 0 && isVerified && jobs?.length === 0 && <EmptyState title={t.market.noJobs} />}

      <ul className="flex flex-col gap-3">
        {list.items.map((job) => (
          <li key={job.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {job.moderationStatus === 'APPROVED' ? (
                    <Link to={`/jobs/${job.code}`} className="font-medium text-app-text hover:underline">
                      {job.title}
                    </Link>
                  ) : (
                    <p className="font-medium text-app-text">{job.title}</p>
                  )}
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="app-mono">{job.code}</span>
                    {' · '}
                    {formatDate(job.createdAt, locale)}
                  </p>
                  <PostingFacts job={job} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={moderationVariant(job.moderationStatus)}>
                    {t.market[job.moderationStatus]}
                  </Badge>
                  <Badge variant={stateVariant(job.state)}>{t.market[job.state]}</Badge>
                </div>
              </div>

              {features.jobsV2 && job.moderationStatus === 'APPROVED' && (
                <PostingGauges job={job} counts={pipeline?.[job.id]} />
              )}

              {job.reviewNote && (
                <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                  <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
                  <p className="mt-1 text-body text-app-text">{job.reviewNote}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(job.moderationStatus === 'DRAFT' ||
                  job.moderationStatus === 'CHANGES_REQUESTED') && (
                  <>
                    {/* The same two statuses the server lets an author edit.
                        Before this the only way past a typo in a draft was to
                        leave it there. */}
                    <Button size="sm" variant="outline" onClick={() => openForm(job)}>
                      <Pencil className="size-4" aria-hidden="true" />
                      {t.common.edit}
                    </Button>
                    <Button
                      size="sm"
                      isLoading={submitJob.isPending}
                      onClick={() =>
                        void run(submitJob.mutateAsync(job.id), t.market.sentForReview)
                      }
                    >
                      {t.market.submitForReview}
                    </Button>
                  </>
                )}

                {job.moderationStatus === 'APPROVED' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenApplicants(job.id)}
                    >
                      <Users className="size-4" aria-hidden="true" />
                      {t.market.applicants} ({num(pipeline?.[job.id]?.total ?? job._count.applications)})
                      {(pipeline?.[job.id]?.unseen ?? 0) > 0 && (
                        <Badge variant="info">
                          {t.jobs.newApplicants.replace('{count}', num(pipeline![job.id].unseen))}
                        </Badge>
                      )}
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

      {list.totalPages > 1 && (
        <Pagination page={controls.page} totalPages={list.totalPages} onPageChange={controls.setPage} />
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.market.newJob : t.market.editJob}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
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

            {features.jobsV2 && (
              <FormField label={t.jobs.country} htmlFor="country">
                <CountrySelect
                  id="country"
                  value={draft.country}
                  onChange={(value) =>
                    // A new country starts its region afresh, and its usual currency.
                    setDraft((prev) => ({
                      ...prev,
                      country: value,
                      province: '',
                      currency: prev.salaryMin || prev.salaryMax ? prev.currency : (DEFAULT_CURRENCY[value] ?? prev.currency),
                    }))
                  }
                />
              </FormField>
            )}

            {features.jobsV2 && draft.country !== 'IR' ? (
              <FormField label={t.jobs.region} htmlFor="province">
                <RegionField id="province" country={draft.country} value={draft.province} onChange={(value) => set('province')(value)} />
              </FormField>
            ) : (
            <FormField label={t.market.province} htmlFor="province">
              <Select id="province" value={draft.province} onChange={(e) => set('province')(e.target.value)}>
                <option value="">—</option>
                {/* A posting written before the list existed keeps what it said,
                    rather than silently losing its province on the next save. */}
                {draft.province && !IRAN_PROVINCES.some((p) => p.fa === draft.province) && (
                  <option value={draft.province}>{draft.province}</option>
                )}
                {IRAN_PROVINCES.map((province) => (
                  <option key={province.slug} value={province.fa}>
                    {provinceLabel(province, locale)}
                  </option>
                ))}
              </Select>
            </FormField>
            )}

            {features.jobsV2 && draft.workArrangement === 'REMOTE' && (
              <label className="flex items-center gap-2 self-end pb-2 text-body text-app-text-3 sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 rounded border-app-border"
                  checked={draft.remoteWorldwide}
                  onChange={(e) => set('remoteWorldwide')(e.target.checked)}
                />
                {t.jobs.remoteWorldwideOption}
              </label>
            )}

            <FormField label={t.market.city} htmlFor="city">
              <Input id="city" value={draft.city} onChange={(e) => set('city')(e.target.value)} />
            </FormField>

            {/* The free-text tag gives way to the fixed list on the new board. */}
            {!features.jobsV2 && (
              <FormField label={t.market.category} htmlFor="category">
                <Input id="category" value={draft.category} onChange={(e) => set('category')(e.target.value)} />
              </FormField>
            )}

            <FormField label={t.jobs.openings} htmlFor="openings" hint={t.jobs.openingsHint}>
              <Input
                id="openings"
                inputMode="numeric"
                className="ltr"
                value={draft.openings}
                onChange={(e) => set('openings')(e.target.value)}
              />
            </FormField>

            <FormField label={t.market.closesAt} htmlFor="closesAt" hint={t.jobs.closesAtHint}>
              <DateField
                id="closesAt"
                value={draft.closesAt}
                // Tomorrow at the earliest: a deadline of today has already
                // passed by the time a reviewer publishes it.
                min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                onChange={(value) => set('closesAt')(value)}
              />
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

          {!draft.salaryUndisclosed && features.jobsV2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.jobs.currencyLabel} htmlFor="currency">
                <CurrencySelect id="currency" value={draft.currency} onChange={(value) => set('currency')(value)} />
              </FormField>
              <FormField label={t.jobs.salaryPeriodLabel} htmlFor="salaryPeriod">
                <Select id="salaryPeriod" value={draft.salaryPeriod} onChange={(e) => set('salaryPeriod')(e.target.value)}>
                  {(['MONTH', 'YEAR', 'HOUR'] as const).map((period) => (
                    <option key={period} value={period}>
                      {t.jobs.periodOptions[period]}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

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

          {features.jobsV2 && <JobFormExtras draft={extras} onChange={setExtras} />}

          <p className="text-label text-app-text-4">{t.market.submitWarning}</p>

          <div className="flex gap-2">
            <Button type="submit" isLoading={create.isPending || updateJob.isPending}>
              {t.market.saveDraft}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
  const [previewing, setPreviewing] = useState<{ id: string; filename: string } | null>(null);
  const v2 = features.jobsV2;

  async function decide(id: string, outcome: 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'DECLINED') {
    try {
      await setOutcome.mutateAsync({ id, outcome });
      if (v2) showToast(t.jobs.stageUpdated, 'success');
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
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* New to this employer: the inbox marks them seen as it opens,
                      so this is read from what the server said before that. */}
                  {v2 && !application.employerSeenAt && application.outcome !== 'WITHDRAWN' && (
                    <Badge variant="warning">{t.jobs.newBadge}</Badge>
                  )}
                  {v2 && application.skillMatch && application.skillMatch.total > 0 && (
                    <Badge variant={application.skillMatch.matched > 0 ? 'success' : 'default'}>
                      {t.jobs.skillFit
                        .replace('{matched}', String(application.skillMatch.matched))
                        .replace('{total}', String(application.skillMatch.total))}
                    </Badge>
                  )}
                  <Badge variant={outcomeVariant(application.outcome)}>
                    {t.market[application.outcome]}
                  </Badge>
                </div>
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
                <div className="mt-2">
                  {/* Opened through FilePreview, not a plain link: the route
                      needs the sign-in header a bare <a href> does not send. */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewing({ id: application.id, filename: application.cvOriginalName! })}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    {t.jobs.viewCv}: {application.cvOriginalName}
                  </Button>
                </div>
              )}

              {v2 && <EmployerNote applicationId={application.id} initial={application.employerNote ?? ''} />}

              {application.outcome !== 'WITHDRAWN' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/dashboard/messages/a/${application.id}`}>
                  <Button size="sm" variant="outline">
                    {t.market.sendMessageCta}
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => void decide(application.id, 'SHORTLISTED')}>
                  {t.market.shortlist}
                </Button>
                {v2 && (
                  <Button size="sm" variant="outline" onClick={() => void decide(application.id, 'INTERVIEW')}>
                    {t.jobs.inviteInterview}
                  </Button>
                )}
                <Button size="sm" onClick={() => void decide(application.id, 'ACCEPTED')}>
                  {t.market.accept}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void decide(application.id, 'DECLINED')}>
                  {t.market.decline}
                </Button>
              </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {previewing && (
        <FilePreview
          url={reviewFileUrls.employerApplicationCv(previewing.id)}
          filename={previewing.filename}
          onClose={() => setPreviewing(null)}
        />
      )}
    </Modal>
  );
}

/** The employer's private note on one candidate. Saved on demand, never shown to them. */
function EmployerNote({ applicationId, initial }: { applicationId: string; initial: string }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const save = useEmployerNote();
  const [note, setNote] = useState(initial);
  const dirty = note.trim() !== initial.trim();

  async function submit() {
    try {
      await save.mutateAsync({ id: applicationId, note });
      showToast(t.jobs.noteSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mt-3">
      <FormField label={t.jobs.employerNote} htmlFor={`note-${applicationId}`} hint={t.jobs.employerNoteHint}>
        <TextArea
          id={`note-${applicationId}`}
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>
      {dirty && (
        <Button size="sm" variant="outline" className="mt-2" isLoading={save.isPending} onClick={() => void submit()}>
          {t.jobs.saveNote}
        </Button>
      )}
    </div>
  );
}

/** Where, what kind and for how much — the line a reader of the advert sees first. */
function PostingFacts({ job }: { job: OwnJob }) {
  const { t, locale } = useLocale();
  const parts = [
    placeText(job, locale),
    t.market[job.employmentType],
    job.workArrangement !== 'ONSITE' ? t.market[job.workArrangement] : '',
    job.seniority ? t.jobs.seniorityLevels[job.seniority] : '',
    salaryText(job, locale, t) ?? '',
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <p className="mt-1 text-label text-app-text-3">{parts.join(' · ')}</p>;
}

/**
 * A posting's figures as a row of small gauges: how many looked, applied,
 * are new, shortlisted, invited — and how long it has left. Each figure a
 * readout, the way the rest of the dashboard shows numbers.
 */
function PostingGauges({
  job,
  counts,
}: {
  job: OwnJob;
  counts?: { total: number; unseen: number; byOutcome: Record<string, number> };
}) {
  const { t, locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const left = job.closesAt ? (daysUntil(job.closesAt) ?? -1) : null;
  const gauges: Array<{ label: string; value: string; tone?: 'attention' }> = [
    { label: t.jobs.viewsCount.replace('{count}', '').trim(), value: number(job.viewCount ?? 0) },
    { label: t.workspace.applicants, value: number(counts?.total ?? job._count.applications) },
    { label: t.workspace.newApplicants, value: number(counts?.unseen ?? 0), tone: (counts?.unseen ?? 0) > 0 ? 'attention' : undefined },
    { label: t.workspace.shortlisted, value: number(counts?.byOutcome.SHORTLISTED ?? 0) },
    { label: t.workspace.interviews, value: number(counts?.byOutcome.INTERVIEW ?? 0) },
    {
      label: t.market.closesAt,
      value: left === null ? t.jobs.noDeadline : left < 0 ? t.market.CLOSED : left === 0 ? t.jobs.closesToday : t.jobs.closesIn.replace('{n}', number(left)),
    },
  ];

  return (
    <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {gauges.map((gauge) => (
        <div key={gauge.label} className="min-w-0">
          <dt className="app-label truncate">{gauge.label}</dt>
          <dd
            className={cn(
              'app-readout mt-1 truncate px-2 py-0.5 text-body font-semibold',
              gauge.tone === 'attention' && 'text-status-warning',
            )}
          >
            {gauge.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
