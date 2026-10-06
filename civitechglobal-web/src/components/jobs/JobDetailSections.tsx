import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { BadgeCheck, Check, Clock, GraduationCap, Share2, Sparkles, Users, Zap } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { categoryName, fill, formatNumber, placeText, salaryText } from '@/lib/jobFormat';
import { Badge } from '@/components/ui/Badge';
import { CompanyLogo, SaveJobButton } from '@/components/jobs/JobUi';
import type { JobMatch } from '@/types/jobs';
import type { PublicJobDetail } from '@/types/marketplace';

/**
 * The parts of a posting the second-generation board shows: who is hiring and
 * how they answer, the facts at a glance, what it offers and asks for, and how
 * the reader's own skills compare.
 */

/** Company, place and the two things to do with a posting besides applying. */
export function JobHeader({ job }: { job: PublicJobDetail }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const company = job.company?.name ?? job.companyName;
  // A worldwide remote role is "anywhere", whatever office it is attached to.
  const where = job.remoteWorldwide && job.workArrangement === 'REMOTE' ? t.jobs.remoteWorldwide : placeText(job, locale);

  async function share() {
    const url = window.location.href;
    // The phone's own share sheet where there is one; a copied link otherwise.
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {
        // Dismissed, or refused: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.jobs.linkCopied, 'success');
    } catch {
      showToast(t.common.error, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <CompanyLogo name={company} logoUrl={job.company?.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {job.urgent && (
              <Badge variant="danger">
                <Zap className="size-3" aria-hidden="true" />
                {t.jobs.urgent}
              </Badge>
            )}
            {job.responsiveness?.responsive && (
              <Badge variant="success">
                <BadgeCheck className="size-3" aria-hidden="true" />
                {t.jobs.responsiveEmployer}
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">{job.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {job.company ? (
              <Link to={`/companies/${encodeURIComponent(job.company.slug)}`} className="font-medium hover:underline">
                {company}
              </Link>
            ) : (
              company
            )}
            {company && where && ' · '}
            {where}
          </p>
          {job.responsiveness?.responsive && job.responsiveness.rate !== null && (
            <p className="mt-1 text-xs text-text-tertiary">
              {fill(t.jobs.responsiveHint, { rate: formatNumber(Math.round(job.responsiveness.rate * 100), locale) })}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <SaveJobButton jobId={job.id} withLabel className="border border-border-default" />
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-default p-2 text-sm text-text-secondary transition hover:bg-surface-muted"
        >
          <Share2 className="size-5" aria-hidden="true" />
          {t.jobs.share}
        </button>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-text-primary">{children}</dd>
    </div>
  );
}

/** The facts somebody scans before reading a word of the description. */
export function JobFacts({ job }: { job: PublicJobDetail }) {
  const { t, locale } = useLocale();
  const pay = salaryText(job, locale, t);
  // A worldwide remote role is "anywhere", whatever office it is attached to.
  const where = job.remoteWorldwide && job.workArrangement === 'REMOTE' ? t.jobs.remoteWorldwide : placeText(job, locale);
  const experience =
    job.minExperienceYears == null || job.minExperienceYears === 0
      ? t.jobs.notRequired
      : fill(t.jobs.yearsOrMore, { n: formatNumber(job.minExperienceYears, locale) });

  return (
    <section aria-labelledby="facts-heading">
      <h2 id="facts-heading" className="mb-3 text-lg font-semibold text-text-primary">
        {t.jobs.keyFacts}
      </h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {job.jobCategory && <Fact label={t.jobs.category}>{categoryName(job.jobCategory, locale)}</Fact>}
        <Fact label={t.market.employmentType}>{t.market[job.employmentType]}</Fact>
        <Fact label={t.market.workArrangement}>{t.market[job.workArrangement]}</Fact>
        {job.seniority && <Fact label={t.jobs.seniority}>{t.jobs.seniorityLevels[job.seniority]}</Fact>}
        <Fact label={t.jobs.minExperience}>{experience}</Fact>
        {where && <Fact label={t.jobs.location}>{where}</Fact>}
        {pay && <Fact label={t.market.salary}>{pay}</Fact>}
        {job.workingHours && <Fact label={t.jobs.workingHours}>{job.workingHours}</Fact>}
        {(job.openings ?? 1) > 1 && <Fact label={t.jobs.openings}>{formatNumber(job.openings ?? 1, locale)}</Fact>}
        {job.closesAt && <Fact label={t.market.closesAt}>{formatDate(job.closesAt, locale)}</Fact>}
      </dl>
    </section>
  );
}

export function JobBenefits({ job }: { job: PublicJobDetail }) {
  const { t } = useLocale();
  const known = (job.benefits ?? []).filter((key): key is keyof typeof t.jobs.benefitLabels => key in t.jobs.benefitLabels);
  if (known.length === 0) return null;
  return (
    <section aria-labelledby="benefits-heading">
      <h2 id="benefits-heading" className="mb-3 text-lg font-semibold text-text-primary">
        {t.jobs.benefits}
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {known.map((key) => (
          <li key={key} className="flex items-center gap-2 text-sm text-text-secondary">
            <Check className="size-4 shrink-0 text-brand-green-600" aria-hidden="true" />
            {t.jobs.benefitLabels[key]}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the role asks of the person, said only where it asks something. */
export function JobRequirements({ job }: { job: PublicJobDetail }) {
  const { t, locale } = useLocale();
  const rows: Array<[string, string]> = [];
  if (job.educationLevel) {
    rows.push([
      t.jobs.education,
      job.fieldOfStudy
        ? `${t.jobs.educationLevels[job.educationLevel]} — ${job.fieldOfStudy}`
        : t.jobs.educationLevels[job.educationLevel],
    ]);
  } else if (job.fieldOfStudy) {
    rows.push([t.jobs.fieldOfStudy, job.fieldOfStudy]);
  }
  if (job.genderRequirement && job.genderRequirement !== 'ANY') {
    rows.push([t.jobs.gender, t.jobs.genders[job.genderRequirement]]);
  }
  if (job.ageMin != null || job.ageMax != null) {
    const min = job.ageMin != null ? formatNumber(job.ageMin, locale) : '';
    const max = job.ageMax != null ? formatNumber(job.ageMax, locale) : '';
    rows.push([
      t.jobs.age,
      min && max ? fill(t.jobs.ageRange, { min, max }) : min ? fill(t.jobs.ageFrom, { min }) : fill(t.jobs.ageTo, { max }),
    ]);
  }
  if (job.militaryService && job.militaryService !== 'ANY') {
    rows.push([t.jobs.militaryService, t.jobs.militaryOptions[job.militaryService]]);
  }

  const notes = [job.amriehEligible && t.jobs.amrieh, job.disabilityFriendly && t.jobs.disabilityFriendly].filter(
    (note): note is string => Boolean(note),
  );
  if (rows.length === 0 && notes.length === 0) return null;

  return (
    <section aria-labelledby="requirements-heading">
      <h2 id="requirements-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-primary">
        <GraduationCap className="size-5 text-text-tertiary" aria-hidden="true" />
        {t.jobs.requirements}
      </h2>
      {rows.length > 0 && (
        <dl className="divide-y divide-border-default rounded-xl border border-border-default">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-text-tertiary">{label}</dt>
              <dd className="text-end font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {notes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {notes.map((note) => (
            <Badge key={note} variant="info">
              <Users className="size-3" aria-hidden="true" />
              {note}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The posting's skills, with the reader's own marked.
 *
 * "You have 4 of 6" is the single most useful sentence on a job page for the
 * person deciding whether to apply — and the two it lacks are the useful part
 * of the answer.
 */
export function JobSkills({ job, match, signedIn }: { job: PublicJobDetail; match?: JobMatch; signedIn: boolean }) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  if (job.skills.length === 0) return null;
  const have = new Set((match?.matched ?? []).map((skill) => skill.toLowerCase()));

  return (
    <section aria-labelledby="skills-heading">
      <h2 id="skills-heading" className="mb-3 text-lg font-semibold text-text-primary">
        {t.market.skills}
      </h2>
      {signedIn && match && (
        <div className="mb-3 rounded-xl border border-border-default p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Sparkles className="size-4 text-brand-green-600" aria-hidden="true" />
            {match.hasProfileSkills
              ? fill(t.jobs.matchSummary, {
                  matched: formatNumber(match.matched.length, locale),
                  total: formatNumber(match.total, locale),
                })
              : t.jobs.matchNoSkills}
          </p>
          {match.hasProfileSkills && match.total > 0 && (
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={match.total}
              aria-valuenow={match.matched.length}
              aria-label={t.jobs.matchTitle}
            >
              <div
                className="h-full rounded-full bg-brand-green-500"
                style={{ width: `${Math.round((match.matched.length / match.total) * 100)}%` }}
              />
            </div>
          )}
          {!match.hasProfileSkills && (
            <Link to="/dashboard/profile" className="mt-2 inline-block text-sm text-brand-green-600 hover:underline">
              {t.jobs.editProfile}
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {(expanded ? job.skills : job.skills.slice(0, 16)).map((skill) => (
          <Badge key={skill} variant={have.has(skill.toLowerCase()) ? 'success' : 'default'}>
            {have.has(skill.toLowerCase()) && <Check className="size-3" aria-hidden="true" />}
            {skill}
          </Badge>
        ))}
        {job.skills.length > 16 && !expanded && (
          <button type="button" className="text-sm text-brand-green-600 hover:underline" onClick={() => setExpanded(true)}>
            +{formatNumber(job.skills.length - 16, locale)}
          </button>
        )}
      </div>
    </section>
  );
}

/** When it went up, how many looked, how many applied. */
export function JobMeta({ job }: { job: PublicJobDetail }) {
  const { t, locale } = useLocale();
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
      {job.publishedAt && (
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          {t.market.postedOn} {formatDate(job.publishedAt, locale)}
        </span>
      )}
      <span className="ltr font-mono">{job.code}</span>
    </p>
  );
}
