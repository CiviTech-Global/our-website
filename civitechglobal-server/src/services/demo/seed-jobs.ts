import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { hashPassword } from '../../utils/password.js';
import { emailLookupHash } from '../auth.service.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { IMAGE_EXTENSIONS, storeFiles } from '../attachment.service.js';
import { syncJobTaxonomy } from '../job-taxonomy.service.js';
import { placeholderPng } from './placeholder-image.js';
import type { DemoManifest } from './manifest.js';

/**
 * Demo data for the job board: enough to see every screen in every state.
 *
 * Employers with company pages in Iran and abroad; job-seekers with skills;
 * postings that between them use every field the board has — fixed
 * categories, seniority, experience, education, benefits, working hours,
 * urgent, featured, openings, requirements, amrieh, disability-friendliness,
 * deadlines near and far, pay in toman and in euros, dollars and dirhams, per
 * hour, month and year, remote within a country and worldwide — and every
 * moderation state the employer's dashboard and the staff queue show.
 *
 * Applications cover the whole pipeline (new, seen, shortlisted, interview,
 * accepted with a collaboration, declined, withdrawn, and two still with the
 * reviewers), so the employer's inbox, the applicant's stage tracker, the
 * "reviewing applications" and "responsive employer" signals and the home
 * dashboards all have something real to show. Saved jobs, alerts and
 * notifications fill the job-seeker's side.
 *
 * Every account signs in with demo-password; the addresses are on the
 * RFC 2606 reserved domain and can never be real.
 */

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

type Seniority = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'EXECUTIVE';
type Status = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';

interface DemoPerson {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  headline: string;
  skills?: string[];
}

const EMPLOYERS: DemoPerson[] = [
  { key: 'rayan', email: 'employer.rayan@demo.invalid', firstName: 'کامران', lastName: 'صدری', username: 'rayan_hr', headline: 'مدیر منابع انسانی' },
  { key: 'alborz', email: 'employer.alborz@demo.invalid', firstName: 'فرشته', lastName: 'نیک‌پور', username: 'alborz_food', headline: 'سرپرست جذب' },
  { key: 'sepahan', email: 'employer.sepahan@demo.invalid', firstName: 'بهرام', lastName: 'اصفهانی', username: 'sepahan_steel', headline: 'مدیر کارخانه' },
  { key: 'tabriz', email: 'employer.tabriz@demo.invalid', firstName: 'لیلا', lastName: 'آذری', username: 'tabriz_pharma', headline: 'مسئول استخدام' },
  { key: 'toos', email: 'employer.toos@demo.invalid', firstName: 'مجید', lastName: 'خراسانی', username: 'toos_dist', headline: 'مدیر فروش' },
  { key: 'nordlicht', email: 'employer.nordlicht@demo.invalid', firstName: 'Anna', lastName: 'Becker', username: 'nordlicht', headline: 'Head of People' },
  { key: 'gulf', email: 'employer.gulf@demo.invalid', firstName: 'Omar', lastName: 'Haddad', username: 'gulfbridge', headline: 'Operations Director' },
  { key: 'maple', email: 'employer.maple@demo.invalid', firstName: 'Emily', lastName: 'Clarke', username: 'maplehealth', headline: 'Clinic Manager' },
  { key: 'bogazici', email: 'employer.bogazici@demo.invalid', firstName: 'Mehmet', lastName: 'Yılmaz', username: 'bogazici_tech', headline: 'CTO' },
  // A verified individual with no company page: the card falls back to a name.
  { key: 'karaj', email: 'employer.karaj@demo.invalid', firstName: 'سعید', lastName: 'کرجی', username: 'karaj_cafe', headline: 'صاحب کافه' },
  // Owns a page staff have hidden, for the staff companies screen.
  { key: 'hidden', email: 'employer.hidden@demo.invalid', firstName: 'ناصر', lastName: 'پنهانی', username: 'hidden_co', headline: 'مدیرعامل' },
];

