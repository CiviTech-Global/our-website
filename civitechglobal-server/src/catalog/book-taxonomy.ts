/**
 * The book market's fixed vocabularies, as data.
 *
 * BOOK CATEGORIES are the shelves. Built from how Iranian bookshops and the
 * book sites people here already use (Iranketab, Taaghche, Fidibo, 30book)
 * shelve their stock, merged with Bookshop.org's shelves for the international
 * side, and with three shelves those sites underplay but a second-hand market
 * lives on: university textbooks, test preparation (konkur), and rare and
 * out-of-print books. Two levels; choosing a shelf matches everything on it.
 *
 * Seeded by slug and never overwritten, like every other list on the site.
 *
 * BINDINGS, TRIM SIZES and CONDITION GRADES are keys, shown in the reader's
 * own language. The trim sizes are the Iranian trade's own names (رقعی, وزیری
 * …), because that is how a buyer here asks for a book; the grades follow the
 * scale the used-book trade uses everywhere (AbeBooks, Amazon): new, like new,
 * very good, good, acceptable.
 */

export interface BookTaxonomyNode {
  slug: string;
  name: string;
  nameEn: string;
  children?: Array<{ slug: string; name: string; nameEn: string }>;
}

const c = (slug: string, name: string, nameEn: string) => ({ slug, name, nameEn });

export const BOOK_CATEGORIES: BookTaxonomyNode[] = [
  {
    slug: 'b-literature',
    name: 'ادبیات',
    nameEn: 'Literature & fiction',
    children: [
      c('b-iranian-novel', 'رمان ایرانی', 'Iranian novels'),
      c('b-world-novel', 'رمان خارجی', 'World fiction'),
      c('b-short-stories', 'داستان کوتاه', 'Short stories'),
      c('b-classic-poetry', 'شعر کلاسیک', 'Classical poetry'),
      c('b-modern-poetry', 'شعر معاصر', 'Modern poetry'),
      c('b-drama', 'نمایشنامه', 'Drama & plays'),
      c('b-crime', 'جنایی و معمایی', 'Crime & mystery'),
      c('b-fantasy-scifi', 'فانتزی و علمی‌تخیلی', 'Fantasy & science fiction'),
      c('b-humor', 'طنز', 'Humour'),
      c('b-literary-criticism', 'نقد و نظریهٔ ادبی', 'Literary criticism'),
    ],
  },
  {
    slug: 'b-kids',
    name: 'کودک و نوجوان',
    nameEn: 'Children & young adult',
    children: [
      c('b-picture-books', 'خردسال و کتاب تصویری', 'Picture books'),
      c('b-children', 'کودک', 'Children'),
      c('b-young-adult', 'نوجوان', 'Young adult'),
      c('b-comics', 'کمیک و رمان مصور', 'Comics & graphic novels'),
      c('b-kids-education', 'آموزشی کودک', 'Learning for children'),
    ],
  },
  {
    slug: 'b-humanities',
    name: 'علوم انسانی',
    nameEn: 'Humanities',
    children: [
      c('b-history', 'تاریخ', 'History'),
      c('b-biography', 'زندگی‌نامه و خاطرات', 'Biography & memoir'),
      c('b-philosophy', 'فلسفه و منطق', 'Philosophy'),
      c('b-religion', 'دین و عرفان', 'Religion & mysticism'),
      c('b-psychology', 'روان‌شناسی', 'Psychology'),
      c('b-sociology', 'جامعه‌شناسی', 'Sociology'),
      c('b-politics', 'سیاست و روابط بین‌الملل', 'Politics'),
      c('b-law', 'حقوق', 'Law'),
      c('b-geography', 'جغرافیا و سفرنامه', 'Geography & travel'),
    ],
  },
  {
    slug: 'b-business',
    name: 'اقتصاد، مدیریت و موفقیت',
    nameEn: 'Business & self-help',
    children: [
      c('b-economics', 'اقتصاد', 'Economics'),
      c('b-management', 'مدیریت و کسب‌وکار', 'Management & business'),
      c('b-marketing', 'بازاریابی و فروش', 'Marketing & sales'),
      c('b-finance', 'مالی و سرمایه‌گذاری', 'Finance & investing'),
      c('b-self-help', 'موفقیت و خودیاری', 'Self-help'),
      c('b-parenting', 'خانواده و فرزندپروری', 'Family & parenting'),
    ],
  },
  {
    slug: 'b-science',
    name: 'علوم و فناوری',
    nameEn: 'Science & technology',
    children: [
      c('b-popular-science', 'علمی عمومی', 'Popular science'),
      c('b-math', 'ریاضیات', 'Mathematics'),
      c('b-physics-chem', 'فیزیک و شیمی', 'Physics & chemistry'),
      c('b-biology', 'زیست‌شناسی', 'Biology'),
      c('b-medicine', 'پزشکی و سلامت', 'Medicine & health'),
      c('b-engineering', 'مهندسی', 'Engineering'),
      c('b-computing', 'کامپیوتر و برنامه‌نویسی', 'Computing & programming'),
      c('b-agriculture', 'کشاورزی و محیط زیست', 'Agriculture & environment'),
    ],
  },
  {
    slug: 'b-arts',
    name: 'هنر و سبک زندگی',
    nameEn: 'Arts & lifestyle',
    children: [
      c('b-cinema', 'سینما و تئاتر', 'Film & theatre'),
      c('b-music', 'موسیقی', 'Music'),
      c('b-visual-arts', 'نقاشی، خوشنویسی و عکاسی', 'Painting, calligraphy & photography'),
      c('b-architecture', 'معماری و طراحی', 'Architecture & design'),
      c('b-cooking', 'آشپزی', 'Cooking'),
      c('b-sport', 'ورزش و سرگرمی', 'Sport & hobbies'),
    ],
  },
  {
    slug: 'b-education',
    name: 'آموزشی و دانشگاهی',
    nameEn: 'Education & academic',
    children: [
      c('b-konkur', 'کنکور و کمک‌درسی', 'Konkur & study guides'),
      c('b-school', 'کتاب درسی مدرسه', 'School textbooks'),
      c('b-university', 'کتاب دانشگاهی', 'University textbooks'),
      c('b-language-learning', 'آموزش زبان', 'Language learning'),
      c('b-exam-prep', 'آزمون‌های بین‌المللی (آیلتس، تافل…)', 'International exams (IELTS, TOEFL…)'),
      c('b-reference', 'مرجع، فرهنگ لغت و دانشنامه', 'Reference & dictionaries'),
    ],
  },
  {
    slug: 'b-foreign',
    name: 'کتاب‌های زبان اصلی',
    nameEn: 'Foreign-language books',
    children: [
      c('b-english', 'انگلیسی', 'English'),
      c('b-arabic', 'عربی', 'Arabic'),
      c('b-other-languages', 'دیگر زبان‌ها', 'Other languages'),
    ],
  },
  {
    slug: 'b-collectible',
    name: 'کمیاب و قدیمی',
    nameEn: 'Rare & collectible',
    children: [
      c('b-out-of-print', 'نایاب و تجدیدچاپ‌نشده', 'Out of print'),
      c('b-first-editions', 'چاپ اول و نسخه‌های امضاشده', 'First & signed editions'),
      c('b-old-magazines', 'مجله‌های قدیمی', 'Vintage magazines'),
      c('b-manuscripts', 'چاپ سنگی و نسخه‌های خطی', 'Lithographs & manuscripts'),
    ],
  },
];

