import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { IMAGE_EXTENSIONS, storeFiles } from '../attachment.service.js';
import { syncWorkTaxonomy } from '../work-taxonomy.service.js';
import { weekStartOf } from '../engagement.service.js';
import { placeholderPng } from './placeholder-image.js';
import type { DemoManifest } from './manifest.js';

/**
 * Demo data for the freelance side: enough to see every screen in every state.
 *
 * Runs after seedJobs and borrows its people by address — the employers become
 * clients, the job-seekers freelancers (with languages, rates and
 * availability filled in) — so one set of sign-ins shows both boards.
 *
 * Projects between them use every field the new board has: fixed and hourly,
 * every experience level and duration, weekly hours, urgent, featured, NDA,
 * sealed and open bidding, members-only and invite-only, preferred countries
 * and languages, screening questions, contract-to-hire, several hires,
 * on-site work, foreign currencies, deadlines near and far — plus a draft,
 * one in review, one sent back, one awarded and one closed.
 *
 * Proposals cover every stage, with plans, answers, client notes and
 * invitations; contracts cover a finished fixed-price job with reviews, a live
 * hourly one with timesheets, and service orders in every state. Services
 * come in one to three packages with extras, FAQs, buyer questions and a
 * gallery, and some carry reviews so the catalogue has ratings to sort by.
 */

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);
const M = (toman: number) => BigInt(toman) * 1_000_000n;

const PEOPLE = {
  rayan: 'employer.rayan@demo.invalid',
  alborz: 'employer.alborz@demo.invalid',
  nordlicht: 'employer.nordlicht@demo.invalid',
  gulf: 'employer.gulf@demo.invalid',
  bogazici: 'employer.bogazici@demo.invalid',
  karaj: 'employer.karaj@demo.invalid',
  maple: 'employer.maple@demo.invalid',
  sara: 'candidate.sara@demo.invalid',
  ali: 'candidate.ali@demo.invalid',
  maryam: 'candidate.maryam@demo.invalid',
  reza: 'candidate.reza@demo.invalid',
  niloofar: 'candidate.niloofar@demo.invalid',
  hamid: 'candidate.hamid@demo.invalid',
  zahra: 'candidate.zahra@demo.invalid',
  omid: 'candidate.omid@demo.invalid',
} as const;
type Person = keyof typeof PEOPLE;

/** The freelancer half of each job-seeker's profile. */
const FREELANCER_PROFILES: Partial<Record<Person, Prisma.UserUpdateInput>> = {
  sara: { languages: ['fa', 'en'], hourlyRate: 900_000n, availability: 'AVAILABLE', country: 'IR' },
  reza: { languages: ['fa', 'en', 'de'], hourlyRate: 25n, hourlyCurrency: 'EUR', availability: 'LIMITED', country: 'IR' },
  niloofar: { languages: ['fa', 'en'], hourlyRate: 750_000n, availability: 'AVAILABLE', country: 'IR' },
  omid: { languages: ['fa', 'en', 'tr'], hourlyRate: 30n, hourlyCurrency: 'USD', availability: 'AVAILABLE', country: 'TR' },
  maryam: { languages: ['fa'], hourlyRate: 500_000n, availability: 'AVAILABLE', country: 'IR' },
  ali: { languages: ['fa', 'ar'], hourlyRate: 400_000n, availability: 'UNAVAILABLE', country: 'IR' },
  hamid: { languages: ['fa', 'az'], hourlyRate: 600_000n, availability: 'LIMITED', country: 'IR' },
  zahra: { languages: ['fa', 'en'], availability: 'AVAILABLE', country: 'CA' },
};

interface DemoProject {
  key: string;
  owner: Person;
  title: string;
  category: string;
  description: string;
  skills: string[];
  pricingType?: 'FIXED' | 'HOURLY';
  budgetMin?: bigint;
  budgetMax?: bigint;
  budgetUnknown?: boolean;
  currency?: string;
  experienceLevel?: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  duration?: string;
  weeklyHours?: string;
  urgent?: boolean;
  featured?: boolean;
  sealed?: boolean;
  nda?: boolean;
  visibility?: 'PUBLIC' | 'SIGNED_IN' | 'INVITE_ONLY';
  preferredCountries?: string[];
  languages?: string[];
  screeningQuestions?: string[];
  contractToHire?: boolean;
  freelancersNeeded?: number;
  onsite?: { country: string; province?: string; city: string };
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';
  reviewNote?: string;
  state?: 'OPEN' | 'AWARDED' | 'CLOSED';
  publishedDaysAgo?: number;
  closesInDays?: number;
  views?: number;
}

const DESC = (lines: string[]) => lines.join('\n\n');