const CANDIDATES: DemoPerson[] = [
  { key: 'sara', email: 'candidate.sara@demo.invalid', firstName: 'سارا', lastName: 'احمدی', username: 'sara_dev', headline: 'برنامه‌نویس فرانت‌اند', skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js'] },
  { key: 'ali', email: 'candidate.ali@demo.invalid', firstName: 'علی', lastName: 'رضایی', username: 'ali_sales', headline: 'کارشناس فروش', skills: ['فروش', 'CRM', 'مذاکره', 'Excel'] },
  { key: 'maryam', email: 'candidate.maryam@demo.invalid', firstName: 'مریم', lastName: 'کاظمی', username: 'maryam_acc', headline: 'حسابدار', skills: ['حسابداری', 'سپیدار', 'Excel', 'مالیات'] },
  { key: 'reza', email: 'candidate.reza@demo.invalid', firstName: 'رضا', lastName: 'نوری', username: 'reza_data', headline: 'تحلیلگر داده', skills: ['Python', 'SQL', 'Power BI', 'Pandas', 'Airflow'] },
  { key: 'niloofar', email: 'candidate.niloofar@demo.invalid', firstName: 'نیلوفر', lastName: 'شریفی', username: 'niloofar_ux', headline: 'طراح محصول', skills: ['Figma', 'UI/UX', 'Design Systems', 'User Research'] },
  { key: 'hamid', email: 'candidate.hamid@demo.invalid', firstName: 'حمید', lastName: 'یزدانی', username: 'hamid_tech', headline: 'تکنسین نگهداری و تعمیرات', skills: ['جوشکاری', 'نت', 'PLC', 'هیدرولیک'] },
  { key: 'zahra', email: 'candidate.zahra@demo.invalid', firstName: 'زهرا', lastName: 'موسوی', username: 'zahra_rn', headline: 'پرستار', skills: ['Nursing', 'ICU', 'Patient Care', 'English'] },
  { key: 'omid', email: 'candidate.omid@demo.invalid', firstName: 'امید', lastName: 'حسینی', username: 'omid_ops', headline: 'مهندس DevOps', skills: ['Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform'] },
];

interface DemoCompany {
  owner: string;
  name: string;
  tagline: string;
  about: string;
  industry: string;
  size: 'SIZE_1_10' | 'SIZE_11_50' | 'SIZE_51_200' | 'SIZE_201_500' | 'SIZE_501_1000' | 'SIZE_1000_PLUS';
  foundedYear: number;
  website: string;
  country: string;
  province: string | null;
  city: string;
  hidden?: boolean;
}

const COMPANIES: DemoCompany[] = [
  {
    owner: 'rayan',
    name: 'رایان تمدن جهان‌گستر',
    tagline: 'نرم‌افزارهای سازمانی و خدمات ابری',
    about: 'تیمی صدنفره از مهندسان نرم‌افزار، طراحان و تحلیلگران که از سال ۱۳۹۵ برای بانک‌ها، بیمه‌ها و سازمان‌های دولتی نرم‌افزار می‌سازند. فرهنگ ما بر یادگیری مداوم، کار تیمی و احترام به زمان شخصی همکاران استوار است.',
    industry: 'SOFTWARE_INTERNET',
    size: 'SIZE_51_200',
    foundedYear: 1395,
    website: 'https://example.com/rayan',
    country: 'IR',
    province: 'تهران',
    city: 'تهران',
  },
  {
    owner: 'alborz',
    name: 'صنایع غذایی البرز قزوین',
    tagline: 'تولیدکنندهٔ لبنیات و کنسرو از ۱۳۷۰',
    about: 'کارخانه‌ای با بیش از ۳۰۰ همکار در شهرک صنعتی البرز قزوین که محصولاتش در سراسر ایران و پنج کشور همسایه عرضه می‌شود.',
    industry: 'FOOD_BEVERAGE',
    size: 'SIZE_201_500',
    foundedYear: 1370,
    website: 'https://example.com/alborz',
    country: 'IR',
    province: 'قزوین',
    city: 'البرز',
  },
  {
    owner: 'sepahan',
    name: 'فولاد سپاهان نوین',
    tagline: 'تولید ورق و مقاطع فولادی',
    about: 'یکی از بزرگ‌ترین تولیدکنندگان خصوصی فولاد در اصفهان، با تأکید بر ایمنی، نوآوری و توسعهٔ مهارت کارکنان.',
    industry: 'MINING_METALS',
    size: 'SIZE_1000_PLUS',
    foundedYear: 1382,
    website: 'https://example.com/sepahan',
    country: 'IR',
    province: 'اصفهان',
    city: 'اصفهان',
  },
  {
    owner: 'tabriz',
    name: 'داروسازی آذر تبریز',
    tagline: 'داروهای ژنریک و مکمل‌ها',
    about: 'تولیدکنندهٔ دارو با استانداردهای GMP و آزمایشگاه کنترل کیفیت مستقل، با بیش از ۶۰۰ همکار.',
    industry: 'PHARMACEUTICAL',
    size: 'SIZE_501_1000',
    foundedYear: 1376,
    website: 'https://example.com/tabriz',
    country: 'IR',
    province: 'آذربایجان شرقی',
    city: 'تبریز',
  },
  {
    owner: 'toos',
    name: 'پخش سراسری توس',
    tagline: 'توزیع کالاهای تندمصرف در شرق کشور',
    about: 'شبکهٔ پخش با ۱۲ انبار و ناوگانی از ۲۰۰ خودرو که هر روز به بیش از ۸۰۰۰ فروشگاه خدمت می‌دهد.',
    industry: 'WHOLESALE_TRADE',
    size: 'SIZE_201_500',
    foundedYear: 1388,
    website: 'https://example.com/toos',
    country: 'IR',
    province: 'خراسان رضوی',
    city: 'مشهد',
  },
  {
    owner: 'nordlicht',
    name: 'Nordlicht Analytics GmbH',
    tagline: 'Data platforms for European logistics',
    about: 'A 90-person data company in Berlin building forecasting and route-optimisation platforms for logistics firms across Europe. English is our working language; relocation support and visa sponsorship are available.',
    industry: 'SOFTWARE_INTERNET',
    size: 'SIZE_51_200',
    foundedYear: 2016,
    website: 'https://example.com/nordlicht',
    country: 'DE',
    province: 'Berlin',
    city: 'Berlin',
  },
  {
    owner: 'gulf',
    name: 'Gulf Bridge Trading LLC',
    tagline: 'Trade between the Gulf and Central Asia',
    about: 'A Dubai trading house moving industrial goods between the UAE, Iran and Central Asia. Our team speaks Persian, Arabic, English and Russian.',
    industry: 'WHOLESALE_TRADE',
    size: 'SIZE_11_50',
    foundedYear: 2012,
    website: 'https://example.com/gulfbridge',
    country: 'AE',
    province: 'Dubai',
    city: 'Dubai',
  },
  {
    owner: 'maple',
    name: 'Maple Health Clinic',
    tagline: 'Family medicine in downtown Toronto',
    about: 'A multilingual family clinic serving Toronto’s Persian-speaking community and beyond. We support internationally trained nurses through licensing.',
    industry: 'HEALTHCARE',
    size: 'SIZE_11_50',
    foundedYear: 2009,
    website: 'https://example.com/maple',
    country: 'CA',
    province: 'Ontario',
    city: 'Toronto',
  },
  {
    owner: 'bogazici',
    name: 'Boğaziçi Teknoloji',
    tagline: 'Mobile apps for retail and fintech',
    about: 'An Istanbul product studio of 40 engineers and designers, working in Turkish and English, with clients across Turkey and the Middle East.',
    industry: 'SOFTWARE_INTERNET',
    size: 'SIZE_11_50',
    foundedYear: 2018,
    website: 'https://example.com/bogazici',
    country: 'TR',
    province: 'İstanbul',
    city: 'Istanbul',
  },
  {
    owner: 'hidden',
    name: 'شرکت نمونهٔ پنهان',
    tagline: 'صفحه‌ای که همکاران پنهان کرده‌اند',
    about: 'این صفحه برای نمایش حالت «پنهان‌شده توسط همکاران» ساخته شده است.',
    industry: 'OTHER',
    size: 'SIZE_1_10',
    foundedYear: 1400,
    website: 'https://example.com/hidden',
    country: 'IR',
    province: 'قم',
    city: 'قم',
    hidden: true,
  },
];

interface DemoJob {
  key: string;
  owner: string;
  title: string;
  category: string;
  description: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
  workArrangement: 'ONSITE' | 'HYBRID' | 'REMOTE';
  country?: string;
  province?: string | null;
  city?: string | null;
  remoteWorldwide?: boolean;
  seniority?: Seniority;
  minExperienceYears?: number;
  educationLevel?: 'DIPLOMA' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE';
  fieldOfStudy?: string;
  salaryMin?: bigint;
  salaryMax?: bigint;
  salaryUndisclosed?: boolean;
  currency?: string;
  salaryPeriod?: 'HOUR' | 'MONTH' | 'YEAR';
  skills?: string[];
  benefits?: string[];
  workingHours?: string;
  urgent?: boolean;
  featured?: boolean;
  openings?: number;
  genderRequirement?: 'ANY' | 'MALE' | 'FEMALE';
  ageMin?: number;
  ageMax?: number;
  militaryService?: 'ANY' | 'COMPLETED_OR_EXEMPT';
  amriehEligible?: boolean;
  disabilityFriendly?: boolean;
  status?: Status;
  state?: 'OPEN' | 'CLOSED' | 'AWARDED';
  reviewNote?: string;
  publishedDaysAgo?: number;
  closesInDays?: number;
  views?: number;
}

const DESC = (lines: string[]) => lines.join('\n\n');
const M = (toman: number) => BigInt(toman) * 1_000_000n;

const JOBS: DemoJob[] = [
  // ---- Rayan Tamaddon (Tehran, software) --------------------------------
  {
    key: 'react-senior',
    owner: 'rayan',
    title: 'برنامه‌نویس ارشد React (Next.js و TypeScript)',
    category: 'web-development',
    description: DESC([
      'به دنبال برنامه‌نویس ارشد فرانت‌اند برای تیم محصول سامانهٔ بانکداری اینترنتی هستیم.',
      'شرح وظایف: توسعهٔ رابط کاربری با React و Next.js، همکاری با تیم طراحی برای پیاده‌سازی Design System، کدنویسی تست‌پذیر و مستند، و راهنمایی برنامه‌نویسان تازه‌کار.',
      'مزیت محسوب می‌شود: تجربهٔ کار با GraphQL، آشنایی با استانداردهای دسترس‌پذیری وب و تجربهٔ کار در محصولات مالی.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    province: 'تهران',
    city: 'تهران',
    seniority: 'SENIOR',
    minExperienceYears: 5,
    educationLevel: 'BACHELOR',
    fieldOfStudy: 'مهندسی کامپیوتر یا رشته‌های مرتبط',
    salaryMin: M(70),
    salaryMax: M(100),
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Jest', 'Accessibility'],
    benefits: ['INSURANCE', 'SUPPLEMENTARY_INSURANCE', 'BONUS', 'FLEXIBLE_HOURS', 'REMOTE_DAYS', 'TRAINING', 'MEALS'],
    workingHours: 'شنبه تا چهارشنبه، ۹ تا ۱۷ (دو روز دورکاری در هفته)',
    urgent: true,
    featured: true,
    openings: 2,
    militaryService: 'COMPLETED_OR_EXEMPT',
    publishedDaysAgo: 0,
    closesInDays: 2,
    views: 412,
  },
  {
    key: 'backend-node',
    owner: 'rayan',
    title: 'برنامه‌نویس بک‌اند Node.js',
    category: 'software-development',
    description: DESC([
      'توسعه و نگهداری سرویس‌های بک‌اند سامانه‌های سازمانی با Node.js و PostgreSQL.',
      'طراحی API، بهینه‌سازی پرس‌وجوها، نوشتن تست و مشارکت در بازبینی کد از وظایف اصلی این نقش است.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'تهران',
    city: 'تهران',
    seniority: 'MID',
    minExperienceYears: 3,
    salaryMin: M(50),
    salaryMax: M(75),
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'],
    benefits: ['INSURANCE', 'LOAN', 'BONUS', 'SHUTTLE'],
    workingHours: 'شنبه تا چهارشنبه، ۸:۳۰ تا ۱۷:۳۰',
    amriehEligible: true,
    publishedDaysAgo: 3,
    closesInDays: 25,
    views: 198,
  },
  {
    key: 'devops',
    owner: 'rayan',
    title: 'مهندس DevOps',
    category: 'devops-cloud',
    description: DESC([
      'راه‌اندازی و نگهداری زیرساخت ابری مبتنی بر Kubernetes، خودکارسازی استقرار و پایش سرویس‌ها.',
      'تجربهٔ کار با Terraform و GitLab CI و آشنایی با امنیت زیرساخت از الزامات این موقعیت است.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'REMOTE',
    country: 'IR',
    province: null,
    city: null,
    seniority: 'SENIOR',
    minExperienceYears: 4,
    salaryMin: M(80),
    salaryMax: M(120),
    skills: ['Kubernetes', 'Docker', 'Terraform', 'Linux', 'CI/CD', 'Prometheus'],
    benefits: ['INSURANCE', 'SUPPLEMENTARY_INSURANCE', 'EQUITY', 'TRAINING'],
    publishedDaysAgo: 6,
    views: 260,
  },
  {
    key: 'ux-designer',
    owner: 'rayan',
    title: 'طراح محصول (UI/UX)',
    category: 'ui-ux-design',
    description: DESC([
      'طراحی تجربهٔ کاربری محصولات بانکی از پژوهش کاربر تا نمونهٔ اولیه و تحویل به تیم توسعه.',
      'نمونه‌کار الزامی است. آشنایی با Design System و تجربهٔ آزمون کاربردپذیری مزیت محسوب می‌شود.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    province: 'تهران',
    city: 'تهران',
    seniority: 'MID',
    minExperienceYears: 2,
    salaryMin: M(45),
    salaryMax: M(65),
    skills: ['Figma', 'UI/UX', 'User Research', 'Design Systems', 'Prototyping'],
    benefits: ['INSURANCE', 'FLEXIBLE_HOURS', 'TRAINING', 'OCCASION_GIFTS'],
    publishedDaysAgo: 9,
    closesInDays: 12,
    views: 143,
  },
  {
    key: 'intern-frontend',
    owner: 'rayan',
    title: 'کارآموز برنامه‌نویسی فرانت‌اند',
    category: 'web-development',
    description: DESC([
      'دورهٔ کارآموزی شش‌ماهه با منتور اختصاصی برای دانشجویان و تازه‌فارغ‌التحصیلان علاقه‌مند به React.',
      'امکان استخدام پس از پایان دوره برای کارآموزان موفق وجود دارد.',
    ]),
    employmentType: 'INTERNSHIP',
    workArrangement: 'ONSITE',
    province: 'تهران',
    city: 'تهران',
    seniority: 'INTERN',
    minExperienceYears: 0,
    salaryMin: M(12),
    salaryMax: M(15),
    skills: ['HTML', 'CSS', 'JavaScript', 'React'],
    benefits: ['TRAINING', 'MEALS', 'CAREER_GROWTH'],
    disabilityFriendly: true,
    openings: 4,
    publishedDaysAgo: 1,
    closesInDays: 20,
    views: 520,
  },
  {
    key: 'pm-draft',
    owner: 'rayan',
    title: 'مدیر محصول (پیش‌نویس)',
    category: 'product-management',
    description: 'پیش‌نویس آگهی برای نمایش حالت «پیش‌نویس» در داشبورد کارفرما. هنوز برای بررسی ارسال نشده است.',
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    province: 'تهران',
    city: 'تهران',
    seniority: 'SENIOR',
    salaryUndisclosed: true,
    status: 'DRAFT',
  },
  // ---- Alborz food (Qazvin) ---------------------------------------------
  {
    key: 'sales-qazvin',
    owner: 'alborz',
    title: 'کارشناس فروش حضوری',
    category: 'field-sales',
    description: DESC([
      'معرفی و فروش محصولات لبنی به فروشگاه‌ها و رستوران‌های استان قزوین و استان‌های همجوار.',
      'دارای حقوق ثابت به‌علاوهٔ پورسانت فروش، با خودروی شرکت.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'قزوین',
    city: 'قزوین',
    seniority: 'JUNIOR',
    minExperienceYears: 1,
    educationLevel: 'DIPLOMA',
    salaryMin: M(25),
    salaryMax: M(35),
    skills: ['فروش', 'مذاکره', 'CRM'],
    benefits: ['INSURANCE', 'COMMISSION', 'BONUS', 'LOAN'],
    workingHours: 'شنبه تا پنج‌شنبه، ۸ تا ۱۶',
    featured: true,
    openings: 3,
    genderRequirement: 'MALE',
    ageMin: 22,
    ageMax: 35,
    militaryService: 'COMPLETED_OR_EXEMPT',
    publishedDaysAgo: 2,
    closesInDays: 30,
    views: 230,
  },
  {
    key: 'qc-lab',
    owner: 'alborz',
    title: 'کارشناس کنترل کیفیت (آزمایشگاه)',
    category: 'quality-control',
    description: DESC([
      'انجام آزمون‌های میکروبی و شیمیایی روی مواد اولیه و محصول نهایی، ثبت نتایج و همکاری با واحد تولید.',
      'آشنایی با استانداردهای ISO 22000 و HACCP الزامی است.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'قزوین',
    city: 'البرز',
    seniority: 'MID',
    minExperienceYears: 2,
    educationLevel: 'BACHELOR',
    fieldOfStudy: 'علوم و صنایع غذایی، میکروبیولوژی',
    salaryMin: M(30),
    salaryMax: M(40),
    skills: ['HACCP', 'ISO 22000', 'میکروبیولوژی'],
    benefits: ['INSURANCE', 'SHUTTLE', 'MEALS', 'OVERTIME_PAY'],
    workingHours: 'شیفت صبح، شنبه تا پنج‌شنبه',
    genderRequirement: 'FEMALE',
    publishedDaysAgo: 5,
    closesInDays: 15,
    views: 96,
  },
  {
    key: 'warehouse',
    owner: 'alborz',
    title: 'انباردار',
    category: 'warehousing',
    description: 'مدیریت ورود و خروج کالا، ثبت در نرم‌افزار انبار، انبارگردانی دوره‌ای و هماهنگی با واحد حمل.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'قزوین',
    city: 'البرز',
    seniority: 'JUNIOR',
    minExperienceYears: 1,
    salaryMin: M(18),
    salaryMax: M(22),
    skills: ['انبارداری', 'Excel'],
    benefits: ['INSURANCE', 'SHUTTLE', 'MEALS'],
    urgent: true,
    amriehEligible: true,
    publishedDaysAgo: 0,
    closesInDays: 6,
    views: 64,
  },
  {
    key: 'accountant-changes',
    owner: 'alborz',
    title: 'حسابدار ارشد',
    category: 'accounting',
    description: 'آگهی برگشت‌خورده برای اصلاح، تا یادداشت بررسی‌کننده در داشبورد کارفرما دیده شود.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'قزوین',
    city: 'قزوین',
    seniority: 'SENIOR',
    salaryMin: M(40),
    salaryMax: M(30),
    status: 'CHANGES_REQUESTED',
    reviewNote: 'بازهٔ حقوق برعکس وارد شده است (حداقل بیشتر از حداکثر). لطفاً اصلاح کنید و شرح وظایف را کامل‌تر بنویسید.',
  },
  // ---- Sepahan steel (Isfahan) ------------------------------------------
  {
    key: 'maintenance',
    owner: 'sepahan',
    title: 'تکنسین نگهداری و تعمیرات (نت)',
    category: 'maintenance-engineering',
    description: DESC([
      'تعمیر و نگهداری پیشگیرانهٔ تجهیزات خط نورد، عیب‌یابی سیستم‌های هیدرولیک و پنوماتیک.',
      'کار در شیفت چرخشی با سرویس رفت‌وآمد و غذای گرم.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'اصفهان',
    city: 'مبارکه',
    seniority: 'MID',
    minExperienceYears: 3,
    educationLevel: 'ASSOCIATE',
    fieldOfStudy: 'مکانیک، برق صنعتی',
    salaryMin: M(35),
    salaryMax: M(48),
    skills: ['نت', 'هیدرولیک', 'PLC', 'جوشکاری'],
    benefits: ['INSURANCE', 'SUPPLEMENTARY_INSURANCE', 'SHUTTLE', 'MEALS', 'HOUSING', 'OVERTIME_PAY'],
    workingHours: 'شیفت چرخشی سه‌گانه',
    openings: 5,
    genderRequirement: 'MALE',
    militaryService: 'COMPLETED_OR_EXEMPT',
    publishedDaysAgo: 4,
    closesInDays: 40,
    views: 175,
  },
  {
    key: 'hse',
    owner: 'sepahan',
    title: 'کارشناس ایمنی و بهداشت کار (HSE)',
    category: 'hse',
    description: 'پایش شرایط ایمنی کارگاه‌ها، آموزش ایمنی کارکنان، بررسی حوادث و تهیهٔ گزارش‌های HSE.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'اصفهان',
    city: 'مبارکه',
    seniority: 'SENIOR',
    minExperienceYears: 5,
    educationLevel: 'MASTER',
    fieldOfStudy: 'مهندسی بهداشت حرفه‌ای، HSE',
    salaryUndisclosed: true,
    skills: ['HSE', 'ISO 45001', 'ارزیابی ریسک'],
    benefits: ['INSURANCE', 'SUPPLEMENTARY_INSURANCE', 'HOUSING', 'SHUTTLE'],
    publishedDaysAgo: 18,
    views: 88,
  },
  {
    key: 'welder-closed',
    owner: 'sepahan',
    title: 'جوشکار درجه‌یک',
    category: 'welding',
    description: 'آگهی بسته‌شده، برای نمایش حالت «بسته» در داشبورد کارفرما.',
    employmentType: 'CONTRACT',
    workArrangement: 'ONSITE',
    province: 'اصفهان',
    city: 'اصفهان',
    seniority: 'MID',
    salaryMin: M(30),
    salaryMax: M(40),
    state: 'CLOSED',
    publishedDaysAgo: 45,
    views: 301,
  },
  // ---- Tabriz pharma -----------------------------------------------------
  {
    key: 'pharmacist',
    owner: 'tabriz',
    title: 'داروساز مسئول فنی',
    category: 'pharmacy',
    description: 'نظارت بر فرایند تولید و کنترل کیفیت داروهای ژنریک مطابق با الزامات GMP و سازمان غذا و دارو.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'آذربایجان شرقی',
    city: 'تبریز',
    seniority: 'LEAD',
    minExperienceYears: 6,
    educationLevel: 'DOCTORATE',
    fieldOfStudy: 'داروسازی',
    salaryMin: M(90),
    salaryMax: M(130),
    skills: ['GMP', 'Quality Assurance', 'Regulatory'],
    benefits: ['INSURANCE', 'SUPPLEMENTARY_INSURANCE', 'BONUS', 'HOUSING', 'CAREER_GROWTH'],
    publishedDaysAgo: 7,
    closesInDays: 21,
    views: 77,
  },
  {
    key: 'lab-tech',
    owner: 'tabriz',
    title: 'کارشناس آزمایشگاه کنترل کیفی',
    category: 'chemistry-lab',
    description: 'آزمون‌های فیزیکوشیمیایی مواد اولیه و محصول، کار با HPLC و تهیهٔ مستندات آزمون.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'آذربایجان شرقی',
    city: 'تبریز',
    seniority: 'JUNIOR',
    minExperienceYears: 1,
    educationLevel: 'BACHELOR',
    fieldOfStudy: 'شیمی',
    salaryMin: M(22),
    salaryMax: M(30),
    skills: ['HPLC', 'GMP', 'شیمی تجزیه'],
    benefits: ['INSURANCE', 'SHUTTLE', 'MEALS'],
    disabilityFriendly: true,
    publishedDaysAgo: 11,
    views: 54,
  },
  // ---- Toos distribution (Mashhad) ---------------------------------------
  {
    key: 'driver',
    owner: 'toos',
    title: 'رانندهٔ پایهٔ دو (پخش مویرگی)',
    category: 'driver',
    description: 'پخش کالا به فروشگاه‌های سطح شهر مشهد با خودروی شرکت. داشتن گواهینامهٔ پایهٔ دو الزامی است.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'خراسان رضوی',
    city: 'مشهد',
    seniority: 'JUNIOR',
    salaryMin: M(20),
    salaryMax: M(26),
    benefits: ['INSURANCE', 'COMMISSION', 'MEALS'],
    workingHours: 'شنبه تا پنج‌شنبه، ۷ تا ۱۵',
    urgent: true,
    openings: 10,
    genderRequirement: 'MALE',
    ageMin: 23,
    ageMax: 45,
    militaryService: 'COMPLETED_OR_EXEMPT',
    publishedDaysAgo: 1,
    closesInDays: 9,
    views: 189,
  },
  {
    key: 'call-center',
    owner: 'toos',
    title: 'کارشناس مرکز تماس (پاره‌وقت)',
    category: 'call-center',
    description: 'پاسخگویی به سفارش‌های تلفنی فروشگاه‌ها و پیگیری رضایت مشتریان در شیفت عصر.',
    employmentType: 'PART_TIME',
    workArrangement: 'ONSITE',
    province: 'خراسان رضوی',
    city: 'مشهد',
    seniority: 'JUNIOR',
    minExperienceYears: 0,
    salaryMin: M(10),
    salaryMax: M(14),
    benefits: ['INSURANCE', 'FLEXIBLE_HOURS'],
    workingHours: 'شنبه تا چهارشنبه، ۱۵ تا ۲۰',
    disabilityFriendly: true,
    publishedDaysAgo: 13,
    views: 71,
  },
  {
    key: 'sales-manager-review',
    owner: 'toos',
    title: 'مدیر فروش منطقه‌ای',
    category: 'sales-management',
    description: 'آگهی در صف بررسی، تا صف آگهی‌های همکاران و حالت «در حال بررسی» دیده شود.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    province: 'خراسان رضوی',
    city: 'مشهد',
    seniority: 'MANAGER',
    minExperienceYears: 7,
    salaryMin: M(90),
    salaryMax: M(120),
    status: 'PENDING_REVIEW',
  },
  // ---- Karaj café (individual employer, no company page) ----------------
  {
    key: 'barista',
    owner: 'karaj',
    title: 'باریستا',
    category: 'barista-cafe',
    description: 'آماده‌سازی نوشیدنی‌های بر پایهٔ اسپرسو و برخورد گرم با مهمانان در کافه‌ای کوچک در گوهردشت کرج.',
    employmentType: 'PART_TIME',
    workArrangement: 'ONSITE',
    province: 'البرز',
    city: 'کرج',
    seniority: 'JUNIOR',
    minExperienceYears: 0,
    salaryMin: M(9),
    salaryMax: M(12),
    benefits: ['MEALS', 'FLEXIBLE_HOURS'],
    workingHours: 'عصرها، پنج روز در هفته',
    publishedDaysAgo: 2,
    views: 33,
  },
  // ---- Nordlicht (Berlin, Germany) ---------------------------------------
  {
    key: 'data-engineer-berlin',
    owner: 'nordlicht',
    title: 'Senior Data Engineer',
    category: 'data-engineering',
    description: DESC([
      'Design and run the pipelines behind our forecasting platform: batch and streaming ingestion, data quality, and the warehouse our data scientists build on.',
      'You will work in English with a team of eight across Berlin and remote. We sponsor visas and help with relocation, including a German course.',
    ]),
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    country: 'DE',
    province: 'Berlin',
    city: 'Berlin',
    seniority: 'SENIOR',
    minExperienceYears: 5,
    educationLevel: 'BACHELOR',
    currency: 'EUR',
    salaryPeriod: 'YEAR',
    salaryMin: 68_000n,
    salaryMax: 85_000n,
    skills: ['Python', 'Airflow', 'Spark', 'SQL', 'Kafka', 'dbt'],
    benefits: ['SUPPLEMENTARY_INSURANCE', 'TRAINING', 'FLEXIBLE_HOURS', 'REMOTE_DAYS', 'HOUSING', 'EQUITY'],
    workingHours: '40 hours a week, flexible core hours',
    featured: true,
    publishedDaysAgo: 1,
    closesInDays: 28,
    views: 640,
  },
  {
    key: 'ml-engineer-remote',
    owner: 'nordlicht',
    title: 'Machine Learning Engineer (remote, worldwide)',
    category: 'machine-learning',
    description: 'Build and deploy demand-forecasting models in production. Fully remote across time zones UTC-3 to UTC+5; contract or employment through a partner in your country.',
    employmentType: 'CONTRACT',
    workArrangement: 'REMOTE',
    remoteWorldwide: true,
    country: 'DE',
    province: null,
    city: 'Berlin',
    seniority: 'MID',
    minExperienceYears: 3,
    currency: 'EUR',
    salaryPeriod: 'MONTH',
    salaryMin: 4_500n,
    salaryMax: 6_000n,
    skills: ['Python', 'PyTorch', 'MLOps', 'SQL'],
    benefits: ['FLEXIBLE_HOURS', 'TRAINING', 'FOREIGN_CURRENCY_PAY'],
    publishedDaysAgo: 4,
    views: 820,
  },
  // ---- Gulf Bridge (Dubai, UAE) ------------------------------------------
  {
    key: 'trade-dubai',
    owner: 'gulf',
    title: 'Import/Export Coordinator (Persian speaker)',
    category: 'import-export',
    description: 'Coordinate shipments between Dubai, Bandar Abbas and Central Asia; prepare documents, follow customs and keep clients informed in Persian and English.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    country: 'AE',
    province: 'Dubai',
    city: 'Dubai',
    seniority: 'MID',
    minExperienceYears: 2,
    currency: 'AED',
    salaryPeriod: 'MONTH',
    salaryMin: 9_000n,
    salaryMax: 13_000n,
    skills: ['فارسی', 'English', 'Customs', 'Logistics'],
    benefits: ['HOUSING', 'SUPPLEMENTARY_INSURANCE', 'BONUS'],
    workingHours: 'Monday to Friday, 9:00 to 18:00',
    urgent: true,
    publishedDaysAgo: 0,
    closesInDays: 14,
    views: 355,
  },
  {
    key: 'support-remote',
    owner: 'gulf',
    title: 'Customer Support Agent (Persian & English, remote)',
    category: 'customer-support',
    description: 'Answer client questions by chat and email in Persian and English, from anywhere. Evening shifts available.',
    employmentType: 'PART_TIME',
    workArrangement: 'REMOTE',
    remoteWorldwide: true,
    country: 'AE',
    province: null,
    city: 'Dubai',
    seniority: 'JUNIOR',
    minExperienceYears: 0,
    currency: 'USD',
    salaryPeriod: 'HOUR',
    salaryMin: 9n,
    salaryMax: 14n,
    skills: ['English', 'فارسی', 'Customer Support'],
    benefits: ['FLEXIBLE_HOURS', 'FOREIGN_CURRENCY_PAY'],
    disabilityFriendly: true,
    publishedDaysAgo: 2,
    views: 470,
  },
  // ---- Maple Health (Toronto, Canada) ------------------------------------
  {
    key: 'nurse-toronto',
    owner: 'maple',
    title: 'Registered Nurse (Persian-speaking)',
    category: 'nursing-midwifery',
    description: 'Join our family clinic caring for Toronto’s Persian-speaking community. Internationally trained nurses welcome — we support the NCLEX and CNO registration process.',
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
    country: 'CA',
    province: 'Ontario',
    city: 'Toronto',
    seniority: 'MID',
    minExperienceYears: 2,
    educationLevel: 'BACHELOR',
    fieldOfStudy: 'Nursing',
    currency: 'CAD',
    salaryPeriod: 'HOUR',
    salaryMin: 38n,
    salaryMax: 46n,
    skills: ['Nursing', 'Patient Care', 'English', 'فارسی'],
    benefits: ['SUPPLEMENTARY_INSURANCE', 'TRAINING', 'PARKING', 'CHILDCARE'],
    openings: 2,
    publishedDaysAgo: 3,
    closesInDays: 45,
    views: 512,
  },
  // ---- Boğaziçi (Istanbul, Turkey) ---------------------------------------
  {
    key: 'flutter-istanbul',
    owner: 'bogazici',
    title: 'Flutter Developer',
    category: 'mobile-development',
    description: 'Build retail and fintech apps in Flutter for clients across Turkey and the Gulf. Hybrid in Kadıköy; English or Turkish as your working language.',
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    country: 'TR',
    province: 'İstanbul',
    city: 'Istanbul',
    seniority: 'MID',
    minExperienceYears: 2,
    currency: 'TRY',
    salaryPeriod: 'MONTH',
    salaryMin: 85_000n,
    salaryMax: 120_000n,
    skills: ['Flutter', 'Dart', 'Firebase', 'REST'],
    benefits: ['MEALS', 'SUPPLEMENTARY_INSURANCE', 'REMOTE_DAYS', 'TRAINING'],
    publishedDaysAgo: 8,
    closesInDays: 3,
    views: 210,
  },
  {
    key: 'backend-istanbul-review',
    owner: 'bogazici',
    title: 'Backend Engineer (Go)',
    category: 'software-development',
    description: 'A posting waiting for review, so the staff queue shows an international posting too.',
    employmentType: 'FULL_TIME',
    workArrangement: 'REMOTE',
    country: 'TR',
    province: null,
    city: 'Istanbul',
    seniority: 'SENIOR',
    currency: 'USD',
    salaryPeriod: 'YEAR',
    salaryMin: 45_000n,
    salaryMax: 60_000n,
    status: 'PENDING_REVIEW',
  },
];

interface DemoApplication {
  candidate: string;
  job: string;
  outcome: 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  seen?: boolean;
  daysAgo: number;
  note?: string;
  coverLetter?: string;
  expectedSalary?: bigint;
  moderation?: 'APPROVED' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED';
  reviewNote?: string;
}

const APPLICATIONS: DemoApplication[] = [
  // Sara — the fullest pipeline, for the applicant's stage tracker.
  { candidate: 'sara', job: 'react-senior', outcome: 'INTERVIEW', seen: true, daysAgo: 0, note: 'نمونه‌کار قوی؛ جلسهٔ فنی روز دوشنبه.', expectedSalary: M(90), coverLetter: 'پنج سال تجربهٔ کار با React و دو سال در محصولات مالی دارم. پیوند نمونه‌کار در رزومه آمده است.' },
  { candidate: 'sara', job: 'backend-node', outcome: 'SHORTLISTED', seen: true, daysAgo: 2 },
  { candidate: 'sara', job: 'flutter-istanbul', outcome: 'DECLINED', seen: true, daysAgo: 7 },
  { candidate: 'sara', job: 'ml-engineer-remote', outcome: 'PENDING', seen: false, daysAgo: 1 },
  // Omid — accepted, so a collaboration exists.
  { candidate: 'omid', job: 'devops', outcome: 'ACCEPTED', seen: true, daysAgo: 5, note: 'پیشنهاد پذیرفته شد؛ شروع همکاری از اول ماه.', expectedSalary: M(100) },
  { candidate: 'omid', job: 'react-senior', outcome: 'PENDING', seen: false, daysAgo: 0 },
  // Ali — sales, and one he took back.
  { candidate: 'ali', job: 'sales-qazvin', outcome: 'SHORTLISTED', seen: true, daysAgo: 1, expectedSalary: M(30) },
  { candidate: 'ali', job: 'trade-dubai', outcome: 'WITHDRAWN', seen: false, daysAgo: 3 },
  { candidate: 'ali', job: 'driver', outcome: 'PENDING', seen: false, daysAgo: 0 },
  // Reza — data, in Berlin and remote.
  { candidate: 'reza', job: 'data-engineer-berlin', outcome: 'INTERVIEW', seen: true, daysAgo: 1, note: 'Strong Airflow background. Second round with the team lead.' },
  { candidate: 'reza', job: 'ml-engineer-remote', outcome: 'SHORTLISTED', seen: true, daysAgo: 3 },
  // Niloofar — design.
  { candidate: 'niloofar', job: 'ux-designer', outcome: 'PENDING', seen: true, daysAgo: 4 },
  { candidate: 'niloofar', job: 'intern-frontend', outcome: 'DECLINED', seen: true, daysAgo: 6 },
  // Maryam — one still with the reviewers, one sent back to her.
  { candidate: 'maryam', job: 'qc-lab', outcome: 'PENDING', daysAgo: 0, moderation: 'PENDING_REVIEW' },
  { candidate: 'maryam', job: 'warehouse', outcome: 'PENDING', daysAgo: 1, moderation: 'CHANGES_REQUESTED', reviewNote: 'لطفاً رزومه را پیوست کنید و دربارهٔ تجربهٔ انبارداری خود بیشتر بنویسید.' },
  // Hamid — industry.
  { candidate: 'hamid', job: 'maintenance', outcome: 'INTERVIEW', seen: true, daysAgo: 2 },
  { candidate: 'hamid', job: 'hse', outcome: 'PENDING', seen: true, daysAgo: 9 },
  // Zahra — nursing in Toronto.
  { candidate: 'zahra', job: 'nurse-toronto', outcome: 'SHORTLISTED', seen: true, daysAgo: 2, coverLetter: 'Six years of ICU experience in Tehran; IELTS 7.5; NCLEX preparation under way.' },
  { candidate: 'zahra', job: 'support-remote', outcome: 'PENDING', seen: false, daysAgo: 1 },
  // A few more so the responsive-employer measure has a sample.
  { candidate: 'niloofar', job: 'react-senior', outcome: 'DECLINED', seen: true, daysAgo: 10 },
  { candidate: 'reza', job: 'backend-node', outcome: 'PENDING', seen: true, daysAgo: 8 },
  { candidate: 'ali', job: 'call-center', outcome: 'PENDING', seen: false, daysAgo: 12 },
];

const SAVED: Array<[string, string]> = [
  ['sara', 'react-senior'],
  ['sara', 'data-engineer-berlin'],
  ['sara', 'ux-designer'],
  ['sara', 'support-remote'],
  ['reza', 'ml-engineer-remote'],
  ['zahra', 'nurse-toronto'],
  ['ali', 'sales-qazvin'],
];

export async function seedJobs(manifest: DemoManifest) {
  const counts = { employers: 0, candidates: 0, companies: 0, jobs: 0, applications: 0, saved: 0, alerts: 0 };

  // The fixed categories are the site's own data, not demo data: created if
  // missing, never recorded, never torn down.
  await syncJobTaxonomy();
  const categories = new Map(
    (await prisma.jobCategory.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]),
  );

  const password = await hashPassword('demo-password');
  const userIds = new Map<string, string>();

  for (const [index, person] of [...EMPLOYERS, ...CANDIDATES].entries()) {
    const isEmployer = EMPLOYERS.includes(person);
    const company = COMPANIES.find((row) => row.owner === person.key);
    const user = await prisma.user.create({
      data: {
        email: person.email,
        emailHash: emailLookupHash(person.email),
        // A known, weak password on local-only demo accounts; the seeder
        // refuses to run in production.
        password,
        firstName: person.firstName,
        lastName: person.lastName,
        username: person.username,
        headline: person.headline,
        skills: person.skills ?? [],
        phone: `0912000${String(4000 + index).padStart(4, '0')}`,
        emailVerified: true,
      },
      select: { id: true },
    });
    await manifest.record('demoUser', user.id);
    userIds.set(person.key, user.id);

    // Everyone verified: posting and applying both require it.
    const verification = await prisma.userVerification.create({
      data: {
        userId: user.id,
        kind: company ? 'COMPANY' : 'INDIVIDUAL',
        status: 'APPROVED',
        legalFirstName: person.firstName,
        legalLastName: person.lastName,
        nationalId: '0000000000',
        phone: `0912000${String(4000 + index).padStart(4, '0')}`,
        province: company?.country === 'IR' ? company.province : 'تهران',
        city: company?.city ?? 'تهران',
        ...(company ? { companyName: company.name } : {}),
        reviewedAt: daysAgo(60),
      },
      select: { id: true },
    });
    await manifest.record('userVerification', verification.id);
    if (isEmployer) counts.employers += 1;
    else counts.candidates += 1;
  }

  // ---- company pages ------------------------------------------------------
  const companyIds = new Map<string, string>();
  for (const company of COMPANIES) {
    const [logo] = await storeFiles(
      [{ originalName: `${company.owner}-logo.png`, buffer: placeholderPng(`${company.name} logo`) }],
      IMAGE_EXTENSIONS,
    );
    await manifest.record('storedFile', logo.storedName);
    const [cover] = await storeFiles(
      [{ originalName: `${company.owner}-cover.png`, buffer: placeholderPng(`${company.name} cover`) }],
      IMAGE_EXTENSIONS,
    );
    await manifest.record('storedFile', cover.storedName);

    const row = await prisma.company.create({
      data: {
        ownerId: userIds.get(company.owner)!,
        slug: `demo-${company.owner}`,
        name: company.name,
        tagline: company.tagline,
        about: company.about,
        industry: company.industry,
        size: company.size,
        foundedYear: company.foundedYear,
        website: company.website,
        country: company.country,
        province: company.province,
        city: company.city,
        hidden: company.hidden ?? false,
        logoStoredName: logo.storedName,
        logoOriginalName: logo.originalName,
        logoMimeType: logo.mimeType,
        coverStoredName: cover.storedName,
        coverOriginalName: cover.originalName,
        coverMimeType: cover.mimeType,
      },
      select: { id: true },
    });
    await manifest.record('company', row.id);
    companyIds.set(company.owner, row.id);
    counts.companies += 1;
  }

  // ---- postings -------------------------------------------------------------
  const jobIds = new Map<string, { id: string; authorId: string; title: string }>();
  for (const job of JOBS) {
    const status = job.status ?? 'APPROVED';
    const live = status === 'APPROVED';
    const company = COMPANIES.find((row) => row.owner === job.owner);
    const owner = EMPLOYERS.find((row) => row.key === job.owner)!;
    const data: Prisma.JobPostUncheckedCreateInput = {
      code: generateTrackingCode(),
      authorId: userIds.get(job.owner)!,
      title: job.title,
      description: job.description,
      companyName: company?.name ?? `${owner.firstName} ${owner.lastName}`,
      companyId: companyIds.get(job.owner) ?? null,
      jobCategoryId: categories.get(job.category) ?? null,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      country: job.country ?? 'IR',
      province: job.province === undefined ? (company?.province ?? null) : job.province,
      city: job.city === undefined ? (company?.city ?? null) : job.city,
      remoteWorldwide: job.remoteWorldwide ?? false,
      seniority: job.seniority ?? null,
      minExperienceYears: job.minExperienceYears ?? null,
      educationLevel: job.educationLevel ?? null,
      fieldOfStudy: job.fieldOfStudy ?? null,
      salaryMin: job.salaryUndisclosed ? null : (job.salaryMin ?? null),
      salaryMax: job.salaryUndisclosed ? null : (job.salaryMax ?? null),
      salaryUndisclosed: job.salaryUndisclosed ?? false,
      currency: job.currency ?? 'IRT',
      salaryPeriod: job.salaryPeriod ?? 'MONTH',
      skills: job.skills ?? [],
      benefits: job.benefits ?? [],
      workingHours: job.workingHours ?? null,
      urgent: job.urgent ?? false,
      featured: job.featured ?? false,
      featuredAt: job.featured ? daysAgo(job.publishedDaysAgo ?? 0) : null,
      openings: job.openings ?? 1,
      genderRequirement: job.genderRequirement ?? 'ANY',
      ageMin: job.ageMin ?? null,
      ageMax: job.ageMax ?? null,
      militaryService: job.militaryService ?? 'ANY',
      amriehEligible: job.amriehEligible ?? false,
      disabilityFriendly: job.disabilityFriendly ?? false,
      moderationStatus: status,
      reviewNote: job.reviewNote ?? null,
      submittedAt: status === 'DRAFT' ? null : daysAgo((job.publishedDaysAgo ?? 1) + 1),
      reviewedAt: live || status === 'CHANGES_REQUESTED' ? daysAgo(job.publishedDaysAgo ?? 1) : null,
      state: job.state ?? 'OPEN',
      publishedAt: live ? daysAgo(job.publishedDaysAgo ?? 0) : null,
      closesAt: job.closesInDays !== undefined ? daysAhead(job.closesInDays) : null,
      viewCount: job.views ?? 0,
      createdAt: daysAgo((job.publishedDaysAgo ?? 1) + 2),
    };
    const row = await prisma.jobPost.create({ data, select: { id: true } });
    await manifest.record('jobPost', row.id);
    jobIds.set(job.key, { id: row.id, authorId: data.authorId, title: job.title });
    counts.jobs += 1;
  }

  // ---- applications, collaborations, notifications --------------------------
  for (const application of APPLICATIONS) {
    const job = jobIds.get(application.job)!;
    const applicantId = userIds.get(application.candidate)!;
    const moderation = application.moderation ?? 'APPROVED';
    const created = daysAgo(application.daysAgo);
    const row = await prisma.jobApplication.create({
      data: {
        jobId: job.id,
        applicantId,
        coverLetter:
          application.coverLetter ??
          'سلام. با دقت آگهی را خواندم و فکر می‌کنم تجربه و مهارت‌هایم با این موقعیت هم‌خوانی دارد. خوشحال می‌شوم دربارهٔ همکاری گفت‌وگو کنیم.',
        expectedSalary: application.expectedSalary ?? null,
        moderationStatus: moderation,
        reviewNote: application.reviewNote ?? null,
        reviewedAt: moderation === 'PENDING_REVIEW' ? null : created,
        outcome: application.outcome,
        employerSeenAt: application.seen ? new Date(created.getTime() + 6 * 3_600_000) : null,
        outcomeChangedAt: application.outcome === 'PENDING' ? null : new Date(created.getTime() + 24 * 3_600_000),
        employerNote: application.note ?? null,
        createdAt: created,
      },
      select: { id: true },
    });
    await manifest.record('jobApplication', row.id);
    counts.applications += 1;

    if (application.outcome === 'ACCEPTED') {
      // What accepting does in the real flow: a collaboration on the dashboard.
      const award = await prisma.marketplaceAward.create({
        data: {
          jobApplicationId: row.id,
          agreedAmount: application.expectedSalary ?? null,
          awardedById: job.authorId,
          note: 'همکاری نمونه برای داشبورد.',
        },
        select: { id: true },
      });
      await manifest.record('marketplaceAward', award.id);
    }

    // The notification the applicant would have had for each step.
    const stageTitle: Record<string, string> = {
      SHORTLISTED: 'در فهرست کوتاه قرار گرفتید',
      INTERVIEW: 'دعوت به مصاحبه',
      ACCEPTED: 'پذیرفته شدید',
      DECLINED: 'نتیجهٔ درخواست شما',
    };
    if (moderation === 'APPROVED' && stageTitle[application.outcome]) {
      const notification = await prisma.notification.create({
        data: {
          userId: applicantId,
          type: 'application.stage',
          title: stageTitle[application.outcome],
          body: `درخواست شما برای «${job.title}» به‌روز شد.`,
          link: '/dashboard/applications',
          readAt: application.daysAgo > 3 ? daysAgo(application.daysAgo - 1) : null,
          createdAt: new Date(created.getTime() + 24 * 3_600_000),
        },
        select: { id: true },
      });
      await manifest.record('notification', notification.id);
    }
  }

  // Employers hear about new applications.
  for (const [owner, title] of [
    ['rayan', 'درخواست تازه برای آگهی شما'],
    ['alborz', 'درخواست تازه برای آگهی شما'],
  ] as const) {
    const notification = await prisma.notification.create({
      data: {
        userId: userIds.get(owner)!,
        type: 'application.received',
        title,
        body: 'یک نفر برای یکی از آگهی‌های شما درخواست داد.',
        link: '/dashboard/jobs',
      },
      select: { id: true },
    });
    await manifest.record('notification', notification.id);
  }

  // ---- saved jobs and alerts --------------------------------------------------
  for (const [candidate, job] of SAVED) {
    const row = await prisma.savedJob.create({
      data: { userId: userIds.get(candidate)!, jobId: jobIds.get(job)!.id },
      select: { id: true },
    });
    await manifest.record('savedJob', row.id);
    counts.saved += 1;
  }

  const webCategory = categories.get('web-development');
  const nursingCategory = categories.get('nursing-midwifery');
  const ALERTS: Array<{ candidate: string; name: string; query: Record<string, string>; active?: boolean; notified?: number }> = [
    { candidate: 'sara', name: 'React در تهران', query: { search: 'React', province: 'تهران' }, notified: 0 },
    { candidate: 'sara', name: 'دورکاری بین‌المللی', query: { workArrangement: 'REMOTE', ...(webCategory ? { jobCategoryId: webCategory } : {}) } },
    { candidate: 'ali', name: 'فروش در قزوین', query: { search: 'فروش', province: 'قزوین' }, notified: 2 },
    { candidate: 'zahra', name: 'Nursing in Canada', query: { country: 'CA', ...(nursingCategory ? { jobCategoryId: nursingCategory } : {}) }, notified: 3 },
    { candidate: 'reza', name: 'Data roles in Germany', query: { country: 'DE', search: 'Data' }, active: false },
  ];
  for (const alert of ALERTS) {
    const row = await prisma.jobAlert.create({
      data: {
        userId: userIds.get(alert.candidate)!,
        name: alert.name,
        query: alert.query,
        active: alert.active ?? true,
        lastNotifiedAt: alert.notified !== undefined ? daysAgo(alert.notified) : null,
      },
      select: { id: true },
    });
    await manifest.record('jobAlert', row.id);
    counts.alerts += 1;
  }

  return counts;
}
