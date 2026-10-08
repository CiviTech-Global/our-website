/**
 * The freelance side's fixed vocabularies, as data.
 *
 * WORK CATEGORIES say what kind of work a project or a service is. Built from
 * the category trees of the marketplaces freelancers already know — Upwork's
 * "Find work" groups, Fiverr's catalogue, Freelancer.com's job families, and
 * Ponisha's and Karlancer's lists for the work Iranian clients actually post —
 * merged where they say the same thing twice. Two levels, the depth the board
 * filters on: choosing a group matches everything under it.
 *
 * A separate tree from the job categories on purpose. A job is a role
 * ("nurse", "welder"); freelance work is a deliverable ("a logo", "a Shopify
 * store", "a translated contract"), and most of the job tree is roles nobody
 * hires by the project.
 *
 * Seeded by slug and never overwritten, like every other list on the site:
 * the seed creates what is missing and leaves anything staff have renamed or
 * switched off as they left it. Slugs are permanent and ASCII.
 *
 * The remaining vocabularies (experience levels, durations, weekly hours,
 * languages) are keys, not rows: they change rarely and every screen shows
 * them in the reader's own language.
 */

export interface WorkTaxonomyNode {
  slug: string;
  name: string;
  nameEn: string;
  children?: Array<{ slug: string; name: string; nameEn: string }>;
}

const c = (slug: string, name: string, nameEn: string) => ({ slug, name, nameEn });

