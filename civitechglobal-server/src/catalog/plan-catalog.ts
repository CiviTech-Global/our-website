/**
 * What each tier allows: the features, how each one counts, and the limits.
 *
 * Seeded into plan_features / plan_feature_levels by `seedPlanCatalog`, which
 * updates names, kinds and limits but never prices. Prices are set by staff on
 * the Plans page (or imported with `npm run plans:prices -- <file>`) and are
 * deliberately not in this file: the repository is public, and a price list
 * belongs on the pricing page the day it is meant to be seen, not in a commit.
 *
 * Kinds follow the wording of the pricing workbook:
 *   "… to list", "items to list", shops      → STOCK   (live at the same time)
 *   "… to post", "… to bet on", "… to ask"   → MONTHLY (in the last 30 days)
 *   the free tier's "only the very first one" → LIFETIME, live for 45 days
 *
 * Never limited, and so absent: browsing shops and the map, insurance, asking
 * us to build software, and booking consultations.
 */

export type PlanSubjectKey = 'USER' | 'BUSINESS' | 'COMPANY';
export type PlanTierKey = 'FREE' | 'PRO' | 'PREMIUM' | 'VIP';
export type PlanLimitKindKey = 'STOCK' | 'MONTHLY' | 'LIFETIME';

export const PLAN_TIERS: PlanTierKey[] = ['FREE', 'PRO', 'PREMIUM', 'VIP'];

export interface LevelDef {
  kind: PlanLimitKindKey;
  /** null = unlimited. */
  limit: number | null;
  liveDays?: number;
}

export interface FeatureDef {
  key: FeatureKey;
  subject: PlanSubjectKey;
  name: string;
  nameEn: string;
  levels: Record<PlanTierKey, LevelDef>;
}

const stock = (free: number, pro: number, premium: number, vip: number): Record<PlanTierKey, LevelDef> => ({
  FREE: { kind: 'STOCK', limit: free },
  PRO: { kind: 'STOCK', limit: pro },
  PREMIUM: { kind: 'STOCK', limit: premium },
  VIP: { kind: 'STOCK', limit: vip },
});

const monthly = (free: number, pro: number, premium: number, vip: number): Record<PlanTierKey, LevelDef> => ({
  FREE: { kind: 'MONTHLY', limit: free },
  PRO: { kind: 'MONTHLY', limit: pro },
  PREMIUM: { kind: 'MONTHLY', limit: premium },
  VIP: { kind: 'MONTHLY', limit: vip },
});

/** "Only the very first one, live for the first 45 days", then monthly. */
const firstOneThenMonthly = (pro: number, premium: number, vip: number): Record<PlanTierKey, LevelDef> => ({
  FREE: { kind: 'LIFETIME', limit: 1, liveDays: FREE_FIRST_POST_LIVE_DAYS },
  PRO: { kind: 'MONTHLY', limit: pro },
  PREMIUM: { kind: 'MONTHLY', limit: premium },
  VIP: { kind: 'MONTHLY', limit: vip },
});

export const FREE_FIRST_POST_LIVE_DAYS = 45;

export const FEATURE_KEYS = [
  'user.job_applications',
  'user.project_bids',
  'user.service_requests',
  'user.book_requests',
  'user.job_posts',
  'user.projects',
  'user.service_listings',
  'user.book_listings',
  'business.shops',
  'business.items',
  'business.job_posts',
  'business.projects',
  'company.job_posts',
  'company.projects',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const PLAN_CATALOG: FeatureDef[] = [
  // --- Users ---------------------------------------------------------------
  {
    key: 'user.job_applications',
    subject: 'USER',
    name: 'درخواست برای آگهی‌های استخدام (ماهانه)',
    nameEn: 'Job applications per month',
    // Free raised from the workbook's 3: employers are the paying side, and a
    // thin applicant pool is what makes them leave.
    levels: monthly(10, 20, 45, 100),
  },
  {
    key: 'user.project_bids',
    subject: 'USER',
    name: 'پیشنهاد روی پروژه‌ها (ماهانه)',
    nameEn: 'Project bids per month',
    levels: monthly(3, 20, 40, 100),
  },
  {
    key: 'user.service_requests',
    subject: 'USER',
    name: 'درخواست خرید بستهٔ خدمات فریلنسرها (ماهانه)',
    nameEn: 'Requests to buy freelancer service packages per month',
    levels: monthly(3, 5, 15, 35),
  },
  {
    key: 'user.book_requests',
    subject: 'USER',
    name: 'درخواست خرید کتاب (ماهانه)',
    nameEn: 'Requests to buy books per month',
    levels: monthly(3, 5, 10, 20),
  },
  {
    key: 'user.job_posts',
    subject: 'USER',
    name: 'ثبت آگهی استخدام (ماهانه)',
    nameEn: 'Job posts per month',
    levels: monthly(1, 5, 10, 20),
  },
  {
    key: 'user.projects',
    subject: 'USER',
    name: 'ثبت پروژه (ماهانه)',
    nameEn: 'Projects posted per month',
    levels: monthly(1, 5, 12, 25),
  },
  {
    key: 'user.service_listings',
    subject: 'USER',
    name: 'بستهٔ خدمات فعال برای فروش',
    nameEn: 'Service packages listed for sale',
    levels: stock(1, 8, 16, 30),
  },
  {
    key: 'user.book_listings',
    subject: 'USER',
    name: 'کتاب فعال برای فروش',
    nameEn: 'Books listed for sale',
    levels: stock(3, 10, 25, 50),
  },

  // --- Business owners -------------------------------------------------------
  {
    key: 'business.shops',
    subject: 'BUSINESS',
    name: 'تعداد فروشگاه',
    nameEn: 'Shops',
    levels: stock(1, 2, 5, 10),
  },
  {
    key: 'business.items',
    subject: 'BUSINESS',
    name: 'کالا و خدمت فعال در فروشگاه‌ها',
    nameEn: 'Products and services listed in shops',
    levels: stock(10, 25, 40, 100),
  },
  {
    key: 'business.job_posts',
    subject: 'BUSINESS',
    name: 'آگهی استخدام به نام فروشگاه',
    nameEn: 'Job posts as a shop',
    levels: firstOneThenMonthly(5, 10, 25),
  },
  {
    key: 'business.projects',
    subject: 'BUSINESS',
    name: 'پروژه به نام فروشگاه',
    nameEn: 'Projects posted as a shop',
    levels: firstOneThenMonthly(5, 10, 25),
  },

  // --- Companies -------------------------------------------------------------
  {
    key: 'company.job_posts',
    subject: 'COMPANY',
    name: 'آگهی استخدام شرکت',
    nameEn: 'Company job posts',
    levels: firstOneThenMonthly(5, 10, 25),
  },
  {
    key: 'company.projects',
    subject: 'COMPANY',
    name: 'پروژهٔ شرکت',
    nameEn: 'Company projects',
    levels: firstOneThenMonthly(5, 10, 25),
  },
];

/**
 * Discount for paying several months up front. Prepaid periods rather than
 * automatic renewal, because recurring card charges are not generally
 * available in Iran.
 */
export const PERIOD_DISCOUNT_PERCENT: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 20 };
export const PLAN_PERIODS = Object.keys(PERIOD_DISCOUNT_PERCENT).map(Number);

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
