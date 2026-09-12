# Insurance catalog — source research

Fetched 2026-09-03 from azki.com, one page per product. This is the raw input for
the product catalog: description, coverages, and — the part that actually drives
the code — **the fields each product needs before anyone can quote it**.

Azki is a comparison marketplace, not an insurer. We are not one either. Their
field lists are the useful part: they encode what an Iranian insurer actually
asks for. Their marketing copy is not reusable and is not copied here.

Where a page did not state its intake fields (mostly the corporate products,
which are all "submit a request and we call you"), that is recorded as such —
those become callback-first products with a short form, not a guess.

---

## Field-type vocabulary

Derived from the 30 pages below; every product form is built from these.

| type | used for |
|---|---|
| `text` | name, address, free text |
| `national_id` | کد ملی — 10 digits, checksum-validatable |
| `phone` | 09xxxxxxxxx |
| `plate` | Iranian vehicle plate (4 segments) |
| `number` | counts, floors, area, capacity |
| `currency` | تومان amounts — building value, contents value, device price |
| `date` | policy start, birth date, travel dates |
| `select` | single choice from a fixed list |
| `multiselect` | optional add-on coverages |
| `bool` | yes/no |
| `textarea` | notes |

---

## 1. شخص ثالث خودرو
`third-party-auto` · https://www.azki.com/car-insurance/third-party-insurance

Compulsory motor liability. Covers bodily and property damage to third parties,
plus injury to the at-fault driver. Base price is set by بیمه مرکزی and is
identical at every insurer — so the differentiator is service, not price.

**Coverages:** خسارت مالی به اشخاص ثالث · خسارت جانی به اشخاص ثالث (دیه، درمان،
فوت، نقص عضو) · حوادث راننده مقصر · افت قیمت برای خودروی زیر ۱۰ سال

**Fields:** شماره پلاک · کد ملی مالک · نوع و مدل خودرو · سال ساخت ·
سقف تعهدات مالی · سوابق بیمه‌ای (سال‌های عدم خسارت، تغییر مالکیت) ·
روش پرداخت (نقدی/اقساطی)

**Notes:** تخفیف عدم خسارت only transfers to first-degree relatives. Late-renewal
penalty accrues daily up to 365 days. Policies register in سامانه بیمه مرکزی.

## 2. بدنه خودرو
`auto-body` · https://www.azki.com/car-insurance/car-body-insurance

Optional own-damage cover: repairs the vehicle after collision, theft or fire,
whether or not the driver was at fault.

**Main:** تصادف و برخورد · سقوط و واژگونی · آتش‌سوزی و صاعقه · سرقت کلی ·
هزینه نجات و انتقال
**Optional:** نوسانات قیمت · سرقت قطعات · شکست شیشه · بلایای طبیعی ·
خسارت ناشی از جنگ · ایاب و ذهاب · کشیدن میخ · رنگ و مواد شیمیایی

**Fields:** شماره پلاک · کد ملی مالک · ارزش روز خودرو · نحوه پرداخت ·
روش بازدید خودرو

**Notes:** Inspection mandatory except on a claim-free renewal. Instalments
available without cheque or promissory note.

## 3. موتورسیکلت
`motorcycle` · https://www.azki.com/motorcycle-insurance

Compulsory third-party cover for motorcycles. Same-day issue if ordered before 21:00.

**Coverages:** خسارت جانی و مالی اشخاص ثالث · خسارت جانی راننده مقصر · افت قیمت

**Fields:** شماره پلاک موتورسیکلت · کد ملی صاحب پلاک ·
شرکت بیمه‌گر قبلی (اختیاری) · تاریخ شروع و پایان بیمه قبلی (اختیاری)

**Notes:** Requires کارت ملی, کارت موتور, valid licence. Instalments 3–11 months.

## 4. بسته جامع مسکونی
`home-comprehensive` · https://www.azki.com/nano-product/comprehensive-home-insurance

Bundles the three policies a residential building otherwise buys separately —
elevator liability, building-manager liability, and fire — into one contract at
a package discount. Bought by the building manager, cost split across units.

