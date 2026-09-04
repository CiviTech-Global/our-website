import type { ProductDef } from "../types.js";
import {
  birthDate,
  currencyField,
  gender,
  jobRiskGroup,
  nationalId,
  peopleCount,
} from "../fields.js";

export const accidentProducts: ProductDef[] = [
  {
    slug: "accident-individual",
    categorySlug: "accident",
    title: "بیمه حوادث انفرادی",
    titleEn: "Individual accident insurance",
    summary: "پوشش ۲۴ ساعته فوت، نقص عضو و ازکارافتادگی",
    summaryEn: "24-hour cover for death, dismemberment and disability",
    description:
      "بیمه حوادث انفرادی فرد را به صورت شبانه‌روزی در برابر پیامدهای حادثه پوشش می‌دهد: فوت، نقص عضو کلی و جزئی و ازکارافتادگی کامل دائم. پوشش‌های تبعی مانند هزینه‌های درمان، بستری و غرامت روزانه نیز قابل افزودن است. حق بیمه عمدتاً بر مبنای گروه شغلی و سرمایه انتخابی تعیین می‌شود، نه سن.",
    descriptionEn:
      "Individual accident cover protects a person around the clock against the consequences of an accident: death, partial and total dismemberment, and permanent total disability. Ancillary benefits such as treatment costs, hospitalisation and a daily allowance can be added. The premium is driven mainly by occupational class and the chosen sum insured rather than by age.",
    coverages: [
      "فوت ناشی از حادثه",
      "نقص عضو کلی و جزئی",
      "ازکارافتادگی کامل دائم",
    ],
    optionalCoverages: [
      "هزینه‌های درمان ناشی از حادثه",
      "بستری در بیمارستان",
      "غرامت روزانه در ایام مصدومیت",
      "بلایای طبیعی",
      "فعالیت‌های ورزشی پرخطر",
    ],
    notes: [
      "محدوده سنی ۱۲ تا ۷۵ سال.",
      "خودکشی، صدمات عمدی، مصرف مواد مخدر و اعمال غیرقانونی از استثنائات است.",
      "سقف پوشش هزینه پزشکی تا یک میلیارد تومان در سال.",
    ],
    exclusions: [
      "خودکشی یا اقدام به آن",
      "صدمات عمدی با هدف دریافت غرامت",
      "آسیب ناشی از مواد مخدر، الکل و داروهای روان‌گردان",
      "حوادث ناشی از اعمال غیرقانونی",
      "خسارات هسته‌ای، جنگ و آشوب",
      "ورزش‌های حرفه‌ای و مسابقه‌ای",
    ],
    requiredDocuments: [
      "کارت ملی و شناسنامه",
      "اصل یا تصویر بیمه‌نامه",
      "گزارش نیروی انتظامی، در صورت لزوم",
      "گواهی پزشک معالج و مدارک بیمارستان",
      "فاکتورهای درمانی",
      "گواهی فوت، برای خسارت فوت",
    ],
    premiumFactors: [
      "گروه شغلی (پنج طبقه، از کم‌خطر تا پرخطر)",
      "سن بیمه‌شده",
      "بیماری‌های زمینه‌ای",
      "ورزش‌ها و فعالیت‌های پرخطر",
      "سقف پوشش‌های انتخابی",
    ],
    faq: [
      {
        question: "خارج از کشور هم پوشش دارد؟",
        answer:
          "بله. پوشش ۲۴ ساعته است و در داخل و خارج از کشور برقرار می‌ماند.",
      },
      {
        question: "محدودهٔ سنی چیست؟",
        answer: "معمولاً ۱۲ تا ۷۵ سال.",
      },
      {
        question: "مهلت اعلام خسارت چقدر است؟",
        answer: "حداکثر پنج روز از وقوع حادثه.",
      },
      {
        question: "ورزش‌های پرخطر پوشش دارند؟",
        answer:
          "ورزش‌های حرفه‌ای پوشش داده نمی‌شوند، اما برخی ورزش‌های پرخطر مانند اسکی با توافق و حق بیمهٔ اضافی قابل پوشش‌اند.",
      },
      {
        question: "با بیماری زمینه‌ای مثل دیابت می‌توان بیمه شد؟",
        answer: "معمولاً بله، با دریافت حق بیمهٔ بیشتر.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Siren",
    order: 1,
    fields: [
      nationalId({
        help: "کد ملی فرد بیمه‌شده",
        helpEn: "National ID of the insured person",
      }),
      birthDate({
        help: "محدوده سنی مجاز: ۱۲ تا ۷۵ سال",
        helpEn: "Eligible ages: 12 to 75",
      }),
      gender(),
      jobRiskGroup(),
      {
        name: "occupation",
        label: "عنوان شغل",
        labelEn: "Job title",
        type: "text",
        required: true,
        maxLength: 150,
      },
      {
        name: "healthConditions",
        label: "سوابق بیماری یا وضعیت سلامتی خاص",
        labelEn: "Existing health conditions",
        type: "textarea",
        required: false,
        maxLength: 500,
        help: "اگر موردی ندارید خالی بگذارید.",
        helpEn: "Leave blank if none.",
      },
      currencyField(
        "deathSumInsured",
        "سرمایه فوت و نقص عضو",
        "Sum insured for death and dismemberment",
      ),
      currencyField(
        "medicalSumInsured",
        "سقف هزینه‌های پزشکی",
        "Medical expenses limit",
        { required: false },
      ),
      {
        name: "optionalCovers",
        label: "پوشش‌های اختیاری",
        labelEn: "Optional benefits",
        type: "multiselect",
        required: false,
        options: [
          {
            value: "daily-allowance",
            label: "غرامت روزانه",
            labelEn: "Daily allowance",
          },
          {
            value: "hospitalisation",
            label: "بستری در بیمارستان",
            labelEn: "Hospitalisation",
          },
          {
            value: "natural-disaster",
            label: "بلایای طبیعی",
            labelEn: "Natural disasters",
          },
          {
            value: "hazardous-sport",
            label: "فعالیت‌های ورزشی پرخطر",
            labelEn: "Hazardous sports",
          },
        ],
      },
    ],
  },

  {
    slug: "accident-group",
    categorySlug: "accident",
    title: "بیمه حوادث گروهی",
    titleEn: "Group accident insurance",
    summary: "پوشش حوادث برای کارکنان سازمان — با تخفیف تعدادی",
    summaryEn: "Accident cover for a workforce — with volume discounts",
    description:
      "بیمه حوادث گروهی برای سازمان‌هایی است که می‌خواهند کارکنانشان را در برابر حوادث پوشش دهند و شامل غرامت فوت، نقص عضو و هزینه‌های پزشکی است. قیمت بر مبنای تعداد نفرات، دسته‌بندی شغلی و میانگین سنی تعیین می‌شود و بسته به تعداد بیمه‌شدگان بین ۵ تا ۲۵ درصد تخفیف اعمال می‌شود. مدت استاندارد بیمه‌نامه یک سال است.",
    descriptionEn:
      "Group accident cover is for organisations insuring their staff against accidents, paying death benefit, dismemberment and medical costs. It is priced on headcount, occupational class and average age, with volume discounts of 5–25%. The standard term is one year.",
    coverages: [
      "غرامت فوت (۱۰۰٪ سرمایه بیمه)",
      "نقص عضو یا ازکارافتادگی دائم",
      "هزینه‌های پزشکی",
    ],
    notes: [
      "افراد بالای ۷۵ سال از پوشش مستثنی هستند.",
      "فرانشیز ۱۰ درصد بر عهده بیمه‌گزار است.",
      "تخفیف ۵ تا ۲۵ درصد بر اساس تعداد بیمه‌شدگان.",
    ],
    exclusions: [
      "خودکشی یا اقدام به آن",
      "صدمات عمدی بیمه‌شده",
      "مستی و سوءمصرف مواد",
      "اعمال مجرمانهٔ بیمه‌شده",
      "بیماری‌ها و عوارض پیشین مانند دیسک و فتق",
      "فوت ناشی از عمد ذی‌نفع",
      "جنگ، شورش، زلزله و آتشفشان",
      "ورزش‌های خطرناک مانند غواصی، سوارکاری، شکار و پرش با چتر",
    ],
    requiredDocuments: [
      "فهرست بیمه‌شدگان",
      "برای فوت: گواهی فوت، گزارش پزشکی قانونی، گواهی انحصار وراثت و مدارک هویتی وراث",
      "برای نقص عضو: گزارش حادثه، رادیوگرافی و گواهی پزشک معالج",
      "برای هزینهٔ پزشکی: صورتحساب درمانی و نظر پزشک متخصص",
    ],
    premiumFactors: [
      "تعداد نفرات بیمه‌شده",
      "مدت بیمه‌نامه",
      "گروه شغلی",
      "میانگین سنی گروه",
    ],
    faq: [
      {
        question: "حداقل و حداکثر تعداد نفرات چقدر است؟",
        answer: "معمولاً از ۱۰ نفر شروع می‌شود.",
      },
      {
        question: "مهلت اعلام حادثه چقدر است؟",
        answer: "حداکثر ۱۵ روز برای حادثه و ۳۰ روز برای فوت.",
      },
      {
        question: "افراد مسن هم پوشش می‌گیرند؟",
        answer: "افراد بالای ۷۵ سال معمولاً تحت پوشش قرار نمی‌گیرند.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "CORPORATE",
    icon: "UsersRound",
    order: 2,
    fields: [
      peopleCount({
        label: "تعداد نفرات تحت پوشش",
        labelEn: "People to be covered",
        min: 5,
      }),
      {
        name: "averageAge",
        label: "میانگین سنی بیمه‌شدگان",
        labelEn: "Average age of the insured",
        type: "number",
        required: true,
        min: 12,
        max: 75,
        unit: "سال",
        unitEn: "years",
      },
      jobRiskGroup({
        label: "دسته‌بندی شغلی بیمه‌شدگان",
        labelEn: "Occupational class of the insured",
      }),
      {
        name: "termMonths",
        label: "مدت بیمه‌نامه",
        labelEn: "Policy term",
        type: "number",
        required: true,
        min: 1,
        max: 36,
        unit: "ماه",
        unitEn: "months",
        help: "مدت استاندارد ۱۲ ماه است.",
        helpEn: "The standard term is 12 months.",
      },
      currencyField(
        "deathSumInsured",
        "سرمایه فوت هر نفر",
        "Death benefit per person",
      ),
      currencyField(
        "medicalSumInsured",
        "سقف هزینه پزشکی هر نفر",
        "Medical limit per person",
        { required: false },
      ),
    ],
  },
];
