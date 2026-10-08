import { prisma } from '../../config/database.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { IMAGE_EXTENSIONS, storeFiles } from '../attachment.service.js';
import { syncBookTaxonomy } from '../book-taxonomy.service.js';
import { placeholderPng } from './placeholder-image.js';
import { searchTextOf } from '../book-market.service.js';
import type { DemoManifest } from './manifest.js';

/**
 * Demo data for the book market: a catalogue with every kind of entry, offers
 * of it in every condition, and purchase requests in every state.
 *
 * Runs after seedJobs and borrows its people. The catalogue mixes Persian
 * classics and contemporary novels, translations (with their originals),
 * English-language books, a university textbook, a konkur guide, a children's
 * book and a rare first printing — so the board's filters all have something
 * to find, and several titles carry offers from more than one seller, which is
 * the point of a page per book. Two entries are the same work in different
 * translations, so "other editions" has something to show.
 *
 * The ISBNs are made up (valid check digits, a 978-600-99 prefix nobody uses),
 * so they can never collide with a real book's.
 */

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const T = (toman: number) => BigInt(toman);

/** A made-up but valid ISBN-13. */
function isbn(serial: number): string {
  const core = `97860099${String(serial).padStart(4, '0')}`;
  const sum = [...core].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${core}${(10 - (sum % 10)) % 10}`;
}

const PEOPLE = {
  sara: 'candidate.sara@demo.invalid',
  ali: 'candidate.ali@demo.invalid',
  maryam: 'candidate.maryam@demo.invalid',
  reza: 'candidate.reza@demo.invalid',
  niloofar: 'candidate.niloofar@demo.invalid',
  hamid: 'candidate.hamid@demo.invalid',
  zahra: 'candidate.zahra@demo.invalid',
  omid: 'candidate.omid@demo.invalid',
  karaj: 'employer.karaj@demo.invalid',
  rayan: 'employer.rayan@demo.invalid',
} as const;
type Person = keyof typeof PEOPLE;

interface DemoBook {
  key: string;
  title: string;
  subtitle?: string;
  authors: string[];
  translators?: string[];
  publisher: string;
  isbn?: number;
  year: number;
  calendar?: 'SOLAR' | 'GREGORIAN';
  edition?: number;
  printRun?: number;
  pages: number;
  language?: string;
  originalTitle?: string;
  originalLanguage?: string;
  series?: string;
  seriesNumber?: number;
  binding: 'PAPERBACK' | 'HARDCOVER' | 'LEATHER' | 'BOARD' | 'SPIRAL';
  trimSize: 'POCKET' | 'PALTOI' | 'ROGHEI' | 'VAZIRI' | 'KHESHTI' | 'RAHLI';
  listPrice?: number;
  currency?: string;
  category: string;
  description: string;
  tags?: string[];
  verified?: boolean;
  views: number;
}

const BOOKS: DemoBook[] = [
  {
    key: 'souvashoun', title: 'سووشون', authors: ['سیمین دانشور'], publisher: 'خوارزمی', isbn: 1, year: 1402, edition: 24, printRun: 1100,
    pages: 312, binding: 'PAPERBACK', trimSize: 'ROGHEI', listPrice: 280_000, category: 'b-iranian-novel', verified: true, views: 812,
    description: 'رمانی دربارهٔ زری و یوسف در شیراز سال‌های اشغال ایران در جنگ جهانی دوم؛ نخستین رمان یک زن ایرانی که به پرفروش‌ترین رمان‌های فارسی بدل شد.',
    tags: ['کلاسیک معاصر', 'پرفروش'],
  },
  {
    key: 'blind-owl', title: 'بوف کور', authors: ['صادق هدایت'], publisher: 'جاویدان', isbn: 2, year: 1400, edition: 12, pages: 128,
    binding: 'PAPERBACK', trimSize: 'PALTOI', listPrice: 120_000, category: 'b-iranian-novel', verified: true, views: 1240,
    description: 'شاهکار داستان‌نویسی مدرن فارسی؛ روایتی کابوس‌وار از مرد نقاشی که با جغدی بر دیوار حرف می‌زند.',
    tags: ['کلاسیک معاصر'],
  },
  {
    key: 'blind-owl-1st', title: 'بوف کور', subtitle: 'چاپ نخست، بمبئی', authors: ['صادق هدایت'], publisher: 'نسخهٔ پلی‌کپی (بمبئی)', year: 1315,
    pages: 140, binding: 'BOARD', trimSize: 'ROGHEI', category: 'b-first-editions', views: 2040,
    description: 'نسخه‌ای از نخستین چاپ بوف کور که خود هدایت در بمبئی تکثیر کرد؛ بسیار کمیاب. برای نمایش قفسهٔ «کمیاب و قدیمی».',
    tags: ['نایاب', 'چاپ اول'],
  },
  {
    key: 'kelidar', title: 'کلیدر', subtitle: 'دورهٔ ده‌جلدی', authors: ['محمود دولت‌آبادی'], publisher: 'فرهنگ معاصر', isbn: 3, year: 1399, edition: 18,
    pages: 2836, binding: 'HARDCOVER', trimSize: 'VAZIRI', listPrice: 3_400_000, category: 'b-iranian-novel', verified: true, views: 560,
    description: 'حماسهٔ ده‌جلدی ایل کلمیشی در خراسان؛ بلندترین رمان فارسی.', series: 'کلیدر',
  },
  {
    key: 'shahnameh', title: 'شاهنامه', subtitle: 'بر پایهٔ نسخهٔ مسکو', authors: ['ابوالقاسم فردوسی'], publisher: 'هرمس', isbn: 4, year: 1398,
    pages: 1640, binding: 'LEATHER', trimSize: 'RAHLI', listPrice: 4_800_000, category: 'b-classic-poetry', verified: true, views: 690,
    description: 'متن کامل شاهنامه در یک جلد رحلی با جلد چرمی و قاب؛ مناسب هدیه.', tags: ['نفیس', 'هدیه'],
  },
  {
    key: 'hafez', title: 'دیوان حافظ', subtitle: 'به تصحیح قزوینی و غنی', authors: ['حافظ شیرازی'], publisher: 'زوار', isbn: 5, year: 1401,
    pages: 520, binding: 'HARDCOVER', trimSize: 'VAZIRI', listPrice: 650_000, category: 'b-classic-poetry', verified: true, views: 980,
    description: 'دیوان حافظ با تصحیح محمد قزوینی و قاسم غنی، با فهرست کامل غزل‌ها.',
  },
  {
    key: 'crime-mohammad', title: 'جنایت و مکافات', authors: ['فیودور داستایفسکی'], translators: ['مهری آهی'], publisher: 'خوارزمی', isbn: 6,
    year: 1401, edition: 31, pages: 712, originalTitle: 'Преступление и наказание', originalLanguage: 'ru', binding: 'HARDCOVER', trimSize: 'VAZIRI',
    listPrice: 980_000, category: 'b-world-novel', verified: true, views: 870, description: 'ترجمهٔ مهری آهی از رمان مشهور داستایفسکی.',
  },
  {
    key: 'crime-other', title: 'جنایت و مکافات', authors: ['فیودور داستایفسکی'], translators: ['اصغر رستگار'], publisher: 'نشر نی', isbn: 7,
    year: 1398, edition: 9, pages: 680, originalTitle: 'Преступление и наказание', originalLanguage: 'ru', binding: 'PAPERBACK', trimSize: 'ROGHEI',
    listPrice: 720_000, category: 'b-world-novel', views: 310, description: 'ترجمهٔ دیگری از همان رمان، تا «ویرایش‌های دیگر» چیزی برای نشان دادن داشته باشد.',
  },
  {
    key: 'little-prince', title: 'شازده کوچولو', authors: ['آنتوان دو سنت‌اگزوپری'], translators: ['احمد شاملو'], publisher: 'نگاه', isbn: 8, year: 1402,
    pages: 112, originalTitle: 'Le Petit Prince', originalLanguage: 'fr', binding: 'HARDCOVER', trimSize: 'KHESHTI', listPrice: 210_000,
    category: 'b-children', verified: true, views: 1450, description: 'ترجمهٔ ماندگار احمد شاملو، با تصویرهای خود نویسنده.',
  },
  {
    key: '1984', title: '1984', authors: ['George Orwell'], publisher: 'Penguin Books', year: 2021, calendar: 'GREGORIAN', pages: 336,
    language: 'en', binding: 'PAPERBACK', trimSize: 'PALTOI', listPrice: 9, currency: 'GBP', category: 'b-english', views: 430,
    description: 'Penguin Modern Classics edition of Orwell’s dystopian novel.', tags: ['Classic'],
  },
  {
    key: 'sapiens', title: 'انسان خردمند', subtitle: 'تاریخ مختصر بشر', authors: ['یووال نوح هراری'], translators: ['نیک گرگین'], publisher: 'فرهنگ نشر نو',
    isbn: 9, year: 1401, edition: 40, pages: 576, originalTitle: 'Sapiens', originalLanguage: 'he', binding: 'PAPERBACK', trimSize: 'VAZIRI',
    listPrice: 690_000, category: 'b-history', verified: true, views: 1120, description: 'روایتی از تاریخ بشر از انقلاب شناختی تا امروز.', tags: ['پرفروش'],
  },
  {
    key: 'atomic', title: 'عادت‌های اتمی', authors: ['جیمز کلیر'], translators: ['هادی بهمنی'], publisher: 'نوین', isbn: 10, year: 1402, pages: 320,
    originalTitle: 'Atomic Habits', originalLanguage: 'en', binding: 'PAPERBACK', trimSize: 'ROGHEI', listPrice: 340_000, category: 'b-self-help', views: 760,
    description: 'روشی ساده و اثبات‌شده برای ساختن عادت‌های خوب و ترک عادت‌های بد.',
  },
  {
    key: 'calculus', title: 'حساب دیفرانسیل و انتگرال', subtitle: 'جلد اول', authors: ['جیمز استوارت'], translators: ['ارشک حمیدی'], publisher: 'فاطمی',
    isbn: 11, year: 1399, edition: 7, pages: 860, originalTitle: 'Calculus', originalLanguage: 'en', binding: 'PAPERBACK', trimSize: 'RAHLI',
    listPrice: 1_250_000, category: 'b-university', views: 380, description: 'ترجمهٔ ویراست هشتم کتاب درسی ریاضی عمومی دانشگاه‌ها.', series: 'حساب دیفرانسیل و انتگرال', seriesNumber: 1,
  },
  {
    key: 'konkur-bio', title: 'زیست‌شناسی جامع کنکور', authors: ['گروه مؤلفان'], publisher: 'خیلی سبز', isbn: 12, year: 1403, pages: 1100,
    binding: 'PAPERBACK', trimSize: 'RAHLI', listPrice: 1_450_000, category: 'b-konkur', views: 640, description: 'درسنامه و تست‌های طبقه‌بندی‌شده برای داوطلبان رشتهٔ تجربی.',
  },
  {
    key: 'ielts', title: 'Cambridge IELTS 18', subtitle: 'Academic', authors: ['Cambridge University Press'], publisher: 'Cambridge', year: 2023,
    calendar: 'GREGORIAN', pages: 144, language: 'en', binding: 'PAPERBACK', trimSize: 'RAHLI', listPrice: 32, currency: 'GBP', category: 'b-exam-prep',
    views: 290, description: 'Four authentic Academic IELTS tests with answers.',
  },
  {
    key: 'cookbook', title: 'هنر آشپزی', authors: ['رزا منتظمی'], publisher: 'کتاب‌های سیمرغ', isbn: 13, year: 1395, edition: 52, pages: 940,
    binding: 'HARDCOVER', trimSize: 'VAZIRI', listPrice: 950_000, category: 'b-cooking', views: 210, description: 'کتاب مرجع آشپزی ایرانی که در بیشتر خانه‌ها پیدا می‌شود.',
  },
];

interface DemoOffer {
  book: string;
  seller: Person;
  grade: 'NEW' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'ACCEPTABLE';
  price: number;
  notes?: string;
  quantity?: number;
  negotiable?: boolean;
  delivery: Array<'IN_PERSON' | 'POST' | 'COURIER'>;
  shipping?: number;
  province: string;
  city: string;
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';
  reviewNote?: string;
  featured?: boolean;
  closed?: boolean;
  daysAgo: number;
  views?: number;
}

const OFFERS: DemoOffer[] = [
  { book: 'souvashoun', seller: 'sara', grade: 'LIKE_NEW', price: 190_000, notes: 'یک بار خوانده شده؛ بدون خط و یادداشت.', delivery: ['POST', 'IN_PERSON'], shipping: 45_000, province: 'تهران', city: 'تهران', featured: true, daysAgo: 2, views: 120 },
  { book: 'souvashoun', seller: 'maryam', grade: 'GOOD', price: 130_000, notes: 'لبه‌های جلد کمی ساییده؛ صفحات سالم.', delivery: ['IN_PERSON'], province: 'قزوین', city: 'قزوین', daysAgo: 5, views: 40 },
  { book: 'souvashoun', seller: 'karaj', grade: 'NEW', price: 280_000, quantity: 4, notes: 'نو، از کتاب‌فروشی کافه.', delivery: ['POST', 'COURIER', 'IN_PERSON'], shipping: 0, province: 'البرز', city: 'کرج', daysAgo: 1, views: 66 },
  { book: 'blind-owl', seller: 'hamid', grade: 'VERY_GOOD', price: 85_000, delivery: ['POST'], shipping: 40_000, province: 'آذربایجان شرقی', city: 'تبریز', negotiable: true, daysAgo: 3, views: 90 },
  { book: 'blind-owl', seller: 'niloofar', grade: 'ACCEPTABLE', price: 40_000, notes: 'جلد پاره شده و با چسب ترمیم شده؛ متن کامل است.', delivery: ['IN_PERSON'], province: 'تهران', city: 'تهران', daysAgo: 9, views: 31 },
  { book: 'blind-owl-1st', seller: 'reza', grade: 'ACCEPTABLE', price: 180_000_000, notes: 'نسخهٔ کمیاب چاپ نخست؛ کاغذ زرد شده، دو صفحه با حاشیهٔ آسیب‌دیده. فقط حضوری در تهران با بازدید.', negotiable: true, delivery: ['IN_PERSON'], province: 'تهران', city: 'تهران', featured: true, daysAgo: 4, views: 610 },
  { book: 'kelidar', seller: 'ali', grade: 'VERY_GOOD', price: 2_300_000, notes: 'دورهٔ کامل ده جلد در قاب.', delivery: ['COURIER', 'IN_PERSON'], shipping: 150_000, province: 'خراسان رضوی', city: 'مشهد', negotiable: true, daysAgo: 6, views: 77 },
  { book: 'shahnameh', seller: 'karaj', grade: 'NEW', price: 4_200_000, quantity: 2, notes: 'نو با قاب و جعبهٔ هدیه.', delivery: ['COURIER', 'POST'], shipping: 0, province: 'البرز', city: 'کرج', featured: true, daysAgo: 2, views: 210 },
  { book: 'hafez', seller: 'zahra', grade: 'LIKE_NEW', price: 480_000, delivery: ['POST'], shipping: 50_000, province: 'تهران', city: 'تهران', daysAgo: 8, views: 58 },
  { book: 'hafez', seller: 'omid', grade: 'GOOD', price: 350_000, notes: 'یادداشت مداد در حاشیهٔ چند غزل.', delivery: ['IN_PERSON', 'POST'], shipping: 45_000, province: 'اصفهان', city: 'اصفهان', daysAgo: 11, views: 22 },
  { book: 'crime-mohammad', seller: 'sara', grade: 'VERY_GOOD', price: 620_000, delivery: ['POST'], shipping: 45_000, province: 'تهران', city: 'تهران', daysAgo: 7, views: 64 },
  { book: 'crime-other', seller: 'reza', grade: 'GOOD', price: 390_000, delivery: ['IN_PERSON'], province: 'تهران', city: 'تهران', daysAgo: 12, views: 18 },
  { book: 'little-prince', seller: 'niloofar', grade: 'NEW', price: 190_000, quantity: 3, delivery: ['POST', 'IN_PERSON'], shipping: 35_000, province: 'تهران', city: 'تهران', daysAgo: 1, views: 140 },
  { book: 'little-prince', seller: 'maryam', grade: 'GOOD', price: 95_000, delivery: ['IN_PERSON'], province: 'قزوین', city: 'قزوین', daysAgo: 14, views: 29 },
  { book: '1984', seller: 'reza', grade: 'VERY_GOOD', price: 450_000, notes: 'Penguin edition, light shelf wear.', delivery: ['POST'], shipping: 45_000, province: 'تهران', city: 'تهران', daysAgo: 3, views: 52 },
  { book: 'sapiens', seller: 'omid', grade: 'LIKE_NEW', price: 520_000, delivery: ['POST', 'COURIER'], shipping: 0, province: 'اصفهان', city: 'اصفهان', daysAgo: 4, views: 88 },
  { book: 'sapiens', seller: 'ali', grade: 'GOOD', price: 360_000, delivery: ['IN_PERSON'], province: 'خراسان رضوی', city: 'مشهد', daysAgo: 10, views: 30 },
  { book: 'atomic', seller: 'zahra', grade: 'NEW', price: 300_000, delivery: ['POST'], shipping: 40_000, province: 'تهران', city: 'تهران', daysAgo: 2, views: 47 },
  { book: 'calculus', seller: 'hamid', grade: 'GOOD', price: 600_000, notes: 'تست‌های فصل ۲ و ۳ با مداد حل شده.', delivery: ['IN_PERSON', 'POST'], shipping: 60_000, province: 'آذربایجان شرقی', city: 'تبریز', negotiable: true, daysAgo: 5, views: 70 },
  { book: 'konkur-bio', seller: 'maryam', grade: 'VERY_GOOD', price: 700_000, delivery: ['POST'], shipping: 60_000, province: 'قزوین', city: 'قزوین', daysAgo: 1, views: 95 },
  { book: 'ielts', seller: 'sara', grade: 'LIKE_NEW', price: 900_000, notes: 'Answer key intact; no writing.', delivery: ['POST'], shipping: 45_000, province: 'تهران', city: 'تهران', daysAgo: 6, views: 38 },
  { book: 'cookbook', seller: 'karaj', grade: 'GOOD', price: 480_000, delivery: ['IN_PERSON'], province: 'البرز', city: 'کرج', closed: true, daysAgo: 30, views: 61 },
  { book: 'atomic', seller: 'hamid', grade: 'GOOD', price: 160_000, delivery: ['IN_PERSON'], province: 'آذربایجان شرقی', city: 'تبریز', status: 'PENDING_REVIEW', daysAgo: 0 },
  { book: 'kelidar', seller: 'sara', grade: 'ACCEPTABLE', price: 900_000, delivery: ['POST'], province: 'تهران', city: 'تهران', status: 'CHANGES_REQUESTED', reviewNote: 'عکس‌ها تار است و جلد سوم در عکس‌ها دیده نمی‌شود؛ لطفاً عکس واضح از هر ده جلد بگذارید.', daysAgo: 1 },
  { book: 'hafez', seller: 'niloofar', grade: 'VERY_GOOD', price: 400_000, delivery: ['POST'], province: 'تهران', city: 'تهران', status: 'DRAFT', daysAgo: 0 },
];

export async function seedBooks(manifest: DemoManifest) {
  const counts = { books: 0, offers: 0, requests: 0, deals: 0 };

  await syncBookTaxonomy();
  const categories = new Map((await prisma.bookCategory.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]));
  const users = await prisma.user.findMany({ where: { email: { in: Object.values(PEOPLE) } }, select: { id: true, email: true } });
  const id = (person: Person) => {
    const user = users.find((row) => row.email === PEOPLE[person]);
    if (!user) throw new Error(`demo user ${person} is missing; seedJobs runs first`);
    return user.id;
  };

  // ---- the catalogue -------------------------------------------------------
  const bookIds = new Map<string, { id: string; title: string; authors: string[]; book: DemoBook }>();
  for (const book of BOOKS) {
    const row = await prisma.book.create({
      data: {
        code: generateTrackingCode(),
        title: book.title,
        subtitle: book.subtitle ?? null,
        authors: book.authors,
        translators: book.translators ?? [],
        publisher: book.publisher,
        isbn: book.isbn ? isbn(book.isbn) : null,
        publishYear: book.year,
        yearCalendar: book.calendar ?? 'SOLAR',
        edition: book.edition ?? null,
        printRun: book.printRun ?? null,
        pageCount: book.pages,
        language: book.language ?? 'fa',
        originalTitle: book.originalTitle ?? null,
        originalLanguage: book.originalLanguage ?? null,
        series: book.series ?? null,
        seriesNumber: book.seriesNumber ?? null,
        binding: book.binding,
        trimSize: book.trimSize,
        listPrice: book.listPrice !== undefined ? T(book.listPrice) : null,
        currency: book.currency ?? 'IRT',
        description: book.description,
        tags: book.tags ?? [],
        categoryId: categories.get(book.category) ?? null,
        verified: book.verified ?? false,
        viewCount: book.views,
        createdById: id('karaj'),
        searchText: searchTextOf({
          title: book.title,
          subtitle: book.subtitle,
          authors: book.authors,
          translators: book.translators ?? [],
          publisher: book.publisher,
          series: book.series,
          originalTitle: book.originalTitle,
          tags: book.tags ?? [],
          isbn: book.isbn ? isbn(book.isbn) : null,
        }),
      },
      select: { id: true },
    });
    await manifest.record('book', row.id);
    bookIds.set(book.key, { id: row.id, title: book.title, authors: book.authors, book });
    counts.books += 1;
  }

  // ---- offers ----------------------------------------------------------------
  const offerIds = new Map<string, { id: string; seller: Person; price: bigint; title: string }>();
  for (const [index, offer] of OFFERS.entries()) {
    const book = bookIds.get(offer.book)!;
    const status = offer.status ?? 'APPROVED';
    const photos = [];
    for (let shot = 0; shot < (status === 'DRAFT' ? 1 : 2); shot++) {
      const [stored] = await storeFiles(
        [{ originalName: `${offer.book}-${index}-${shot}.png`, buffer: placeholderPng(`${book.title} ${offer.seller} ${shot}`) }],
        IMAGE_EXTENSIONS,
      );
      await manifest.record('storedFile', stored.storedName);
      photos.push(stored);
    }
    const created = daysAgo(offer.daysAgo);
    const row = await prisma.bookListing.create({
      data: {
        code: generateTrackingCode(),
        sellerId: id(offer.seller),
        bookId: book.id,
        title: book.title,
        bookAuthor: book.authors.join('، '),
        description: offer.notes ?? book.book.description,
        publisher: book.book.publisher,
        isbn: book.book.isbn ? isbn(book.book.isbn) : null,
        publishYear: book.book.year,
        language: book.book.language ?? 'fa',
        pageCount: book.book.pages,
        condition: offer.grade === 'NEW' ? 'NEW' : 'USED',
        grade: offer.grade,
        conditionNotes: offer.notes ?? null,
        price: T(offer.price),
        currency: 'IRT',
        negotiable: offer.negotiable ?? false,
        quantity: offer.quantity ?? 1,
        deliveryOptions: offer.delivery,
        shippingCost: offer.shipping !== undefined ? T(offer.shipping) : null,
        province: offer.province,
        city: offer.city,
        moderationStatus: status,
        reviewNote: offer.reviewNote ?? null,
        submittedAt: status === 'DRAFT' ? null : created,
        reviewedAt: status === 'APPROVED' || status === 'CHANGES_REQUESTED' ? created : null,
        publishedAt: status === 'APPROVED' ? created : null,
        state: offer.closed ? 'CLOSED' : 'OPEN',
        featured: offer.featured ?? false,
        featuredAt: offer.featured ? created : null,
        viewCount: offer.views ?? 0,
        createdAt: created,
        photos: {
          create: photos.map((file, position) => ({
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            position,
          })),
        },
      },
      select: { id: true },
    });
    await manifest.record('bookListing', row.id);
    offerIds.set(`${offer.book}:${offer.seller}`, { id: row.id, seller: offer.seller, price: T(offer.price), title: book.title });
    counts.offers += 1;
  }

  // ---- requests: every state, threads, finished deals with reviews ----------
  const REQUESTS: Array<{
    offer: string;
    buyer: Person;
    status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
    delivery: 'IN_PERSON' | 'POST' | 'COURIER';
    offered?: number;
    note?: string;
    reason?: string;
    daysAgo: number;
    messages?: Array<[Person, string]>;
    review?: { buyer: [number, string]; seller: [number, string] };
  }> = [
    {
      offer: 'souvashoun:sara', buyer: 'reza', status: 'REQUESTED', delivery: 'POST', daysAgo: 0, note: 'لطفاً با پست پیشتاز بفرستید.',
      messages: [['reza', 'سلام، کتاب هنوز موجود است؟ می‌خواهم امروز سفارش بدهم.']],
    },
    {
      offer: 'shahnameh:karaj', buyer: 'rayan', status: 'ACCEPTED', delivery: 'COURIER', daysAgo: 1,
      messages: [
        ['rayan', 'برای هدیهٔ تولد می‌خواهم؛ تا پنج‌شنبه می‌رسد؟'],
        ['karaj', 'بله، فردا با پیک ارسال می‌شود و جعبهٔ هدیه هم دارد.'],
        ['rayan', 'عالی، ممنون.'],
      ],
    },
    {
      offer: 'blind-owl:hamid', buyer: 'sara', status: 'COMPLETED', delivery: 'POST', offered: 75_000, daysAgo: 12,
      messages: [['sara', 'هفتاد و پنج هزار تومان می‌دهید؟'], ['hamid', 'قبول، همین امروز می‌فرستم.']],
      review: { buyer: [5, 'بسته‌بندی عالی و سریع.'], seller: [5, 'خریدار خوش‌حساب.'] },
    },
    {
      offer: 'sapiens:omid', buyer: 'zahra', status: 'COMPLETED', delivery: 'COURIER', daysAgo: 20,
      review: { buyer: [4, 'کتاب همان‌طور بود که گفته شده بود؛ کمی دیر رسید.'], seller: [5, 'خریدار صبور و دقیق.'] },
    },
    { offer: 'kelidar:ali', buyer: 'niloofar', status: 'DECLINED', delivery: 'COURIER', daysAgo: 4, reason: 'دوره را به خریدار حضوری فروختم؛ متأسفم.' },
    { offer: 'hafez:zahra', buyer: 'hamid', status: 'CANCELLED', delivery: 'POST', daysAgo: 3 },
    {
      offer: 'calculus:hamid', buyer: 'omid', status: 'REQUESTED', delivery: 'IN_PERSON', offered: 500_000, daysAgo: 1, note: 'دانشجوی تبریز هستم؛ حضوری در دانشگاه تحویل بگیرم؟',
    },
  ];

  for (const request of REQUESTS) {
    const offer = offerIds.get(request.offer)!;
    const sellerId = id(offer.seller);
    const buyerId = id(request.buyer);
    const created = daysAgo(request.daysAgo);
    const unit = offer.price;
    const total = (request.offered !== undefined ? T(request.offered) : unit) + (request.delivery === 'IN_PERSON' ? 0n : 45_000n);
    const row = await prisma.bookRequest.create({
      data: {
        code: generateTrackingCode(),
        listingId: offer.id,
        buyerId,
        sellerId,
        quantity: 1,
        deliveryMethod: request.delivery,
        unitPrice: unit,
        shippingCost: request.delivery === 'IN_PERSON' ? 0n : 45_000n,
        offeredPrice: request.offered !== undefined ? T(request.offered) : null,
        note: request.note ?? null,
        status: request.status,
        respondedAt: request.status === 'REQUESTED' ? null : new Date(created.getTime() + 3 * 3_600_000),
        declineReason: request.reason ?? null,
        completedAt: request.status === 'COMPLETED' ? new Date(created.getTime() + 3 * DAY) : null,
        createdAt: created,
      },
      select: { id: true },
    });
    await manifest.record('bookRequest', row.id);
    counts.requests += 1;

    for (const [index, [sender, body]] of (request.messages ?? []).entries()) {
      const message = await prisma.marketplaceMessage.create({
        data: {
          bookRequestId: row.id,
          senderId: id(sender),
          body,
          createdAt: new Date(created.getTime() + (index + 1) * 600_000),
          readAt: index < (request.messages?.length ?? 0) - 1 ? new Date(created.getTime() + (index + 1) * 900_000) : null,
        },
        select: { id: true },
      });
      await manifest.record('marketplaceMessage', message.id);
    }

    if (request.status === 'ACCEPTED' || request.status === 'COMPLETED') {
      const done = request.status === 'COMPLETED';
      const award = await prisma.marketplaceAward.create({
        data: {
          bookRequestId: row.id,
          agreedAmount: total,
          currency: 'IRT',
          awardedById: buyerId,
          status: done ? 'COMPLETED' : 'ACTIVE',
          completedAt: done ? new Date(created.getTime() + 3 * DAY) : null,
          createdAt: created,
        },
        select: { id: true },
      });
      await manifest.record('marketplaceAward', award.id);
      const milestone = await prisma.marketplaceMilestone.create({
        data: {
          awardId: award.id,
          order: 1,
          title: 'تحویل کتاب',
          dueDate: new Date(created.getTime() + 7 * DAY),
          status: done ? 'APPROVED' : 'PENDING',
          deliveredAt: done ? new Date(created.getTime() + 3 * DAY) : null,
          approvedAt: done ? new Date(created.getTime() + 3 * DAY) : null,
        },
        select: { id: true },
      });
      await manifest.record('marketplaceMilestone', milestone.id);
      counts.deals += 1;
      if (done) {
        await prisma.bookListing.update({ where: { id: offer.id }, data: { soldCount: { increment: 1 } } });
      }
      if (done && request.review) {
        for (const [rater, ratee, [rating, text]] of [
          [buyerId, sellerId, request.review.buyer],
          [sellerId, buyerId, request.review.seller],
        ] as const) {
          const review = await prisma.marketplaceReview.create({
            data: { awardId: award.id, raterId: rater, rateeId: ratee, rating, text, createdAt: new Date(created.getTime() + 4 * DAY) },
            select: { id: true },
          });
          await manifest.record('marketplaceReview', review.id);
        }
      }
    }
  }

  return counts;
}