**Coverages:** مسئولیت آسانسور · مسئولیت هیأت مدیره · آتش‌سوزی

**Fields:** مدارک هویتی · کد پستی ساختمان · فرم عقد قرارداد (آنلاین)

## 5. آتش‌سوزی مسکونی
`fire-residential` · https://www.azki.com/property-insurance/fire-insurance

Property cover for a home against fire, explosion and lightning, extendable to
earthquake, flood and theft. Property damage only — bodily injury is excluded.

**Main:** آتش‌سوزی · صاعقه · انفجار
**Optional:** زلزله · طوفان · سیل · ترکیدگی لوله آب · سرقت · جنگ · نوسانات برق

**Fields:** استان و شهر · نوع ملک · تعداد واحد · نوع سازه (بتنی/فلزی/آجری) ·
سن بنا · متراژ · هزینه ساخت هر متر مربع · ارزش اثاثیه ·
مورد بیمه (فقط لوازم / فقط بنا / هر دو)

**Notes:** Some add-ons require an inspection.

## 6. زلزله مسکونی
`earthquake-residential` · https://www.azki.com/property-insurance/earthquake-insurance

Technically an add-on to fire cover, sold standalone. Pays direct earthquake
damage to the structure and contents — not, e.g., looting afterwards.

**Fields:** استان و شهر · مورد بیمه (لوازم/بنا/هر دو) · متراژ ·
نوع سازه و مصالح · ارزش لوازم منزل

**Notes:** Iran is graded into 5 seismic zones, which drives price. Tenants do
not need the owner's permission; the deed is not required at purchase.

## 7. آسانسور
`elevator` · https://www.azki.com/nano-product/elevator

Liability cover for accidents involving a building's lift. Not compulsory;
bought by building management, cost split across units.

**Coverages:** هزینه پزشکی (۵ تا ۴۰ میلیون تومان) · غرامت فوت/دیه ·
غرامت نقص عضو · خسارت مالی (فقط آسانسور باری)

**Fields:** نوع کاربری (تجاری/مسکونی/باربری) · ظرفیت · تعداد طبقات توقف ·
سال ساخت · دارای در داخلی (بله/خیر) · سقف پوشش هزینه پزشکی

**Notes:** Regular servicing is a condition of any claim payment.

## 8. درمان تکمیلی انفرادی / خانواده
`health-supplementary-individual` · https://www.azki.com/personal-insurance/health-insurance

Supplementary health cover layered on top of a base insurer (تأمین اجتماعی /
سلامت), paying treatment costs up to a chosen ceiling.

**Main:** بستری · جراحی تخصصی · پاراکلینیک (سونوگرافی، سی‌تی‌اسکن، MRI) ·
آزمایش · آمبولانس
**Optional:** زایمان · درمان ناباروری · شیمی‌درمانی · ویزیت · دندان‌پزشکی · دارو

**Fields:** نوع بیمه (انفرادی/خانوادگی) · سن بیمه‌شده ·
بیمه‌گر پایه (تأمین اجتماعی/سلامت/سایر/ندارد) · تعداد افراد ·
سقف تعهدات · درصد فرانشیز (۱۰–۳۰٪)

**Notes:** Waiting period 3–12 months on maternity and major surgery. Minimum
age 18. Available without a base insurer at ~18% surcharge.

## 9. درمان تکمیلی شرکتی
`health-supplementary-corporate` · https://www.azki.com/landing/group-health-insurance

Group supplementary health for a company's employees and their families.

**Fields:** page states none — the flow is "register a request, our experts call
you". → **callback-first product.**

**Notes:** Minimum 10 people.

## 10. عمر و سرمایه‌گذاری
`life-investment` · https://www.azki.com/personal-insurance/life-insurance

Long-term contract combining death/illness/disability cover with an investment
account earning guaranteed plus participatory returns.

