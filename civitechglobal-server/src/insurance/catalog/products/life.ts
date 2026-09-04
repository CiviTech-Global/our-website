import type { ProductDef } from "../types.js";
import { age, currencyField, peopleCount } from "../fields.js";

const LIFE_COVERS = [
  { value: "death-any", label: "فوت به هر علت", labelEn: "Death by any cause" },
  {
    value: "death-accident",
    label: "فوت بر اثر حادثه",
    labelEn: "Accidental death",
  },
  {
    value: "critical-illness",
    label: "بیماری‌های خاص",
    labelEn: "Critical illness",
  },
  {
    value: "disability",
    label: "نقص عضو و ازکارافتادگی",
    labelEn: "Disability",
  },
  { value: "medical", label: "هزینه‌های پزشکی", labelEn: "Medical expenses" },
];

export const lifeProducts: ProductDef[] = [
  {
    slug: "life-investment",
    categorySlug: "life",
    title: "بیمه عمر و سرمایه‌گذاری",
    titleEn: "Life and investment insurance",
    summary: "پوشش فوت و بیماری، همراه با اندوخته سرمایه‌گذاری",
    summaryEn: "Death and illness cover, with a savings account attached",
    description:
      "بیمه عمر و سرمایه‌گذاری قراردادی بلندمدت است که با پرداخت حق بیمه ماهانه، سه‌ماهه یا سالانه، هم پوشش مالی در برابر فوت، بیماری‌های خاص و ازکارافتادگی فراهم می‌کند و هم اندوخته‌ای با سود تضمینی و مشارکتی می‌سازد. از این اندوخته می‌توان تا ۹۰ درصد وام بدون ضامن گرفت و سرمایه و سود آن از مالیات معاف است. سن ورود تا ۵۰ سالگی و مدت قرارداد بین ۵ تا ۳۰ سال است، به شرطی که مجموع سن و مدت از ۷۰ بیشتر نشود.",
    descriptionEn:
      "A long-term contract combining cover against death, critical illness and disability with a savings account earning a guaranteed plus participatory return. Up to 90% of the accumulated fund can be borrowed against without a guarantor, and both capital and returns are tax-exempt. Entry age runs to 50 and terms from 5 to 30 years, provided age plus term does not exceed 70.",
    coverages: [
      "فوت به هر علت و فوت حادثه‌ای",
      "بیماری‌های خاص (سکته قلبی، سرطان، سکته مغزی)",
      "نقص عضو و ازکارافتادگی کامل دائم",
      "اندوخته سرمایه‌گذاری با سود تضمینی و مشارکتی",
    ],
    optionalCoverages: [
      "وام تا ۹۰٪ اندوخته بدون ضامن",
      "معافیت مالیاتی سرمایه و سود",
      "افزایش سالانه ۵ تا ۳۰ درصد پوشش",
      "بازخرید در هر زمان",
    ],
    notes: [
      "سن ورود: از بدو تولد تا ۵۰ سالگی.",
      "مدت قرارداد ۵ تا ۳۰ سال؛ مجموع سن و مدت قرارداد نباید از ۷۰ بیشتر شود.",
      "برخی پوشش‌ها مانند بیماری‌های خاص دوره انتظار ۳ تا ۶ ماهه دارند.",
    ],
    exclusions: [
      "خودکشی در دورهٔ انتظار، معمولاً دو سال نخست",
      "خسارت ناشی از مصرف مواد مخدر، الکل و روان‌گردان",
      "ارتکاب یا مشارکت در جرم",
      "فوت عمدی به دست ذی‌نفعان",
      "فعالیت‌های پرخطر اعلام‌نشده",
      "شرکت در جنگ یا شورش",
      "بیماری‌های از پیش موجود که افشا نشده‌اند",
    ],
    requiredDocuments: [
      "فرم پیشنهاد بیمه‌نامه",
      "کارت ملی و شناسنامه",
      "مدارک پزشکی، در صورت نیاز",
      "مشخصات ذی‌نفعان",
    ],
    premiumFactors: [
      "سن بیمه‌شده",
      "وضعیت سلامت و سوابق پزشکی",
      "سرمایهٔ فوت انتخابی",
      "پوشش‌های اضافی",
      "مدت قرارداد",
      "ضریب افزایش سالانهٔ حق بیمه",
    ],
    faq: [
      {
        question: "می‌توان از اندوخته وام گرفت؟",
        answer:
          "بله. پس از گذشت مدتی، تا حدود ۹۰ درصد ارزش بازخریدی اندوخته و بدون ضامن، با بازپرداخت تا ۳۶ قسط.",
      },
      {
        question: "سرمایهٔ بیمه‌نامه مالیات دارد؟",
        answer:
          "سرمایهٔ فوت و اندوخته از مالیات بر درآمد و مالیات بر ارث معاف است.",
      },
      {
        question: "محدودهٔ سنی و مدت قرارداد چیست؟",
        answer:
          "معمولاً تا ۵۰ سالگی، به شرطی که مجموع سن بیمه‌شده و مدت قرارداد از ۷۰ سال بیشتر نشود. مدت قرارداد ۵ تا ۳۰ سال است.",
      },
      {
        question: "می‌توان زودتر بازخرید کرد؟",
        answer:
          "بله، بازخرید اندوخته در هر زمان از مدت قرارداد امکان‌پذیر است.",
      },
    ],
    intake: "SELF_SERVE",
    audience: "INDIVIDUAL",
    icon: "Sprout",
    order: 1,
    fields: [
      age({
        label: "سن بیمه‌گذار",
        labelEn: "Age of the policyholder",
        max: 50,
      }),
      currencyField("monthlyPremium", "حق بیمه ماهانه", "Monthly premium", {
        min: 200_000,
        help: "مبلغی که ماهانه می‌توانید کنار بگذارید — بیشترین اثر را بر اندوخته نهایی دارد.",
        helpEn:
          "What you can set aside each month — the single biggest driver of the final fund.",
      }),
      {
        name: "termYears",
        label: "مدت قرارداد",
        labelEn: "Contract term",
        type: "number",
        required: true,
        min: 5,
        max: 30,
        unit: "سال",
        unitEn: "years",
        help: "مجموع سن شما و مدت قرارداد نباید از ۷۰ بیشتر شود.",
        helpEn: "Your age plus the term must not exceed 70.",
      },
      {
        name: "covers",
        label: "پوشش‌های مورد نظر",
        labelEn: "Cover options",
        type: "multiselect",
        required: true,
        minSelected: 1,
        options: LIFE_COVERS,
      },
      {
        name: "paymentFrequency",
        label: "دوره پرداخت",
        labelEn: "Payment frequency",
        type: "select",
        required: true,
        options: [
          { value: "monthly", label: "ماهانه", labelEn: "Monthly" },
          { value: "quarterly", label: "سه‌ماهه", labelEn: "Quarterly" },
          { value: "yearly", label: "سالانه", labelEn: "Annually" },
        ],
      },
    ],
  },

  {
    slug: "life-shuka",
    categorySlug: "life",
    title: "طرح‌های عمر و مستمری شوکا",
    titleEn: "Shuka life and pension plans",
    summary: "طرح عمر با تمرکز بر مستمری بازنشستگی",
    summaryEn: "A life plan built around a retirement income",
    description:
      "شوکا مجموعه‌ای از طرح‌های عمر و مستمری است که به جای پرداخت یکجای سرمایه، بر تأمین درآمد دوره‌ای در سال‌های بازنشستگی تمرکز دارد. ساختار طرح‌ها بسته به سن ورود، مدت پرداخت و مستمری هدف تنظیم می‌شود. چون طراحی هر طرح به شرایط فردی وابسته است، ابتدا کارشناس ما گزینه‌ها را با شما مرور می‌کند.",
    descriptionEn:
      "Shuka is a family of life-and-pension plans that focus on providing periodic income in retirement rather than a lump sum. The structure is set by entry age, contribution period and the target pension. Because each plan is shaped around individual circumstances, a specialist reviews the options with you first.",
    coverages: ["مستمری دوره‌ای بازنشستگی", "پوشش فوت", "اندوخته سرمایه‌گذاری"],
    notes: ["ساختار طرح بر اساس سن ورود و مستمری هدف تنظیم می‌شود."],
    intake: "CALLBACK",
    audience: "INDIVIDUAL",
    icon: "PiggyBank",
    order: 2,
    fields: [
      age({ label: "سن بیمه‌گذار", labelEn: "Age of the policyholder" }),
      currencyField(
        "monthlyPremium",
        "حق بیمه ماهانه مورد نظر",
        "Intended monthly premium",
        { required: false },
      ),
      currencyField(
        "targetPension",
        "مستمری ماهانه هدف",
        "Target monthly pension",
        {
          required: false,
          help: "اگر رقم مشخصی در ذهن دارید.",
          helpEn: "If you have a figure in mind.",
        },
      ),
    ],
  },

  {
    slug: "accident-pension",
    categorySlug: "life",
    title: "بیمه عمر مستمری فوت در اثر حادثه",
    titleEn: "Accidental death pension",
    summary: "مستمری ماهانه پنج‌ساله برای بازماندگان",
    summaryEn: "A five-year monthly income for survivors",
    description:
      "این طرح برای کسانی طراحی شده که شغل پرخطری دارند یا نگران تأمین مالی بازماندگانشان هستند. در صورت فوت بر اثر حادثه، بازماندگان به مدت پنج سال مستمری ماهانه دریافت می‌کنند. مبلغ مستمری مستقیماً به حق بیمه ماهانه‌ای که پرداخت می‌شود بستگی دارد.",
    descriptionEn:
      "Aimed at people in hazardous occupations or anyone concerned about leaving dependants without income. If death results from an accident, survivors receive a monthly pension for five years, sized directly by the monthly premium paid.",
    coverages: ["مستمری ماهانه بازماندگان به مدت ۵ سال"],
    optionalCoverages: ["نقص عضو", "هزینه‌های پزشکی ناشی از حادثه"],
    intake: "CALLBACK",
    audience: "INDIVIDUAL",
    icon: "Umbrella",
    order: 3,
    fields: [
      age(),
      {
        name: "occupation",
        label: "شغل",
        labelEn: "Occupation",
        type: "text",
        required: true,
        maxLength: 150,
        help: "ریسک شغلی بیشترین اثر را بر حق بیمه این طرح دارد.",
        helpEn:
          "Occupational risk is the largest factor in this plan’s premium.",
      },
      currencyField(
        "targetPension",
        "مستمری ماهانه مورد نظر بازماندگان",
        "Intended monthly pension for survivors",
        {
          required: false,
        },
      ),
      {
        name: "dependants",
        label: "تعداد افراد تحت تکفل",
        labelEn: "Number of dependants",
        type: "number",
        required: false,
        min: 0,
        max: 20,
        unit: "نفر",
        unitEn: "people",
      },
    ],
  },

  {
    slug: "life-group",
    categorySlug: "life",
    title: "بیمه عمر گروهی",
    titleEn: "Group life insurance",
    summary: "پوشش عمر برای کارکنان یک سازمان",
    summaryEn: "Life cover for a company workforce",
    description:
      "بیمه عمر گروهی پوشش فوت و ازکارافتادگی را برای کارکنان یک سازمان تحت یک قرارداد واحد فراهم می‌کند و از خرید انفرادی به مراتب ارزان‌تر تمام می‌شود. سرمایه بیمه معمولاً بر مبنای مضربی از حقوق یا رقم ثابتی برای همه کارکنان تعیین می‌شود. نرخ نهایی به ترکیب سنی، دسته‌بندی شغلی و تعداد نفرات بستگی دارد.",
    descriptionEn:
      "Group life provides death and disability cover for a company workforce under a single contract, at a fraction of what individual policies would cost. The sum insured is usually set as a multiple of salary or a flat figure for everyone. The final rate depends on the age mix, occupational classes and headcount.",
    coverages: [
      "غرامت فوت",
      "ازکارافتادگی دائم",
      "امکان افزودن پوشش بیماری‌های خاص",
    ],
    intake: "CALLBACK",
    audience: "CORPORATE",
    icon: "Users",
    order: 4,
    fields: [
      peopleCount({
        label: "تعداد کارکنان",
        labelEn: "Number of employees",
        min: 5,
      }),
      {
        name: "averageAge",
        label: "میانگین سنی کارکنان",
        labelEn: "Average age of employees",
        type: "number",
        required: true,
        min: 18,
        max: 75,
        unit: "سال",
        unitEn: "years",
      },
      {
        name: "industry",
        label: "حوزه فعالیت سازمان",
        labelEn: "Industry",
        type: "text",
        required: true,
        maxLength: 150,
      },
      currencyField(
        "sumInsuredPerPerson",
        "سرمایه فوت هر نفر",
        "Sum insured per person",
        { required: false },
      ),
    ],
  },

  {
    slug: "life-credit",
    categorySlug: "life",
    title: "بیمه عمر مانده بدهکار",
    titleEn: "Credit life insurance",
    summary: "تسویه مانده تسهیلات در صورت فوت وام‌گیرنده",
    summaryEn: "Settles the outstanding loan balance if the borrower dies",
    description:
      "بیمه عمر مانده بدهکار برای پوشش تسهیلات بانکی طراحی شده است: اگر وام‌گیرنده در طول دوره بازپرداخت فوت کند، شرکت بیمه مانده بدهی را به بانک پرداخت می‌کند و بازماندگان با تعهد باقی‌مانده روبه‌رو نمی‌شوند. سرمایه بیمه با کاهش مانده وام به مرور کم می‌شود و به همین دلیل حق بیمه آن از عمر معمولی کمتر است. بانک‌ها اغلب این بیمه‌نامه را شرط پرداخت تسهیلات بلندمدت قرار می‌دهند.",
    descriptionEn:
      "Credit life is written against a bank facility: if the borrower dies during the repayment period, the insurer settles the outstanding balance with the bank and the family is not left with the debt. The sum insured falls as the loan amortises, which is why it costs less than ordinary life cover. Banks frequently require it as a condition of long-term lending.",
    coverages: [
      "تسویه مانده تسهیلات در صورت فوت",
      "امکان افزودن پوشش ازکارافتادگی",
    ],
    intake: "CALLBACK",
    audience: "CORPORATE",
    icon: "Landmark",
    order: 5,
    fields: [
      currencyField("loanAmount", "مبلغ تسهیلات", "Loan amount"),
      {
        name: "loanTermMonths",
        label: "مدت بازپرداخت",
        labelEn: "Repayment term",
        type: "number",
        required: true,
        min: 6,
        max: 360,
        unit: "ماه",
        unitEn: "months",
      },
      {
        name: "bankName",
        label: "نام بانک یا مؤسسه",
        labelEn: "Bank or institution",
        type: "text",
        required: false,
        maxLength: 100,
      },
      age({ label: "سن وام‌گیرنده", labelEn: "Age of the borrower" }),
    ],
  },

  {
    slug: "life-project",
    categorySlug: "life",
    title: "بیمه عمر پروژه‌محور",
    titleEn: "Project-based life insurance",
    summary: "پوشش عمر برای نیروهای یک پروژه مشخص، محدود به مدت آن",
    summaryEn: "Life cover for the workforce of one project, for its duration",
    description:
      "در پروژه‌های پیمانکاری، نیروی انسانی برای مدت مشخصی به کار گرفته می‌شود و خرید بیمه عمر سالانه برای آن‌ها منطقی نیست. بیمه عمر پروژه‌محور پوشش را به بازه زمانی پروژه محدود می‌کند و حق بیمه را متناسب با همان مدت تعیین می‌کند. این طرح معمولاً در کنار بیمه مسئولیت کارفرما خریداری می‌شود.",
    descriptionEn:
      "On contracting projects the workforce is engaged for a fixed period, and buying annual life cover for them makes little sense. Project-based life limits the cover to the project window and prices it for that period. It is usually bought alongside employer liability cover.",
    coverages: ["غرامت فوت در طول پروژه", "ازکارافتادگی دائم"],
    intake: "CALLBACK",
    audience: "CORPORATE",
    icon: "HardHat",
    order: 6,
    fields: [
      {
        name: "projectName",
        label: "عنوان پروژه",
        labelEn: "Project name",
        type: "text",
        required: true,
        maxLength: 200,
      },
      peopleCount({
        label: "تعداد نیروهای پروژه",
        labelEn: "Project headcount",
      }),
      {
        name: "projectMonths",
        label: "مدت پروژه",
        labelEn: "Project duration",
        type: "number",
        required: true,
        min: 1,
        max: 120,
        unit: "ماه",
        unitEn: "months",
      },
      currencyField(
        "sumInsuredPerPerson",
        "سرمایه فوت هر نفر",
        "Sum insured per person",
        { required: false },
      ),
    ],
  },
];
