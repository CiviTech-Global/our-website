import type { PublicJobSummary } from './marketplace';

/**
 * The job board's second generation, as the API sends it.
 *
 * The posting types themselves stay in types/marketplace, where they were;
 * what is here is new: the fixed vocabularies, company pages, saved jobs,
 * alerts and recommendations.
 */

export type JobSeniority = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'EXECUTIVE';
export type EducationLevel = 'DIPLOMA' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE';
export type GenderRequirement = 'ANY' | 'MALE' | 'FEMALE';
export type MilitaryServiceRequirement = 'ANY' | 'COMPLETED_OR_EXEMPT';
export type CompanySize =
  | 'SIZE_1_10'
  | 'SIZE_11_50'
  | 'SIZE_51_200'
  | 'SIZE_201_500'
  | 'SIZE_501_1000'
  | 'SIZE_1000_PLUS';

export const SENIORITY_LEVELS: JobSeniority[] = ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE'];
export const EDUCATION_LEVELS: EducationLevel[] = ['DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'];
export const COMPANY_SIZES: CompanySize[] = [
  'SIZE_1_10',
  'SIZE_11_50',
  'SIZE_51_200',
  'SIZE_201_500',
  'SIZE_501_1000',
  'SIZE_1000_PLUS',
];

/** Same keys, same order as the server's catalog/job-taxonomy JOB_BENEFITS. */
export const JOB_BENEFITS = [
  'INSURANCE',
  'SUPPLEMENTARY_INSURANCE',
  'LOAN',
  'BONUS',
  'COMMISSION',
  'OVERTIME_PAY',
  'FLEXIBLE_HOURS',
  'REMOTE_DAYS',
  'TRAINING',
  'CAREER_GROWTH',
  'EQUITY',
  'MEALS',
  'SHUTTLE',
  'SPORTS',
  'GIFT_CARDS',
  'OCCASION_GIFTS',
  'FOREIGN_CURRENCY_PAY',
  'HOUSING',
  'CHILDCARE',
  'PARKING',
] as const;
export type JobBenefit = (typeof JOB_BENEFITS)[number];

/** Same keys as the server's COMPANY_INDUSTRIES. */
export const COMPANY_INDUSTRIES = [
  'SOFTWARE_INTERNET',
  'TELECOM',
  'ECOMMERCE',
  'FINTECH_BANKING',
  'INSURANCE',
  'INVESTMENT',
  'ACCOUNTING_CONSULTING',
  'MANAGEMENT_CONSULTING',
  'LEGAL_SERVICES',
  'RECRUITMENT_HR',
  'MARKETING_ADVERTISING',
  'MEDIA_PUBLISHING',
  'EDUCATION',
  'HEALTHCARE',
  'PHARMACEUTICAL',
  'MEDICAL_DEVICES',
  'FMCG',
  'FOOD_BEVERAGE',
  'RETAIL',
  'WHOLESALE_TRADE',
  'AUTOMOTIVE',
  'MANUFACTURING',
  'OIL_GAS_PETROCHEMICAL',
  'CHEMICALS',
  'MINING_METALS',
  'ENERGY_UTILITIES',
  'CONSTRUCTION',
  'ARCHITECTURE_DESIGN',
  'REAL_ESTATE',
  'TRANSPORT_LOGISTICS',
  'TRAVEL_HOSPITALITY',
  'RESTAURANTS',
  'AGRICULTURE',
  'TEXTILES',
  'HOME_APPLIANCES',
  'COSMETICS_FASHION',
  'GAMING_ENTERTAINMENT',
  'NONPROFIT',
  'GOVERNMENT',
  'OTHER',
] as const;
export type CompanyIndustry = (typeof COMPANY_INDUSTRIES)[number];

export interface JobCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  parentId: string | null;
  position: number;
  _count: { jobs: number };
}

/** What a posting carries of its company. Absent when there is none, or it is hidden. */
export interface CompanySummary {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export interface Responsiveness {
  rate: number | null;
  sample: number;
  responsive: boolean;
}

export interface CompanyListItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  industry: CompanyIndustry | null;
  size: CompanySize | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  openJobs: number;
}

export type CompanyJob = PublicJobSummary;

export interface PublicCompany {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  industry: CompanyIndustry | null;
  size: CompanySize | null;
  foundedYear: number | null;
  website: string | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  createdAt: string;
  jobs: CompanyJob[];
  responsiveness: Responsiveness;
  hiredCount: number;
}

export interface OwnCompany {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  industry: CompanyIndustry | null;
  size: CompanySize | null;
  foundedYear: number | null;
  website: string | null;
  province: string | null;
  city: string | null;
  hidden: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  _count: { jobs: number };
}

export interface CompanyPayload {
  name: string;
  tagline?: string | null;
  about?: string | null;
  industry?: CompanyIndustry | null;
  size?: CompanySize | null;
  foundedYear?: number | string | null;
  website?: string | null;
  province?: string | null;
  city?: string | null;
}

/** A posting as a card: every list of jobs sends the same row. */
export type JobCard = PublicJobSummary;

export interface SavedJobEntry {
  savedAt: string;
  open: boolean;
  job: JobCard;
}

export interface AlertQuery {
  search?: string;
  province?: string;
  jobCategoryId?: string;
  employmentType?: string;
  workArrangement?: string;
  seniority?: string;
  salaryMin?: string;
}

export interface JobAlert {
  id: string;
  name: string;
  query: AlertQuery;
  active: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface RecommendedJobs {
  basis: 'skills' | 'activity' | 'none';
  items: Array<JobCard & { match: { matched: number; total: number } }>;
}

export interface JobMatch {
  matched: string[];
  missing: string[];
  total: number;
  hasProfileSkills: boolean;
}

/** Per posting: how many applied, how many unread, how many at each stage. */
export type PipelineCounts = Record<string, { total: number; unseen: number; byOutcome: Record<string, number> }>;