**Coverages:** فوت به هر علت و فوت حادثه‌ای · بیماری‌های خاص (سکته قلبی، سرطان،
سکته مغزی) · نقص عضو و ازکارافتادگی کامل دائم · اندوخته سرمایه‌گذاری
**Benefits:** وام تا ۹۰٪ اندوخته بدون ضامن · معافیت مالیاتی ·
افزایش سالانه ۵–۳۰٪ · بازخرید در هر زمان

**Fields:** سن بیمه‌گذار · حق بیمه ماهانه · مدت قرارداد (سال) ·
پوشش‌های دلخواه

**Notes:** Entry age up to 50. Term 5–30 years. Age + term must be ≤ 70.
Waiting period 3–6 months on critical illness.

## 11. Corporate hub — عمر گروهی · عمر مانده بدهکار · عمر پروژه‌محور · مسئولیت سایر · باربری (وارداتی / صادراتی / مرهونات) · تمام خطر مهندسی
`corporate-*` · https://www.azki.com/corporate-insurance

One hub page covers all of these. It lists the products but publishes **no
intake fields** — the stated flow is a contact form ("اطلاعات تماس جهت پیگیری"
and "توضیحات") followed by a call from a specialist.

Products named: مسئولیت (کارفرما، حرفه‌ای مهندسان، مشاغل و اصناف) ·
آتش‌سوزی (منازل، اداری/تجاری، صنعتی) · باربری (وارداتی، صادراتی، داخلی، مرسولات) ·
مهندسی (تمام خطر پیمانکاران، نصب، تجهیزات) · درمان تکمیلی گروهی ·
عمر گروهی و حوادث گروهی

→ **All callback-first.** Short form: contact details, organisation, a free-text
brief, and whatever few structured fields we know the underwriter always asks.

## 12. عمر مستمری فوت در اثر حادثه
`accident-pension` · https://www.azki.com/nano-product/accident-pension-insurance

Pays survivors a monthly pension for five years after accidental death. Aimed at
hazardous occupations. Pension size tracks the monthly premium paid.

**Coverages:** مستمری ماهانه بازماندگان (۵ سال) · نقص عضو (اختیاری) ·
هزینه پزشکی ناشی از حادثه (اختیاری)

**Fields:** not published beyond "pick a package, then enter your details".

## 13. طرح‌های عمر و مستمری | شوکا
`life-shuka` · https://www.azki.com/nano-product/life-insurance-shuka

Page returned only the generic Azki landing content; no product-specific fields.
→ treat as a variant of `life-investment` pending confirmation.

## 14. مسئولیت حرفه‌ای پزشکان و پیراپزشکان
`liability-medical` · https://www.azki.com/liability-insurance/medical-insurance

Covers a clinician against financial and bodily-injury claims arising from
professional negligence, error or omission in treating patients.

**Coverages:** دیه فوت · دیه نقص عضو · هزینه‌های پزشکی بیمار

**Fields:** تخصص · شماره نظام پزشکی · سابقه خسارت · سقف تعهدات

**Notes:** Claims must be reported within 5 working days. Insurer's obligation
extends 4 years past policy expiry. Premium varies sharply by specialty risk class.

## 15. مسئولیت مدیران ساختمان
`liability-building-manager` · https://www.azki.com/nano-product/building-manager

Covers the building manager against injury and damage claims from residents and
third parties in the common areas.

**Coverages:** آتش‌سوزی و انفجار (با احراز مسئولیت) · خسارت خودروی ساکنان در
پارکینگ · آسیب ناشی از ریزش نما · آسیب بدنی کارکنان ساختمان

**Fields:** page lists price drivers rather than a form: متراژ کل زیربنا ·
نوع کاربری ساختمان · تعداد پوشش‌های درخواستی · وجود استخر/سونا

**Notes:** Natural disasters excluded. Medical costs covered to ۵۰۰ میلیارد ریال.

## 16. مسئولیت حرفه‌ای مهندسین ناظر
`liability-supervising-engineer` · https://www.azki.com/nano-product/engineering-insurance

