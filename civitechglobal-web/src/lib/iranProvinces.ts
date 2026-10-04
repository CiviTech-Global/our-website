import type { Locale } from '@/i18n/locales';

/**
 * Iran's thirty-one provinces, said one way.
 *
 * A free-text province box let the same place arrive as «تهران», «استان تهران»
 * and "Tehran", and a filter on one of them missed the other two. Postings
 * store the Persian name — what the board has always stored — and every
 * screen picks from this list, so there is only ever one spelling to match.
 *
 * The slug is for addresses (/jobs/in/tehran): Latin, stable, and never shown.
 * Ordered by population, which is also the order people look for them in.
 */
export interface IranProvince {
  slug: string;
  fa: string;
  en: string;
}

export const IRAN_PROVINCES: IranProvince[] = [
  { slug: 'tehran', fa: 'تهران', en: 'Tehran' },
  { slug: 'razavi-khorasan', fa: 'خراسان رضوی', en: 'Razavi Khorasan' },
  { slug: 'isfahan', fa: 'اصفهان', en: 'Isfahan' },
  { slug: 'fars', fa: 'فارس', en: 'Fars' },
  { slug: 'khuzestan', fa: 'خوزستان', en: 'Khuzestan' },
  { slug: 'east-azerbaijan', fa: 'آذربایجان شرقی', en: 'East Azerbaijan' },
  { slug: 'mazandaran', fa: 'مازندران', en: 'Mazandaran' },
  { slug: 'west-azerbaijan', fa: 'آذربایجان غربی', en: 'West Azerbaijan' },
  { slug: 'kerman', fa: 'کرمان', en: 'Kerman' },
  { slug: 'alborz', fa: 'البرز', en: 'Alborz' },
  { slug: 'sistan-and-baluchestan', fa: 'سیستان و بلوچستان', en: 'Sistan and Baluchestan' },
  { slug: 'gilan', fa: 'گیلان', en: 'Gilan' },
  { slug: 'kermanshah', fa: 'کرمانشاه', en: 'Kermanshah' },
  { slug: 'golestan', fa: 'گلستان', en: 'Golestan' },
  { slug: 'hormozgan', fa: 'هرمزگان', en: 'Hormozgan' },
  { slug: 'lorestan', fa: 'لرستان', en: 'Lorestan' },
  { slug: 'hamadan', fa: 'همدان', en: 'Hamadan' },
  { slug: 'kurdistan', fa: 'کردستان', en: 'Kurdistan' },
  { slug: 'markazi', fa: 'مرکزی', en: 'Markazi' },
  { slug: 'qom', fa: 'قم', en: 'Qom' },
  { slug: 'qazvin', fa: 'قزوین', en: 'Qazvin' },
  { slug: 'ardabil', fa: 'اردبیل', en: 'Ardabil' },
  { slug: 'yazd', fa: 'یزد', en: 'Yazd' },
  { slug: 'zanjan', fa: 'زنجان', en: 'Zanjan' },
  { slug: 'bushehr', fa: 'بوشهر', en: 'Bushehr' },
  { slug: 'chaharmahal-and-bakhtiari', fa: 'چهارمحال و بختیاری', en: 'Chaharmahal and Bakhtiari' },
  { slug: 'north-khorasan', fa: 'خراسان شمالی', en: 'North Khorasan' },
  { slug: 'kohgiluyeh-and-boyer-ahmad', fa: 'کهگیلویه و بویراحمد', en: 'Kohgiluyeh and Boyer-Ahmad' },
  { slug: 'south-khorasan', fa: 'خراسان جنوبی', en: 'South Khorasan' },
  { slug: 'semnan', fa: 'سمنان', en: 'Semnan' },
  { slug: 'ilam', fa: 'ایلام', en: 'Ilam' },
];

/** A province's name for the reader: Persian for Persian, the English name otherwise. */
export function provinceLabel(province: IranProvince, locale: Locale): string {
  return locale === 'fa' ? province.fa : province.en;
}

/** The stored (Persian) name shown in the reader's language, or as stored if it is not one of ours. */
export function displayProvince(stored: string | null | undefined, locale: Locale): string {
  if (!stored) return '';
  const known = IRAN_PROVINCES.find((province) => province.fa === stored);
  return known ? provinceLabel(known, locale) : stored;
}

export function provinceBySlug(slug: string | undefined): IranProvince | undefined {
  return IRAN_PROVINCES.find((province) => province.slug === slug);
}
