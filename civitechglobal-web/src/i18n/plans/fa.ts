/**
 * Plans and limits, company accounts, professional links and the expert's own
 * profile. A section of its own, imported into each dictionary as `plans`;
 * the reference shape is this file.
 */
const fa = {
  // ---- Pricing -------------------------------------------------------------
  pricingTitle: 'پلن‌ها و قیمت‌ها',
  pricingIntro:
    'هر بخش رایگان شروع می‌شود. هر وقت بیشتر لازم داشتید، یک پلن کامل بخرید یا برای هر مورد سطح دلخواه خود را بچینید. قیمت‌ها ماهانه و به تومان است.',
  alwaysFree: 'همیشه رایگان و بدون سقف: مرور فروشگاه‌ها و نقشه، بیمه، سفارش ساخت نرم‌افزار و رزرو مشاوره.',
  subjects: {
    USER: 'کاربران',
    BUSINESS: 'صاحبان کسب‌وکار',
    COMPANY: 'شرکت‌ها',
  },
  subjectHints: {
    USER: 'درخواست برای آگهی‌ها، پیشنهاد روی پروژه‌ها، خرید و فروش کتاب و بسته‌های خدمات، و آگهی به نام خودتان.',
    BUSINESS: 'فروشگاه‌ها و کالاها، و آگهی استخدام و پروژه به نام فروشگاه.',
    COMPANY: 'آگهی استخدام و پروژهٔ شرکت‌های ثبت‌شده (شخص حقوقی).',
  },
  tiers: {
    FREE: 'رایگان',
    PRO: 'حرفه‌ای',
    PREMIUM: 'پریمیوم',
    VIP: 'VIP',
  },
  custom: 'سفارشی',
  feature: 'مورد',
  perMonth: '{amount} تومان در ماه',
  monthlyTotal: 'جمع ماهانه',
  perMonthUsdt: '{amount} USDT خارج از ایران',
  notPriced: 'به‌زودی',
  unlimited: 'نامحدود',
  kinds: {
    STOCK: 'فعال هم‌زمان',
    MONTHLY: 'در ماه',
    LIFETIME: 'فقط اولین مورد',
  },
  liveDays: 'تا {days} روز نمایش',
  choose: 'انتخاب',
  buildCustom: 'ساخت پلن سفارشی',
  toman: 'تومان',
  features: {
    user_job_applications: 'درخواست برای آگهی‌های استخدام',
    user_project_bids: 'پیشنهاد روی پروژه‌ها',
    user_service_requests: 'درخواست خرید بستهٔ خدمات فریلنسرها',
    user_book_requests: 'درخواست خرید کتاب',
    user_job_posts: 'ثبت آگهی استخدام',
    user_projects: 'ثبت پروژه',
    user_service_listings: 'بستهٔ خدمات فعال برای فروش',
    user_book_listings: 'کتاب فعال برای فروش',
    business_shops: 'فروشگاه',
    business_items: 'کالا و خدمت فعال در فروشگاه‌ها',
    business_job_posts: 'آگهی استخدام به نام فروشگاه',
    business_projects: 'پروژه به نام فروشگاه',
    company_job_posts: 'آگهی استخدام شرکت',
    company_projects: 'پروژهٔ شرکت',
  },

  // ---- The member's billing page -------------------------------------------
  navBilling: 'پلن و اشتراک',
  billingTitle: 'پلن و اشتراک',
  billingIntro: 'آنچه در هر بخش دارید، چقدر از آن استفاده شده، و خرید یا تمدید پلن.',
  measuringOnly: 'سقف‌ها فعلاً فقط اندازه‌گیری می‌شوند و جلوی کاری را نمی‌گیرند.',
  currentTier: 'سطح فعلی',
  used: '{used} از {limit}',
  usedUnlimited: '{used} — نامحدود',
  activeUntil: 'فعال تا {date}',
  noActive: 'اشتراک فعالی ندارید؛ سطح رایگان برقرار است.',
  companyPlanFor: 'پلن شرکت «{name}»',
  buyTitle: 'خرید پلن',
  wholeTier: 'پلن کامل',
  customMix: 'ترکیب سفارشی',
  customHint: 'برای هر مورد سطح دلخواه را انتخاب کنید؛ قیمت، جمع سطح‌های انتخاب‌شده است.',
  months: 'مدت',
  monthsOption: '{count} ماه',
  discount: '{percent}٪ تخفیف',
  total: 'مبلغ قابل پرداخت',
  pay: 'پرداخت',
  sandboxNote: 'درگاه پرداخت فعلاً آزمایشی است و مبلغی از حساب شما کسر نمی‌شود.',
  history: 'سابقهٔ اشتراک‌ها',
  noHistory: 'هنوز اشتراکی نداشته‌اید.',
  statuses: {
    PENDING_PAYMENT: 'در انتظار پرداخت',
    ACTIVE: 'فعال',
    EXPIRED: 'پایان‌یافته',
    CANCELLED: 'لغو شده',
  },
  sources: {
    PURCHASE: 'خرید',
    STAFF_GRANT: 'اعطای پشتیبانی',
  },
  returnTitle: 'نتیجهٔ پرداخت',
  returnChecking: 'در حال بررسی پرداخت…',
  returnSuccess: 'پرداخت تأیید شد و اشتراک {code} فعال است.',
  returnFailed: 'پرداخت انجام نشد و مبلغی کسر نشده است. می‌توانید دوباره تلاش کنید.',
  returnPending: 'پرداخت هنوز کامل نشده است. چند لحظه بعد دوباره بررسی کنید.',
  checkAgain: 'بررسی دوباره',
  backToBilling: 'بازگشت به پلن و اشتراک',

  // ---- When a limit is reached ---------------------------------------------
  limitTitle: 'به سقف پلن رسیدید',
  limitResets: 'سهم ماهانهٔ این بخش از {date} دوباره آزاد می‌شود.',
  seePlans: 'دیدن پلن‌ها',

  // ---- Posting as a shop -----------------------------------------------------
  postAs: 'ثبت به نام',
  postAsMe: 'خودم',
  postAsHint: 'به نام فروشگاه، از سهم پلن کسب‌وکار شما کم می‌شود؛ به نام خودتان، از پلن شخصی.',

  // ---- Professional links -----------------------------------------------------
  linksTitle: 'پیوندهای حرفه‌ای',
  linksHint:
    'تا کارفرما یا مشتری بتواند کار و سابقهٔ شما را ببیند و راحت‌تر اعتماد کند. ایمیل نمایش داده نمی‌شود؛ گفت‌وگو از طریق خود سایت است.',
  github: 'گیت‌هاب',
  linkedin: 'لینکدین',
  website: 'وب‌سایت',

  // ---- Registering as a company ----------------------------------------------
  accountKind: 'نوع حساب',
  kindIndividual: 'شخص حقیقی',
  kindCompany: 'شرکت (شخص حقوقی)',
  companyName: 'نام شرکت',
  companyNationalId: 'شناسهٔ ملی شرکت',
  companyNationalIdHint: '۱۱ رقم، مطابق آگهی تأسیس.',
  representativeHint: 'نام و نام خانوادگی، مربوط به نمایندهٔ شرکت است که با این حساب کار می‌کند.',
  loginIdentifier: 'ایمیل یا نام کاربری',

  // ---- The expert's own profile -------------------------------------------------
  navExpert: 'پروفایل مشاوره',
  expertTitle: 'پروفایل مشاوره',
  expertIntro:
    'در باشگاه کارشناسان دیده شوید و برای مشاوره هزینه دریافت کنید. پروفایل تازه پس از بررسی پشتیبانی منتشر می‌شود.',
  expertVerifyFirst: 'برای ثبت پروفایل مشاوره، ابتدا احراز هویت را کامل کنید.',
  hourlyFee: 'هزینهٔ هر ساعت مشاوره (تومان)',
  hourlyFeeHint: 'برای پذیرش مشاوره الزامی است و در صفحهٔ شما نمایش داده می‌شود.',
  feePerHour: '{amount} تومان / ساعت',
  expertStatuses: {
    DRAFT: 'پیش‌نویس',
    PENDING_REVIEW: 'در انتظار بررسی',
    CHANGES_REQUESTED: 'نیازمند اصلاح',
    APPROVED: 'منتشرشده',
    REJECTED: 'تأیید نشد',
  },
  expertHeadline: 'عنوان حرفه‌ای',
  expertBio: 'دربارهٔ شما',
  expertSpecialities: 'زمینه‌های تخصص (با ویرگول جدا کنید)',
  expertLanguages: 'زبان‌ها (با ویرگول جدا کنید)',
  expertYears: 'سال‌های تجربه',
  acceptsConsultations: 'مشاوره می‌پذیرم',
  expertPhoto: 'عکس',
  linksRequired: 'دست‌کم یکی از پیوندهای حرفه‌ای لازم است.',
  submitExpert: 'ارسال برای بررسی',
  saveExpert: 'ذخیره',
  expertSaved: 'ذخیره شد.',
  expertSubmitted: 'پروفایل برای بررسی ارسال شد.',
  viewPublic: 'دیدن صفحهٔ عمومی',
  reviewNote: 'یادداشت پشتیبانی',

  // ---- Staff: plans and prices ---------------------------------------------------
  adminPlansTitle: 'پلن‌ها و قیمت‌ها',
  adminPlansIntro:
    'قیمت ماهانهٔ هر سطح را تعیین کنید. قیمت‌ها فقط روی خریدهای بعدی اثر دارند؛ اشتراک‌های خریداری‌شده قیمت و سقف خود را حفظ می‌کنند. سطح بدون قیمت قابل خرید نیست.',
  priceIrt: 'تومان',
  priceUsdt: 'USDT',
  savePrices: 'ذخیرهٔ قیمت‌ها',
  pricesSaved: 'قیمت‌ها ذخیره شد.',
  subscriptionsTitle: 'اشتراک‌ها',
  grantTitle: 'اعطای پلن',
  grantHint: 'برای عضو مؤسس، جبران خسارت یا حسابی که پشتیبانی ساخته است. بدون هزینه و از همین لحظه فعال.',
  grantUserId: 'شناسهٔ کاربر',
  grantCompanyId: 'شناسهٔ شرکت',
  note: 'یادداشت',
  grant: 'اعطا',
  granted: 'پلن اعطا شد.',
  cancelSubscription: 'لغو',
  holder: 'دارنده',
  code: 'کد',
  period: 'دوره',
  amount: 'مبلغ',
  status: 'وضعیت',

  // ---- Staff: accounts opened on somebody's behalf -------------------------------
  adminAccountsTitle: 'حساب‌های ساخته‌شده توسط پشتیبانی',
  adminAccountsIntro:
    'برای شرکت یا کارشناسی که حضوری مراجعه کرده حساب بسازید و اطلاعات ورود را به او بدهید. این حساب‌ها به تأیید پشتیبانی معتبرند و نیازی به بارگذاری مدارک ندارند.',
  newCompanyAccount: 'حساب شرکت جدید',
  operator: 'نمایندهٔ شرکت',
  email: 'ایمیل',
  password: 'رمز عبور',
  username: 'نام کاربری',
  phone: 'شمارهٔ همراه',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  createAccount: 'ساخت حساب',
  accountCreated: 'حساب ساخته شد. اطلاعات ورود را به صاحب حساب بدهید.',
  vouchedAt: 'ساخته‌شده در',
  noAccounts: 'هنوز حسابی ساخته نشده است.',

  // ---- Staff: experts --------------------------------------------------------------
  expertAccount: 'حساب کاربری کارشناس',
  expertAccountHint:
    'اختیاری. کارشناس با این اطلاعات وارد می‌شود و هزینه و پیوندهای خود را به‌روز می‌کند.',
  expertHasAccount: 'حساب کاربری: {name}',
  approveExpert: 'تأیید و انتشار',
  rejectExpert: 'رد',
  rejectReason: 'دلیل رد (به کارشناس نمایش داده می‌شود)',
};

export default fa;