Covers the supervising engineer of a construction project against bodily and
property claims from site workers and third parties arising from their negligence.

**Main:** غرامت فوت · غرامت نقص عضو · هزینه پزشکی · خسارت مالی
**Optional:** افزایش خودکار نرخ دیه · تعدد دیات · هزینه اعتراض ·
پرداخت بدون رأی دادگاه

**Fields:** not published. **Deductible:** 10% property, 0% bodily.

## 17. مسافرت خارجی
`travel-outbound` · https://www.azki.com/personal-insurance/travel-insurance

Covers medical and travel mishaps abroad. Mandatory for Schengen visas.

**Coverages:** هزینه پزشکی و بستری · دندان‌پزشکی اضطراری · جبران داروی مفقود ·
هزینه بازگشت (بستری بیش از ۱۰ روز) · اقامت بستگان · مشاوره حقوقی ·
بار و مدارک و تأخیر پرواز

**Fields:** کشور/منطقه مقصد · مدت سفر (روز) · سن مسافر (≤۱۲ / ۱۳–۶۵ / ۶۶+) ·
تعداد مسافران · سقف تعهدات

**Notes:** Cover starts at the passport exit stamp. Max 92 consecutive days.
Trip must originate in Iran.

## 18. مسافرت داخلی
`travel-domestic` · https://www.azki.com/nano-product/internal-travel-insurance

Accident cover for travel inside Iran.

**Coverages:** غرامت فوت · نقص عضو · ازکارافتادگی دائم و موقت · هزینه پزشکی

**Fields:** تعداد نفرات · مدت زمان سفر

## 19. مسافرت زائرین
`travel-pilgrimage` · https://www.azki.com/nano-product/pilgrims-insurance

Travel cover for pilgrims to عتبات عالیات in Iraq. Required for lawful exit.

**Coverages:** غرامت فوت (عادی و حادثه‌ای) · نقص عضو و ازکارافتادگی دائم ·
هزینه درمان · بازگشت اضطراری · مفقود شدن مدارک · خسارت بار ·
حوادث تروریستی

**Fields:** تعداد مسافران · مدت اقامت (۸ تا ۳۰ روز) · نام و نام خانوادگی ·
کد ملی · تاریخ تولد · تاریخ شروع و پایان سفر

**Notes:** Supplements the compulsory سماح insurance — does not replace it.

## 20. مسافرت ورودی به ایران
`travel-inbound` · https://www.azki.com/nano-product/incoming-travel-insurance

Medical and emergency cover for foreign visitors to Iran.

**Coverages:** انتقال به بیمارستان · هزینه پزشکی · بستری · بازگشت هوایی ·
مفقود شدن مدارک · خدمات قضایی و ترجمه

**Fields:** سن مسافر · مدت اقامت (۱ تا ۹۲ روز)

**Notes:** Non-refundable once the traveller has entered. Claims within 5 days.

## 21. کارفرما در قبال کارکنان — ساختمانی
`employer-liability-construction` · https://www.azki.com/nano-product/construction-employer-insurance

Employer's liability for bodily injury to construction workers on site.

**Coverages:** سقوط از ارتفاع · افتادن مصالح · خفگی در چاه · صدمات پی‌کنی ·
صدمات بالابر، جرثقیل و ماشین‌آلات

**Fields:** page describes a فرم پیشنهاد rather than a web form:
مشخصات متقاضی · اطلاعات محل و مدت بیمه‌نامه · تعهدات درخواستی · سوابق بیمه‌ای

## 22. کارفرما در قبال کارکنان — غیر ساختمانی
`employer-liability-general` · https://www.azki.com/nano-product/non-construction-employer-insurance

Same cover for service, commercial and industrial workplaces.

**Main:** فوت و نقص عضو · هزینه پزشکی · دیات و دیات غیرمسری ·
مطالبات تبصره ۱ ماده ۶۶ قانون تأمین اجتماعی
**Optional:** هزینه پزشکی · افزایش ریالی دیه تا یک سال · مأموریت خارج از کارگاه

