/**
 * The marketplace's two category lists, as data.
 *
 * BUSINESS CATEGORIES (اصناف) say what kind of business a shop is: a barber, a
 * mechanic, a bookshop. They follow how Iranian guilds are organised — the
 * four guild sectors (distribution, services, production, technical services)
 * and the unions under them — regrouped by what a buyer is looking for rather
 * than by which union collects the dues, so "everything for a car" sits
 * together whether it is sold or repaired.
 *
 * LISTING CATEGORIES say what is being offered: a coat, a haircut. Two
 * branches, products and services, two levels deep, the depth the category
 * service enforces.
 *
 * Both are seeded by slug and never overwritten: the seed creates what is
 * missing and leaves anything staff have renamed, reordered or switched off
 * exactly as they left it. Removing an entry here therefore removes nothing
 * from the database — retire it from the admin desk instead.
 *
 * Slugs are permanent identifiers, so they are ASCII and never translated.
 * The names are Persian; they are what staff and buyers see.
 */

export interface TaxonomyNode {
  slug: string;
  name: string;
  children?: Array<{ slug: string; name: string }>;
}

export interface ListingTaxonomyNode extends TaxonomyNode {
  kind: 'PRODUCT' | 'SERVICE';
}

// ---------------------------------------------------------------------------
// Business categories (اصناف)
// ---------------------------------------------------------------------------

