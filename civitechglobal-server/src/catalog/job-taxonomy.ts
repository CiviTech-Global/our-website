/**
 * The job board's fixed vocabularies, as data.
 *
 * JOB CATEGORIES say what kind of work a role is. Built from the category
 * lists of the boards Iranian job-seekers already use — Jobinja's fifty and
 * IranTalent's fifty-seven — merged where they say the same thing twice, and
 * grouped along the ISCO-08 major groups so a reader finds "nurse" under
 * health and "welder" under the trades rather than in one flat list of a
 * hundred and fifty. Two levels, the depth the board filters on: choosing a
 * group matches every role under it.
 *
 * Seeded by slug and never overwritten, exactly like the marketplace lists:
 * the seed creates what is missing and leaves anything staff have renamed or
 * switched off as they left it. Slugs are permanent and ASCII.
 *
 * BENEFITS and INDUSTRIES are keys, not rows: they change rarely, every screen
 * shows them in the reader's own language, and a key the schema checks is all
 * a posting needs to store.
 */

export interface JobTaxonomyNode {
  slug: string;
  name: string;
  nameEn: string;
  children?: Array<{ slug: string; name: string; nameEn: string }>;
}

const c = (slug: string, name: string, nameEn: string) => ({ slug, name, nameEn });

export const JOB_CATEGORIES: JobTaxonomyNode[] = [
  {
    slug: 'it-software',
    name: 'فناوری اطلاعات و نرم‌افزار',
    nameEn: 'IT & software',
    children: [
      c('software-development', 'توسعه نرم‌افزار و برنامه‌نویسی', 'Software development'),
      c('web-development', 'توسعه وب (فرانت‌اند، بک‌اند، فول‌استک)', 'Web development'),
      c('mobile-development', 'توسعه اپلیکیشن موبایل', 'Mobile development'),
      c('devops-cloud', 'DevOps و زیرساخت ابری', 'DevOps & cloud'),
      c('network-hardware', 'شبکه و سخت‌افزار', 'Networking & hardware'),
      c('cyber-security', 'امنیت سایبری و امنیت اطلاعات', 'Cyber security'),
      c('software-qa', 'تضمین کیفیت و تست نرم‌افزار', 'QA & software testing'),
      c('database-admin', 'پایگاه داده', 'Databases'),
      c('it-support', 'پشتیبانی فنی و Help Desk', 'IT support & help desk'),
      c('systems-analysis', 'تحلیل سیستم و معماری نرم‌افزار', 'Systems analysis & architecture'),
      c('game-development', 'توسعه بازی', 'Game development'),
      c('embedded-iot', 'سیستم‌های نهفته و اینترنت اشیا', 'Embedded systems & IoT'),
    ],
  },
  {
    slug: 'data-ai',
    name: 'داده و هوش مصنوعی',
    nameEn: 'Data & AI',
    children: [
      c('data-analysis-bi', 'تحلیل داده و هوش تجاری', 'Data analysis & BI'),
      c('data-science', 'علم داده', 'Data science'),
      c('machine-learning', 'هوش مصنوعی و یادگیری ماشین', 'AI & machine learning'),
      c('data-engineering', 'مهندسی داده', 'Data engineering'),
    ],
  },
  {
    slug: 'product-design',
    name: 'محصول و طراحی',
    nameEn: 'Product & design',
    children: [
      c('product-management', 'مدیریت محصول', 'Product management'),
      c('ui-ux-design', 'طراحی رابط و تجربه کاربری (UI/UX)', 'UI/UX design'),
      c('graphic-design', 'طراحی گرافیک', 'Graphic design'),
      c('industrial-design', 'طراحی صنعتی', 'Industrial design'),
      c('motion-animation', 'انیمیشن و موشن‌گرافیک', 'Motion & animation'),
      c('photo-video', 'عکاسی و تصویربرداری', 'Photography & video'),
    ],
  },
  {
    slug: 'sales',
    name: 'فروش و توسعه کسب‌وکار',
    nameEn: 'Sales & business development',
    children: [
      c('sales-specialist', 'کارشناس فروش', 'Sales specialist'),
      c('field-sales', 'فروش حضوری و ویزیتوری', 'Field sales'),
      c('telesales', 'فروش تلفنی و تله‌مارکتینگ', 'Telesales'),
      c('business-development', 'توسعه کسب‌وکار و مشتریان کلیدی', 'Business development & key accounts'),
      c('sales-management', 'مدیریت فروش', 'Sales management'),
      c('after-sales', 'خدمات پس از فروش', 'After-sales service'),
    ],
  },
  {
    slug: 'marketing',
    name: 'بازاریابی و تبلیغات',
    nameEn: 'Marketing & advertising',
    children: [
      c('digital-marketing', 'دیجیتال مارکتینگ', 'Digital marketing'),
      c('seo-content-marketing', 'سئو و بازاریابی محتوا', 'SEO & content marketing'),
      c('social-media', 'مدیریت شبکه‌های اجتماعی', 'Social media'),
      c('market-research', 'تحقیقات بازار', 'Market research'),
      c('branding-advertising', 'برندینگ و تبلیغات', 'Branding & advertising'),
      c('public-relations', 'روابط عمومی', 'Public relations'),
    ],
  },
  {
    slug: 'content-media',
    name: 'محتوا، رسانه و ترجمه',
    nameEn: 'Content, media & translation',
    children: [
      c('copywriting', 'تولید محتوا و کپی‌رایتینگ', 'Content writing & copywriting'),
      c('journalism', 'خبرنگاری و روزنامه‌نگاری', 'Journalism'),
      c('translation', 'ترجمه', 'Translation'),
      c('editing-proofreading', 'ویراستاری و نمونه‌خوانی', 'Editing & proofreading'),
      c('film-tv', 'سینما و تصویر', 'Film & TV'),
      c('music-audio', 'موسیقی و صدا', 'Music & audio'),
    ],
  },
  {
    slug: 'finance-accounting',
    name: 'مالی و حسابداری',
    nameEn: 'Finance & accounting',
    children: [
      c('accounting', 'حسابداری', 'Accounting'),
      c('auditing', 'حسابرسی', 'Auditing'),
      c('corporate-finance', 'مدیریت مالی و بودجه', 'Corporate finance & budgeting'),
      c('tax', 'امور مالیاتی', 'Tax'),
      c('treasury-cashier', 'خزانه‌داری و صندوق', 'Treasury & cashier'),
    ],
  },
  {
    slug: 'banking-insurance',
    name: 'بانک، بیمه و سرمایه‌گذاری',
    nameEn: 'Banking, insurance & investment',
    children: [
      c('banking', 'بانکداری', 'Banking'),
      c('insurance', 'بیمه', 'Insurance'),
      c('investment-capital-markets', 'بورس و سرمایه‌گذاری', 'Investment & capital markets'),
      c('financial-economic-analysis', 'تحلیل مالی و اقتصادی', 'Financial & economic analysis'),
    ],
  },
  {
    slug: 'hr-admin',
    name: 'منابع انسانی و اداری',
    nameEn: 'HR & administration',
    children: [
      c('recruitment', 'جذب و استخدام', 'Recruitment'),
      c('hr-management', 'مدیریت منابع انسانی', 'HR management'),
      c('learning-development', 'آموزش و توسعه کارکنان', 'Learning & development'),
      c('payroll', 'حقوق و دستمزد', 'Payroll'),
      c('office-admin', 'امور اداری و دفتری', 'Office administration'),
      c('secretary', 'منشی و مسئول دفتر', 'Secretary & office manager'),
      c('executive-assistant', 'دستیار مدیر', 'Executive assistant'),
    ],
  },
  {
    slug: 'management',
    name: 'مدیریت و رهبری',
    nameEn: 'Management & leadership',
    children: [
      c('executive-leadership', 'مدیریت ارشد و هیئت‌مدیره', 'Executive leadership'),
      c('project-management', 'مدیریت پروژه و برنامه', 'Project & programme management'),
      c('operations', 'مدیریت عملیات و بهبود فرایند', 'Operations & process improvement'),
      c('strategy-consulting', 'مشاوره مدیریت و استراتژی', 'Strategy & management consulting'),
      c('project-control', 'برنامه‌ریزی و کنترل پروژه', 'Project planning & control'),
    ],
  },
  {
    slug: 'customer-service',
    name: 'پشتیبانی و امور مشتریان',
    nameEn: 'Customer service',
    children: [
      c('customer-support', 'پشتیبانی مشتریان', 'Customer support'),
      c('call-center', 'مرکز تماس', 'Call centre'),
      c('customer-success', 'موفقیت مشتری', 'Customer success'),
    ],
  },
  {
    slug: 'supply-chain',
    name: 'خرید، بازرگانی و زنجیره تأمین',
    nameEn: 'Purchasing, trade & supply chain',
    children: [
      c('procurement', 'خرید و تدارکات', 'Procurement'),
      c('import-export', 'بازرگانی خارجی، واردات و صادرات', 'Import & export'),
      c('customs-clearance', 'ترخیص کالا و امور گمرکی', 'Customs clearance'),
      c('warehousing', 'انبارداری', 'Warehousing'),
      c('production-planning', 'برنامه‌ریزی و کنترل تولید', 'Production planning & control'),
      c('distribution', 'توزیع و پخش', 'Distribution'),
    ],
  },
  {
    slug: 'transport-logistics',
    name: 'حمل‌ونقل و لجستیک',
    nameEn: 'Transport & logistics',
    children: [
      c('logistics', 'لجستیک', 'Logistics'),
      c('driver', 'راننده', 'Driver'),
      c('courier', 'پیک موتوری', 'Courier'),
      c('shipping-aviation', 'حمل‌ونقل دریایی و هوایی', 'Shipping & aviation'),
    ],
  },
  {
    slug: 'electrical-engineering',
    name: 'مهندسی برق، الکترونیک و مخابرات',
    nameEn: 'Electrical, electronics & telecoms',
    children: [
      c('power-engineering', 'برق قدرت', 'Power engineering'),
      c('electronics', 'الکترونیک', 'Electronics'),
      c('telecommunications', 'مخابرات', 'Telecommunications'),
      c('instrumentation-control', 'ابزار دقیق و کنترل', 'Instrumentation & control'),
      c('industrial-automation', 'اتوماسیون صنعتی', 'Industrial automation'),
    ],
  },
  {
    slug: 'mechanical-engineering',
    name: 'مهندسی مکانیک و هوافضا',
    nameEn: 'Mechanical & aerospace engineering',
    children: [
      c('mechanical-design', 'طراحی مکانیک', 'Mechanical design'),
      c('hvac-mechanical-facilities', 'تأسیسات مکانیکی', 'HVAC & mechanical facilities'),
      c('automotive', 'خودرو', 'Automotive'),
      c('aerospace', 'هوافضا', 'Aerospace'),
      c('maintenance-engineering', 'نگهداری و تعمیرات (نت)', 'Maintenance engineering'),
    ],
  },
  {
    slug: 'civil-architecture',
    name: 'عمران، معماری و ساختمان',
    nameEn: 'Civil engineering, architecture & construction',
    children: [
      c('civil-structural', 'عمران و سازه', 'Civil & structural'),
      c('architecture', 'معماری', 'Architecture'),
      c('interior-design', 'طراحی داخلی', 'Interior design'),
      c('surveying', 'نقشه‌برداری', 'Surveying'),
      c('site-supervision', 'نظارت و اجرای ساختمان', 'Site supervision & construction'),
      c('urban-planning', 'شهرسازی', 'Urban planning'),
    ],
  },
  {
    slug: 'industrial-production',
    name: 'مهندسی صنایع و تولید',
    nameEn: 'Industrial engineering & production',
    children: [
      c('industrial-engineering', 'مهندسی صنایع', 'Industrial engineering'),
      c('quality-control', 'کنترل و تضمین کیفیت (QC/QA)', 'Quality control & assurance'),
      c('production-operations', 'تولید و بهره‌برداری', 'Production & operations'),
      c('research-development', 'تحقیق و توسعه (R&D)', 'Research & development'),
    ],
  },
  {
    slug: 'process-engineering',
    name: 'شیمی، نفت، پلیمر و معدن',
    nameEn: 'Chemical, petroleum, polymer & mining',
    children: [
      c('chemical-engineering', 'مهندسی شیمی و فرایند', 'Chemical & process engineering'),
      c('oil-gas-petrochemical', 'نفت، گاز و پتروشیمی', 'Oil, gas & petrochemicals'),
      c('polymer', 'پلیمر', 'Polymers'),
      c('mining-metallurgy', 'معدن و متالورژی', 'Mining & metallurgy'),
      c('materials', 'مهندسی مواد', 'Materials engineering'),
      c('textile', 'نساجی و طراحی پارچه و لباس', 'Textiles & clothing design'),
    ],
  },
  {
    slug: 'hse-energy',
    name: 'ایمنی، محیط زیست و انرژی',
    nameEn: 'HSE, environment & energy',
    children: [
      c('hse', 'ایمنی و بهداشت کار (HSE)', 'Health, safety & environment'),
      c('environment', 'محیط زیست', 'Environment'),
      c('renewable-energy', 'انرژی‌های تجدیدپذیر و پایداری', 'Renewable energy & sustainability'),
    ],
  },
  {
    slug: 'healthcare',
    name: 'سلامت و درمان',
    nameEn: 'Healthcare',
    children: [
      c('medicine', 'پزشکی', 'Medicine'),
      c('nursing-midwifery', 'پرستاری و مامایی', 'Nursing & midwifery'),
      c('pharmacy', 'داروسازی', 'Pharmacy'),
      c('dentistry', 'دندانپزشکی', 'Dentistry'),
      c('medical-lab', 'آزمایشگاه تشخیص طبی', 'Medical laboratory'),
      c('psychology-counselling', 'روانشناسی و مشاوره', 'Psychology & counselling'),
      c('nutrition', 'تغذیه', 'Nutrition'),
      c('physiotherapy-rehab', 'فیزیوتراپی و توانبخشی', 'Physiotherapy & rehabilitation'),
      c('biomedical-engineering', 'مهندسی پزشکی', 'Biomedical engineering'),
      c('veterinary', 'دامپزشکی', 'Veterinary'),
      c('social-work', 'مددکاری و خدمات اجتماعی', 'Social work'),
    ],
  },
  {
    slug: 'science-agriculture',
    name: 'علوم، آزمایشگاه و کشاورزی',
    nameEn: 'Science, laboratory & agriculture',
    children: [
      c('chemistry-lab', 'شیمی و آزمایشگاه', 'Chemistry & laboratory'),
      c('biology-biotech', 'زیست‌شناسی و بیوتکنولوژی', 'Biology & biotechnology'),
      c('food-industry', 'صنایع غذایی', 'Food industry'),
      c('agriculture-livestock', 'کشاورزی و دامپروری', 'Agriculture & livestock'),
    ],
  },
  {
    slug: 'education-research',
    name: 'آموزش و پژوهش',
    nameEn: 'Education & research',
    children: [
      c('school-teaching', 'تدریس در مدرسه', 'School teaching'),
      c('institute-teaching', 'تدریس در آموزشگاه و مؤسسه', 'Institute & tutoring'),
      c('university-faculty', 'هیئت علمی و تدریس دانشگاه', 'University faculty'),
      c('sports-coaching', 'مربیگری ورزش', 'Sports coaching'),
      c('research', 'پژوهش', 'Research'),
    ],
  },
  {
    slug: 'legal',
    name: 'حقوقی',
    nameEn: 'Legal',
    children: [
      c('lawyer', 'وکالت', 'Lawyer'),
      c('legal-contracts', 'کارشناس حقوقی و قراردادها', 'Legal & contracts'),
      c('compliance-risk', 'ریسک و تطبیق مقررات', 'Compliance & risk'),
    ],
  },
  {
    slug: 'hospitality-tourism',
    name: 'هتلداری، گردشگری و رستوران',
    nameEn: 'Hospitality, tourism & food service',
    children: [
      c('hotel', 'هتلداری', 'Hotels'),
      c('tourism', 'گردشگری و تور', 'Tourism & tours'),
      c('chef-cook', 'آشپزی', 'Chef & cook'),
      c('barista-cafe', 'باریستا و کافه', 'Barista & café'),
      c('restaurant-service', 'خدمات رستوران و کترینگ', 'Restaurant service & catering'),
    ],
  },
  {
    slug: 'retail',
    name: 'خرده‌فروشی و فروشگاهی',
    nameEn: 'Retail',
    children: [
      c('shop-assistant', 'فروشنده فروشگاه', 'Shop assistant'),
      c('cashier', 'صندوقدار', 'Cashier'),
      c('store-manager', 'مدیر فروشگاه', 'Store manager'),
      c('visual-merchandising', 'چیدمان و ویترین‌آرایی', 'Visual merchandising'),
    ],
  },
  {
    slug: 'skilled-trades',
    name: 'فنی و حرفه‌ای',
    nameEn: 'Skilled trades',
    children: [
      c('technician', 'تکنسین فنی', 'Technician'),
      c('repair', 'تعمیرکار', 'Repair'),
      c('electrician', 'برق‌کار ساختمان و صنعتی', 'Electrician'),
      c('plumbing-facilities', 'لوله‌کشی و تأسیسات', 'Plumbing & facilities'),
      c('welding', 'جوشکاری', 'Welding'),
      c('carpentry', 'نجاری و کابینت‌سازی', 'Carpentry & cabinet making'),
      c('tailoring', 'خیاطی', 'Tailoring'),
      c('beauty-hairdressing', 'آرایشگری و زیبایی', 'Beauty & hairdressing'),
      c('skilled-industrial-worker', 'کارگر ماهر صنعتی', 'Skilled industrial worker'),
    ],
  },
  {
    slug: 'general-services',
    name: 'خدمات عمومی',
    nameEn: 'General services',
    children: [
      c('security-guard', 'نگهبانی و حراست', 'Security'),
      c('cleaning', 'خدمات و نظافت', 'Cleaning'),
      c('general-labour', 'کارگر ساده', 'General labour'),
      c('office-services', 'آبدارخانه و خدمات اداری', 'Office services'),
    ],
  },
];

/**
 * What a role offers beyond the pay — the filters the Iranian boards put first
 * ("فیلترهای جالب"), as keys. Labels live with the reader's language.
 */
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

/** What an employer does, for the company page. IranTalent's list, merged and keyed. */
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