**Fields:** not published. Employee names must be filed **before** any loss.
High-risk sites require an inspection.

## 23. آتش‌سوزی اداری و تجاری
`fire-commercial` · https://www.azki.com/nano-product/business-fire

Fire cover for non-industrial premises — offices, shops, clinics, schools.

**Coverages:** آتش‌سوزی · انفجار · صاعقه · ساختمان · تأسیسات و ماشین‌آلات ·
مواد اولیه و کالای موجود

**Fields:** not published. Price driven by region, property type, and proximity
to fault lines.

## 24. آتش‌سوزی صنعتی
`fire-industrial` · https://www.azki.com/nano-product/industrial-fire-insurance

Fire cover for production units, factories and workshops — building, machinery,
installations and stock.

**Main:** آتش‌سوزی · صاعقه · انفجار
**Optional:** زلزله و رانش زمین · سیل و طغیان · طوفان · نشت گاز ·
مسئولیت مالی در قبال همسایگان

**Fields:** not published — فرم پیشنهاد plus کارت ملی.

## 25. حوادث انفرادی
`accident-individual` · https://www.azki.com/nano-product/individual-event

24-hour personal accident cover: death, dismemberment, permanent disability.

**Main:** فوت · نقص عضو (کلی و جزئی) · ازکارافتادگی کامل دائم
**Ancillary:** هزینه درمان · بستری · غرامت روزانه
**Optional:** بلایای طبیعی · فعالیت‌های پرخطر

**Fields:** نام و نام خانوادگی · کد ملی · جنسیت · تاریخ تولد (۱۲–۷۵ سال) ·
شغل / گروه ریسک (۵ گروه) · وضعیت سلامتی · تلفن همراه · آدرس ·
سقف پوشش‌ها (فوت/نقص عضو/هزینه پزشکی)

**Notes:** Excludes suicide, self-harm, narcotics, unlawful acts. Medical cover
to ۱ میلیارد تومان/year.

## 26. حوادث گروهی
`accident-group` · https://www.azki.com/nano-product/group-events

Group personal accident cover for a company's staff.

**Coverages:** غرامت فوت (۱۰۰٪ سرمایه) · نقص عضو / ازکارافتادگی دائم ·
هزینه پزشکی

**Fields:** تعداد نفرات · مدت بیمه · دسته‌بندی شغلی · میانگین سنی

**Notes:** Excludes over-75s. 10% deductible. Volume discounts 5–25%.

## 27. موبایل
`mobile-device` · https://www.azki.com/mobile-insurance

Cover for a phone against theft, screen breakage, liquid damage and physical harm.

**Coverages:** سرقت با شکست حرز · ضربه و شکستگی صفحه‌نمایش · آب‌خوردگی ·
نوسانات برق · حوادث غیرمترقبه

**Fields:** برند · مدل · ارزش روز گوشی
(IMEI and purchase date come later, at verification and claim time.)

**Notes:** 10-day waiting period. Claims within 48–72 hours. Deductible 20–40%.
One claim per annual policy.

---

## What this means for the build

**Two shapes of product, not one.**

*Self-serve* products publish a real field list — enough to route a request to an
underwriter without a phone call first. These get a full multi-step form:
`third-party-auto`, `auto-body`, `motorcycle`, `fire-residential`,
`earthquake-residential`, `elevator`, `health-supplementary-individual`,
**Self-serve (17)** — the source publishes real intake fields, so the product
gets a full multi-step form: `third-party-auto`, `auto-body`, `motorcycle`,
`fire-residential`, `earthquake-residential`, `elevator`,
`health-supplementary-individual`, `life-investment`, `accident-individual`,
`accident-group`, `travel-outbound`, `travel-domestic`, `travel-pilgrimage`,
`travel-inbound`, `liability-medical`, `liability-building-manager`,
`mobile-device`.