const PROJECTS: DemoProject[] = [
  {
    key: 'shop',
    owner: 'karaj',
    title: 'فروشگاه اینترنتی ووکامرس برای کافه و فروش قهوه',
    category: 'w-wordpress',
    description: DESC([
      'برای کافه‌مان یک فروشگاه اینترنتی می‌خواهیم که دانهٔ قهوه، تجهیزات دم‌آوری و کارت هدیه بفروشد.',
      'خروجی‌ها: قالب واکنش‌گرا و فارسی، اتصال به درگاه پرداخت، محاسبهٔ هزینهٔ ارسال با پست و تیپاکس، و آموزش کار با پنل.',
      'محتوای محصولات و عکس‌ها را خودمان می‌دهیم. معیار پایان کار: ثبت سفارش آزمایشی موفق و سرعت بارگذاری زیر سه ثانیه.',
    ]),
    skills: ['WordPress', 'WooCommerce', 'PHP', 'سئو'],
    budgetMin: M(40),
    budgetMax: M(70),
    experienceLevel: 'INTERMEDIATE',
    duration: 'ONE_TO_FOUR_WEEKS',
    urgent: true,
    featured: true,
    sealed: false,
    languages: ['fa'],
    screeningQuestions: ['نشانی دو فروشگاه ووکامرسی که ساخته‌اید را بفرستید.', 'کدام درگاه پرداخت را پیشنهاد می‌کنید و چرا؟'],
    publishedDaysAgo: 1,
    closesInDays: 2,
    views: 384,
  },
  {
    key: 'dashboard',
    owner: 'rayan',
    title: 'داشبورد مدیریتی React برای سامانهٔ بیمه',
    category: 'w-frontend',
    description: DESC([
      'یک داشبورد مدیریتی با React و TypeScript برای کارشناسان بیمه: فهرست پرونده‌ها، فیلترها، نمودارها و گزارش اکسل.',
      'طراحی در Figma آماده است و API آن را تیم خودمان فراهم می‌کند. کد باید تست‌پذیر و دسترس‌پذیر باشد.',
    ]),
    skills: ['React', 'TypeScript', 'Recharts', 'Tailwind', 'Jest'],
    budgetMin: M(120),
    budgetMax: M(180),
    experienceLevel: 'EXPERT',
    duration: 'ONE_TO_THREE_MONTHS',
    nda: true,
    freelancersNeeded: 2,
    contractToHire: true,
    languages: ['fa', 'en'],
    screeningQuestions: ['تجربهٔ کار با جداول بزرگ و مجازی‌سازی فهرست را توضیح دهید.'],
    publishedDaysAgo: 3,
    closesInDays: 12,
    views: 512,
  },
  {
    key: 'pipeline',
    owner: 'nordlicht',
    title: 'Data pipeline maintenance (Airflow, dbt) — ongoing, hourly',
    category: 'w-data-engineering',
    description: DESC([
      'We need an experienced data engineer for roughly 15 hours a week to maintain and extend our Airflow DAGs and dbt models.',
      'You will fix failing loads, add sources, write tests and document what you change. English is our working language.',
    ]),
    skills: ['Airflow', 'dbt', 'Python', 'SQL', 'PostgreSQL'],
    pricingType: 'HOURLY',
    budgetMin: 20n,
    budgetMax: 35n,
    currency: 'EUR',
    experienceLevel: 'EXPERT',
    duration: 'MORE_THAN_SIX_MONTHS',
    weeklyHours: 'TEN_TO_THIRTY',
    preferredCountries: ['IR', 'TR', 'DE', 'AE'],
    languages: ['en'],
    state: 'AWARDED',
    publishedDaysAgo: 30,
    views: 288,
  },
  {
    key: 'logo',
    owner: 'alborz',
    title: 'طراحی لوگو و بسته‌بندی برای خط تولید ماست پروبیوتیک',
    category: 'w-packaging',
    description: DESC([
      'برای محصول تازه‌مان (ماست پروبیوتیک در سه طعم) لوگوی فرعی و طراحی لیوان و درب می‌خواهیم.',
      'خروجی‌ها: سه پیشنهاد اولیه، فایل‌های نهایی چاپی (CMYK) و قالب برای دو طعم دیگر.',
    ]),
    skills: ['Illustrator', 'طراحی بسته‌بندی', 'هویت بصری'],
    budgetMin: M(25),
    budgetMax: M(40),
    experienceLevel: 'INTERMEDIATE',
    duration: 'LESS_THAN_WEEK',
    sealed: false,
    publishedDaysAgo: 2,
    closesInDays: 6,
    views: 167,
  },
  {
    key: 'translation',
    owner: 'gulf',
    title: 'Translate a 40-page product catalogue (English → Persian & Arabic)',
    category: 'w-translation',
    description: DESC([
      'A technical catalogue of industrial valves and pumps, 40 pages, to be translated from English into Persian and Arabic.',
      'Terminology consistency matters more than style; we provide a glossary. Delivery as Word files with the original layout.',
    ]),
    skills: ['Translation', 'Arabic', 'Persian', 'Technical writing'],
    budgetMin: 600n,
    budgetMax: 900n,
    currency: 'USD',
    experienceLevel: 'INTERMEDIATE',
    duration: 'ONE_TO_FOUR_WEEKS',
    languages: ['en', 'fa', 'ar'],
    freelancersNeeded: 2,
    publishedDaysAgo: 5,
    closesInDays: 9,
    views: 141,
  },
  {
    key: 'ml',
    owner: 'nordlicht',
    title: 'Demand-forecasting model review (NDA, invite only)',
    category: 'w-ml-models',
    description: 'Review and improve an existing gradient-boosting demand forecast; produce a short report with backtests.',
    skills: ['Python', 'LightGBM', 'Time series', 'pandas'],
    budgetMin: 1_500n,
    budgetMax: 2_500n,
    currency: 'EUR',
    experienceLevel: 'EXPERT',
    duration: 'ONE_TO_FOUR_WEEKS',
    nda: true,
    visibility: 'INVITE_ONLY',
    publishedDaysAgo: 4,
    closesInDays: 20,
    views: 12,
  },
  {
    key: 'app',
    owner: 'bogazici',
    title: 'Flutter delivery app — courier side (members only)',
    category: 'w-mobile',
    description: 'Courier app in Flutter: login, assigned orders, live location, proof of delivery photos. Backend exists (REST).',
    skills: ['Flutter', 'Dart', 'Firebase', 'Google Maps'],
    budgetMin: 4_000n,
    budgetMax: 6_000n,
    currency: 'USD',
    experienceLevel: 'INTERMEDIATE',
    duration: 'ONE_TO_THREE_MONTHS',
    visibility: 'SIGNED_IN',
    publishedDaysAgo: 6,
    views: 96,
  },
  {
    key: 'accounting',
    owner: 'alborz',
    title: 'حسابدار پاره‌وقت برای بستن حساب‌های سال مالی (ساعتی)',
    category: 'w-accounting',
    description: DESC([
      'برای بستن حساب‌های سال مالی و آماده‌سازی اظهارنامه به یک حسابدار باتجربه، حدود ۱۰ ساعت در هفته، نیاز داریم.',
      'آشنایی با سپیدار و قوانین مالیاتی الزامی است. کار حضوری در شهرک صنعتی البرز قزوین، دو روز در هفته.',
    ]),
    skills: ['حسابداری', 'سپیدار', 'مالیات', 'Excel'],
    pricingType: 'HOURLY',
    budgetMin: 400_000n,
    budgetMax: 600_000n,
    experienceLevel: 'EXPERT',
    duration: 'ONE_TO_THREE_MONTHS',
    weeklyHours: 'LESS_THAN_10',
    onsite: { country: 'IR', province: 'قزوین', city: 'البرز' },
    publishedDaysAgo: 8,
    closesInDays: 15,
    views: 74,
  },
  {
    key: 'seo',
    owner: 'rayan',
    title: 'سئوی فنی و محتوایی وب‌سایت شرکت (بودجه با پیشنهاد شما)',
    category: 'w-seo',
    description: 'بررسی فنی سایت، رفع خطاهای ایندکس، نقشهٔ کلمات کلیدی و تقویم محتوایی سه‌ماهه. بودجه را بر اساس دامنهٔ کار پیشنهاد دهید.',
    skills: ['SEO', 'Google Search Console', 'محتوا'],
    budgetUnknown: true,
    experienceLevel: 'ENTRY',
    duration: 'THREE_TO_SIX_MONTHS',
    publishedDaysAgo: 12,
    views: 58,
  },
  {
    key: 'video',
    owner: 'karaj',
    title: 'تدوین ده ویدئوی کوتاه اینستاگرام برای کافه',
    category: 'w-video-edit',
    description: 'ده ریلز ۱۵ تا ۳۰ ثانیه‌ای از فیلم‌هایی که خودمان گرفته‌ایم، با زیرنویس فارسی و موسیقی بدون حق نشر.',
    skills: ['Premiere', 'CapCut', 'Motion'],
    budgetMin: M(8),
    budgetMax: M(12),
    experienceLevel: 'ENTRY',
    duration: 'LESS_THAN_WEEK',
    state: 'CLOSED',
    publishedDaysAgo: 40,
    views: 210,
  },
  {
    key: 'website-done',
    owner: 'gulf',
    title: 'Company website in English and Arabic',
    category: 'w-web-dev',
    description: 'A five-page bilingual website with a contact form and a product enquiry page. Finished and reviewed.',
    skills: ['React', 'i18n', 'SEO'],
    budgetMin: 1_200n,
    budgetMax: 1_800n,
    currency: 'USD',
    experienceLevel: 'INTERMEDIATE',
    duration: 'ONE_TO_FOUR_WEEKS',
    state: 'AWARDED',
    publishedDaysAgo: 60,
    views: 330,
  },
  {
    key: 'draft',
    owner: 'rayan',
    title: 'اپلیکیشن داخلی مرخصی کارکنان (پیش‌نویس)',
    category: 'w-web-app',
    description: 'پیش‌نویسی برای نمایش حالت «پیش‌نویس» در داشبورد کارفرما؛ هنوز برای بررسی ارسال نشده است.',
    skills: ['Node.js'],
    budgetMin: M(30),
    budgetMax: M(50),
    status: 'DRAFT',
  },
  {
    key: 'review',
    owner: 'bogazici',
    title: 'Landing page A/B testing setup',
    category: 'w-marketing-strategy',
    description: 'Waiting for review, so the staff queue shows an international, hourly posting.',
    skills: ['Google Optimize', 'Analytics'],
    pricingType: 'HOURLY',
    budgetMin: 15n,
    budgetMax: 25n,
    currency: 'USD',
    weeklyHours: 'LESS_THAN_10',
    status: 'PENDING_REVIEW',
  },
  {
    key: 'changes',
    owner: 'alborz',
    title: 'ربات تلگرام ثبت سفارش',
    category: 'w-scripts-bots',
    description: 'برگشت‌خورده برای اصلاح، تا یادداشت بررسی‌کننده در داشبورد دیده شود.',
    skills: ['Python', 'Telegram API'],
    budgetMin: M(10),
    budgetMax: M(5),
    status: 'CHANGES_REQUESTED',
    reviewNote: 'حداکثر بودجه کمتر از حداقل آن است و شرح کار کامل نیست؛ لطفاً خروجی‌ها را دقیق بنویسید.',
  },
];