export const BUSINESS_CATEGORIES: TaxonomyNode[] = [
  {
    slug: 'grocery',
    name: 'مواد غذایی و خواربار',
    children: [
      { slug: 'supermarket', name: 'سوپرمارکت و خواربارفروشی' },
      { slug: 'chain-store', name: 'فروشگاه زنجیره‌ای' },
      { slug: 'greengrocer', name: 'میوه و تره‌بار' },
      { slug: 'dairy', name: 'لبنیات' },
      { slug: 'butcher', name: 'قصابی و فرآورده‌های گوشتی' },
      { slug: 'poultry-fish', name: 'مرغ و ماهی' },
      { slug: 'bakery', name: 'نانوایی' },
      { slug: 'confectionery', name: 'شیرینی‌فروشی و قنادی' },
      { slug: 'nuts-dried-fruit', name: 'آجیل و خشکبار' },
      { slug: 'herbal-shop', name: 'عطاری و گیاهان دارویی' },
      { slug: 'tea-coffee-shop', name: 'چای، قهوه و ادویه' },
      { slug: 'organic-food', name: 'محصولات ارگانیک و محلی' },
    ],
  },
  {
    slug: 'food-service',
    name: 'رستوران و پذیرایی',
    children: [
      { slug: 'restaurant', name: 'رستوران' },
      { slug: 'fast-food', name: 'فست‌فود و ساندویچی' },
      { slug: 'cafe', name: 'کافه و کافی‌شاپ' },
      { slug: 'traditional-teahouse', name: 'سفره‌خانه و قهوه‌خانهٔ سنتی' },
      { slug: 'juice-ice-cream', name: 'آبمیوه و بستنی' },
      { slug: 'kebab-dizi', name: 'کبابی و دیزی‌سرا' },
      { slug: 'catering', name: 'تهیهٔ غذا و کترینگ' },
      { slug: 'banquet-hall', name: 'تالار پذیرایی' },
    ],
  },
  {
    slug: 'apparel',
    name: 'پوشاک و منسوجات',
    children: [
      { slug: 'menswear', name: 'پوشاک مردانه' },
      { slug: 'womenswear', name: 'پوشاک زنانه' },
      { slug: 'kidswear', name: 'پوشاک کودک و نوزاد' },
      { slug: 'shoes-bags', name: 'کیف و کفش' },
      { slug: 'sportswear', name: 'پوشاک ورزشی' },
      { slug: 'formalwear', name: 'لباس مجلسی و عروس' },
      { slug: 'fabric', name: 'پارچه‌فروشی' },
      { slug: 'haberdashery', name: 'خرازی و لوازم خیاطی' },
      { slug: 'hijab', name: 'چادر، روسری و شال' },
    ],
  },
  {
    slug: 'beauty-health-retail',
    name: 'آرایشی، بهداشتی و دارویی',
    children: [
      { slug: 'cosmetics', name: 'لوازم آرایشی و بهداشتی' },
      { slug: 'perfume', name: 'عطر و ادکلن' },
      { slug: 'pharmacy', name: 'داروخانه' },
      { slug: 'optician', name: 'عینک‌فروشی' },
      { slug: 'medical-supplies', name: 'تجهیزات پزشکی' },
    ],
  },
  {
    slug: 'home-furniture',
    name: 'خانه، مبلمان و لوازم خانگی',
    children: [
      { slug: 'furniture', name: 'مبلمان' },
      { slug: 'carpet', name: 'فرش و گلیم' },
      { slug: 'curtains', name: 'پرده و پارچهٔ مبلی' },
      { slug: 'bedding', name: 'سرویس خواب و کالای خواب' },
      { slug: 'home-appliances', name: 'لوازم خانگی' },
      { slug: 'kitchenware', name: 'ظروف و لوازم آشپزخانه' },
      { slug: 'home-decor', name: 'دکوراسیون و لوازم تزئینی' },
      { slug: 'lighting', name: 'روشنایی و لوستر' },
    ],
  },
  {
    slug: 'electronics',
    name: 'دیجیتال و الکترونیک',
    children: [
      { slug: 'mobile-shop', name: 'موبایل و لوازم جانبی' },
      { slug: 'computer-shop', name: 'رایانه و لپ‌تاپ' },
      { slug: 'audio-video', name: 'صوتی و تصویری' },
      { slug: 'camera-shop', name: 'دوربین و تجهیزات عکاسی' },
      { slug: 'gaming', name: 'کنسول و بازی' },
      { slug: 'security-systems', name: 'دوربین مداربسته و دزدگیر' },
    ],
  },
  {
    slug: 'building-hardware',
    name: 'ساختمان، ابزار و یراق',
    children: [
      { slug: 'building-materials', name: 'مصالح ساختمانی' },
      { slug: 'hardware-tools', name: 'ابزار و یراق‌آلات' },
      { slug: 'paint-shop', name: 'رنگ و ابزار نقاشی' },
      { slug: 'plumbing-supplies', name: 'لوله، اتصالات و شیرآلات' },
      { slug: 'tiles', name: 'کاشی، سرامیک و سنگ' },
      { slug: 'electrical-supplies', name: 'لوازم برقی ساختمان' },
      { slug: 'doors-windows', name: 'درب، پنجره و کابینت' },
      { slug: 'glass-mirror', name: 'شیشه و آینه' },
      { slug: 'heating-cooling', name: 'تأسیسات سرمایشی و گرمایشی' },
    ],
  },
  {
    slug: 'automotive',
    name: 'خودرو و موتورسیکلت',
    children: [
      { slug: 'car-dealer', name: 'نمایشگاه خودرو' },
      { slug: 'car-parts', name: 'لوازم یدکی خودرو' },
      { slug: 'tyres', name: 'لاستیک و رینگ' },
      { slug: 'car-accessories', name: 'لوازم جانبی و تزئینی خودرو' },
      { slug: 'motorcycle', name: 'موتورسیکلت و لوازم' },
      { slug: 'bicycle', name: 'دوچرخه و لوازم' },
      { slug: 'oil-shop', name: 'روغن و فیلتر' },
    ],
  },
  {
    slug: 'auto-services',
    name: 'خدمات خودرو',
    children: [
      { slug: 'mechanic', name: 'تعمیرگاه و مکانیکی' },
      { slug: 'auto-electrician', name: 'برق خودرو' },
      { slug: 'body-shop', name: 'صافکاری و نقاشی خودرو' },
      { slug: 'car-wash', name: 'کارواش' },
      { slug: 'oil-change', name: 'تعویض روغن' },
      { slug: 'tyre-repair', name: 'پنچرگیری و تنظیم باد' },
      { slug: 'auto-diagnostics', name: 'عیب‌یابی و تنظیم موتور' },
      { slug: 'towing', name: 'امداد و یدک‌کش' },
    ],
  },
  {
    slug: 'culture-art',
    name: 'فرهنگی، هنری و سرگرمی',
    children: [
      { slug: 'bookshop', name: 'کتاب‌فروشی' },
      { slug: 'stationery', name: 'لوازم‌التحریر و نوشت‌افزار' },
      { slug: 'toy-shop', name: 'اسباب‌بازی' },
      { slug: 'handicrafts', name: 'صنایع دستی' },
      { slug: 'music-instruments', name: 'ساز و لوازم موسیقی' },
      { slug: 'art-supplies', name: 'لوازم هنری' },
      { slug: 'print-shop', name: 'چاپ، تکثیر و فتوکپی' },
      { slug: 'game-center', name: 'گیم‌نت و سرگرمی' },
    ],
  },
  {
    slug: 'jewelry-gifts',
    name: 'طلا، جواهر و هدیه',
    children: [
      { slug: 'goldsmith', name: 'طلا و جواهر' },
      { slug: 'watches', name: 'ساعت' },
      { slug: 'silver-costume', name: 'نقره و بدلیجات' },
      { slug: 'florist', name: 'گل‌فروشی' },
      { slug: 'gift-shop', name: 'کادو و هدیه' },
    ],
  },
  {
    slug: 'agri-pets',
    name: 'کشاورزی، گل و گیاه و حیوانات',
    children: [
      { slug: 'plant-nursery', name: 'گل و گیاه و گلخانه' },
      { slug: 'seeds-saplings', name: 'بذر و نهال' },
      { slug: 'fertiliser-pesticide', name: 'کود و سموم کشاورزی' },
      { slug: 'farm-equipment', name: 'ادوات کشاورزی' },
      { slug: 'pet-shop', name: 'لوازم و غذای حیوانات خانگی' },
      { slug: 'livestock-feed', name: 'دام، طیور و خوراک دام' },
    ],
  },
  {
    slug: 'sports-travel-goods',
    name: 'ورزش و سفر',
    children: [
      { slug: 'sports-goods', name: 'لوازم ورزشی' },
      { slug: 'camping', name: 'کوهنوردی و کمپینگ' },
      { slug: 'fishing-hunting', name: 'ماهیگیری' },
      { slug: 'luggage', name: 'چمدان و لوازم سفر' },
    ],
  },
  {
    slug: 'personal-care',
    name: 'آرایش و پیرایش',
    children: [
      { slug: 'barber', name: 'آرایشگاه مردانه' },
      { slug: 'beauty-salon', name: 'آرایشگاه زنانه' },
      { slug: 'nail-lash', name: 'ناخن، مژه و ابرو' },
      { slug: 'skin-clinic', name: 'مراقبت پوست' },
      { slug: 'spa-massage', name: 'ماساژ و اسپا' },
    ],
  },
  {
    slug: 'home-repair',
    name: 'تعمیرات و خدمات فنی',
    children: [
      { slug: 'plumber', name: 'لوله‌کشی و تأسیسات' },
      { slug: 'electrician', name: 'برق‌کاری ساختمان' },
      { slug: 'hvac-repair', name: 'تعمیر کولر، پکیج و آبگرمکن' },
      { slug: 'appliance-repair', name: 'تعمیر لوازم خانگی' },
      { slug: 'mobile-repair', name: 'تعمیر موبایل' },
      { slug: 'computer-repair', name: 'تعمیر رایانه و شبکه' },
      { slug: 'painter', name: 'نقاشی ساختمان' },
      { slug: 'carpenter', name: 'نجاری و کابینت‌سازی' },
      { slug: 'metalwork', name: 'جوشکاری و آهنگری' },
      { slug: 'locksmith', name: 'کلیدسازی و قفل' },
      { slug: 'renovation', name: 'بازسازی ساختمان' },
    ],
  },
  {
    slug: 'everyday-services',
    name: 'خدمات روزمره',
    children: [
      { slug: 'tailor', name: 'خیاطی و تعمیر لباس' },
      { slug: 'dry-cleaner', name: 'خشکشویی' },
      { slug: 'carpet-cleaning', name: 'قالیشویی' },
      { slug: 'shoe-repair', name: 'کفاشی و تعمیر کفش' },
      { slug: 'cleaning-service', name: 'نظافت منزل و اداره' },
      { slug: 'pest-control', name: 'سم‌پاشی' },
      { slug: 'gardening', name: 'باغبانی و فضای سبز' },
      { slug: 'care-services', name: 'نگهداری کودک و سالمند' },
    ],
  },
  {
    slug: 'health-care',
    name: 'درمان و سلامت',
    children: [
      { slug: 'clinic', name: 'مطب و درمانگاه' },
      { slug: 'dentist', name: 'دندان‌پزشکی' },
      { slug: 'laboratory', name: 'آزمایشگاه' },
      { slug: 'physiotherapy', name: 'فیزیوتراپی' },
      { slug: 'optometry', name: 'بینایی‌سنجی' },
      { slug: 'psychology', name: 'روان‌شناسی و مشاوره' },
      { slug: 'veterinary', name: 'دامپزشکی' },
      { slug: 'home-nursing', name: 'پرستاری در منزل' },
    ],
  },
  {
    slug: 'education',
    name: 'آموزش',
    children: [
      { slug: 'language-school', name: 'آموزشگاه زبان' },
      { slug: 'music-school', name: 'آموزشگاه موسیقی' },
      { slug: 'driving-school', name: 'آموزشگاه رانندگی' },
      { slug: 'tutoring', name: 'کنکور و کلاس تقویتی' },
      { slug: 'vocational', name: 'آموزشگاه فنی‌وحرفه‌ای' },
      { slug: 'art-school', name: 'آموزشگاه هنری' },
      { slug: 'kindergarten', name: 'مهدکودک و پیش‌دبستانی' },
    ],
  },
  {
    slug: 'sports-wellness',
    name: 'ورزش و تندرستی',
    children: [
      { slug: 'gym', name: 'باشگاه بدنسازی' },
      { slug: 'pool', name: 'استخر و سونا' },
      { slug: 'yoga-pilates', name: 'یوگا و پیلاتس' },
      { slug: 'martial-arts', name: 'ورزش‌های رزمی' },
    ],
  },
  {
    slug: 'professional',
    name: 'خدمات حرفه‌ای و اداری',
    children: [
      { slug: 'real-estate', name: 'مشاور املاک' },
      { slug: 'insurance-agency', name: 'نمایندگی بیمه' },
      { slug: 'legal', name: 'وکالت و مشاورهٔ حقوقی' },
      { slug: 'accounting', name: 'حسابداری و مالیات' },
      { slug: 'notary', name: 'دفتر اسناد رسمی' },
      { slug: 'e-government', name: 'دفتر پیشخوان و خدمات دولت' },
      { slug: 'translation', name: 'دارالترجمه' },
      { slug: 'design-advertising', name: 'طراحی و تبلیغات' },
      { slug: 'photo-studio', name: 'آتلیه عکاسی و فیلم‌برداری' },
      { slug: 'it-services', name: 'خدمات نرم‌افزار و فناوری' },
    ],
  },
  {
    slug: 'transport-travel',
    name: 'حمل‌ونقل، سفر و اقامت',
    children: [
      { slug: 'moving', name: 'باربری و اثاث‌کشی' },
      { slug: 'courier', name: 'پیک و ارسال مرسوله' },
      { slug: 'taxi-agency', name: 'آژانس تاکسی' },
      { slug: 'car-rental', name: 'اجارهٔ خودرو' },
      { slug: 'travel-agency', name: 'آژانس مسافرتی' },
      { slug: 'hotel', name: 'هتل و اقامتگاه' },
    ],
  },
  {
    slug: 'events',
    name: 'مراسم و رویداد',
    children: [
      { slug: 'event-hall', name: 'تالار و باغ تالار' },
      { slug: 'event-planning', name: 'تشریفات و برگزاری مراسم' },
      { slug: 'party-supplies', name: 'لوازم جشن و تزئینات' },
    ],
  },
  {
    slug: 'manufacturing',
    name: 'تولیدی و کارگاهی',
    children: [
      { slug: 'garment-workshop', name: 'تولیدی پوشاک' },
      { slug: 'food-production', name: 'تولید مواد غذایی' },
      { slug: 'furniture-workshop', name: 'تولید مبلمان' },
      { slug: 'craft-workshop', name: 'کارگاه صنایع دستی' },
      { slug: 'printing-house', name: 'چاپخانه' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Listing categories — what is offered
// ---------------------------------------------------------------------------

export const LISTING_CATEGORIES: ListingTaxonomyNode[] = [
  // ---- Products -------------------------------------------------------------
  {
    kind: 'PRODUCT',
    slug: 'food',
    name: 'مواد غذایی و نوشیدنی',
    children: [
      { slug: 'food-bread-pastry', name: 'نان و شیرینی' },
      { slug: 'food-dairy', name: 'لبنیات' },
      { slug: 'food-meat', name: 'گوشت، مرغ و ماهی' },
      { slug: 'food-produce', name: 'میوه و سبزی' },
      { slug: 'food-nuts', name: 'آجیل و خشکبار' },
      { slug: 'food-staples', name: 'برنج، حبوبات و غلات' },
      { slug: 'food-spices', name: 'ادویه و چاشنی' },
      { slug: 'food-snacks', name: 'شکلات و تنقلات' },
      { slug: 'food-drinks', name: 'نوشیدنی، چای و قهوه' },
      { slug: 'food-ready', name: 'غذای آماده و کنسرو' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'clothing',
    name: 'پوشاک',
    children: [
      { slug: 'clothing-men', name: 'مردانه' },
      { slug: 'clothing-women', name: 'زنانه' },
      { slug: 'clothing-kids', name: 'بچگانه و نوزاد' },
      { slug: 'clothing-coats', name: 'کت و پالتو' },
      { slug: 'clothing-knitwear', name: 'بافتنی' },
      { slug: 'clothing-sport', name: 'ورزشی' },
      { slug: 'clothing-underwear', name: 'لباس زیر و خواب' },
      { slug: 'clothing-hijab', name: 'چادر، روسری و شال' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'shoes-bags',
    name: 'کیف و کفش',
    children: [
      { slug: 'shoes-men', name: 'کفش مردانه' },
      { slug: 'shoes-women', name: 'کفش زنانه' },
      { slug: 'shoes-kids', name: 'کفش بچگانه' },
      { slug: 'bags', name: 'کیف' },
      { slug: 'accessories', name: 'کمربند و اکسسوری' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'beauty',
    name: 'آرایشی و بهداشتی',
    children: [
      { slug: 'beauty-makeup', name: 'لوازم آرایش' },
      { slug: 'beauty-skin', name: 'مراقبت پوست' },
      { slug: 'beauty-hair', name: 'مراقبت مو' },
      { slug: 'beauty-perfume', name: 'عطر و ادکلن' },
      { slug: 'beauty-hygiene', name: 'بهداشت شخصی' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'health-products',
    name: 'سلامت و پزشکی',
    children: [
      { slug: 'health-supplements', name: 'مکمل و ویتامین' },
      { slug: 'health-equipment', name: 'تجهیزات پزشکی' },
      { slug: 'health-eyewear', name: 'عینک و لنز' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'home',
    name: 'خانه و آشپزخانه',
    children: [
      { slug: 'home-cookware', name: 'ظروف و لوازم پخت‌وپز' },
      { slug: 'home-small-appliances', name: 'لوازم برقی کوچک' },
      { slug: 'home-decor-items', name: 'دکوراسیون' },
      { slug: 'home-lighting', name: 'روشنایی' },
      { slug: 'home-textiles', name: 'منسوجات خانگی' },
      { slug: 'home-cleaning', name: 'شست‌وشو و نظافت' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'furniture',
    name: 'مبلمان و فرش',
    children: [
      { slug: 'furniture-sofas', name: 'مبل و صندلی' },
      { slug: 'furniture-beds', name: 'تخت و سرویس خواب' },
      { slug: 'furniture-tables', name: 'میز و کمد' },
      { slug: 'furniture-carpets', name: 'فرش و گلیم' },
      { slug: 'furniture-curtains', name: 'پرده' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'appliances',
    name: 'لوازم خانگی بزرگ',
    children: [
      { slug: 'appliances-fridge', name: 'یخچال و فریزر' },
      { slug: 'appliances-washing', name: 'لباسشویی و ظرفشویی' },
      { slug: 'appliances-cooking', name: 'اجاق و فر' },
      { slug: 'appliances-climate', name: 'کولر، بخاری و پکیج' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'digital',
    name: 'کالای دیجیتال',
    children: [
      { slug: 'digital-phones', name: 'موبایل' },
      { slug: 'digital-accessories', name: 'لوازم جانبی' },
      { slug: 'digital-computers', name: 'رایانه و لپ‌تاپ' },
      { slug: 'digital-tablets', name: 'تبلت' },
      { slug: 'digital-audio-video', name: 'صوتی و تصویری' },
      { slug: 'digital-cameras', name: 'دوربین' },
      { slug: 'digital-gaming', name: 'کنسول و بازی' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'tools',
    name: 'ابزار و تجهیزات',
    children: [
      { slug: 'tools-hand', name: 'ابزار دستی' },
      { slug: 'tools-power', name: 'ابزار برقی' },
      { slug: 'tools-hardware', name: 'یراق‌آلات' },
      { slug: 'tools-safety', name: 'تجهیزات ایمنی' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'building',
    name: 'مصالح و تأسیسات ساختمانی',
    children: [
      { slug: 'building-materials-basic', name: 'مصالح ساختمانی' },
      { slug: 'building-tiles', name: 'کاشی، سرامیک و سنگ' },
      { slug: 'building-plumbing', name: 'شیرآلات و لوله' },
      { slug: 'building-paint', name: 'رنگ' },
      { slug: 'building-electrical', name: 'لوازم برقی ساختمان' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'vehicles',
    name: 'خودرو و موتور',
    children: [
      { slug: 'vehicles-parts', name: 'قطعات یدکی' },
      { slug: 'vehicles-tyres', name: 'لاستیک و رینگ' },
      { slug: 'vehicles-oil', name: 'روغن و فیلتر' },
      { slug: 'vehicles-accessories', name: 'لوازم جانبی خودرو' },
      { slug: 'vehicles-motorcycles', name: 'موتورسیکلت و دوچرخه' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'books',
    name: 'کتاب و نوشت‌افزار',
    children: [
      { slug: 'books-books', name: 'کتاب' },
      { slug: 'books-stationery', name: 'لوازم‌التحریر' },
      { slug: 'books-office', name: 'لوازم اداری' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'handicraft',
    name: 'صنایع دستی و هنر',
    children: [
      { slug: 'handicraft-pottery', name: 'سفال و سرامیک' },
      { slug: 'handicraft-textiles', name: 'گلیم، جاجیم و دست‌بافته' },
      { slug: 'handicraft-art-supplies', name: 'لوازم هنری' },
      { slug: 'handicraft-paintings', name: 'تابلو و خوشنویسی' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'kids',
    name: 'کودک و نوزاد',
    children: [
      { slug: 'kids-toys', name: 'اسباب‌بازی' },
      { slug: 'kids-baby-gear', name: 'لوازم نوزاد' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'sports-goods',
    name: 'ورزش و سفر',
    children: [
      { slug: 'sports-equipment', name: 'لوازم ورزشی' },
      { slug: 'sports-camping', name: 'کوهنوردی و کمپینگ' },
      { slug: 'sports-luggage', name: 'چمدان و لوازم سفر' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'jewelry',
    name: 'طلا، جواهر و ساعت',
    children: [
      { slug: 'jewelry-gold', name: 'طلا و جواهر' },
      { slug: 'jewelry-silver', name: 'نقره و بدلیجات' },
      { slug: 'jewelry-watches', name: 'ساعت' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'plants',
    name: 'گل، گیاه و کشاورزی',
    children: [
      { slug: 'plants-indoor', name: 'گیاه آپارتمانی' },
      { slug: 'plants-flowers', name: 'گل شاخه‌بریده و دسته‌گل' },
      { slug: 'plants-seeds', name: 'بذر و نهال' },
      { slug: 'plants-garden-supplies', name: 'کود، سم و لوازم باغبانی' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'pets',
    name: 'حیوانات خانگی',
    children: [
      { slug: 'pets-food', name: 'غذای حیوانات' },
      { slug: 'pets-supplies', name: 'لوازم حیوانات' },
    ],
  },
  {
    kind: 'PRODUCT',
    slug: 'music',
    name: 'ساز و موسیقی',
    children: [
      { slug: 'music-instruments-items', name: 'ساز' },
      { slug: 'music-accessories', name: 'لوازم جانبی موسیقی' },
    ],
  },

  // ---- Services -------------------------------------------------------------
  {
    kind: 'SERVICE',
    slug: 'beauty-services',
    name: 'آرایش و زیبایی',
    children: [
      { slug: 'barbershop', name: 'آرایشگاه مردانه' },
      { slug: 'salon-women', name: 'آرایشگاه زنانه' },
      { slug: 'nails-lashes', name: 'ناخن، مژه و ابرو' },
      { slug: 'skin-care-services', name: 'پوست و مو' },
      { slug: 'massage-spa', name: 'ماساژ و اسپا' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'car-services',
    name: 'خدمات خودرو',
    children: [
      { slug: 'auto-repair', name: 'مکانیکی و تعمیر' },
      { slug: 'car-electrics', name: 'برق خودرو' },
      { slug: 'car-bodywork', name: 'صافکاری و نقاشی' },
      { slug: 'car-washing', name: 'کارواش و صفرشویی' },
      { slug: 'car-oil-change', name: 'تعویض روغن' },
      { slug: 'car-tyre-service', name: 'پنچرگیری و بالانس' },
      { slug: 'car-towing', name: 'امداد و یدک‌کش' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'home-services',
    name: 'تعمیرات و تأسیسات منزل',
    children: [
      { slug: 'plumbing-service', name: 'لوله‌کشی' },
      { slug: 'electrical-service', name: 'برق‌کاری' },
      { slug: 'hvac-service', name: 'کولر، پکیج و آبگرمکن' },
      { slug: 'appliance-service', name: 'تعمیر لوازم خانگی' },
      { slug: 'painting-service', name: 'نقاشی ساختمان' },
      { slug: 'carpentry-service', name: 'نجاری' },
      { slug: 'locksmith-service', name: 'کلیدسازی و قفل' },
      { slug: 'renovation-service', name: 'بازسازی' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'clothing-services',
    name: 'پوشاک و شست‌وشو',
    children: [
      { slug: 'tailoring', name: 'خیاطی و تعمیر لباس' },
      { slug: 'dry-cleaning', name: 'خشکشویی' },
      { slug: 'shoe-repair-service', name: 'تعمیر کفش و کیف' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'cleaning-services',
    name: 'نظافت و خدمات منزل',
    children: [
      { slug: 'house-cleaning', name: 'نظافت منزل و اداره' },
      { slug: 'carpet-washing', name: 'قالیشویی' },
      { slug: 'pest-control-service', name: 'سم‌پاشی' },
      { slug: 'gardening-service', name: 'باغبانی' },
      { slug: 'moving-service', name: 'اثاث‌کشی' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'tech-repair',
    name: 'تعمیرات دیجیتال',
    children: [
      { slug: 'phone-repair', name: 'تعمیر موبایل' },
      { slug: 'computer-repair-service', name: 'تعمیر رایانه' },
      { slug: 'network-cctv', name: 'شبکه و دوربین مداربسته' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'health-services',
    name: 'سلامت و درمان',
    children: [
      { slug: 'medical-visit', name: 'ویزیت پزشک' },
      { slug: 'dental', name: 'دندان‌پزشکی' },
      { slug: 'physio', name: 'فیزیوتراپی' },
      { slug: 'lab-tests', name: 'آزمایش' },
      { slug: 'counselling', name: 'روان‌شناسی و مشاوره' },
      { slug: 'vet', name: 'دامپزشکی' },
      { slug: 'nursing', name: 'پرستاری در منزل' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'education-services',
    name: 'آموزش',
    children: [
      { slug: 'lessons-language', name: 'زبان' },
      { slug: 'lessons-music', name: 'موسیقی' },
      { slug: 'lessons-school', name: 'درسی و کنکور' },
      { slug: 'lessons-driving', name: 'رانندگی' },
      { slug: 'lessons-art', name: 'هنر' },
      { slug: 'lessons-vocational', name: 'فنی‌وحرفه‌ای' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'food-services',
    name: 'غذا و پذیرایی',
    children: [
      { slug: 'dining', name: 'رستوران و غذاخوری' },
      { slug: 'cafe-services', name: 'کافه' },
      { slug: 'catering-service', name: 'کترینگ و تهیهٔ غذا' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'event-services',
    name: 'مراسم و رویداد',
    children: [
      { slug: 'venue', name: 'تالار و محل برگزاری' },
      { slug: 'event-organising', name: 'تشریفات' },
      { slug: 'photo-video', name: 'عکاسی و فیلم‌برداری' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'professional-services',
    name: 'خدمات حرفه‌ای',
    children: [
      { slug: 'legal-service', name: 'حقوقی و وکالت' },
      { slug: 'accounting-service', name: 'حسابداری و مالیات' },
      { slug: 'real-estate-service', name: 'املاک' },
      { slug: 'insurance-service', name: 'بیمه' },
      { slug: 'translation-service', name: 'ترجمه' },
      { slug: 'design-print', name: 'طراحی و چاپ' },
      { slug: 'it-service', name: 'نرم‌افزار و فناوری' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'transport-services',
    name: 'حمل‌ونقل و سفر',
    children: [
      { slug: 'courier-service', name: 'پیک' },
      { slug: 'freight', name: 'باربری' },
      { slug: 'taxi-service', name: 'تاکسی و آژانس' },
      { slug: 'car-hire', name: 'اجارهٔ خودرو' },
      { slug: 'travel-tours', name: 'تور و سفر' },
      { slug: 'accommodation', name: 'اقامت' },
    ],
  },
  {
    kind: 'SERVICE',
    slug: 'fitness-services',
    name: 'ورزش و تندرستی',
    children: [
      { slug: 'gym-membership', name: 'باشگاه و بدنسازی' },
      { slug: 'swimming', name: 'استخر' },
      { slug: 'yoga', name: 'یوگا و پیلاتس' },
      { slug: 'personal-training', name: 'مربی خصوصی' },
    ],
  },
];
