import type { ProductDef, TextField } from "../types.js";
import {
  area,
  buildingAge,
  currencyField,
  insuredSubject,
  province,
  structureType,
  unitCount,
} from "../fields.js";

/**
 * The property's own location, which is not necessarily where the applicant
 * lives — a landlord insuring a flat in Mashhad from Tehran is ordinary. The
 * contact block's `province`/`city` stay the applicant's; these are the risk's.
 */
const propertyProvince = () =>
  province({
    name: "propertyProvince",
    label: "استان محل ملک",
    labelEn: "Province of the property",
  });

const propertyCity = (): TextField => ({
  name: "propertyCity",
  label: "شهر محل ملک",
  labelEn: "City of the property",
  type: "text",
  required: true,
  minLength: 2,
  maxLength: 100,
});

const ADDON_PERILS = [
  { value: "earthquake", label: "زلزله", labelEn: "Earthquake" },
  { value: "flood", label: "سیل", labelEn: "Flood" },
  { value: "storm", label: "طوفان", labelEn: "Storm" },
  {
    value: "water-damage",
    label: "ترکیدگی لوله آب",
    labelEn: "Burst water pipes",
  },
  { value: "theft", label: "سرقت", labelEn: "Theft" },
  { value: "power-surge", label: "نوسانات برق", labelEn: "Power surge" },
  { value: "war", label: "جنگ", labelEn: "War" },
];