interface DemoBid {
  project: string;
  bidder: Person;
  amount: bigint;
  days?: number;
  outcome: 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  seen?: boolean;
  daysAgo: number;
  message: string;
  milestones?: Array<{ title: string; amount: string; days: number }>;
  answers?: string[];
  note?: string;
  invited?: boolean;
}

const BIDS: DemoBid[] = [
  {
    project: 'shop', bidder: 'sara', amount: M(60), days: 18, outcome: 'SHORTLISTED', seen: true, daysAgo: 0,
    message: 'پنج فروشگاه ووکامرس ساخته‌ام که دو تا از آن‌ها قهوه می‌فروشند. کار را در سه مرحله تحویل می‌دهم و پس از تحویل یک ماه پشتیبانی رایگان دارم.',
    milestones: [
      { title: 'قالب و صفحهٔ اصلی', amount: String(M(20)), days: 6 },
      { title: 'محصولات، پرداخت و ارسال', amount: String(M(30)), days: 8 },
      { title: 'بهینه‌سازی سرعت و آموزش', amount: String(M(10)), days: 4 },
    ],
    answers: ['coffee-example.ir و shop-example.ir', 'زرین‌پال؛ کارمزد مناسب و پشتیبانی خوب از ووکامرس.'],
    note: 'نمونه‌کار قهوه دارد؛ تماس تصویری برای پنجشنبه.',
  },
  {
    project: 'shop', bidder: 'niloofar', amount: M(45), days: 21, outcome: 'PENDING', seen: false, daysAgo: 0,
    message: 'طراح رابط کاربری هستم و فروشگاه‌های وردپرسی را با همکار برنامه‌نویسم پیاده می‌کنم.',
    answers: ['design-portfolio.ir/shops', 'آی‌دی‌پی؛ برای کارت‌های بانکی تجربهٔ کاربری بهتری دارد.'],
  },
  {
    project: 'shop', bidder: 'omid', amount: M(70), days: 14, outcome: 'DECLINED', seen: true, daysAgo: 1,
    message: 'راه‌اندازی سرور و بهینه‌سازی سرعت تخصص من است؛ فروشگاه را روی سرور اختصاصی با CDN بالا می‌آورم.',
    answers: ['store-a.example و store-b.example', 'به‌پرداخت ملت.'],
  },
  {
    project: 'dashboard', bidder: 'sara', amount: M(160), days: 45, outcome: 'INTERVIEW', seen: true, daysAgo: 2,
    message: 'داشبوردهای بانکی با جداول ده‌هزار ردیفی ساخته‌ام؛ با TanStack Table و مجازی‌سازی کار می‌کنم.',
    answers: ['از react-virtual برای ردیف‌ها و صفحه‌بندی سمت سرور استفاده کرده‌ام.'],
    note: 'بهترین تطابق فنی. جلسهٔ دوم با تیم محصول.',
    invited: true,
  },
  {
    project: 'dashboard', bidder: 'omid', amount: M(140), days: 50, outcome: 'SHORTLISTED', seen: true, daysAgo: 2,
    message: 'فرانت‌اند و DevOps را با هم انجام می‌دهم؛ CI و استقرار خودکار هم بخشی از تحویل است.',
    answers: ['در پروژهٔ قبلی جدول ۵۰ هزار ردیفی را با ag-grid پیاده کردم.'],
  },
  {
    project: 'pipeline', bidder: 'reza', amount: 28n, outcome: 'ACCEPTED', seen: true, daysAgo: 28,
    message: 'I maintain Airflow and dbt for a retail analytics team today and can start at 15 hours a week.',
  },
  {
    project: 'pipeline', bidder: 'omid', amount: 32n, outcome: 'DECLINED', seen: true, daysAgo: 29,
    message: 'Platform engineer with Airflow on Kubernetes experience.',
  },
  {
    project: 'logo', bidder: 'niloofar', amount: M(30), days: 5, outcome: 'PENDING', seen: true, daysAgo: 1,
    message: 'هویت بصری دو برند لبنی را طراحی کرده‌ام؛ سه پیشنهاد اولیه را در دو روز می‌فرستم.',
  },
  {
    project: 'logo', bidder: 'maryam', amount: M(22), days: 7, outcome: 'WITHDRAWN', seen: false, daysAgo: 2,
    message: 'پیشنهادی که پس گرفته شد، برای نمایش حالت «پس‌گرفته‌شده».',
  },
  {
    project: 'translation', bidder: 'ali', amount: 750n, days: 12, outcome: 'PENDING', seen: false, daysAgo: 0,
    message: 'Native Persian and fluent Arabic; I translated two industrial catalogues last year with a client glossary.',
  },
  {
    project: 'translation', bidder: 'zahra', amount: 820n, days: 10, outcome: 'SHORTLISTED', seen: true, daysAgo: 1,
    message: 'Medical and technical translator; I will deliver in the original layout with a terminology sheet.',
  },
  {
    project: 'accounting', bidder: 'maryam', amount: 550_000n, outcome: 'INTERVIEW', seen: true, daysAgo: 3,
    message: 'هشت سال سابقهٔ بستن حساب با سپیدار دارم و در قزوین زندگی می‌کنم.',
    invited: true,
  },
  {
    project: 'website-done', bidder: 'sara', amount: 1_500n, days: 20, outcome: 'ACCEPTED', seen: true, daysAgo: 55,
    message: 'Bilingual sites with RTL and LTR layouts are my speciality.',
    milestones: [
      { title: 'Design and English pages', amount: '800', days: 10 },
      { title: 'Arabic pages and launch', amount: '700', days: 10 },
    ],
  },
  {
    project: 'video', bidder: 'niloofar', amount: M(10), days: 5, outcome: 'DECLINED', seen: true, daysAgo: 38,
    message: 'تدوین کوتاه و موشن ساده برای شبکه‌های اجتماعی.',
  },
];