**Callback-first (17)** — the source publishes no intake fields, because in
reality an underwriter prices these by hand. Forcing a fake twelve-field form
onto them would collect data nobody uses and lose the applicant halfway. They
get contact details, organisation, a short structured brief and a scheduled
call: `cargo-import`, `cargo-export`, `cargo-bank`, `engineering-all-risk`,
`life-group`, `life-credit`, `life-project`, `life-shuka`, `liability-other`,
`health-supplementary-corporate`, `fire-commercial`, `fire-industrial`,
`employer-liability-construction`, `employer-liability-general`,
`liability-supervising-engineer`, `accident-pension`, `home-comprehensive`.

The distinction is not cosmetic — it is the main thing the data model has to
express, and it is why a single `Lead` table with fixed columns cannot survive
this refactor.

**Recurring fields across products** (define once, reuse): کد ملی، شماره تماس،
نام و نام خانوادگی، تاریخ تولد، استان و شهر، متراژ، ارزش، تعداد نفرات،
مدت (روز/سال)، سقف تعهدات، درصد فرانشیز، سوابق بیمه‌ای.


---

## Second pass — 2026-09-04

Every source page was fetched again, asking for far more than the first pass
took: exclusions, required documents, what moves the premium, and the questions
people actually ask. Four new fields carry it — `exclusions`,
`requiredDocuments`, `premiumFactors` and `faq` — and the product page renders
each as its own section.

The exclusion list earns its place more than any of the others. Coverages
describe only the good half of a policy; the exclusions are where
disappointment lives, and someone who meets one at claim time meets it in the
worst possible circumstances. Putting both lists on the same page, in the same
weight of type, is the honest way to present a product we are asking people to
apply for.

`premiumFactors` is the substitute for a price. We quote nothing on this site,
so rather than leave the money question unanswered, each product lists the
variables a specialist will actually ask about.

**24 of 34 products** carry the new detail. The other ten do not, and that is a
finding rather than an omission:

- `life-shuka` — the source page now returns 404. The product's existing
  description stands; nothing was invented to replace what is gone.
- `cargo-import`, `cargo-export`, `cargo-bank`, `engineering-all-risk`,
  `life-group`, `life-credit`, `life-project`, `liability-other` — all eight
  live behind one corporate hub page that is a bare list of product names with
  no coverage, exclusion or documentation detail on it at all.
- `accident-pension` — the page carries two sentences of substance.

For these, a specialist on the call is genuinely the source of truth, which is
also why every one of them is `CALLBACK`. If detail is wanted on the page, it
has to come from the underwriter, not from a fetch.

**A note on sourcing.** These pages are where the product facts were checked,
and nothing more. No wording, framing or branding from them appears in the
catalog: the Persian copy is written from the facts, names no insurer or
comparison site, and the `sourceUrl` column that once carried these links was
dropped from the database (migration
`20260904080000_drop_product_source_url`). Provenance lives here, in an
internal document, which is the right place for it.


## Third pass — key facts and the claim procedure

Two more fields, aimed at the two moments that matter either side of a policy.

`keyFacts` is the spec strip at the top of the product page: compulsory or
not, policy term, waiting period, excess, how long you have to report a claim,
age range. These are the numbers people scan for before reading a word of
prose, and in a paragraph they get missed. 24 products carry one.

`claimSteps` is what to do after something goes wrong, in order. A policy is
bought once and claimed on under stress; putting the procedure on the product
page means it is not in a PDF nobody opens until the worst day. 20 products
carry one — the four without are those whose source described a product but
never a claim process (`fire-commercial`, `travel-domestic`,
`health-supplementary-corporate`, `home-comprehensive`).

Where a source gave no figure, the row is simply absent. A spec table that
guesses is worse than a short spec table, because it is read as fact.

**The ten thin products did not improve, and now we know why.** The source has
no dedicated pages for them at all: its own corporate hub links out to third
party, own-damage, motorcycle, health, fire, travel, life and medical liability
— and nothing else. Cargo, engineering all-risk, group life and credit life are
named on that page and nowhere linked. There is no deeper source to fetch, so
those products stay on the underwriter, which is exactly what `CALLBACK`
already encodes.
