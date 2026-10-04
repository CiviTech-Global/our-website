import { toLatinDigits } from '@/i18n/utils';
import type { EducationLevel, GenderRequirement, JobSeniority, MilitaryServiceRequirement } from '@/types/jobs';
import type { OwnJob } from '@/types/marketplace';

/**
 * The second-generation half of the posting form, as plain data: the draft
 * the form edits, how a saved posting fills it, and what it sends.
 */

export interface JobExtrasDraft {
  jobCategoryId: string;
  seniority: string;
  minExperienceYears: string;
  educationLevel: string;
  fieldOfStudy: string;
  workingHours: string;
  benefits: string[];
  urgent: boolean;
  genderRequirement: GenderRequirement;
  ageMin: string;
  ageMax: string;
  militaryService: MilitaryServiceRequirement;
  amriehEligible: boolean;
  disabilityFriendly: boolean;
}

export const EMPTY_EXTRAS: JobExtrasDraft = {
  jobCategoryId: '',
  seniority: '',
  minExperienceYears: '',
  educationLevel: '',
  fieldOfStudy: '',
  workingHours: '',
  benefits: [],
  urgent: false,
  genderRequirement: 'ANY',
  ageMin: '',
  ageMax: '',
  militaryService: 'ANY',
  amriehEligible: false,
  disabilityFriendly: false,
};

export function extrasFromJob(job: OwnJob): JobExtrasDraft {
  return {
    jobCategoryId: job.jobCategoryId ?? '',
    seniority: job.seniority ?? '',
    minExperienceYears: job.minExperienceYears != null ? String(job.minExperienceYears) : '',
    educationLevel: job.educationLevel ?? '',
    fieldOfStudy: job.fieldOfStudy ?? '',
    workingHours: job.workingHours ?? '',
    benefits: job.benefits ?? [],
    urgent: job.urgent ?? false,
    genderRequirement: job.genderRequirement ?? 'ANY',
    ageMin: job.ageMin != null ? String(job.ageMin) : '',
    ageMax: job.ageMax != null ? String(job.ageMax) : '',
    militaryService: job.militaryService ?? 'ANY',
    amriehEligible: job.amriehEligible ?? false,
    disabilityFriendly: job.disabilityFriendly ?? false,
  };
}

/** A whole number typed in either set of digits, or nothing. */
function wholeNumber(value: string): number | undefined {
  const digits = toLatinDigits(value).trim();
  if (!digits) return undefined;
  const parsed = Number(digits);
  return Number.isInteger(parsed) ? parsed : undefined;
}

/**
 * What the extras send. `blank` is what an empty field becomes: null on an
 * edit, so the server clears it; undefined on a new posting, which has
 * nothing to clear.
 */
export function extrasPayload(draft: JobExtrasDraft, blank: null | undefined) {
  const text = (value: string) => value.trim() || blank;
  const number = (value: string) => wholeNumber(value) ?? blank;
  return {
    jobCategoryId: draft.jobCategoryId || blank,
    seniority: (draft.seniority || blank) as JobSeniority | null | undefined,
    minExperienceYears: number(draft.minExperienceYears),
    educationLevel: (draft.educationLevel || blank) as EducationLevel | null | undefined,
    fieldOfStudy: text(draft.fieldOfStudy),
    workingHours: text(draft.workingHours),
    benefits: draft.benefits,
    urgent: draft.urgent,
    genderRequirement: draft.genderRequirement,
    ageMin: number(draft.ageMin),
    ageMax: number(draft.ageMax),
    militaryService: draft.militaryService,
    amriehEligible: draft.amriehEligible,
    disabilityFriendly: draft.disabilityFriendly,
  };
}
