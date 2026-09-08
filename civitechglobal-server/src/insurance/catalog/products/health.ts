import type { ProductDef } from '../types.js';
import { coverageCeiling, deductible, paymentMethod, peopleCount } from '../fields.js';

const HEALTH_CEILINGS = [
  { value: '50', label: 'تا ۵۰ میلیون تومان', labelEn: 'Up to 500m IRR' },
  { value: '100', label: 'تا ۱۰۰ میلیون تومان', labelEn: 'Up to 1b IRR' },
  { value: '200', label: 'تا ۲۰۰ میلیون تومان', labelEn: 'Up to 2b IRR' },
  { value: '500', label: 'تا ۵۰۰ میلیون تومان', labelEn: 'Up to 5b IRR' },
];

const OPTIONAL_HEALTH_COVERS = [
  { value: 'maternity', label: 'زایمان', labelEn: 'Maternity' },
  {
    value: 'infertility',
    label: 'درمان ناباروری',
    labelEn: 'Infertility treatment',
  },
  { value: 'chemotherapy', label: 'شیمی‌درمانی', labelEn: 'Chemotherapy' },
  { value: 'visits', label: 'ویزیت پزشک', labelEn: 'Doctor visits' },
  { value: 'dental', label: 'دندان‌پزشکی', labelEn: 'Dental' },
  { value: 'pharmacy', label: 'دارو', labelEn: 'Pharmacy' },
];