interface DemoService {
  key: string;
  owner: Person;
  title: string;
  category: string;
  description: string;
  skills: string[];
  languages: string[];
  currency?: string;
  packages: Array<{ tier: 'BASIC' | 'STANDARD' | 'PREMIUM'; name: string; description: string; price: bigint; days: number; revisions: number; features: string[] }>;
  extras?: Array<{ title: string; price: bigint; extraDays: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  requirements?: string[];
  featured?: boolean;
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED';
  paused?: boolean;
  views?: number;
}

const SERVICES: DemoService[] = [
  {
    key: 'landing',
    owner: 'sara',
    title: 'صفحهٔ فرود واکنش‌گرا با React و Next.js طراحی و پیاده‌سازی می‌کنم',
    category: 'w-frontend',
    description: DESC([
      'یک صفحهٔ فرود سریع، واکنش‌گرا و سئوشده برای محصول یا کمپین شما می‌سازم؛ با Next.js، Tailwind و امتیاز Lighthouse بالای ۹۰.',
      'از طرح Figma شما یا قالب پیشنهادی من شروع می‌کنیم. کد تمیز و قابل نگهداری تحویل می‌دهم و روی دامنهٔ شما مستقر می‌کنم.',
    ]),
    skills: ['React', 'Next.js', 'Tailwind', 'SEO'],
    languages: ['fa', 'en'],
    packages: [
      { tier: 'BASIC', name: 'تک‌صفحه', description: 'یک صفحه تا ۵ بخش از روی طرح شما', price: M(12), days: 4, revisions: 2, features: ['واکنش‌گرا', 'فرم تماس', 'سئوی پایه'] },
      { tier: 'STANDARD', name: 'صفحه و وبلاگ', description: 'صفحهٔ فرود به‌همراه وبلاگ ساده', price: M(22), days: 7, revisions: 3, features: ['واکنش‌گرا', 'فرم تماس', 'سئوی پایه', 'وبلاگ', 'تحلیل‌گر'] },
      { tier: 'PREMIUM', name: 'کامل', description: 'طراحی از صفر، چندزبانه و انیمیشن', price: M(40), days: 12, revisions: -1, features: ['واکنش‌گرا', 'فرم تماس', 'سئوی پایه', 'وبلاگ', 'تحلیل‌گر', 'چندزبانه', 'طراحی اختصاصی'] },
    ],
    extras: [
      { title: 'فایل منبع Figma', price: M(5), extraDays: 0 },
      { title: 'یک صفحهٔ اضافه', price: M(4), extraDays: 2 },
    ],
    faqs: [
      { question: 'میزبانی را هم انجام می‌دهید؟', answer: 'بله، روی سرور یا Vercel شما مستقر می‌کنم؛ هزینهٔ میزبانی با خودتان است.' },
      { question: 'کد را تحویل می‌گیرم؟', answer: 'بله، مخزن گیت کامل با راهنمای اجرا.' },
    ],
    requirements: ['نشانی طرح Figma یا نمونه‌هایی که می‌پسندید', 'متن و تصاویر صفحه'],
    featured: true,
    views: 640,
  },
  {
    key: 'logo',
    owner: 'niloofar',
    title: 'لوگو و هویت بصری حرفه‌ای برای برند شما طراحی می‌کنم',
    category: 'w-logo-brand',
    description: DESC([
      'لوگوی ماندگار و ساده که در اندازهٔ آیکون و تابلو به یک اندازه خوانا باشد؛ همراه با پالت رنگ و راهنمای استفاده.',
      'روند کار: پرسش‌نامهٔ برند، سه پیشنهاد اولیه، اصلاح و تحویل فایل‌های نهایی در همهٔ قالب‌ها.',
    ]),
    skills: ['Illustrator', 'Branding', 'Typography'],
    languages: ['fa', 'en'],
    packages: [
      { tier: 'BASIC', name: 'لوگو', description: 'دو پیشنهاد اولیه و فایل نهایی', price: M(6), days: 3, revisions: 2, features: ['فایل PNG و SVG', 'نسخهٔ سیاه و سفید'] },
      { tier: 'STANDARD', name: 'لوگو و کارت', description: 'سه پیشنهاد، کارت ویزیت و سربرگ', price: M(12), days: 5, revisions: 4, features: ['فایل PNG و SVG', 'نسخهٔ سیاه و سفید', 'کارت ویزیت', 'سربرگ'] },
      { tier: 'PREMIUM', name: 'هویت کامل', description: 'راهنمای برند و قالب شبکه‌های اجتماعی', price: M(28), days: 10, revisions: -1, features: ['فایل PNG و SVG', 'نسخهٔ سیاه و سفید', 'کارت ویزیت', 'سربرگ', 'راهنمای برند', 'قالب اینستاگرام'] },
    ],
    extras: [{ title: 'فایل سه‌بعدی لوگو', price: M(3), extraDays: 2 }],
    faqs: [{ question: 'حق مالکیت لوگو با کیست؟', answer: 'پس از تحویل، همهٔ حقوق با شماست.' }],
    requirements: ['نام برند و شعار', 'رنگ‌ها یا نمونه‌هایی که دوست دارید'],
    views: 410,
  },
  {
    key: 'dataviz',
    owner: 'reza',
    title: 'I will build a Power BI dashboard from your Excel or SQL data',
    category: 'w-dashboards',
    description: DESC([
      'Interactive Power BI dashboards that answer the questions your team asks every week — sales, stock, finance or operations.',
      'I model the data properly (star schema, DAX measures) so the report stays fast and correct as it grows.',
    ]),
    skills: ['Power BI', 'DAX', 'SQL', 'Excel'],
    languages: ['en', 'fa', 'de'],
    currency: 'EUR',
    packages: [
      { tier: 'BASIC', name: 'One page', description: 'One report page from one data source', price: 120n, days: 3, revisions: 1, features: ['Up to 5 visuals', 'One data source'] },
      { tier: 'STANDARD', name: 'Department', description: 'Three pages, two sources, scheduled refresh', price: 320n, days: 7, revisions: 3, features: ['Up to 15 visuals', 'Two data sources', 'Scheduled refresh'] },
    ],
    faqs: [{ question: 'Do I need a Power BI Pro licence?', answer: 'Only to share in the Power BI service; the .pbix file works in the free desktop app.' }],
    requirements: ['A sample of the data (anonymised is fine)', 'The questions the dashboard must answer'],
    views: 290,
  },
  {
    key: 'devops',
    owner: 'omid',
    title: 'I will set up Docker, CI/CD and a production server for your app',
    category: 'w-devops',
    description: DESC([
      'Containerise your app, set up GitHub Actions or GitLab CI, and deploy it to a hardened Linux server with HTTPS, backups and monitoring.',
      'You get everything as code in your repository, and a short runbook.',
    ]),
    skills: ['Docker', 'Linux', 'Nginx', 'GitHub Actions', 'Terraform'],
    languages: ['en', 'fa', 'tr'],
    currency: 'USD',
    packages: [
      { tier: 'BASIC', name: 'Dockerise', description: 'Dockerfile and compose for one app', price: 80n, days: 2, revisions: 1, features: ['Dockerfile', 'docker-compose'] },
      { tier: 'STANDARD', name: 'Deploy', description: 'CI pipeline and deployment to your server', price: 250n, days: 5, revisions: 2, features: ['Dockerfile', 'docker-compose', 'CI pipeline', 'HTTPS'] },
      { tier: 'PREMIUM', name: 'Production', description: 'Hardened server, backups, monitoring', price: 600n, days: 10, revisions: 3, features: ['Dockerfile', 'docker-compose', 'CI pipeline', 'HTTPS', 'Backups', 'Monitoring', 'Runbook'] },
    ],
    extras: [{ title: 'One month of on-call support', price: 200n, extraDays: 0 }],
    requirements: ['Repository access', 'Server or cloud account details'],
    featured: true,
    views: 520,
  },
  {
    key: 'translate',
    owner: 'zahra',
    title: 'I will translate medical and technical documents between English and Persian',
    category: 'w-translation',
    description: 'Accurate, terminology-consistent translation of medical reports, manuals and research papers, by a nurse with eight years of translation work.',
    skills: ['Translation', 'Medical', 'Technical writing'],
    languages: ['en', 'fa'],
    currency: 'CAD',
    packages: [
      { tier: 'BASIC', name: 'Up to 1,000 words', description: 'One document up to 1,000 words', price: 60n, days: 2, revisions: 1, features: ['Proofread once'] },
      { tier: 'STANDARD', name: 'Up to 5,000 words', description: 'Up to 5,000 words with glossary', price: 260n, days: 6, revisions: 2, features: ['Proofread once', 'Glossary'] },
    ],
    requirements: ['The document', 'Target audience (patients, clinicians, regulators)'],
    views: 150,
  },
  {
    key: 'bookkeeping',
    owner: 'maryam',
    title: 'دفترداری ماهانه و تهیهٔ گزارش‌های مالی کسب‌وکارهای کوچک',
    category: 'w-accounting',
    description: 'ثبت اسناد ماهانه در سپیدار یا اکسل، تطبیق بانکی و گزارش سود و زیان برای فروشگاه‌ها و شرکت‌های کوچک.',
    skills: ['حسابداری', 'سپیدار', 'Excel'],
    languages: ['fa'],
    packages: [{ tier: 'BASIC', name: 'ماهانه', description: 'ثبت تا ۲۰۰ سند و گزارش ماهانه', price: M(5), days: 7, revisions: 1, features: ['تطبیق بانکی', 'گزارش سود و زیان'] }],
    status: 'PENDING_REVIEW',
  },
  {
    key: 'paused',
    owner: 'hamid',
    title: 'نقشه‌کشی صنعتی قطعات با سالیدورکس و اتوکد انجام می‌دهم',
    category: 'w-cad',
    description: 'تهیهٔ نقشهٔ ساخت قطعات از روی نمونه یا اسکچ، با تلرانس‌گذاری و فایل‌های DWG و STEP. فعلاً متوقف است تا حالت «متوقف» دیده شود.',
    skills: ['SolidWorks', 'AutoCAD'],
    languages: ['fa', 'az'],
    packages: [{ tier: 'BASIC', name: 'یک قطعه', description: 'نقشهٔ ساخت یک قطعهٔ ساده', price: M(3), days: 3, revisions: 2, features: ['DWG', 'STEP'] }],
    paused: true,
  },
];

export async function seedWork(manifest: DemoManifest) {
  const counts = { projects: 0, bids: 0, invites: 0, contracts: 0, services: 0, orders: 0, timesheets: 0 };

  await syncWorkTaxonomy();
  const categories = new Map(
    (await prisma.workCategory.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]),
  );