export const WORK_CATEGORIES: WorkTaxonomyNode[] = [
  {
    slug: 'w-ai',
    name: 'هوش مصنوعی و خودکارسازی',
    nameEn: 'AI & automation',
    children: [
      c('w-ai-agents', 'ایجنت‌ها و چت‌بات‌های هوشمند', 'AI agents & chatbots'),
      c('w-ai-integration', 'یکپارچه‌سازی LLM و API هوش مصنوعی', 'LLM & AI API integration'),
      c('w-ml-models', 'مدل‌سازی و یادگیری ماشین', 'Machine learning models'),
      c('w-data-labeling', 'برچسب‌گذاری و آماده‌سازی داده', 'Data labelling & annotation'),
      c('w-prompt-engineering', 'مهندسی پرامپت', 'Prompt engineering'),
      c('w-workflow-automation', 'خودکارسازی فرایندها (n8n، Zapier، Make)', 'Workflow automation (n8n, Zapier, Make)'),
      c('w-ai-content', 'تولید محتوا، تصویر و ویدئو با هوش مصنوعی', 'AI images, video & content'),
    ],
  },
  {
    slug: 'w-dev',
    name: 'برنامه‌نویسی و نرم‌افزار',
    nameEn: 'Development & IT',
    children: [
      c('w-web-dev', 'طراحی و توسعه وب‌سایت', 'Website development'),
      c('w-web-app', 'اپلیکیشن تحت وب و SaaS', 'Web apps & SaaS'),
      c('w-frontend', 'فرانت‌اند (React، Vue، Angular)', 'Front-end (React, Vue, Angular)'),
      c('w-backend', 'بک‌اند و API', 'Back-end & APIs'),
      c('w-wordpress', 'وردپرس و ووکامرس', 'WordPress & WooCommerce'),
      c('w-ecommerce', 'فروشگاه اینترنتی (Shopify و دیگران)', 'E-commerce (Shopify and others)'),
      c('w-mobile', 'اپلیکیشن موبایل (Android، iOS، Flutter)', 'Mobile apps (Android, iOS, Flutter)'),
      c('w-desktop', 'نرم‌افزار دسکتاپ', 'Desktop software'),
      c('w-game', 'بازی‌سازی', 'Game development'),
      c('w-devops', 'DevOps، سرور و ابر', 'DevOps, servers & cloud'),
      c('w-database', 'پایگاه داده', 'Databases'),
      c('w-security', 'امنیت و تست نفوذ', 'Security & penetration testing'),
      c('w-qa', 'تست و تضمین کیفیت نرم‌افزار', 'QA & testing'),
      c('w-blockchain', 'بلاکچین و وب ۳', 'Blockchain & Web3'),
      c('w-scripts-bots', 'اسکریپت، ربات و اسکرپینگ', 'Scripts, bots & scraping'),
      c('w-embedded', 'سخت‌افزار، الکترونیک و اینترنت اشیا', 'Embedded, electronics & IoT'),
      c('w-it-support', 'پشتیبانی فنی و شبکه', 'IT support & networking'),
    ],
  },
  {
    slug: 'w-design',
    name: 'طراحی و گرافیک',
    nameEn: 'Design & creative',
    children: [
      c('w-logo-brand', 'لوگو و هویت بصری', 'Logo & brand identity'),
      c('w-ui-ux', 'طراحی رابط و تجربهٔ کاربری (UI/UX)', 'UI/UX design'),
      c('w-web-design', 'طراحی قالب وب‌سایت', 'Web design'),
      c('w-graphic', 'طراحی گرافیک و تبلیغات', 'Graphic & ad design'),
      c('w-social-design', 'طراحی پست و استوری شبکه‌های اجتماعی', 'Social media design'),
      c('w-print', 'طراحی چاپی (کاتالوگ، بروشور، کارت ویزیت)', 'Print design'),
      c('w-packaging', 'طراحی بسته‌بندی و برچسب', 'Packaging & labels'),
      c('w-illustration', 'تصویرسازی و کاراکتر', 'Illustration & characters'),
      c('w-3d', 'مدل‌سازی و رندر سه‌بعدی', '3D modelling & rendering'),
      c('w-presentation', 'طراحی ارائه و اینفوگرافیک', 'Presentations & infographics'),
      c('w-photo-edit', 'ویرایش و روتوش عکس', 'Photo editing & retouching'),
      c('w-interior', 'طراحی داخلی و دکوراسیون', 'Interior design'),
      c('w-fashion', 'طراحی مد و لباس', 'Fashion design'),
    ],
  },
  {
    slug: 'w-video-audio',
    name: 'ویدئو، انیمیشن و صدا',
    nameEn: 'Video, animation & audio',
    children: [
      c('w-video-edit', 'تدوین ویدئو', 'Video editing'),
      c('w-motion', 'موشن‌گرافیک', 'Motion graphics'),
      c('w-animation', 'انیمیشن دوبعدی و سه‌بعدی', '2D & 3D animation'),
      c('w-videography', 'فیلم‌برداری و عکاسی', 'Videography & photography'),
      c('w-voice-over', 'گویندگی و دوبله', 'Voice-over & dubbing'),
      c('w-audio-production', 'میکس، مسترینگ و تولید صدا', 'Mixing, mastering & audio'),
      c('w-music', 'آهنگ‌سازی و موسیقی', 'Music composition'),
      c('w-podcast', 'تولید پادکست', 'Podcast production'),
      c('w-subtitles', 'زیرنویس و تبدیل گفتار به متن', 'Subtitles & transcription'),
    ],
  },
  {
    slug: 'w-writing',
    name: 'نویسندگی و ترجمه',
    nameEn: 'Writing & translation',
    children: [
      c('w-content-writing', 'تولید محتوا و مقاله', 'Content & article writing'),
      c('w-seo-writing', 'محتوای سئو', 'SEO writing'),
      c('w-copywriting', 'کپی‌رایتینگ و متن تبلیغاتی', 'Copywriting'),
      c('w-technical-writing', 'نگارش فنی و مستندسازی', 'Technical writing & docs'),
      c('w-translation', 'ترجمه', 'Translation'),
      c('w-localization', 'بومی‌سازی نرم‌افزار و بازی', 'Software & game localisation'),
      c('w-proofreading', 'ویراستاری و نمونه‌خوانی', 'Editing & proofreading'),
      c('w-academic', 'پژوهش و نگارش علمی', 'Research & academic writing'),
      c('w-resume', 'رزومه و کاورلتر', 'Resumes & cover letters'),
      c('w-scriptwriting', 'فیلم‌نامه و سناریو', 'Scriptwriting'),
      c('w-business-plan', 'طرح توجیهی و بیزینس‌پلن', 'Business plans & proposals'),
    ],
  },
  {
    slug: 'w-marketing',
    name: 'بازاریابی و فروش',
    nameEn: 'Marketing & sales',
    children: [
      c('w-seo', 'سئو و بهینه‌سازی سایت', 'SEO'),
      c('w-social-media', 'مدیریت شبکه‌های اجتماعی', 'Social media management'),
      c('w-paid-ads', 'تبلیغات کلیکی (Google Ads، متا)', 'Paid ads (Google, Meta)'),
      c('w-email-marketing', 'ایمیل مارکتینگ', 'Email marketing'),
      c('w-influencer', 'اینفلوئنسر مارکتینگ', 'Influencer marketing'),
      c('w-marketing-strategy', 'استراتژی و برنامهٔ بازاریابی', 'Marketing strategy'),
      c('w-market-research', 'تحقیقات بازار', 'Market research'),
      c('w-lead-generation', 'جذب سرنخ و فروش تلفنی', 'Lead generation & telesales'),
      c('w-marketplace-sellers', 'مدیریت فروش در بازارگاه‌ها (دیجی‌کالا، آمازون)', 'Marketplace selling (Digikala, Amazon)'),
    ],
  },
  {
    slug: 'w-data',
    name: 'داده و تحلیل',
    nameEn: 'Data & analytics',
    children: [
      c('w-data-analysis', 'تحلیل داده و گزارش‌گیری', 'Data analysis & reporting'),
      c('w-dashboards', 'داشبورد و هوش تجاری (Power BI، Tableau)', 'Dashboards & BI (Power BI, Tableau)'),
      c('w-data-engineering', 'مهندسی داده و ETL', 'Data engineering & ETL'),
      c('w-excel', 'اکسل و گوگل‌شیت', 'Excel & Google Sheets'),
      c('w-statistics', 'آمار و تحلیل آماری (SPSS، R)', 'Statistics (SPSS, R)'),
      c('w-data-entry', 'ورود داده', 'Data entry'),
    ],
  },
  {
    slug: 'w-business',
    name: 'کسب‌وکار، مالی و حقوقی',
    nameEn: 'Business, finance & legal',
    children: [
      c('w-accounting', 'حسابداری و دفترداری', 'Accounting & bookkeeping'),
      c('w-tax', 'مالیات و اظهارنامه', 'Tax & returns'),
      c('w-financial-modeling', 'مدل‌سازی مالی و ارزش‌گذاری', 'Financial modelling & valuation'),
      c('w-business-consulting', 'مشاورهٔ کسب‌وکار و مدیریت', 'Business & management consulting'),
      c('w-hr', 'منابع انسانی و جذب نیرو', 'HR & recruiting'),
      c('w-legal', 'مشاورهٔ حقوقی و تنظیم قرارداد', 'Legal advice & contracts'),
      c('w-ip', 'ثبت شرکت، برند و اختراع', 'Company, trademark & patent registration'),
      c('w-project-management', 'مدیریت پروژه و محصول', 'Project & product management'),
      c('w-virtual-assistant', 'دستیار مجازی و امور اداری', 'Virtual assistance & admin'),
      c('w-customer-support', 'پشتیبانی مشتریان', 'Customer support'),
    ],
  },
  {
    slug: 'w-engineering',
    name: 'مهندسی و معماری',
    nameEn: 'Engineering & architecture',
    children: [
      c('w-architecture', 'طراحی معماری و نقشه', 'Architecture & plans'),
      c('w-cad', 'نقشه‌کشی و CAD (اتوکد، سالیدورکس)', 'CAD drafting (AutoCAD, SolidWorks)'),
      c('w-structural', 'محاسبات سازه و عمران', 'Structural & civil engineering'),
      c('w-mechanical', 'طراحی مکانیکی و قطعه', 'Mechanical & product design'),
      c('w-electrical', 'طراحی برق و الکترونیک (PCB)', 'Electrical & PCB design'),
      c('w-industrial', 'مهندسی صنایع و کنترل پروژه', 'Industrial engineering & planning'),
      c('w-simulation', 'شبیه‌سازی و تحلیل (MATLAB، ANSYS)', 'Simulation (MATLAB, ANSYS)'),
      c('w-bim', 'BIM و مدل‌سازی ساختمان', 'BIM & building modelling'),
    ],
  },
  {
    slug: 'w-education',
    name: 'آموزش و مشاوره',
    nameEn: 'Teaching & coaching',
    children: [
      c('w-tutoring', 'تدریس خصوصی و آنلاین', 'Private & online tutoring'),
      c('w-language-teaching', 'آموزش زبان', 'Language teaching'),
      c('w-course-creation', 'تولید دورهٔ آموزشی', 'Course creation'),
      c('w-career-coaching', 'مشاورهٔ شغلی و مهاجرت تحصیلی', 'Career & study-abroad coaching'),
    ],
  },
];

