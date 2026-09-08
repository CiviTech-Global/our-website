import type { ProductDef } from '../types.js';
import { currencyField } from '../fields.js';

export const deviceProducts: ProductDef[] = [
  {
    slug: 'mobile-device',
    categorySlug: 'device',
    title: 'بیمه موبایل',
    titleEn: 'Mobile phone insurance',
    summary: 'سرقت، شکستن صفحه، آب‌خوردگی و آسیب فیزیکی',
    summaryEn: 'Theft, screen breakage, liquid damage and physical harm',
    description:
      'بیمه موبایل گوشی شما را در برابر سرقت با شکست حرز، شکستن صفحه‌نمایش، آب‌خوردگی و آسیب فیزیکی پوشش می‌دهد. حق بیمه بر مبنای ارزش روز دستگاه محاسبه می‌شود و پس از خرید یک دوره انتظار ده‌روزه دارد. هر بیمه‌نامه سالانه است و تنها یک بار قابل استفاده است، با فرانشیز ۲۰ تا ۴۰ درصد بسته به نوع خسارت.',
    descriptionEn:
      'Mobile cover protects a handset against forced-entry theft, screen breakage, liquid ingress and physical damage. The premium is based on the current value of the device, and there is a ten-day waiting period after purchase. Each policy runs a year and can be claimed against once, with a deductible of 20–40% depending on the type of loss.',
    coverages: [
      'سرقت با شکست حرز',
      'خسارت ناشی از ضربه و شکستن صفحه‌نمایش',
      'آب‌خوردگی و نم‌زدگی',
      'نوسانات برق',
      'حوادث غیرمترقبه (آتش‌سوزی، انفجار، سیل، زلزله، طوفان)',
    ],
    notes: [
      'دوره انتظار ۱۰ روز پس از خرید بیمه‌نامه.',
      'اعلام خسارت باید ظرف ۴۸ تا ۷۲ ساعت انجام شود.',
      'فرانشیز بسته به نوع خسارت ۲۰ تا ۴۰ درصد است.',
      'بیمه‌نامه یک‌ساله است و تنها یک بار قابل استفاده است.',
    ],
    exclusions: [
      'مواردی که تحت گارانتی دستگاه هستند',
      'نواقص ذاتی و عیوب نرم‌افزاری',
      'خسارت به لوازم جانبی',
      'خسارت ناشی از تعمیر در مراکز غیرمعتبر',
      'عیوب ظاهری مانند خراشیدگی',
      'استهلاک عادی',
      'خسارت عمدی بیمه‌گذار',
      'دستگاه با شمارهٔ سریال مخدوش',
    ],
    requiredDocuments: [
      'کارت ملی یا شناسنامه',
      'تصویر بیمه‌نامه',
      'فاکتور خرید دستگاه',
      'جعبه و لوازم جانبی',
      'برای سرقت: گزارش رسمی نیروی انتظامی و در صورت وجود، تصویر دوربین مداربسته یا استشهاد محلی',
    ],
    premiumFactors: [
      'ارزش روز گوشی',
      'برند و مدل دستگاه',
      'نو یا دست‌دوم بودن',
      'نوع و میزان پوشش‌های انتخابی',
    ],
    faq: [
      {
        question: 'هر سرقتی پوشش دارد؟',
        answer:
          'خیر. فقط سرقت با شکست حرز؛ یعنی وقتی دستگاه در مکانی امن مانند منزل، کیف بسته یا خودروی قفل‌شده باشد و با ورود غیرمجاز ربوده شود.',
      },
      {
        question: 'گوشی دست‌دوم بیمه می‌شود؟',
        answer: 'در برخی شرکت‌ها بله، با ارائهٔ فاکتور و بررسی سلامت دستگاه.',
      },
      {
        question: 'دورهٔ انتظار دارد؟',
        answer: 'بله، معمولاً ۱۰ روز پس از خرید بیمه‌نامه.',
      },
      {
        question: 'فرانشیز چقدر است؟',
        answer:
          'بسته به نوع خسارت متفاوت است: خسارت جزئی حدود ۲۰ تا ۳۰ درصد، خسارت صفحه‌نمایش ۳۰ تا ۴۰ درصد و سرقت ۳۰ تا ۴۰ درصد ارزش دستگاه.',
      },
      {
        question: 'چند بار می‌توان استفاده کرد؟',
        answer: 'معمولاً یک بار در طول مدت یک‌سالهٔ اعتبار بیمه‌نامه.',
      },
    ],
    keyFacts: [
      { label: 'دورهٔ انتظار', value: '۱۰ روز پس از خرید بیمه‌نامه' },
      { label: 'مدت اعتبار', value: 'یک‌ساله، قابل تمدید' },
      { label: 'تعداد دفعات استفاده', value: 'یک بار در طول مدت اعتبار' },
      { label: 'فرانشیز خسارت جزئی', value: 'حدود ۲۰ تا ۳۰٪' },
      { label: 'فرانشیز صفحه‌نمایش', value: 'حدود ۳۰ تا ۴۰٪' },
      { label: 'فرانشیز سرقت', value: 'حدود ۳۰ تا ۴۰٪ ارزش دستگاه' },
      { label: 'مهلت اعلام خسارت', value: 'حدود ۴۸ تا ۷۲ ساعت' },
    ],
    claimSteps: [
      'ظرف ۴۸ تا ۷۲ ساعت خسارت را به شرکت بیمه اعلام کنید.',
      'در صورت سرقت، ابتدا گزارش رسمی نیروی انتظامی تهیه کنید.',
      'بیمه‌نامه، فاکتور خرید، جعبه و لوازم جانبی را آماده کنید.',
      'دستگاه را برای ارزیابی به مرکز مورد تأیید شرکت بیمه تحویل دهید.',
      'پس از کسر فرانشیز، خسارت پرداخت یا دستگاه تعمیر یا تعویض می‌شود.',
    ],
    intake: 'SELF_SERVE',
    audience: 'INDIVIDUAL',
    icon: 'Smartphone',
    order: 1,
    fields: [
      {
        name: 'brand',
        label: 'برند',
        labelEn: 'Brand',
        type: 'text',
        required: true,
        maxLength: 60,
        help: 'مثال: اپل، سامسونگ، شیائومی',
        helpEn: 'e.g. Apple, Samsung, Xiaomi',
      },
      {
        name: 'model',
        label: 'مدل',
        labelEn: 'Model',
        type: 'text',
        required: true,
        maxLength: 100,
        help: 'مدل دقیق، مثال: iPhone 15 Pro Max 256GB',
        helpEn: 'Exact model, e.g. iPhone 15 Pro Max 256GB',
      },
      currencyField('deviceValue', 'ارزش روز گوشی', 'Current value of the handset', {
        min: 1_000_000,
        help: 'قیمت روز بازار — مبنای حق بیمه و سقف خسارت.',
        helpEn: 'Market price today — the basis for both premium and claim limit.',
      }),
      {
        name: 'purchaseDate',
        label: 'تاریخ خرید گوشی',
        labelEn: 'Date the handset was bought',
        type: 'date',
        required: false,
        help: 'اگر فاکتور خرید دارید، تاریخ آن را وارد کنید.',
        helpEn: 'If you have the purchase invoice, use its date.',
      },
      {
        name: 'imei',
        label: 'شماره IMEI',
        labelEn: 'IMEI number',
        type: 'text',
        required: false,
        minLength: 15,
        maxLength: 15,
        help: 'با شماره‌گیری #06#* روی گوشی نمایش داده می‌شود. در مرحله صدور لازم است.',
        helpEn: 'Dial *#06# to see it. Required at issuance, not now.',
      },
    ],
  },
];