export const healthProducts: ProductDef[] = [
  {
    slug: 'health-supplementary-individual',
    categorySlug: 'health',
    title: 'درمان تکمیلی انفرادی و خانواده',
    titleEn: 'Supplementary health — individual and family',
    summary: 'مکمل بیمه پایه — بستری، جراحی، پاراکلینیک و آزمایش',
    summaryEn: 'On top of your base insurer — hospital, surgery, diagnostics',
    description:
      'بیمه درمان تکمیلی در کنار بیمه پایه (تأمین اجتماعی یا سلامت) قرار می‌گیرد و بخشی از هزینه‌های درمانی را تا سقف تعهدات انتخابی پرداخت می‌کند. پوشش اصلی شامل بستری، جراحی تخصصی، خدمات پاراکلینیکی و آزمایش است و پوشش‌هایی مانند زایمان و دندان‌پزشکی به صورت اختیاری اضافه می‌شوند. توجه کنید که برخی پوشش‌ها دوره انتظار سه تا دوازده‌ماهه دارند.',
    descriptionEn:
      'Supplementary health sits on top of a base insurer and pays a share of treatment costs up to a chosen ceiling. The core covers inpatient care, specialist surgery, diagnostics and lab work; maternity, dental and similar are optional add-ons. Several benefits carry a waiting period of three to twelve months.',
    coverages: [
      'بستری در بیمارستان',
      'جراحی‌های تخصصی',
      'خدمات پاراکلینیکی (سونوگرافی، سی‌تی‌اسکن، MRI)',
      'آزمایش‌های تشخیصی',
      'آمبولانس',
    ],
    optionalCoverages: [
      'زایمان',
      'درمان ناباروری',
      'شیمی‌درمانی',
      'ویزیت پزشک',
      'دندان‌پزشکی',
      'دارو',
    ],
    notes: [
      'دوره انتظار ۳ تا ۱۲ ماه برای زایمان و جراحی‌های بزرگ.',
      'حداقل سن ۱۸ سال؛ برای بالای ۷۰ سال حق بیمه افزایش می‌یابد.',
      'خرید بدون بیمه پایه با حدود ۱۸٪ اضافه‌نرخ ممکن است.',
    ],
    exclusions: [
      'جراحی‌های زیبایی',
      'سقط جنین، مگر با تشخیص پزشک',
      'ترک اعتیاد و خودکشی',
      'حوادث طبیعی، جنگ و اعتصاب',
      'هزینهٔ اتاق خصوصی، مگر با ضرورت پزشکی',
      'ارتودنسی و دندان‌پزشکی زیبایی',
      'چکاپ دوره‌ای و واکسیناسیون',
      'جراحی‌های لاغری مانند اسلیو معده، مگر با ضرورت پزشکی',
      'زایمان فرزند چهارم و بیشتر',
    ],
    requiredDocuments: [
      'فرم درخواست خسارت',
      'کارت ملی و شناسنامه',
      'تصویر بیمه‌نامه و شمارهٔ حساب بانکی',
      'برای بستری: صورتحساب بیمارستان، شرح عمل و تأییدیهٔ بیمهٔ پایه',
      'برای پاراکلینیک: نسخهٔ پزشک، نتیجهٔ آزمایش یا تصویربرداری و فاکتور مرکز درمانی',
      'برای دارو: نسخهٔ ممهور پزشک و فاکتور داروخانه',
    ],
    premiumFactors: [
      'سن بیمه‌شده',
      'سقف تعهدات انتخابی',
      'میزان فرانشیز',
      'فردی، خانوادگی یا گروهی بودن',
      'طول دورهٔ انتظار',
      'نداشتن بیمهٔ پایه',
    ],
    faq: [
      {
        question: 'دورهٔ انتظار چقدر است؟',
        answer:
          'برای زایمان معمولاً ۹ تا ۱۲ ماه و برای بستری و جراحی حدود ۳ تا ۶ ماه. در موارد اورژانسی دورهٔ انتظار اعمال نمی‌شود.',
      },
      {
        question: 'محدودهٔ سنی چیست؟',
        answer:
          'بیمه‌شدهٔ اصلی معمولاً ۱۸ تا ۷۰ سال. افراد بالای ۷۰ سال با افزایش حق بیمه پذیرفته می‌شوند. دختران تا ۱۸ و پسران تا ۲۲ سال به‌عنوان فرزند تحت پوشش قرار می‌گیرند.',
      },
      {
        question: 'بدون بیمهٔ پایه می‌توان خرید کرد؟',
        answer: 'بله، با حدود ۱۸ درصد افزایش در حق بیمه.',
      },
      {
        question: 'فرانشیز چقدر است؟',
        answer: 'معمولاً بین ۱۰ تا ۳۰ درصد هزینه‌های درمانی.',
      },
      {
        question: 'اگر دیر تمدید کنم دورهٔ انتظار دوباره اعمال می‌شود؟',
        answer: 'اگر تا یک ماه پس از سررسید تمدید کنید، دورهٔ انتظار مجدد اعمال نمی‌شود.',
      },
    ],
    keyFacts: [
      { label: 'محدودهٔ سنی', value: 'بیمه‌شدهٔ اصلی ۱۸ تا ۷۰ سال' },
      { label: 'فرزندان', value: 'دختران تا ۱۸ و پسران تا ۲۲ سال' },
      { label: 'دورهٔ انتظار بستری و جراحی', value: 'حدود ۳ تا ۶ ماه' },
      { label: 'دورهٔ انتظار زایمان', value: 'حدود ۹ تا ۱۲ ماه' },
      { label: 'فرانشیز', value: 'حدود ۱۰ تا ۳۰ درصد' },
      { label: 'بدون بیمهٔ پایه', value: 'ممکن است، با حدود ۱۸٪ افزایش حق بیمه' },
      { label: 'مدت بیمه‌نامه', value: 'یک‌ساله' },
    ],
    claimSteps: [
      'در مراکز طرف قرارداد، معرفی‌نامه بگیرید تا هزینه مستقیم تسویه شود.',
      'در مراکز غیرطرف قرارداد، هزینه را پرداخت و اصل مدارک را نگه دارید.',
      'فرم درخواست خسارت را همراه کارت ملی، بیمه‌نامه و شمارهٔ حساب تکمیل کنید.',
      'برای بستری، صورتحساب بیمارستان، شرح عمل و تأییدیهٔ بیمهٔ پایه را ضمیمه کنید.',
      'برای پاراکلینیک و دارو، نسخهٔ پزشک و فاکتور رسمی را ارائه دهید.',
      'مدارک را در مهلت مقرر تحویل دهید و پیگیر واریز خسارت باشید.',
    ],
    intake: 'SELF_SERVE',
    audience: 'INDIVIDUAL',
    icon: 'HeartPulse',
    order: 1,
    fields: [
      {
        name: 'planType',
        label: 'نوع بیمه‌نامه',
        labelEn: 'Plan type',
        type: 'select',
        required: true,
        options: [
          { value: 'individual', label: 'انفرادی', labelEn: 'Individual' },
          { value: 'family', label: 'خانوادگی', labelEn: 'Family' },
        ],
      },
      peopleCount({
        label: 'تعداد افراد تحت پوشش',
        labelEn: 'People to be covered',
        max: 20,
        showWhen: { field: 'planType', equals: ['family'] },
      }),
      {
        name: 'insuredAges',
        label: 'سن افراد تحت پوشش',
        labelEn: 'Ages of those covered',
        type: 'text',
        required: true,
        maxLength: 120,
        help: 'سن‌ها را با کاما جدا کنید. مثال: ۳۸، ۳۵، ۹، ۴',
        helpEn: 'Comma-separated. e.g. 38, 35, 9, 4',
      },
      {
        name: 'baseInsurer',
        label: 'بیمه‌گر پایه',
        labelEn: 'Base insurer',
        type: 'select',
        required: true,
        options: [
          {
            value: 'tamin',
            label: 'تأمین اجتماعی',
            labelEn: 'Social Security',
          },
          {
            value: 'salamat',
            label: 'بیمه سلامت',
            labelEn: 'Health Insurance Organisation',
          },
          {
            value: 'armed-forces',
            label: 'نیروهای مسلح',
            labelEn: 'Armed forces',
          },
          { value: 'other', label: 'سایر', labelEn: 'Other' },
          {
            value: 'none',
            label: 'بیمه پایه ندارم',
            labelEn: 'No base insurer',
          },
        ],
        help: 'نداشتن بیمه پایه حق بیمه را حدود ۱۸٪ افزایش می‌دهد.',
        helpEn: 'Without a base insurer the premium rises by roughly 18%.',
      },
      coverageCeiling(HEALTH_CEILINGS),
      deductible(),
      {
        name: 'optionalCovers',
        label: 'پوشش‌های اختیاری',
        labelEn: 'Optional benefits',
        type: 'multiselect',
        required: false,
        options: OPTIONAL_HEALTH_COVERS,
        help: 'برخی از این پوشش‌ها دوره انتظار دارند.',
        helpEn: 'Some of these carry a waiting period.',
      },
      paymentMethod(),
    ],
  },

  {
    slug: 'health-supplementary-corporate',
    categorySlug: 'health',
    title: 'درمان تکمیلی شرکتی',
    titleEn: 'Supplementary health — corporate',
    summary: 'برای کارکنان سازمان و خانواده‌هایشان — حداقل ۱۰ نفر',
    summaryEn: 'For a company workforce and their families — minimum 10 people',
    description:
      'بیمه درمان تکمیلی سازمانی هزینه‌های درمان کارکنان و خانواده‌هایشان را جبران می‌کند و یکی از رایج‌ترین مزایای غیرنقدی سازمان‌هاست. طرح‌ها بر اساس ترکیب سنی، تعداد نفرات و صنعت سازمان قیمت‌گذاری می‌شوند و همین باعث می‌شود نرخ‌گذاری آن به صورت خودکار ممکن نباشد. پس از ثبت درخواست، کارشناس ما با شما تماس می‌گیرد و طرح را متناسب با سازمان تنظیم می‌کند.',
    descriptionEn:
      'Group supplementary health covers a company workforce and their families, and is one of the most common non-cash benefits offered in Iran. Plans are priced on the age mix, headcount and industry, which is why no automatic quote is possible. Once a request is filed, a specialist calls to shape the plan around the organisation.',
    coverages: [
      'بستری و جراحی',
      'خدمات پاراکلینیکی',
      'آزمایش و تصویربرداری',
      'پوشش خانواده کارکنان',
    ],
    notes: ['حداقل تعداد نفرات: ۱۰ نفر.', 'دوره انتظار برای زایمان و جراحی‌های بزرگ اعمال می‌شود.'],
    premiumFactors: [
      'میانگین سنی گروه',
      'تعداد نفرات تحت پوشش',
      'سقف تعهدات انتخابی',
      'ترکیب افراد تحت تکفل',
    ],
    faq: [
      {
        question: 'حداقل تعداد نفرات چقدر است؟',
        answer: 'معمولاً ۱۰ نفر، هرچند برخی شرکت‌ها انعطاف بیشتری دارند.',
      },
      {
        question: 'دورهٔ انتظار در طرح گروهی چقدر است؟',
        answer:
          'معمولاً بین ۳ تا ۹ ماه. در گروه‌های بزرگ‌تر کوتاه‌تر می‌شود و در گروه‌های بسیار بزرگ ممکن است حذف شود.',
      },
      {
        question: 'در مراکز غیرطرف قرارداد چه می‌شود؟',
        answer:
          'بیمه‌شده کل هزینه را پرداخت می‌کند و سپس درخواست خسارت می‌دهد؛ رسیدگی معمولاً ۴ تا ۶ هفتهٔ کاری طول می‌کشد.',
      },
    ],
    keyFacts: [
      { label: 'حداقل تعداد', value: 'حدود ۱۰ نفر' },
      { label: 'دورهٔ انتظار', value: 'حدود ۳ تا ۹ ماه؛ در گروه‌های بزرگ کمتر' },
      {
        label: 'محدودهٔ سنی',
        value: 'از ۱۸ سال؛ برای بالای ۶۰ سال در گروه‌های کوچک حق بیمهٔ بیشتر',
      },
      { label: 'مدت بیمه‌نامه', value: 'یک‌ساله، با پرداخت یکجا یا اقساطی' },
      { label: 'رسیدگی به خسارت', value: 'در مراکز غیرطرف قرارداد حدود ۴ تا ۶ هفتهٔ کاری' },
    ],
    intake: 'CALLBACK',
    audience: 'CORPORATE',
    icon: 'Users',
    order: 2,
    fields: [
      peopleCount({
        label: 'تعداد کارکنان تحت پوشش',
        labelEn: 'Employees to be covered',
        min: 10,
        help: 'حداقل ۱۰ نفر برای طرح گروهی لازم است.',
        helpEn: 'A group plan needs at least 10 people.',
      }),
      {
        name: 'includeFamilies',
        label: 'خانواده کارکنان نیز تحت پوشش باشند',
        labelEn: 'Include employees’ families',
        type: 'bool',
      },
      {
        name: 'industry',
        label: 'حوزه فعالیت سازمان',
        labelEn: 'Industry',
        type: 'text',
        required: true,
        maxLength: 150,
      },
      {
        name: 'currentInsurer',
        label: 'بیمه‌گر فعلی سازمان',
        labelEn: 'Current group insurer',
        type: 'text',
        required: false,
        maxLength: 100,
        help: 'اگر در حال حاضر طرح گروهی دارید.',
        helpEn: 'If you already have a group plan in place.',
      },
      coverageCeiling(HEALTH_CEILINGS, { required: false }),
      {
        name: 'optionalCovers',
        label: 'پوشش‌های اختیاری مورد نظر',
        labelEn: 'Optional benefits wanted',
        type: 'multiselect',
        required: false,
        options: OPTIONAL_HEALTH_COVERS,
      },
    ],
  },
];