/** How much experience the client is asking for. Upwork's three tiers. */
export const EXPERIENCE_LEVELS = ['ENTRY', 'INTERMEDIATE', 'EXPERT'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** How long the work is expected to take. Freelancer.com's duration filter. */
export const PROJECT_DURATIONS = [
  'LESS_THAN_WEEK',
  'ONE_TO_FOUR_WEEKS',
  'ONE_TO_THREE_MONTHS',
  'THREE_TO_SIX_MONTHS',
  'MORE_THAN_SIX_MONTHS',
] as const;
export type ProjectDuration = (typeof PROJECT_DURATIONS)[number];

/** Weekly hours on an hourly project. Upwork's "hours needed". */
export const WEEKLY_HOURS = ['LESS_THAN_10', 'TEN_TO_THIRTY', 'MORE_THAN_THIRTY'] as const;
export type WeeklyHours = (typeof WEEKLY_HOURS)[number];

/**
 * The languages a project can ask for and a service can be offered in.
 *
 * ISO 639-1 codes; every screen names them through Intl.DisplayNames in the
 * reader's own language. The ones freelancers here actually work in.
 */
export const WORK_LANGUAGES = [
  'fa', 'en', 'ar', 'tr', 'de', 'fr', 'es', 'ru', 'zh', 'it', 'ku', 'az', 'ur', 'hi', 'pt', 'ja', 'ko', 'nl',
] as const;
export type WorkLanguage = (typeof WORK_LANGUAGES)[number];

/** Proposal counts are shown as a range, like Upwork's, never as a number. */
export const PROPOSAL_BUCKETS = [
  { key: 'LT5', max: 4 },
  { key: '5_10', max: 10 },
  { key: '10_15', max: 15 },
  { key: '15_20', max: 20 },
  { key: '20_50', max: 50 },
  { key: '50_PLUS', max: Number.POSITIVE_INFINITY },
] as const;
export type ProposalBucket = (typeof PROPOSAL_BUCKETS)[number]['key'];

export function proposalBucket(count: number): ProposalBucket {
  return PROPOSAL_BUCKETS.find((bucket) => count <= bucket.max)!.key;
}

/** At most this many screening questions on a project, as on Upwork. */
export const MAX_SCREENING_QUESTIONS = 5;

/** Service packages, cheapest first. A service needs BASIC; the others are optional. */
export const PACKAGE_TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];

/** Revisions sentinel: a package may promise unlimited revisions. */
export const UNLIMITED_REVISIONS = -1;