  const users = await prisma.user.findMany({
    where: { email: { in: Object.values(PEOPLE) } },
    select: { id: true, email: true },
  });
  const id = (person: Person) => {
    const user = users.find((row) => row.email === PEOPLE[person]);
    if (!user) throw new Error(`demo user ${person} is missing; seedJobs runs first`);
    return user.id;
  };

  // Fixed, not random: a screenshot taken today should match one taken next week.
  for (const [index, [person, data]] of Object.entries(FREELANCER_PROFILES).entries()) {
    await prisma.user.update({ where: { id: id(person as Person) }, data: { ...data, lastActiveAt: daysAgo(index % 3) } });
  }
  for (const person of ['rayan', 'alborz', 'nordlicht', 'gulf', 'bogazici', 'karaj'] as const) {
    await prisma.user.update({ where: { id: id(person) }, data: { lastActiveAt: daysAgo(1) } });
  }

  // ---- projects ------------------------------------------------------------------
  const projectIds = new Map<string, { id: string; owner: Person; title: string; currency: string; pricingType: 'FIXED' | 'HOURLY' }>();
  for (const project of PROJECTS) {
    const status = project.status ?? 'APPROVED';
    const live = status === 'APPROVED';
    const row = await prisma.freelanceProject.create({
      data: {
        code: generateTrackingCode(),
        authorId: id(project.owner),
        title: project.title,
        description: project.description,
        workCategoryId: categories.get(project.category) ?? null,
        skills: project.skills,
        pricingType: project.pricingType ?? 'FIXED',
        budgetMin: project.budgetUnknown ? null : (project.budgetMin ?? null),
        budgetMax: project.budgetUnknown ? null : (project.budgetMax ?? null),
        budgetUnknown: project.budgetUnknown ?? false,
        currency: project.currency ?? 'IRT',
        experienceLevel: project.experienceLevel ?? null,
        duration: project.duration ?? null,
        weeklyHours: project.weeklyHours ?? null,
        urgent: project.urgent ?? false,
        featured: project.featured ?? false,
        featuredAt: project.featured ? daysAgo(project.publishedDaysAgo ?? 0) : null,
        sealed: project.sealed ?? true,
        nda: project.nda ?? false,
        visibility: project.visibility ?? 'PUBLIC',
        preferredCountries: project.preferredCountries ?? [],
        languages: project.languages ?? ['fa'],
        screeningQuestions: project.screeningQuestions ?? [],
        contractToHire: project.contractToHire ?? false,
        freelancersNeeded: project.freelancersNeeded ?? 1,
        onsite: Boolean(project.onsite),
        country: project.onsite?.country ?? null,
        province: project.onsite?.province ?? null,
        city: project.onsite?.city ?? null,
        moderationStatus: status,
        reviewNote: project.reviewNote ?? null,
        submittedAt: status === 'DRAFT' ? null : daysAgo((project.publishedDaysAgo ?? 1) + 1),
        reviewedAt: live || status === 'CHANGES_REQUESTED' ? daysAgo(project.publishedDaysAgo ?? 1) : null,
        state: project.state ?? 'OPEN',
        publishedAt: live ? daysAgo(project.publishedDaysAgo ?? 0) : null,
        closesAt: project.closesInDays !== undefined ? daysAhead(project.closesInDays) : null,
        viewCount: project.views ?? 0,
        clientViewedAt: live ? daysAgo(Math.min(project.publishedDaysAgo ?? 0, 1)) : null,
        createdAt: daysAgo((project.publishedDaysAgo ?? 1) + 2),
      },
      select: { id: true },
    });
    await manifest.record('freelanceProject', row.id);
    projectIds.set(project.key, {
      id: row.id,
      owner: project.owner,
      title: project.title,
      currency: project.currency ?? 'IRT',
      pricingType: project.pricingType ?? 'FIXED',
    });
    counts.projects += 1;
  }
  const project = (key: string) => projectIds.get(key)!;

