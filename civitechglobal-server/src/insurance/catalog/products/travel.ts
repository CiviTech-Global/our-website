import type { ProductDef } from "../types.js";
import {
  coverageCeiling,
  durationDays,
  peopleCount,
  startDate,
} from "../fields.js";

const TRAVEL_AGE_BANDS = [
  { value: "0-12", label: "تا ۱۲ سال", labelEn: "Up to 12" },
  { value: "13-65", label: "۱۳ تا ۶۵ سال", labelEn: "13 to 65" },
  { value: "66-75", label: "۶۶ تا ۷۵ سال", labelEn: "66 to 75" },
  { value: "76+", label: "بالای ۷۵ سال", labelEn: "Over 75" },
];

const SCHENGEN_CEILINGS = [
  {
    value: "30000",
    label: "۳۰٬۰۰۰ یورو (حداقل شینگن)",
    labelEn: "€30,000 (Schengen minimum)",
  },
  { value: "50000", label: "۵۰٬۰۰۰ یورو", labelEn: "€50,000" },
  { value: "100000", label: "۱۰۰٬۰۰۰ یورو", labelEn: "€100,000" },
];

export const travelProducts: ProductDef[] = [
  {
    slug: "travel-outbound",
    categorySlug: "travel",
    title: "بیمه مسافرتی خارجی",
    titleEn: "Outbound travel insurance",
    summary: "الزامی برای ویزای شینگن — پوشش درمان و حوادث سفر",
    summaryEn: "Required for a Schengen visa — medical and travel cover",
    description:
      "بیمه مسافرتی خارجی هزینه‌های درمانی و حوادث پیش‌بینی‌نشده در طول سفر خارج از کشور را جبران می‌کند و برای دریافت ویزای شینگن الزامی است. علاوه بر درمان و بستری، مواردی مانند بازگرداندن مسافر، اقامت بستگان، مشاوره حقوقی و خسارت بار و مدارک را پوشش می‌دهد. اعتبار بیمه‌نامه از لحظه درج مهر خروج بر گذرنامه آغاز می‌شود و حداکثر ۹۲ روز پیوسته است.",
    descriptionEn:
      "Outbound travel insurance covers medical costs and unforeseen incidents abroad, and is mandatory for a Schengen visa. Beyond treatment and hospitalisation it covers repatriation, a relative’s stay, legal advice, and lost baggage or documents. Cover begins at the passport exit stamp and runs for a maximum of 92 consecutive days.",
    coverages: [
      "هزینه‌های پزشکی و بستری",
      "درمان دندان‌پزشکی اضطراری",
      "جبران داروی مفقودشده",
      "هزینه بازگشت در صورت بستری بیش از ۱۰ روز",
      "هزینه اقامت بستگان",
      "مشاوره حقوقی",
      "خسارت بار، مدارک و تأخیر پرواز",
    ],
    notes: [
      "اعتبار از زمان درج مهر خروج بر گذرنامه آغاز می‌شود.",
      "حداکثر مدت پوشش: ۹۲ روز پیوسته.",
      "مبدأ سفر باید ایران باشد.",
    ],
    exclusions: [
      "بیماری‌های سابقه‌دار و عوارض پیشین",
      "جنگ، تجاوز نظامی و تروریسم",
      "ورزش‌های حرفه‌ای مانند کوه‌نوردی، غواصی، هوانوردی و ورزش‌های زمستانی",
      "تشعشعات هسته‌ای",
      "زایمان در سه ماه پایانی و سقط جنین اختیاری",
      "مصرف مواد مخدر و الکل",
      "حوادث شغلی",
      "بیماری‌های مادرزادی",
      "واکسیناسیون و اقدامات پیشگیرانه",
      "درمان‌های زیبایی و فیزیوتراپی",
      "بیماری‌های روانی و خودکشی",
    ],
    requiredDocuments: [
      "اصل بیمه‌نامه",
      "اصل و تصویر گذرنامه",
      "صورتحساب‌های پرداختی",
      "گواهی پزشکی، و در صورت فوت گواهی فوت",
    ],
    premiumFactors: [
      "سن مسافر",
      "مدت سفر",
      "تعداد کشورهای مقصد",
      "سقف تعهدات انتخابی",
    ],
    faq: [
      {
        question: "برای ویزای شینگن الزامی است؟",
        answer:
          "بله. برای دریافت ویزای شینگن ارائهٔ بیمهٔ مسافرتی الزامی است؛ در سفرهای بدون ویزا اختیاری است.",
      },
      {
        question: "اعتبار بیمه‌نامه از چه زمانی شروع می‌شود؟",
        answer: "از زمان درج مهر خروج بر روی گذرنامه.",
      },
      {
        question: "حداکثر مدت پوشش چقدر است؟",
        answer:
          "حداکثر ۹۲ روز متوالی؛ طرح‌های شش‌ماهه و یک‌ساله نیز وجود دارد.",
      },
      {
        question: "اگر سفر لغو شود بیمه‌نامه قابل استرداد است؟",
        answer: "در شش ماه نخست پس از خرید امکان درخواست فسخ وجود دارد.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Plane",
    order: 1,
    fields: [
      {
        name: "destinationZone",
        label: "منطقه مقصد",
        labelEn: "Destination zone",
        type: "select",
        required: true,
        options: [
          {
            value: "schengen",
            label: "اروپا / شینگن",
            labelEn: "Europe / Schengen",
          },
          { value: "asia", label: "آسیا", labelEn: "Asia" },
          { value: "middle-east", label: "خاورمیانه", labelEn: "Middle East" },
          { value: "americas", label: "قاره آمریکا", labelEn: "Americas" },
          { value: "africa", label: "آفریقا", labelEn: "Africa" },
          { value: "oceania", label: "اقیانوسیه", labelEn: "Oceania" },
          {
            value: "worldwide",
            label: "چند مقصد / سراسر جهان",
            labelEn: "Multiple / worldwide",
          },
        ],
      },
      {
        name: "destinationCountries",
        label: "کشور یا کشورهای مقصد",
        labelEn: "Destination country or countries",
        type: "text",
        required: false,
        maxLength: 200,
      },
      durationDays({ label: "مدت سفر", labelEn: "Trip length", max: 92 }),
      startDate({ label: "تاریخ شروع سفر", labelEn: "Departure date" }),
      peopleCount({
        label: "تعداد مسافران",
        labelEn: "Number of travellers",
        max: 50,
      }),
      {
        name: "ageBand",
        label: "رده سنی مسافران",
        labelEn: "Traveller age band",
        type: "multiselect",
        required: true,
        minSelected: 1,
        options: TRAVEL_AGE_BANDS,
        help: "اگر مسافران در رده‌های سنی مختلفی هستند، همه را انتخاب کنید.",
        helpEn: "If travellers fall in different bands, select all that apply.",
      },
      coverageCeiling(SCHENGEN_CEILINGS, {
        help: "برای ویزای شینگن حداقل ۳۰٬۰۰۰ یورو الزامی است.",
        helpEn: "A Schengen visa requires at least €30,000.",
      }),
    ],
  },

  {
    slug: "travel-domestic",
    categorySlug: "travel",
    title: "بیمه مسافرتی داخلی",
    titleEn: "Domestic travel insurance",
    summary: "پوشش حوادث در سفرهای درون کشور",
    summaryEn: "Accident cover for trips inside Iran",
    description:
      "بیمه مسافرتی داخلی مسافران را در برابر حوادث احتمالی در سفرهای درون مرزی محافظت می‌کند و شامل غرامت فوت، نقص عضو، ازکارافتادگی و هزینه‌های پزشکی است. برای سفرهای گروهی، اردوها و تورهای داخلی کاربرد زیادی دارد. هزینه آن به مدت سفر، سرمایه انتخابی و تعداد افراد بستگی دارد.",
    descriptionEn:
      "Domestic travel insurance protects travellers against accidents on trips inside Iran, paying death benefit, dismemberment, disability and medical costs. It is commonly used for group trips, camps and domestic tours. Cost depends on trip length, sum insured and party size.",
    coverages: [
      "غرامت فوت",
      "نقص عضو",
      "ازکارافتادگی دائم و موقت",
      "هزینه‌های پزشکی",
    ],
    exclusions: [
      "خسارت ناشی از سهل‌انگاری یا بی‌احتیاطی خود مسافر",
      "حوادثی که قصد و ارادهٔ فرد در آن دخیل باشد",
    ],
    premiumFactors: [
      "مدت سفر",
      "سرمایهٔ انتخابی",
      "تعداد افراد بیمه‌شده",
      "پوشش‌های اضافی",
    ],
    faq: [
      {
        question: "چرا این بیمه‌نامه با بیمهٔ مسافرتی خارجی فرق دارد؟",
        answer:
          "برای سفرهای داخلی بیمه‌نامهٔ مسافرتی بین‌المللی صادر نمی‌شود؛ آنچه در سفر داخلی خریداری می‌شود بیمهٔ حوادث انفرادی یا گروهی است.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "MapPin",
    order: 2,
    fields: [
      peopleCount({
        label: "تعداد نفرات",
        labelEn: "Number of travellers",
        max: 500,
      }),
      durationDays({ label: "مدت سفر", labelEn: "Trip length", max: 90 }),
      startDate({ label: "تاریخ شروع سفر", labelEn: "Departure date" }),
      {
        name: "tripPurpose",
        label: "نوع سفر",
        labelEn: "Trip type",
        type: "select",
        required: false,
        options: [
          { value: "leisure", label: "تفریحی", labelEn: "Leisure" },
          { value: "business", label: "کاری", labelEn: "Business" },
          { value: "tour", label: "تور یا اردو", labelEn: "Tour or camp" },
          { value: "pilgrimage", label: "زیارتی", labelEn: "Pilgrimage" },
        ],
      },
    ],
  },

  {
    slug: "travel-pilgrimage",
    categorySlug: "travel",
    title: "بیمه مسافرت زائرین عتبات",
    titleEn: "Pilgrimage travel insurance",
    summary: "ویژه سفر عتبات عالیات — مکمل بیمه سماح",
    summaryEn:
      "For pilgrimage to Iraq — supplements the compulsory Samah cover",
    description:
      "بیمه زائرین برای سفر به عتبات عالیات در عراق صادر می‌شود و خسارت‌های مالی و جانی در طول سفر را جبران می‌کند. پوشش آن گسترده‌تر از بیمه اجباری سماح است و مواردی مانند بازگشت اضطراری، مفقود شدن مدارک و حوادث تروریستی را نیز شامل می‌شود. توجه کنید که این بیمه‌نامه مکمل سماح است و جایگزین آن نمی‌شود.",
    descriptionEn:
      "Pilgrimage cover is written for travel to the holy sites in Iraq, paying for financial and bodily losses during the journey. It is broader than the compulsory Samah insurance, adding emergency repatriation, lost documents and terrorism cover. It supplements Samah — it does not replace it.",
    coverages: [
      "غرامت فوت (عادی و حادثه‌ای)",
      "نقص عضو و ازکارافتادگی دائم",
      "هزینه‌های درمانی و پزشکی",
      "بازگشت اضطراری به کشور",
      "جبران مفقود شدن مدارک",
      "خسارت بار و وسایل سفر",
      "پوشش حوادث تروریستی",
    ],
    notes: [
      "مدت اعتبار ۸ تا ۳۱ روز.",
      "اشیای قیمتی، تجهیزات پزشکی و اعمال عمدی پوشش داده نمی‌شوند.",
      "مکمل بیمه اجباری سماح است، نه جایگزین آن.",
    ],
    exclusions: [
      "مفقود شدن پول نقد، اوراق بهادار، طلا، لپ‌تاپ، تبلت و تلفن همراه",
      "ویلچر، سمعک، دندان مصنوعی و عینک طبی",
      "خودکشی، صدمات بدنی عمدی و مشارکت در جرم",
      "بیماری‌های دارای سابقهٔ قبلی و عمل‌های زیبایی",
      "مستی و مصرف مواد مخدر یا داروی محرک بدون نسخه",
    ],
    requiredDocuments: [
      "تصویر شناسنامه و کارت ملی",
      "صفحهٔ اول گذرنامه و صفحات دارای مهر مرزی",
      "مستندات پزشکی و بیمارستانی و گواهی پزشک معالج",
      "گزارش حادثه از مقامات ذی‌صلاح",
      "تصویر مانیفست کاروان و کد رهگیری سامانهٔ سماح",
    ],
    premiumFactors: ["تعداد مسافران", "مدت اقامت", "طرح و سقف تعهدات انتخابی"],
    faq: [
      {
        question: "آیا جایگزین بیمهٔ سماح است؟",
        answer:
          "خیر. این بیمه‌نامه تکمیل‌کنندهٔ بیمهٔ سماح است؛ سماح باید جداگانه تهیه شود.",
      },
      {
        question: "فقط برای اربعین است؟",
        answer: "خیر، در تمام ایام سال قابل خریداری است.",
      },
      {
        question: "پوشش از چه زمانی آغاز می‌شود؟",
        answer:
          "حدود ۱۲ ساعت پیش از پرواز، و برای سفرهای زمینی از ساعت صفر بامداد روز حرکت.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Compass",
    order: 3,
    fields: [
      peopleCount({
        label: "تعداد زائران",
        labelEn: "Number of pilgrims",
        max: 200,
      }),
      durationDays({
        label: "مدت اقامت",
        labelEn: "Length of stay",
        min: 8,
        max: 31,
      }),
      startDate({ label: "تاریخ شروع سفر", labelEn: "Departure date" }),
      {
        name: "returnDate",
        label: "تاریخ بازگشت",
        labelEn: "Return date",
        type: "date",
        required: true,
        min: "today",
      },
      {
        name: "travellerDetails",
        label: "مشخصات زائران",
        labelEn: "Traveller details",
        type: "textarea",
        required: true,
        maxLength: 2000,
        help: "برای هر نفر: نام و نام خانوادگی، کد ملی، تاریخ تولد — هر نفر در یک خط.",
        helpEn: "One per line: full name, national ID, date of birth.",
      },
    ],
  },

  {
    slug: "travel-inbound",
    categorySlug: "travel",
    title: "بیمه مسافرتی ورودی به ایران",
    titleEn: "Inbound travel insurance",
    summary: "برای اتباع خارجی که به ایران سفر می‌کنند",
    summaryEn: "For foreign nationals travelling to Iran",
    description:
      "این بیمه‌نامه برای افرادی صادر می‌شود که قصد سفر به ایران را دارند و هزینه‌های درمانی، بستری و خدمات اضطراری را در طول اقامت پوشش می‌دهد. خدماتی مانند انتقال به بیمارستان، بازگشت هوایی، جبران مفقود شدن مدارک و خدمات ترجمه نیز در آن گنجانده شده است. پس از ورود مسافر به کشور، بیمه‌نامه قابل استرداد نیست.",
    descriptionEn:
      "Written for foreign nationals travelling to Iran, covering medical costs, hospitalisation and emergency services during the stay. It also includes hospital transfer, air repatriation, lost-document compensation and translation services. Once the traveller has entered the country the policy is non-refundable.",
    coverages: [
      "انتقال به نزدیک‌ترین بیمارستان",
      "هزینه‌های پزشکی در صورت بیماری یا حادثه",
      "بستری در بیمارستان",
      "حمل‌ونقل هوایی و بازگشت",
      "هزینه‌های از دست دادن مدارک",
      "خدمات قضایی و ترجمه",
    ],
    notes: [
      "مدت اقامت قابل پوشش: ۱ تا ۹۲ روز.",
      "پس از ورود مسافر، بیمه‌نامه غیرقابل استرداد است.",
      "اعلام خسارت باید ظرف ۵ روز انجام شود.",
    ],
    exclusions: [
      "بیماری‌های سابقه‌دار که پیش از شروع پوشش تحت درمان بوده‌اند",
      "جنگ و عملیات نظامی",
      "خودکشی و صدمات عمدی",
      "مسابقات ورزشی حرفه‌ای و فعالیت‌های خطرناک",
      "آلودگی ناشی از تشعشعات هسته‌ای",
      "زایمان در سه ماه پایانی",
      "مصرف مواد مخدر و الکل",
      "ریسک‌های شغلی",
      "اختلالات مادرزادی",
      "واکسیناسیون و بیماری‌های روانی",
    ],
    requiredDocuments: [
      "نام و شمارهٔ بیمه‌نامه و گذرنامه",
      "نشانی و شمارهٔ تماس در ایران",
      "شرح حادثه یا بیماری",
    ],
    premiumFactors: ["سن مسافر", "مدت اقامت در ایران", "سقف تعهدات انتخابی"],
    faq: [
      {
        question: "مدت اعتبار چقدر است؟",
        answer: "از ۱ تا ۹۲ روز، بسته به طرح انتخابی.",
      },
      {
        question: "پس از ورود به ایران قابل ابطال است؟",
        answer:
          "خیر. پس از ورود بیمه‌نامه ابطال نمی‌شود؛ پیش از سفر با کسر مبلغی قابل استرداد است.",
      },
      {
        question: "رسیدگی به خسارت چقدر طول می‌کشد؟",
        answer:
          "حادثه باید حداکثر ظرف پنج روز اعلام شود و رسیدگی معمولاً تا پنج روز کاری انجام می‌شود.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "PlaneLanding",
    order: 4,
    fields: [
      peopleCount({
        label: "تعداد مسافران",
        labelEn: "Number of travellers",
        max: 50,
      }),
      {
        name: "ageBand",
        label: "رده سنی مسافران",
        labelEn: "Traveller age band",
        type: "multiselect",
        required: true,
        minSelected: 1,
        options: TRAVEL_AGE_BANDS,
      },
      durationDays({
        label: "مدت اقامت در ایران",
        labelEn: "Length of stay in Iran",
        max: 92,
      }),
      startDate({ label: "تاریخ ورود", labelEn: "Arrival date" }),
      {
        name: "nationality",
        label: "ملیت مسافران",
        labelEn: "Nationality of travellers",
        type: "text",
        required: false,
        maxLength: 150,
      },
    ],
  },
];
