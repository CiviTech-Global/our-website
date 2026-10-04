import { useJobCategories } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import type { JobExtrasDraft } from '@/lib/jobForm';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { JobCategorySelect } from '@/components/jobs/JobUi';
import { EDUCATION_LEVELS, JOB_BENEFITS, SENIORITY_LEVELS } from '@/types/jobs';

/**
 * The posting form's second-generation fields, in the order a reader of the
 * advert scans them: what the role is, what it asks, what it offers, and any
 * special conditions. Every one optional except the category, which the
 * board files the posting under.
 */
export function JobFormExtras({
  draft,
  onChange,
}: {
  draft: JobExtrasDraft;
  onChange: (next: JobExtrasDraft) => void;
}) {
  const { t } = useLocale();
  const { data: categories } = useJobCategories();
  const set = <K extends keyof JobExtrasDraft>(key: K, value: JobExtrasDraft[K]) => onChange({ ...draft, [key]: value });
  const heading = 'border-t border-app-border-light pt-4 text-label font-semibold text-app-text-3';

  return (
    <>
      <p className={heading}>{t.jobs.sectionBasics}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.jobs.category} htmlFor="jobCategoryId">
          <JobCategorySelect
            id="jobCategoryId"
            categories={categories}
            value={draft.jobCategoryId}
            onChange={(value) => set('jobCategoryId', value)}
            placeholder={t.jobs.chooseCategory}
          />
        </FormField>
        <FormField label={t.jobs.seniority} htmlFor="seniority">
          <Select id="seniority" value={draft.seniority} onChange={(e) => set('seniority', e.target.value)}>
            <option value="">—</option>
            {SENIORITY_LEVELS.map((value) => (
              <option key={value} value={value}>
                {t.jobs.seniorityLevels[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.jobs.workingHours} htmlFor="workingHours">
          <Input
            id="workingHours"
            maxLength={160}
            placeholder={t.jobs.workingHoursPlaceholder}
            value={draft.workingHours}
            onChange={(e) => set('workingHours', e.target.value)}
          />
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2 text-body text-app-text-3">
          <input
            type="checkbox"
            className="size-4 rounded border-app-border"
            checked={draft.urgent}
            onChange={(e) => set('urgent', e.target.checked)}
          />
          {t.jobs.urgentOnly}
        </label>
      </div>

      <p className={heading}>{t.jobs.sectionRequirements}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.jobs.minExperienceLabel} htmlFor="minExperienceYears">
          <Input
            id="minExperienceYears"
            inputMode="numeric"
            className="ltr"
            value={draft.minExperienceYears}
            onChange={(e) => set('minExperienceYears', e.target.value)}
          />
        </FormField>
        <FormField label={t.jobs.education} htmlFor="educationLevel">
          <Select id="educationLevel" value={draft.educationLevel} onChange={(e) => set('educationLevel', e.target.value)}>
            <option value="">{t.jobs.notRequired}</option>
            {EDUCATION_LEVELS.map((value) => (
              <option key={value} value={value}>
                {t.jobs.educationLevels[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.jobs.fieldOfStudy} htmlFor="fieldOfStudy">
          <Input
            id="fieldOfStudy"
            maxLength={120}
            value={draft.fieldOfStudy}
            onChange={(e) => set('fieldOfStudy', e.target.value)}
          />
        </FormField>
        <FormField label={t.jobs.gender} htmlFor="genderRequirement">
          <Select
            id="genderRequirement"
            value={draft.genderRequirement}
            onChange={(e) => set('genderRequirement', e.target.value as JobExtrasDraft['genderRequirement'])}
          >
            {(['ANY', 'MALE', 'FEMALE'] as const).map((value) => (
              <option key={value} value={value}>
                {t.jobs.genders[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.jobs.ageMinLabel} htmlFor="ageMin">
          <Input
            id="ageMin"
            inputMode="numeric"
            className="ltr"
            value={draft.ageMin}
            onChange={(e) => set('ageMin', e.target.value)}
          />
        </FormField>
        <FormField label={t.jobs.ageMaxLabel} htmlFor="ageMax">
          <Input
            id="ageMax"
            inputMode="numeric"
            className="ltr"
            value={draft.ageMax}
            onChange={(e) => set('ageMax', e.target.value)}
          />
        </FormField>
        <FormField label={t.jobs.militaryService} htmlFor="militaryService">
          <Select
            id="militaryService"
            value={draft.militaryService}
            onChange={(e) => set('militaryService', e.target.value as JobExtrasDraft['militaryService'])}
          >
            {(['ANY', 'COMPLETED_OR_EXEMPT'] as const).map((value) => (
              <option key={value} value={value}>
                {t.jobs.militaryOptions[value]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <p className={heading}>{t.jobs.benefits}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {JOB_BENEFITS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="size-4 rounded border-app-border"
              checked={draft.benefits.includes(key)}
              onChange={(e) =>
                set(
                  'benefits',
                  e.target.checked ? [...draft.benefits, key] : draft.benefits.filter((item) => item !== key),
                )
              }
            />
            {t.jobs.benefitLabels[key]}
          </label>
        ))}
      </div>

      <p className={heading}>{t.jobs.sectionSpecial}</p>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-body text-app-text-3">
          <input
            type="checkbox"
            className="size-4 rounded border-app-border"
            checked={draft.amriehEligible}
            onChange={(e) => set('amriehEligible', e.target.checked)}
          />
          {t.jobs.amrieh}
        </label>
        <label className="flex items-center gap-2 text-body text-app-text-3">
          <input
            type="checkbox"
            className="size-4 rounded border-app-border"
            checked={draft.disabilityFriendly}
            onChange={(e) => set('disabilityFriendly', e.target.checked)}
          />
          {t.jobs.disabilityFriendly}
        </label>
      </div>
    </>
  );
}