  // NDAs signed by the people who bid on NDA projects, and by one who only read.
  for (const [key, people] of [
    ['dashboard', ['sara', 'omid', 'reza']],
    ['ml', ['reza']],
  ] as const) {
    for (const person of people) {
      const row = await prisma.projectNdaSignature.create({
        data: { projectId: project(key).id, userId: id(person), signedName: person, signedAt: daysAgo(2) },
        select: { id: true },
      });
      await manifest.record('projectNdaSignature', row.id);
    }
  }

  // ---- invitations ---------------------------------------------------------------
  for (const [key, person, status, message] of [
    ['dashboard', 'sara', 'ACCEPTED', 'نمونه‌کارهای بانکی شما را دیدیم؛ خوشحال می‌شویم پیشنهاد بدهید.'],
    ['accounting', 'maryam', 'ACCEPTED', 'سابقهٔ شما با سپیدار برای ما ارزشمند است.'],
    ['ml', 'reza', 'PENDING', 'We liked your Airflow work for us — would you review our forecasting model?'],
    ['translation', 'zahra', 'ACCEPTED', null],
    ['logo', 'sara', 'DECLINED', null],
    ['shop', 'hamid', 'PENDING', null],
  ] as const) {
    const row = await prisma.projectInvite.create({
      data: {
        projectId: project(key).id,
        freelancerId: id(person),
        message,
        status,
        respondedAt: status === 'PENDING' ? null : daysAgo(1),
        createdAt: daysAgo(3),
      },
      select: { id: true },
    });
    await manifest.record('projectInvite', row.id);
    counts.invites += 1;
  }