export const propertyProducts: ProductDef[] = [
  {
    slug: "fire-residential",
    categorySlug: "property",
    title: "بیمه آتش‌سوزی مسکونی",
    titleEn: "Home fire insurance",
    summary: "محافظت از بنا و اثاثیه در برابر آتش، انفجار و صاعقه",
    summaryEn:
      "Protects the building and its contents against fire, explosion and lightning",
    description:
      "بیمه آتش‌سوزی زیرمجموعه بیمه اموال است و از دارایی شما در برابر آتش‌سوزی، انفجار و صاعقه محافظت می‌کند. با افزودن پوشش‌های تکمیلی می‌توان زلزله، سیل و سرقت را نیز به آن اضافه کرد. توجه داشته باشید که این بیمه‌نامه تنها خسارت مالی را جبران می‌کند و خسارت جانی از استثنائات آن است.",
    descriptionEn:
      "Fire insurance is a property line covering fire, explosion and lightning damage to a home. Optional extensions bring in earthquake, flood and theft. It pays for property damage only — bodily injury is expressly excluded.",
    coverages: ["آتش‌سوزی", "صاعقه", "انفجار"],
    optionalCoverages: [
      "زلزله",
      "طوفان",
      "سیل",
      "ترکیدگی لوله آب",
      "سرقت",
      "نوسانات برق",
      "جنگ",
    ],
    notes: [
      "خسارت جانی جزو استثنائات این بیمه‌نامه است.",
      "برخی پوشش‌های اضافی نیازمند بازدید کارشناس هستند.",
    ],
    exclusions: [
      "خسارت‌های جانی",
      "جنگ، شورش و بلوا، مگر با الحاقیه صریح",
      "مسکوکات، طلا و شمش",
      "پول نقد و اوراق بهادار",
      "آثار هنری، نسخ خطی و اشیای عتیقه",
      "جواهرات، مروارید و سنگ‌های قیمتی",
    ],
    requiredDocuments: [
      "نام و نام خانوادگی و کد ملی",
      "شماره موبایل",
      "نشانی کامل ساختمان و تلفن ثابت",
      "فهرست تفکیکی اثاثیه، برای سرمایه بیش از یک میلیارد تومان",
    ],
    premiumFactors: [
      "ارزش بنا",
      "ارزش اثاثیه و اموال",
      "مدت بیمه‌نامه",
      "پوشش‌های اضافی انتخابی",
      "موقعیت جغرافیایی و ریسک زلزله",
      "نوع سازه و سن ساختمان",
    ],
    faq: [
      {
        question: "مستأجر می‌تواند بیمه آتش‌سوزی بخرد؟",
        answer:
          "بله. در این حالت حق بیمه فقط بر اساس ارزش اموال و اثاثیه محاسبه می‌شود و ارزش بنا در آن اثری ندارد.",
      },
      {
        question: "همهٔ پوشش‌ها بدون بازدید صادر می‌شوند؟",
        answer:
          "خیر. پوشش‌هایی مانند جنگ، ترکیدگی لوله، برف سنگین، نشست زمین، طوفان و سرقت معمولاً بازدید اولیه لازم دارند.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Flame",
    order: 1,
    fields: [
      propertyProvince(),
      propertyCity(),
      insuredSubject(),
      area(),
      structureType(),
      buildingAge(),
      unitCount({
        required: false,
        help: "برای ساختمان‌های چندواحدی",
        helpEn: "For multi-unit buildings",
      }),
      currencyField(
        "constructionCostPerMeter",
        "هزینه ساخت هر متر مربع",
        "Construction cost per m²",
        {
          showWhen: { field: "insuredSubject", equals: ["building", "both"] },
          help: "برای محاسبه ارزش بنا. اگر مطمئن نیستید، تخمین بزنید — کارشناس اصلاح می‌کند.",
          helpEn:
            "Used to value the structure. An estimate is fine; our specialist will refine it.",
        },
      ),
      currencyField(
        "contentsValue",
        "ارزش اثاثیه و لوازم منزل",
        "Value of contents",
        {
          showWhen: { field: "insuredSubject", equals: ["contents", "both"] },
        },
      ),
      {
        name: "addonPerils",
        label: "پوشش‌های اضافی",
        labelEn: "Additional perils",
        type: "multiselect",
        required: false,
        options: ADDON_PERILS,
      },
    ],
  },

  {
    slug: "earthquake-residential",
    categorySlug: "property",
    title: "بیمه زلزله مسکونی",
    titleEn: "Home earthquake insurance",
    summary: "جبران خسارت مستقیم زلزله به بنا و لوازم منزل",
    summaryEn: "Pays direct earthquake damage to the structure and contents",
    description:
      "بیمه زلزله در اصل یکی از پوشش‌های اضافی بیمه آتش‌سوزی است که به صورت مستقل هم فروخته می‌شود و خسارت واردشده به بنا و اموال در اثر زمین‌لرزه را جبران می‌کند. تنها خسارت مستقیم ناشی از زلزله پوشش داده می‌شود — نه پیامدهای بعدی مانند سرقت پس از حادثه. ایران به پنج منطقه لرزه‌خیز تقسیم شده و همین منطقه‌بندی بیشترین اثر را بر حق بیمه دارد.",
    descriptionEn:
      "Earthquake cover is formally an extension of fire insurance, sold here on its own, paying for damage to the structure and contents caused by a quake. It covers direct damage only — not what follows, such as looting. Iran is graded into five seismic zones, and that grading is the largest single factor in the premium.",
    coverages: [
      "خسارت مالی به ساختمان (بنا)",
      "خسارت مالی به لوازم و اثاثیه منزل",
      "پوشش آتش‌سوزی ناشی از زلزله",
    ],
    notes: [
      "مستأجران برای خرید این بیمه‌نامه نیازی به اجازه مالک ندارند.",
      "ارائه سند ملک هنگام خرید ضروری نیست.",
      "تنها خسارت مستقیم زلزله پوشش دارد.",
    ],
    exclusions: [
      "خسارت‌های جانی",
      "رانش و حرکت زمین",
      "سرقت اموال پس از وقوع زلزله",
      "خسارت‌های غیرمستقیم؛ تنها خسارت مستقیم ناشی از زلزله جبران می‌شود",
    ],
    requiredDocuments: [
      "شماره بیمه‌نامه",
      "گزارش مؤسسه ژئوفیزیک یا مرکز زمین‌شناسی",
      "گزارش فرمانداری، استانداری یا بخشداری",
      "فهرست و ارزش اموال آسیب‌دیده",
      "عکس و فیلم از محل حادثه",
    ],
    premiumFactors: [
      "نوع سازه (فلزی، بتنی، آجری، گلی)",
      "متراژ ملک",
      "هزینه ساخت هر مترمربع",
      "ارزش لوازم منزل",
      "منطقهٔ زلزله‌خیزی محل ملک",
      "مدت بیمه‌نامه",
    ],
    faq: [
      {
        question: "بیمه زلزله جدا از آتش‌سوزی خریداری می‌شود؟",
        answer:
          "خیر. زلزله یکی از پوشش‌های اضافی بیمه آتش‌سوزی است و روی همان بیمه‌نامه اضافه می‌شود.",
      },
      {
        question: "سند ملک لازم است؟",
        answer: "خیر. برای بیمهٔ منزل مسکونی یا مغازه ارائهٔ سند ضروری نیست.",
      },
      {
        question: "مستأجر بدون اجازه مالک می‌تواند بخرد؟",
        answer:
          "بله؛ مستأجر برای بیمه‌کردن اموال خود به اجازهٔ مالک نیاز ندارد.",
      },
      {
        question: "مهلت اعلام خسارت چقدر است؟",
        answer: "پنج روز کاری از زمان وقوع حادثه.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Activity",
    order: 2,
    fields: [
      propertyProvince(),
      propertyCity(),
      insuredSubject(),
      area(),
      structureType(),
      currencyField(
        "constructionCostPerMeter",
        "هزینه ساخت هر متر مربع",
        "Construction cost per m²",
        {
          showWhen: { field: "insuredSubject", equals: ["building", "both"] },
        },
      ),
      currencyField("contentsValue", "ارزش لوازم منزل", "Value of contents", {
        showWhen: { field: "insuredSubject", equals: ["contents", "both"] },
      }),
    ],
  },

  {
    slug: "elevator",
    categorySlug: "property",
    title: "بیمه مسئولیت آسانسور",
    titleEn: "Elevator liability insurance",
    summary: "پوشش حوادث آسانسور — خریداری‌شده توسط مدیریت ساختمان",
    summaryEn: "Covers lift accidents — bought by building management",
    description:
      "بیمه مسئولیت آسانسور خسارت‌های ناشی از حوادث آسانسور را جبران می‌کند و معمولاً توسط مدیریت ساختمان خریداری و هزینه آن میان واحدها تقسیم می‌شود. این بیمه‌نامه اجباری نیست، اما نبود آن مسئولیت حادثه را مستقیماً متوجه هیأت مدیره می‌کند. پرداخت خسارت مشروط به انجام سرویس‌های دوره‌ای منظم است.",
    descriptionEn:
      "Elevator liability covers accidents involving a building lift. It is normally bought by the building manager and the cost split across the units. It is not compulsory — but without it, liability for an accident falls directly on the board. Payment of any claim is conditional on the lift having been serviced on schedule.",
    coverages: [
      "هزینه‌های پزشکی ناشی از حادثه",
      "غرامت فوت / دیه",
      "غرامت نقص عضو",
      "خسارت مالی (تنها در آسانسورهای باری)",
    ],
    notes: [
      "سرویس‌های دوره‌ای منظم شرط دریافت خسارت است.",
      "این بیمه اجباری نیست و معمولاً مدیریت ساختمان آن را تهیه می‌کند.",
    ],
    exclusions: [
      "جنگ، اغتشاش و اعتصاب",
      "حوادث هسته‌ای و امواج رادیواکتیو",
      "خسارت‌های عمدی",
      "نقص فنی ناشی از انجام‌نشدن سرویس دوره‌ای یا تعمیر توسط شخص غیرمجاز",
      "خسارت به اموال، جز در آسانسورهای باری",
    ],
    requiredDocuments: [
      "قرارداد و فاکتورهای سرویس دوره‌ای",
      "گواهی سلامت و بازرسی فنی آسانسور",
      "مشخصات ساختمان و تعداد طبقات",
    ],
    premiumFactors: [
      "تعداد طبقات",
      "نوع کاربری ساختمان (مسکونی، تجاری، باربری)",
      "ظرفیت آسانسور",
      "سال ساخت و فناوری آسانسور",
      "ارتفاع بیش از ده طبقه",
      "سقف هزینهٔ پزشکی انتخابی",
    ],
    faq: [
      {
        question: "چه کسی این بیمه‌نامه را می‌خرد؟",
        answer:
          "مدیریت ساختمان بیمه‌نامه را تهیه می‌کند و هزینهٔ آن میان واحدها تقسیم می‌شود.",
      },
      {
        question: "سقف هزینهٔ پزشکی چقدر است؟",
        answer:
          "قابل انتخاب است و معمولاً از ۵ تا ۴۰ میلیون تومان تعیین می‌شود.",
      },
      {
        question: "اگر آسانسور سرویس نشده باشد چه می‌شود؟",
        answer:
          "در صورت نقص فنی ناشی از سرویس‌نشدن یا تعمیر توسط شخص غیرمجاز، خسارت پرداخت نمی‌شود. مدارک سرویس دوره‌ای را نگه دارید.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "ArrowUpDown",
    order: 3,
    fields: [
      {
        name: "elevatorUsage",
        label: "نوع کاربری آسانسور",
        labelEn: "Lift usage",
        type: "select",
        required: true,
        options: [
          { value: "residential", label: "مسکونی", labelEn: "Residential" },
          { value: "commercial", label: "تجاری", labelEn: "Commercial" },
          { value: "freight", label: "باربری", labelEn: "Freight" },
        ],
      },
      {
        name: "elevatorCapacity",
        label: "ظرفیت آسانسور",
        labelEn: "Lift capacity",
        type: "number",
        required: true,
        min: 1,
        max: 50,
        unit: "نفر",
        unitEn: "people",
      },
      {
        name: "stopCount",
        label: "تعداد طبقات توقف",
        labelEn: "Number of stops",
        type: "number",
        required: true,
        min: 2,
        max: 100,
      },
      {
        name: "elevatorBuildYear",
        label: "سال ساخت آسانسور",
        labelEn: "Year of installation",
        type: "number",
        required: true,
        min: 1340,
        max: 1450,
      },
      {
        name: "hasInnerDoor",
        label: "آسانسور در داخلی دارد",
        labelEn: "Lift has an inner door",
        type: "bool",
        help: "نبود در داخلی ریسک را به شکل محسوسی بالا می‌برد.",
        helpEn: "A missing inner door raises the assessed risk noticeably.",
      },
      {
        name: "medicalCeiling",
        label: "سقف پوشش هزینه‌های پزشکی",
        labelEn: "Medical expenses limit",
        type: "select",
        required: true,
        options: [
          { value: "5", label: "۵ میلیون تومان", labelEn: "50m IRR" },
          { value: "10", label: "۱۰ میلیون تومان", labelEn: "100m IRR" },
          { value: "20", label: "۲۰ میلیون تومان", labelEn: "200m IRR" },
          { value: "40", label: "۴۰ میلیون تومان", labelEn: "400m IRR" },
        ],
      },
      unitCount(),
    ],
  },

  {
    slug: "home-comprehensive",
    categorySlug: "property",
    title: "بسته جامع مسکونی",
    titleEn: "Comprehensive home package",
    summary: "آسانسور، مسئولیت مدیران و آتش‌سوزی در یک قرارداد",
    summaryEn: "Lift, board liability and fire cover in a single contract",
    description:
      "این بسته سه بیمه‌نامه‌ای را که یک ساختمان مسکونی معمولاً جداگانه می‌خرد — مسئولیت آسانسور، مسئولیت هیأت مدیره و آتش‌سوزی — در یک قرارداد با تخفیف بسته‌ای جمع می‌کند. خرید آن بر عهده مدیریت ساختمان است و هزینه میان واحدها تقسیم می‌شود. چون سه پوشش با هم قیمت‌گذاری می‌شوند، تنظیم آن نیازمند گفت‌وگو با کارشناس است.",
    descriptionEn:
      "This package bundles the three policies a residential building usually buys separately — lift liability, board liability and fire — into one contract at a package discount. The building manager buys it and the cost is split across units. Because the three are priced together, setting it up needs a conversation with a specialist.",
    coverages: [
      "بیمه مسئولیت آسانسور",
      "بیمه مسئولیت هیأت مدیره ساختمان",
      "بیمه آتش‌سوزی ساختمان و مشاعات",
    ],
    notes: ["تخفیف بسته‌ای نسبت به خرید جداگانه سه بیمه‌نامه."],
    requiredDocuments: [
      "اطلاعات هویتی مالک یا مدیر ساختمان",
      "کد پستی ساختمان",
    ],
    intake: "CALLBACK",
    audience: "INDIVIDUAL",
    icon: "Building",
    order: 4,
    fields: [
      {
        name: "postalCode",
        label: "کد پستی ساختمان",
        labelEn: "Building postal code",
        type: "text",
        required: true,
        minLength: 10,
        maxLength: 10,
      },
      unitCount(),
      {
        name: "floorCount",
        label: "تعداد طبقات",
        labelEn: "Number of floors",
        type: "number",
        required: true,
        min: 1,
        max: 100,
      },
      area({ label: "متراژ کل زیربنا", labelEn: "Total floor area" }),
      {
        name: "hasElevator",
        label: "ساختمان آسانسور دارد",
        labelEn: "Building has a lift",
        type: "bool",
      },
    ],
  },

  {
    slug: "fire-commercial",
    categorySlug: "property",
    title: "بیمه آتش‌سوزی اداری و تجاری",
    titleEn: "Commercial fire insurance",
    summary: "دفاتر، مغازه‌ها، مطب‌ها و مراکز آموزشی",
    summaryEn: "Offices, shops, clinics and schools",
    description:
      "بیمه آتش‌سوزی اداری و تجاری برای محل‌های غیرصنعتی صادر می‌شود — دفاتر کار، مغازه‌ها، مراکز درمانی و آموزشی. ساختمان، تأسیسات، ماشین‌آلات و کالای موجود در محل را پوشش می‌دهد. قیمت به منطقه جغرافیایی، نوع کاربری و فاصله ملک از گسل بستگی دارد، بنابراین نرخ‌گذاری آن دستی انجام می‌شود.",
    descriptionEn:
      "Commercial fire cover is written for non-industrial premises — offices, shops, clinics, schools — and covers the building, its installations, machinery and stock. Pricing depends on the region, the use of the premises and proximity to fault lines, so it is rated by hand rather than instantly.",
    coverages: [
      "آتش‌سوزی",
      "انفجار",
      "برخورد صاعقه",
      "ساختمان و تأسیسات",
      "ماشین‌آلات",
      "مواد اولیه و کالای موجود در محل",
    ],
    notes: ["قیمت به منطقه، نوع ملک و موقعیت نسبت به گسل‌ها بستگی دارد."],
    premiumFactors: [
      "منطقهٔ جغرافیایی و شهر",
      "نوع ملک و سازه",
      "وضعیت گسل",
      "نوع کاربری و میزان ریسک فعالیت",
      "ارزش بنا و موجودی",
    ],
    intake: "CALLBACK",
    audience: "CORPORATE",
    icon: "Store",
    order: 5,
    fields: [
      propertyProvince(),
      propertyCity(),
      {
        name: "premisesUse",
        label: "نوع کاربری محل",
        labelEn: "Use of premises",
        type: "select",
        required: true,
        options: [
          { value: "office", label: "دفتر اداری", labelEn: "Office" },
          {
            value: "retail",
            label: "مغازه / فروشگاه",
            labelEn: "Shop / retail",
          },
          { value: "clinic", label: "مطب / درمانگاه", labelEn: "Clinic" },
          { value: "school", label: "آموزشی", labelEn: "Educational" },
          { value: "warehouse", label: "انبار", labelEn: "Warehouse" },
          { value: "other", label: "سایر", labelEn: "Other" },
        ],
      },
      area(),
      currencyField(
        "buildingValue",
        "ارزش تقریبی بنا و تأسیسات",
        "Approximate value of building and fittings",
        {
          required: false,
        },
      ),
      currencyField(
        "stockValue",
        "ارزش تقریبی کالا و موجودی",
        "Approximate value of stock",
        { required: false },
      ),
    ],
  },

  {
    slug: "fire-industrial",
    categorySlug: "property",
    title: "بیمه آتش‌سوزی صنعتی",
    titleEn: "Industrial fire insurance",
    summary: "کارخانه‌ها، کارگاه‌ها و واحدهای تولیدی",
    summaryEn: "Factories, workshops and production units",
    description:
      "بیمه آتش‌سوزی صنعتی برای واحدهای تولیدی، کارخانه‌ها و کارگاه‌ها صادر می‌شود و ساختمان، ماشین‌آلات، تأسیسات و موجودی انبار را تحت پوشش قرار می‌دهد. پوشش‌های اضافی مانند زلزله، سیل و مسئولیت مالی در قبال همسایگان قابل افزودن است. ارزیابی ریسک صنعتی همیشه نیازمند بررسی کارشناسی است.",
    descriptionEn:
      "Industrial fire cover is written for production units, factories and workshops, covering the building, machinery, installations and stock. Extensions such as earthquake, flood and liability towards neighbours can be added. Industrial risk always requires an underwriter to assess it.",
    coverages: ["آتش‌سوزی", "صاعقه", "انفجار در واحد تولیدی"],
    optionalCoverages: [
      "زلزله و رانش زمین",
      "سیل و طغیان",
      "طوفان و بارش شدید",
      "نشت گاز",
      "مسئولیت مالی در قبال همسایگان",
    ],
    notes: [
      "ارائه فرم پیشنهاد و مدارک هویتی الزامی است.",
      "بازدید کارشناس در اغلب موارد ضروری است.",
    ],
    exclusions: [
      "پول نقد و مسکوکات",
      "طلا و سنگ‌های قیمتی",
      "اسناد و اوراق بهادار",
      "خسارت‌های نرم‌افزاری",
      "نوسان جریان برق ناشی از صاعقه",
    ],
    requiredDocuments: [
      "بیمه‌نامه و رسید پرداخت حق بیمه",
      "کارت ملی",
      "سند مالکیت یا اجاره‌نامه",
      "فهرست اموال آسیب‌دیده",
      "گزارش آتش‌نشانی و نیروی انتظامی",
    ],
    premiumFactors: [
      "ارزش ساختمان، ماشین‌آلات و تأسیسات",
      "ارزش موجودی انبار و مواد اولیه",
      "نوع فعالیت تولیدی",
      "موقعیت جغرافیایی و وضعیت گسل",
      "پوشش‌های اضافی انتخابی",
    ],
    intake: "CALLBACK",
    audience: "CORPORATE",
    icon: "Factory",
    order: 6,
    fields: [
      propertyProvince(),
      propertyCity(),
      {
        name: "industryType",
        label: "نوع فعالیت صنعتی",
        labelEn: "Type of industrial activity",
        type: "text",
        required: true,
        maxLength: 200,
        help: "مثال: تولید قطعات پلاستیکی، صنایع غذایی، ریخته‌گری",
        helpEn: "e.g. plastic components, food processing, foundry",
      },
      area({ label: "متراژ کل واحد", labelEn: "Total site area" }),
      currencyField(
        "buildingValue",
        "ارزش بنا و تأسیسات",
        "Value of building and installations",
        { required: false },
      ),
      currencyField("machineryValue", "ارزش ماشین‌آلات", "Value of machinery", {
        required: false,
      }),
      currencyField("stockValue", "ارزش موجودی انبار", "Value of stock", {
        required: false,
      }),
      {
        name: "addonPerils",
        label: "پوشش‌های اضافی مورد نظر",
        labelEn: "Additional perils wanted",
        type: "multiselect",
        required: false,
        options: [
          {
            value: "earthquake",
            label: "زلزله و رانش زمین",
            labelEn: "Earthquake and landslide",
          },
          { value: "flood", label: "سیل و طغیان", labelEn: "Flood" },
          {
            value: "storm",
            label: "طوفان و بارش شدید",
            labelEn: "Storm and heavy rain",
          },
          { value: "gas-leak", label: "نشت گاز", labelEn: "Gas leak" },
          {
            value: "neighbour-liability",
            label: "مسئولیت در قبال همسایگان",
            labelEn: "Liability to neighbours",
          },
        ],
      },
    ],
  },
];