/** How a book is bound. */
export const BOOK_BINDINGS = ['PAPERBACK', 'HARDCOVER', 'SPIRAL', 'BOARD', 'LEATHER', 'OTHER'] as const;
export type BookBinding = (typeof BOOK_BINDINGS)[number];

/** The Iranian trade's trim sizes, smallest first. */
export const BOOK_TRIM_SIZES = ['POCKET', 'PALTOI', 'ROGHEI', 'VAZIRI', 'KHESHTI', 'RAHLI', 'OTHER'] as const;
export type BookTrimSize = (typeof BOOK_TRIM_SIZES)[number];

/** The used-book trade's condition scale, best first. */
export const BOOK_GRADES = ['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE'] as const;
export type BookGrade = (typeof BOOK_GRADES)[number];

/** How a copy can reach its buyer. */
export const BOOK_DELIVERY = ['IN_PERSON', 'POST', 'COURIER'] as const;
export type BookDelivery = (typeof BOOK_DELIVERY)[number];

/** The calendar a publication year is written in: Iranian books carry a solar year. */
export const YEAR_CALENDARS = ['SOLAR', 'GREGORIAN'] as const;

/** At most this many photos of one copy. */
export const MAX_BOOK_PHOTOS = 6;

/**
 * An ISBN, checked properly: ISBN-10 and ISBN-13 both carry a check digit,
 * and a typo almost always breaks it — which is what makes it worth checking
 * before two listings of the same book fail to find each other.
 */
export function normalizeIsbnStrict(raw: string): string | null {
  const value = raw.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(value)) {
    const sum = [...value.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(value[12]) ? value : null;
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    const sum = [...value].reduce((total, char, index) => total + (char === 'X' ? 10 : Number(char)) * (10 - index), 0);
    if (sum % 11 !== 0) return null;
    // Stored as ISBN-13, so the two forms of one book are one key.
    const core = `978${value.slice(0, 9)}`;
    const check = (10 - ([...core].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0) % 10)) % 10;
    return `${core}${check}`;
  }
  return null;
}