  // ---- proposals -------------------------------------------------------------------
  const bidIds = new Map<string, string>();
  for (const bid of BIDS) {
    const target = project(bid.project);
    const created = daysAgo(bid.daysAgo);
    const row = await prisma.projectBid.create({
      data: {
        projectId: target.id,
        bidderId: id(bid.bidder),
        amount: bid.amount,
        currency: target.currency,
        deliveryDays: bid.days ?? null,
        message: bid.message,
        moderationStatus: 'APPROVED',
        reviewedAt: created,
        outcome: bid.outcome,
        milestones: bid.milestones ?? undefined,
        screeningAnswers: bid.answers ?? [],
        clientSeenAt: bid.seen ? new Date(created.getTime() + 4 * 3_600_000) : null,
        clientNote: bid.note ?? null,
        outcomeChangedAt: bid.outcome === 'PENDING' ? null : new Date(created.getTime() + 20 * 3_600_000),
        invited: bid.invited ?? false,
        createdAt: created,
      },
      select: { id: true },
    });
    await manifest.record('projectBid', row.id);
    bidIds.set(`${bid.project}:${bid.bidder}`, row.id);
    counts.bids += 1;
  }

  // ---- contracts ---------------------------------------------------------------------
  // A finished fixed-price job, both sides reviewed, milestones delivered on time.
  const website = await prisma.marketplaceAward.create({
    data: {
      projectBidId: bidIds.get('website-done:sara')!,
      agreedAmount: 1_500n,
      currency: 'USD',
      awardedById: id('gulf'),
      status: 'COMPLETED',
      completedAt: daysAgo(30),
      createdAt: daysAgo(54),
    },
    select: { id: true },
  });
  await manifest.record('marketplaceAward', website.id);
  for (const [order, title, due, delivered] of [
    [1, 'Design and English pages', 44, 45],
    [2, 'Arabic pages and launch', 32, 33],
  ] as const) {
    const milestone = await prisma.marketplaceMilestone.create({
      data: {
        awardId: website.id,
        order,
        title,
        dueDate: daysAgo(due),
        status: 'APPROVED',
        deliveredAt: daysAgo(delivered),
        deliveryNote: 'Delivered with source code and a short handover note.',
        approvedAt: daysAgo(delivered - 1),
      },
      select: { id: true },
    });
    await manifest.record('marketplaceMilestone', milestone.id);
  }
  for (const [rater, ratee, rating, text] of [
    ['gulf', 'sara', 5, 'Excellent bilingual work, on time, clear communication throughout.'],
    ['sara', 'gulf', 5, 'Clear brief and fast feedback. Would work with them again.'],
  ] as const) {
    const review = await prisma.marketplaceReview.create({
      data: { awardId: website.id, raterId: id(rater), rateeId: id(ratee), rating, text, createdAt: daysAgo(29) },
      select: { id: true },
    });
    await manifest.record('marketplaceReview', review.id);
  }
  counts.contracts += 1;

  // A live hourly contract with weeks approved, one queried and one waiting.
  const hourly = await prisma.marketplaceAward.create({
    data: {
      projectBidId: bidIds.get('pipeline:reza')!,
      currency: 'EUR',
      awardedById: id('nordlicht'),
      pricingType: 'HOURLY',
      hourlyRate: 28n,
      weeklyHourLimit: 30,
      createdAt: daysAgo(27),
    },
    select: { id: true },
  });
  await manifest.record('marketplaceAward', hourly.id);
  counts.contracts += 1;
  for (const [weeksAgo, minutes, status, memo, note] of [
    [3, 14 * 60, 'APPROVED', 'Fixed the nightly orders DAG; added freshness tests to 12 dbt models.', null],
    [2, 16 * 60 + 30, 'APPROVED', 'New Shopify source with incremental loads; documented the lineage.', null],
    [1, 18 * 60, 'QUERIED', 'Backfill of 2025 shipments; refactored the warehouse staging layer.', 'Can you split the backfill hours from the refactor?'],
    [0, 9 * 60 + 15, 'SUBMITTED', 'Alerting on failed tasks to Slack; reviewed the pull requests of the team.', null],
  ] as const) {
    const sheet = await prisma.marketplaceTimesheet.create({
      data: {
        awardId: hourly.id,
        weekStart: weekStartOf(daysAgo(weeksAgo * 7)),
        minutes,
        memo,
        status,
        clientNote: note,
        submittedAt: daysAgo(weeksAgo * 7 - 1 < 0 ? 0 : weeksAgo * 7 - 1),
        reviewedAt: status === 'SUBMITTED' ? null : daysAgo(Math.max(weeksAgo * 7 - 2, 0)),
      },
      select: { id: true },
    });
    await manifest.record('marketplaceTimesheet', sheet.id);
    counts.timesheets += 1;
  }

  // ---- services --------------------------------------------------------------------
  const serviceIds = new Map<string, { id: string; owner: Person; packages: DemoService['packages']; currency: string; title: string }>();
  for (const service of SERVICES) {
    const files = [];
    for (let index = 0; index < (service.status === 'PENDING_REVIEW' ? 1 : 3); index++) {
      const [stored] = await storeFiles(
        [{ originalName: `${service.key}-${index + 1}.png`, buffer: placeholderPng(`${service.title} ${index + 1}`) }],
        IMAGE_EXTENSIONS,
      );
      await manifest.record('storedFile', stored.storedName);
      files.push(stored);
    }
    const currency = service.currency ?? 'IRT';
    const status = service.status ?? 'APPROVED';
    const row = await prisma.service.create({
      data: {
        code: generateTrackingCode(),
        ownerId: id(service.owner),
        title: service.title,
        description: service.description,
        workCategoryId: categories.get(service.category) ?? null,
        skills: service.skills,
        languages: service.languages,
        faqs: (service.faqs ?? []) as Prisma.InputJsonValue,
        requirements: service.requirements ?? [],
        moderationStatus: status,
        submittedAt: daysAgo(20),
        reviewedAt: status === 'APPROVED' ? daysAgo(19) : null,
        state: service.paused ? 'PAUSED' : 'ACTIVE',
        featured: service.featured ?? false,
        featuredAt: service.featured ? daysAgo(10) : null,
        viewCount: service.views ?? 0,
        createdAt: daysAgo(21),
        packages: {
          create: service.packages.map((pkg) => ({
            tier: pkg.tier,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            currency,
            deliveryDays: pkg.days,
            revisions: pkg.revisions,
            features: pkg.features,
          })),
        },
        extras: {
          create: (service.extras ?? []).map((extra, position) => ({ ...extra, position })),
        },
        images: {
          create: files.map((file, position) => ({
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            position,
          })),
        },
      },
      select: { id: true },
    });
    await manifest.record('service', row.id);
    serviceIds.set(service.key, { id: row.id, owner: service.owner, packages: service.packages, currency, title: service.title });
    counts.services += 1;
  }

