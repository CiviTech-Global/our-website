import type { ProductDef } from "../types.js";
import {
  claimHistory,
  currencyField,
  coverageCeiling,
  nationalId,
  noClaimYears,
  paymentMethod,
  plate,
  previousInsurer,
  vehicleModel,
  buildYear,
} from "../fields.js";

/** سقف تعهدات مالی — the property-damage limits an applicant picks between. */
const PROPERTY_LIMITS = [
  {
    value: "80",
    label: "۸۰ میلیون تومان (حداقل قانونی)",
    labelEn: "800m IRR (legal minimum)",
  },
  { value: "160", label: "۱۶۰ میلیون تومان", labelEn: "1.6b IRR" },
  { value: "240", label: "۲۴۰ میلیون تومان", labelEn: "2.4b IRR" },
  { value: "400", label: "۴۰۰ میلیون تومان", labelEn: "4b IRR" },
];

export const autoProducts: ProductDef[] = [
  {
    slug: "third-party-auto",
    categorySlug: "auto",
    title: "بیمه شخص ثالث خودرو",
    titleEn: "Third-party motor insurance",
    summary: "اجباری برای همه خودروها — جبران خسارت جانی و مالی اشخاص ثالث",
    summaryEn:
      "Compulsory for every vehicle — covers injury and damage to third parties",
    description:
      "بیمه شخص ثالث برای تمام وسایل نقلیه اجباری است و خسارت‌های جانی و مالی واردشده به اشخاص ثالث در حوادث رانندگی را جبران می‌کند. پوشش حوادث راننده مقصر نیز در همین بیمه‌نامه گنجانده شده است. نرخ پایه را بیمه مرکزی تعیین می‌کند و در تمام شرکت‌ها یکسان است؛ بنابراین آنچه تفاوت ایجاد می‌کند سرعت صدور و کیفیت پیگیری خسارت است.",
    descriptionEn:
      "Third-party motor cover is compulsory for every vehicle in Iran and pays for bodily injury and property damage caused to third parties, plus injury to the at-fault driver. The base rate is set by the Central Insurance regulator and is identical at every insurer — what differs is issuance speed and how a claim is handled.",
    coverages: [
      "خسارت مالی به اموال اشخاص ثالث",
      "خسارت جانی به اشخاص ثالث (دیه، درمان، فوت، نقص عضو)",
      "حوادث راننده مقصر (غرامت فوت، هزینه درمان، ازکارافتادگی)",
      "افت قیمت برای خودروهای کمتر از ۱۰ سال",
    ],
    notes: [
      "تخفیف عدم خسارت تنها به بستگان درجه یک قابل انتقال است.",
      "جریمه دیرکرد روزانه محاسبه می‌شود و تا سقف ۳۶۵ روز ادامه دارد.",
      "بیمه‌نامه صادرشده در سامانه بیمه مرکزی ثبت می‌گردد.",
    ],
    exclusions: [
      "خسارت واردشده به خودروی راننده مقصر",
      "خسارت به باری که خودروی مقصر حمل می‌کند",
      "رانندگی بدون گواهینامه معتبر یا با گواهینامه نامتناسب",
      "رانندگی تحت تأثیر الکل، مواد مخدر یا داروهای روان‌گردان",
      "خسارت عمدی و اقدام به خودکشی",
      "حوادث ناشی از تغییر کاربری غیرمجاز خودرو",
      "جنگ، شورش، اعتصاب و بلوا",
      "تشعشعات رادیواکتیو و حوادث هسته‌ای",
    ],
    requiredDocuments: [
      "تصویر برگ سبز یا کارت خودرو",
      "شماره پلاک",
      "کد ملی مالک",
      "کد پستی محل سکونت ثبت‌شده",
      "بیمه‌نامه قبلی، در صورت انتقال تخفیف عدم خسارت",
    ],
    premiumFactors: [
      "نرخ دیه اعلامی سال",
      "نوع کاربری خودرو",
      "سن خودرو",
      "سقف تعهدات مالی انتخابی",
      "درصد تخفیف عدم خسارت",
      "جریمه دیرکرد",
      "تعداد سیلندر",
      "مدت اعتبار بیمه‌نامه",
    ],
    faq: [
      {
        question: "برای خرید بیمه شخص ثالث گواهینامه لازم است؟",
        answer:
          "برای خرید بیمه‌نامه گواهینامه لازم نیست، اما در زمان دریافت خسارت راننده مقصر باید گواهینامه معتبر و متناسب با نوع خودرو داشته باشد.",
      },
      {
        question: "خسارت خودروی خودم پرداخت می‌شود؟",
        answer:
          "خیر. شخص ثالث فقط خسارت جانی راننده مقصر و خسارت جانی و مالی اشخاص ثالث را جبران می‌کند. برای خودروی خودتان بیمه بدنه لازم است.",
      },
      {
        question: "با تعویض شرکت بیمه تخفیف عدم خسارت از بین می‌رود؟",
        answer:
          "خیر. تخفیف عدم خسارت به بیمه‌نامه و مالک تعلق دارد و با تغییر شرکت بیمه منتقل می‌شود.",
      },
      {
        question: "تخفیف عدم خسارت به چه کسانی منتقل می‌شود؟",
        answer:
          "به خودروی جایگزین همان مالک، یا به بستگان درجه یک (پدر، مادر، همسر و فرزند). نوع و کاربری خودروی قبلی و جدید باید مشابه باشد.",
      },
      {
        question: "جریمه دیرکرد چگونه محاسبه می‌شود؟",
        answer:
          "روزانه و بر اساس نوع خودرو محاسبه می‌شود و حداکثر تا ۳۶۵ روز ادامه دارد؛ پس از آن افزایش نمی‌یابد.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Car",
    order: 1,
    fields: [
      plate(),
      nationalId(),
      vehicleModel(),
      buildYear(),
      coverageCeiling(PROPERTY_LIMITS, {
        label: "سقف تعهدات مالی",
        labelEn: "Property damage limit",
        help: "حداقل قانونی ۸۰ میلیون تومان است؛ سقف بالاتر حق بیمه را افزایش می‌دهد.",
        helpEn:
          "The legal minimum is the lowest option; a higher limit raises the premium.",
      }),
      noClaimYears(),
      {
        name: "ownershipChanged",
        label: "مالکیت خودرو در سال گذشته تغییر کرده است",
        labelEn: "Ownership changed in the last year",
        type: "bool",
        help: "تغییر مالکیت بر انتقال تخفیف عدم خسارت اثر می‌گذارد.",
        helpEn:
          "A change of owner affects whether the no-claims discount transfers.",
      },
      paymentMethod(),
    ],
  },

  {
    slug: "auto-body",
    categorySlug: "auto",
    title: "بیمه بدنه خودرو",
    titleEn: "Motor own-damage (comprehensive)",
    summary: "اختیاری — جبران خسارت خودروی خودتان، حتی وقتی مقصر نیستید",
    summaryEn:
      "Optional — repairs your own car, whether or not you were at fault",
    description:
      "بیمه بدنه اختیاری است و خسارت واردشده به خودروی خودتان را در حوادثی مانند تصادف، سرقت و آتش‌سوزی جبران می‌کند — حتی اگر مقصر حادثه نباشید. علاوه بر پوشش‌های اصلی، مجموعه‌ای از پوشش‌های فرعی وجود دارد که بسته به نیاز و ارزش خودرو انتخاب می‌شوند.",
    descriptionEn:
      "Own-damage cover is optional and pays to repair your own vehicle after a collision, theft or fire, regardless of fault. Beyond the core perils, a set of optional extensions can be added depending on the value of the car and how it is used.",
    coverages: [
      "تصادف و برخورد",
      "سقوط و واژگونی",
      "آتش‌سوزی و صاعقه",
      "سرقت کلی خودرو",
      "هزینه‌های نجات و انتقال",
    ],
    optionalCoverages: [
      "نوسانات قیمت",
      "سرقت قطعات",
      "شکست شیشه",
      "بلایای طبیعی",
      "خسارت ناشی از جنگ",
      "ایاب و ذهاب",
      "کشیدن میخ",
      "رنگ و مواد شیمیایی",
    ],
    notes: [
      "بازدید خودرو الزامی است، مگر در تمدید بدون خسارت.",
      "خرید اقساطی بدون چک و سفته امکان‌پذیر است.",
    ],
    exclusions: [
      "جنگ، شورش، اعتصاب و حوادث هسته‌ای",
      "تعقیب و گریز با پلیس",
      "خسارت عمدی بیمه‌گذار یا راننده",
      "رانندگی بدون گواهینامه معتبر",
      "مستی یا مصرف مواد مخدر",
      "بکسل کردن غیرمجاز",
      "حمل بار بیش از حد مجاز",
      "حمل مواد اسیدی، انفجاری یا قابل احتراق",
      "سرقت قطعات پس از وقوع حادثه",
      "غرامت عدم استفاده از خودرو",
      "شرکت در مسابقات اتومبیل‌رانی",
    ],
    requiredDocuments: [
      "شماره پلاک و کارت خودرو",
      "کد ملی مالک",
      "کد یکتای بیمه شخص ثالث معتبر",
      "بیمه‌نامه بدنه قبلی، در صورت انتقال تخفیف",
      "برای خسارت: کروکی یا گزارش پلیس و فاکتورهای رسمی تعمیر",
    ],
    premiumFactors: [
      "ارزش روز خودرو",
      "سال ساخت و عمر خودرو",
      "نوع کاربری",
      "پوشش‌های تکمیلی انتخابی",
      "تخفیف عدم خسارت",
      "نحوه پرداخت (نقدی یا اقساطی)",
    ],
    faq: [
      {
        question: "فرانشیز بیمه بدنه چقدر است؟",
        answer:
          "به‌طور معمول ۱۰ درصد خسارت. در خسارت‌های سوم به بعد و برای خودروهای فرسوده تا حدود ۳۰ درصد افزایش می‌یابد. حذف فرانشیز خسارت اول با پوشش اختیاری ممکن است.",
      },
      {
        question: "خودروی بالای ۲۰ سال بیمه بدنه می‌شود؟",
        answer:
          "معمولاً خیر. برای خودروهای بالای ۱۰ سال نیز به ازای هر سال حدود ۵ درصد به حق بیمه افزوده می‌شود.",
      },
      {
        question: "چند بار می‌توان از بیمه بدنه استفاده کرد؟",
        answer:
          "محدودیت تعداد ندارد و تا سقف ارزش بیمه‌شده خودرو قابل استفاده است، اما فرانشیز خسارت‌های بعدی افزایش می‌یابد.",
      },
      {
        question: "پرداخت خسارت چقدر طول می‌کشد؟",
        answer: "خسارت جزئی معمولاً تا ۱۵ روز و خسارت کلی تا ۶۰ روز.",
      },
      {
        question: "تمدید بدون بازدید ممکن است؟",
        answer:
          "اگر بیمه‌نامه بدون خسارت و در همان شرکت تمدید شود، معمولاً بازدید مجدد لازم نیست.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "ShieldCheck",
    order: 2,
    fields: [
      plate(),
      nationalId(),
      vehicleModel(),
      buildYear(),
      currencyField("vehicleValue", "ارزش روز خودرو", "Current market value", {
        min: 10_000_000,
        help: "ارزش روز بازار — مبنای محاسبه حق بیمه و سقف خسارت.",
        helpEn:
          "Market value today — the basis for both premium and claim ceiling.",
      }),
      {
        name: "extraCoverages",
        label: "پوشش‌های اختیاری",
        labelEn: "Optional extensions",
        type: "multiselect",
        required: false,
        options: [
          {
            value: "price-fluctuation",
            label: "نوسانات قیمت",
            labelEn: "Price fluctuation",
          },
          { value: "parts-theft", label: "سرقت قطعات", labelEn: "Parts theft" },
          { value: "glass", label: "شکست شیشه", labelEn: "Glass breakage" },
          {
            value: "natural-disaster",
            label: "بلایای طبیعی",
            labelEn: "Natural disasters",
          },
          { value: "war", label: "خسارت ناشی از جنگ", labelEn: "War damage" },
          {
            value: "transport",
            label: "ایاب و ذهاب",
            labelEn: "Courtesy transport",
          },
          { value: "nail", label: "کشیدن میخ", labelEn: "Keying / scratching" },
          {
            value: "chemical",
            label: "رنگ و مواد شیمیایی",
            labelEn: "Paint and chemicals",
          },
        ],
      },
      {
        name: "inspectionMethod",
        label: "روش بازدید خودرو",
        labelEn: "Inspection method",
        type: "select",
        required: true,
        options: [
          {
            value: "in-person",
            label: "حضوری در مرکز بازدید",
            labelEn: "In person at a centre",
          },
          {
            value: "on-site",
            label: "بازدید در محل شما",
            labelEn: "At your location",
          },
          {
            value: "app",
            label: "بازدید آنلاین (اپلیکیشن)",
            labelEn: "Online / app-based",
          },
          {
            value: "renewal-exempt",
            label: "تمدید بدون خسارت — نیازی به بازدید نیست",
            labelEn: "Claim-free renewal — exempt",
          },
        ],
      },
      noClaimYears(),
      paymentMethod(),
    ],
  },

  {
    slug: "motorcycle",
    categorySlug: "auto",
    title: "بیمه شخص ثالث موتورسیکلت",
    titleEn: "Motorcycle third-party insurance",
    summary: "اجباری برای موتورسیکلت — صدور در همان روز",
    summaryEn: "Compulsory for motorcycles — same-day issue",
    description:
      "بیمه شخص ثالث موتورسیکلت مانند خودرو اجباری است و خسارت جانی و مالی واردشده به اشخاص ثالث را پوشش می‌دهد. پوشش حوادث راننده مقصر نیز شامل آن است. سفارش‌های ثبت‌شده پیش از ساعت ۲۱ معمولاً در همان روز صادر می‌شوند.",
    descriptionEn:
      "Third-party cover for motorcycles is compulsory in the same way as for cars, paying for injury and property damage to third parties and covering injury to the at-fault rider. Orders placed before 21:00 are usually issued the same day.",
    coverages: [
      "خسارت جانی اشخاص ثالث",
      "خسارت مالی اشخاص ثالث",
      "خسارت جانی راننده مقصر",
      "افت قیمت وسیله نقلیه آسیب‌دیده",
    ],
    notes: [
      "ارائه کارت ملی، کارت موتور و گواهینامه معتبر الزامی است.",
      "امکان پرداخت اقساطی ۳ تا ۱۱ ماهه وجود دارد.",
    ],
    exclusions: [
      "خسارت واردشده به خود موتورسیکلت راننده مقصر",
      "جنگ، شورش، اعتصاب و انفجار هسته‌ای",
      "خسارت عمدی",
      "رانندگی در حالت مستی یا تحت تأثیر مواد مخدر",
      "تعقیب و گریز با پلیس",
      "رانندگی بدون گواهینامه معتبر",
      "حمل بار بیش از ظرفیت مجاز",
    ],
    requiredDocuments: [
      "کارت ملی و شناسنامه مالک",
      "کارت موتورسیکلت یا سند مالکیت",
      "گواهینامه رانندگی معتبر",
      "بیمه‌نامه قبلی، در صورت انتقال تخفیف",
      "فاکتور فروش ممهور، در صورت صادرنشدن کارت موتور",
    ],
    premiumFactors: [
      "نوع موتور (گازی، تک‌سیلندر، دوسیلندر یا بالاتر، سه‌چرخ)",
      "سال تولید",
      "سقف تعهدات مالی انتخابی",
      "تخفیف عدم خسارت",
      "جریمه دیرکرد",
      "مدت اعتبار بیمه‌نامه",
    ],
    faq: [
      {
        question: "مهلت اعلام خسارت چقدر است؟",
        answer: "پنج روز کاری از زمان وقوع حادثه.",
      },
      {
        question: "تخفیف عدم خسارت موتورسیکلت منتقل می‌شود؟",
        answer:
          "بله، اما فقط به وسیله‌ای از همان نوع، برای مالک یا بستگان درجه یک، از بیمه‌نامه‌ای معتبر و تنها یک بار.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Bike",
    order: 3,
    fields: [
      plate({
        label: "شماره پلاک موتورسیکلت",
        labelEn: "Motorcycle plate number",
        help: undefined,
        helpEn: undefined,
      }),
      nationalId({
        help: "کد ملی صاحب پلاک",
        helpEn: "National ID of the plate holder",
      }),
      previousInsurer(),
      {
        name: "previousPolicyEnd",
        label: "تاریخ پایان بیمه قبلی",
        labelEn: "Previous policy end date",
        type: "date",
        required: false,
        help: "برای محاسبه جریمه دیرکرد و تخفیف عدم خسارت.",
        helpEn: "Used to work out any late penalty and the no-claims discount.",
      },
      claimHistory(),
      paymentMethod(),
    ],
  },
];