  // ---- orders: every state, and finished ones with reviews for the ratings ----------
  const ORDERS: Array<{
    service: string;
    buyer: Person;
    tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
    status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
    finished?: { daysAgo: number; rating: number; text: string };
    reason?: string;
    daysAgo: number;
  }> = [
    { service: 'landing', buyer: 'rayan', tier: 'STANDARD', status: 'ACCEPTED', daysAgo: 40, finished: { daysAgo: 32, rating: 5, text: 'سریع، تمیز و دقیق. امتیاز Lighthouse صد شد!' } },
    { service: 'landing', buyer: 'karaj', tier: 'BASIC', status: 'ACCEPTED', daysAgo: 25, finished: { daysAgo: 21, rating: 5, text: 'صفحهٔ کافه را در چهار روز تحویل داد؛ عالی.' } },
    { service: 'landing', buyer: 'alborz', tier: 'PREMIUM', status: 'ACCEPTED', daysAgo: 6 },
    { service: 'landing', buyer: 'gulf', tier: 'BASIC', status: 'REQUESTED', daysAgo: 0 },
    { service: 'logo', buyer: 'karaj', tier: 'STANDARD', status: 'ACCEPTED', daysAgo: 30, finished: { daysAgo: 24, rating: 4, text: 'طرح‌ها خوب بود؛ یک دور بازبینی بیشتر از انتظار طول کشید.' } },
    { service: 'logo', buyer: 'bogazici', tier: 'PREMIUM', status: 'DECLINED', daysAgo: 9, reason: 'فعلاً ظرفیت پروژهٔ هویت کامل را ندارم؛ دو هفتهٔ دیگر در خدمتم.' },
    { service: 'devops', buyer: 'nordlicht', tier: 'PREMIUM', status: 'ACCEPTED', daysAgo: 35, finished: { daysAgo: 25, rating: 5, text: 'Rock-solid setup and a runbook our team actually uses.' } },
    { service: 'devops', buyer: 'rayan', tier: 'STANDARD', status: 'REQUESTED', daysAgo: 1 },
    { service: 'dataviz', buyer: 'gulf', tier: 'STANDARD', status: 'ACCEPTED', daysAgo: 20, finished: { daysAgo: 13, rating: 5, text: 'The dashboard answers every question we had. Great DAX work.' } },
    { service: 'translate', buyer: 'maple', tier: 'BASIC', status: 'CANCELLED', daysAgo: 4 },
  ];
  for (const order of ORDERS) {
    const service = serviceIds.get(order.service)!;
    const buyer = id(order.buyer);
    const pkg = service.packages.find((row) => row.tier === order.tier) ?? service.packages[0];
    const created = daysAgo(order.daysAgo);
    const row = await prisma.serviceOrder.create({
      data: {
        code: generateTrackingCode(),
        serviceId: service.id,
        buyerId: buyer,
        sellerId: id(service.owner),
        tier: pkg.tier,
        packageName: pkg.name,
        price: pkg.price,
        currency: service.currency,
        deliveryDays: pkg.days,
        revisions: pkg.revisions,
        requirementAnswers: [],
        note: order.status === 'REQUESTED' ? 'لطفاً پیش از شروع تماس کوتاهی بگیرید.' : null,
        status: order.status,
        respondedAt: order.status === 'REQUESTED' ? null : new Date(created.getTime() + 5 * 3_600_000),
        declineReason: order.reason ?? null,
        createdAt: created,
      },
      select: { id: true },
    });
    await manifest.record('serviceOrder', row.id);
    counts.orders += 1;

    if (order.status !== 'ACCEPTED') continue;
    const done = order.finished;
    const award = await prisma.marketplaceAward.create({
      data: {
        serviceOrderId: row.id,
        agreedAmount: pkg.price,
        currency: service.currency,
        awardedById: buyer,
        status: done ? 'COMPLETED' : 'ACTIVE',
        completedAt: done ? daysAgo(done.daysAgo) : null,
        createdAt: created,
      },
      select: { id: true },
    });
    await manifest.record('marketplaceAward', award.id);
    counts.contracts += 1;
    const milestone = await prisma.marketplaceMilestone.create({
      data: {
        awardId: award.id,
        order: 1,
        title: `تحویل — ${pkg.name}`,
        dueDate: new Date(created.getTime() + pkg.days * DAY),
        status: done ? 'APPROVED' : 'PENDING',
        deliveredAt: done ? daysAgo(done.daysAgo + 1) : null,
        approvedAt: done ? daysAgo(done.daysAgo) : null,
      },
      select: { id: true },
    });
    await manifest.record('marketplaceMilestone', milestone.id);
    if (done) {
      for (const [rater, ratee, rating, text] of [
        [buyer, id(service.owner), done.rating, done.text],
        [id(service.owner), buyer, 5, 'خریدار خوش‌قول با توضیحات کامل.'],
      ] as const) {
        const review = await prisma.marketplaceReview.create({
          data: { awardId: award.id, raterId: rater, rateeId: ratee, rating, text, createdAt: daysAgo(done.daysAgo) },
          select: { id: true },
        });
        await manifest.record('marketplaceReview', review.id);
      }
    }
  }

  // ---- saved projects and alerts -----------------------------------------------------
  for (const [person, key] of [
    ['sara', 'dashboard'],
    ['sara', 'translation'],
    ['reza', 'ml'],
    ['niloofar', 'shop'],
    ['omid', 'app'],
  ] as const) {
    const row = await prisma.savedProject.create({ data: { userId: id(person), projectId: project(key).id }, select: { id: true } });
    await manifest.record('savedProject', row.id);
  }
  const web = categories.get('w-dev');
  const design = categories.get('w-design');
  for (const [person, name, query, active] of [
    ['sara', 'React و Next.js', { skills: ['React', 'Next.js'] }, true],
    ['sara', 'پروژه‌های برنامه‌نویسی بالای ۵۰ میلیون', { ...(web ? { workCategoryId: web } : {}), budgetMin: String(M(50)) }, true],
    ['niloofar', 'طراحی', { ...(design ? { workCategoryId: design } : {}) }, true],
    ['reza', 'Hourly data work in English', { pricingType: 'HOURLY', language: 'en', search: 'data' }, false],
  ] as const) {
    const row = await prisma.projectAlert.create({
      data: { userId: id(person), name, query: query as Prisma.InputJsonValue, active, lastNotifiedAt: active ? daysAgo(1) : null },
      select: { id: true },
    });
    await manifest.record('projectAlert', row.id);
  }

  return counts;
}
