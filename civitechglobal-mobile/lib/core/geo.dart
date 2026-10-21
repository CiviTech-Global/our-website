import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../l10n/l10n.dart';

/// Countries, currencies, languages and Iran's provinces, as the web's
/// lib/geo.ts and lib/iranProvinces.ts. Codes only are stored and sent
/// (ISO 3166-1, ISO 4217, and IRT, the toman, which Iranian postings quote
/// though it has no ISO code). Names come from `assets/geo/<language>.json`,
/// written by the web's export script from the same Intl data the website
/// names them with, already in each language's own order.

const homeCountry = 'IR';

/// Where Iranian job-seekers most often look, offered first in every picker.
const popularCountries = [
  'IR',
  'AE',
  'TR',
  'DE',
  'CA',
  'GB',
  'US',
  'NL',
  'AU',
  'QA',
  'OM',
  'IQ',
];

/// The web's CURRENCIES, in its order: the toman first.
const currencyCodes = [
  'IRT',
  'IRR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'TRY',
  'CAD',
  'AUD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'JPY',
  'CNY',
  'INR',
  'SAR',
  'QAR',
  'KWD',
  'OMR',
  'BHD',
  'IQD',
  'AFN',
  'AMD',
  'AZN',
  'GEL',
  'RUB',
  'MYR',
  'SGD',
  'NZD',
];

/// The currency a posting in this country most likely pays in.
const defaultCurrency = {
  'IR': 'IRT',
  'AE': 'AED',
  'TR': 'TRY',
  'DE': 'EUR',
  'NL': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'AT': 'EUR',
  'BE': 'EUR',
  'FI': 'EUR',
  'IE': 'EUR',
  'PT': 'EUR',
  'GR': 'EUR',
  'US': 'USD',
  'CA': 'CAD',
  'GB': 'GBP',
  'AU': 'AUD',
  'CH': 'CHF',
  'SE': 'SEK',
  'NO': 'NOK',
  'DK': 'DKK',
  'JP': 'JPY',
  'CN': 'CNY',
  'IN': 'INR',
  'SA': 'SAR',
  'QA': 'QAR',
  'KW': 'KWD',
  'OM': 'OMR',
  'BH': 'BHD',
  'IQ': 'IQD',
  'AF': 'AFN',
  'AM': 'AMD',
  'AZ': 'AZN',
  'GE': 'GEL',
  'RU': 'RUB',
  'MY': 'MYR',
  'SG': 'SGD',
  'NZ': 'NZD',
};

/// One of Iran's thirty-one provinces. Postings store the Persian name; the
/// slug is for addresses (/jobs/in/tehran) and never shown.
typedef IranProvince = ({String slug, String fa, String en});

/// Ordered by population, which is also the order people look for them in.
const iranProvinces = <IranProvince>[
  (slug: 'tehran', fa: 'تهران', en: 'Tehran'),
  (slug: 'razavi-khorasan', fa: 'خراسان رضوی', en: 'Razavi Khorasan'),
  (slug: 'isfahan', fa: 'اصفهان', en: 'Isfahan'),
  (slug: 'fars', fa: 'فارس', en: 'Fars'),
  (slug: 'khuzestan', fa: 'خوزستان', en: 'Khuzestan'),
  (slug: 'east-azerbaijan', fa: 'آذربایجان شرقی', en: 'East Azerbaijan'),
  (slug: 'mazandaran', fa: 'مازندران', en: 'Mazandaran'),
  (slug: 'west-azerbaijan', fa: 'آذربایجان غربی', en: 'West Azerbaijan'),
  (slug: 'kerman', fa: 'کرمان', en: 'Kerman'),
  (slug: 'alborz', fa: 'البرز', en: 'Alborz'),
  (
    slug: 'sistan-and-baluchestan',
    fa: 'سیستان و بلوچستان',
    en: 'Sistan and Baluchestan',
  ),
  (slug: 'gilan', fa: 'گیلان', en: 'Gilan'),
  (slug: 'kermanshah', fa: 'کرمانشاه', en: 'Kermanshah'),
  (slug: 'golestan', fa: 'گلستان', en: 'Golestan'),
  (slug: 'hormozgan', fa: 'هرمزگان', en: 'Hormozgan'),
  (slug: 'lorestan', fa: 'لرستان', en: 'Lorestan'),
  (slug: 'hamadan', fa: 'همدان', en: 'Hamadan'),
  (slug: 'kurdistan', fa: 'کردستان', en: 'Kurdistan'),
  (slug: 'markazi', fa: 'مرکزی', en: 'Markazi'),
  (slug: 'qom', fa: 'قم', en: 'Qom'),
  (slug: 'qazvin', fa: 'قزوین', en: 'Qazvin'),
  (slug: 'ardabil', fa: 'اردبیل', en: 'Ardabil'),
  (slug: 'yazd', fa: 'یزد', en: 'Yazd'),
  (slug: 'zanjan', fa: 'زنجان', en: 'Zanjan'),
  (slug: 'bushehr', fa: 'بوشهر', en: 'Bushehr'),
  (
    slug: 'chaharmahal-and-bakhtiari',
    fa: 'چهارمحال و بختیاری',
    en: 'Chaharmahal and Bakhtiari',
  ),
  (slug: 'north-khorasan', fa: 'خراسان شمالی', en: 'North Khorasan'),
  (
    slug: 'kohgiluyeh-and-boyer-ahmad',
    fa: 'کهگیلویه و بویراحمد',
    en: 'Kohgiluyeh and Boyer-Ahmad',
  ),
  (slug: 'south-khorasan', fa: 'خراسان جنوبی', en: 'South Khorasan'),
  (slug: 'semnan', fa: 'سمنان', en: 'Semnan'),
  (slug: 'ilam', fa: 'ایلام', en: 'Ilam'),
];

/// A province's name for the reader: Persian for Persian, English otherwise.
String provinceLabel(IranProvince province, String language) =>
    language == 'fa' ? province.fa : province.en;

/// A stored (Persian) province in the reader's language, or as stored if it
/// is not one of ours.
String displayProvince(String? stored, String language) {
  if (stored == null || stored.isEmpty) return '';
  for (final p in iranProvinces) {
    if (p.fa == stored) return provinceLabel(p, language);
  }
  return stored;
}

IranProvince? provinceBySlug(String? slug) {
  for (final p in iranProvinces) {
    if (p.slug == slug) return p;
  }
  return null;
}

/// Names of countries, currencies and languages in one language, each list
/// already in that language's alphabetical order.
class GeoNames {
  GeoNames.fromJson(Map<String, Object?> json)
    : countries = _pairs(json['countries']),
      currencies = _pairs(json['currencies']),
      languages = _pairs(json['languages']);

  GeoNames.empty()
    : countries = const [],
      currencies = const [],
      languages = const [];

  static List<(String, String)> _pairs(Object? value) => [
    for (final pair in (value as List? ?? const []))
      if (pair is List && pair.length == 2) ('${pair[0]}', '${pair[1]}'),
  ];

  final List<(String, String)> countries;
  final List<(String, String)> currencies;
  final List<(String, String)> languages;

  late final Map<String, String> _country = Map.fromEntries(
    countries.map((p) => MapEntry(p.$1, p.$2)),
  );
  late final Map<String, String> _currency = Map.fromEntries(
    currencies.map((p) => MapEntry(p.$1, p.$2)),
  );
  late final Map<String, String> _language = Map.fromEntries(
    languages.map((p) => MapEntry(p.$1, p.$2)),
  );

  /// "Germany", «آلمان», "Almanya", or the code if it has no name here.
  String country(String? code) {
    if (code == null || code.isEmpty) return '';
    return _country[code.toUpperCase()] ?? code;
  }

  /// "Euro (EUR)"; the toman is named by the dictionary.
  String currency(String code, String tomanLabel) {
    if (code == 'IRT') return tomanLabel;
    final name = _currency[code];
    return name == null ? code : '$name ($code)';
  }

  String language(String code) => _language[code] ?? code;

  /// For a picker: the popular countries first, then the rest by name.
  List<(String, String)> countryOptions() => [
    for (final code in popularCountries) (code, country(code)),
    for (final pair in countries)
      if (!popularCountries.contains(pair.$1)) pair,
  ];
}

/// The names in the app's language; empty (codes shown) until they load.
final geoNamesProvider = FutureProvider<GeoNames>((ref) async {
  final language = ref.watch(l10nProvider.select((l) => l.language));
  try {
    return GeoNames.fromJson(await loadJsonAsset('assets/geo/$language.json'));
  } catch (_) {
    return GeoNames.empty();
  }
});

/// A whole number in the reader's numerals and grouping: «۷۰٬۰۰۰٬۰۰۰»,
/// "70,000,000", "70.000.000". Amounts arrive as strings: in tomans they
/// pass 2^53.
String groupedNumber(String digits, String language) {
  final clean = toLatinPlain(digits);
  if (clean.isEmpty) return '';
  // Grouped here, in threes (all six languages do), with the language's
  // own separator and numerals: intl's own BigInt path throws.
  final symbols = NumberFormat.decimalPattern(language).symbols;
  final zero = symbols.ZERO_DIGIT.codeUnitAt(0);
  final out = StringBuffer();
  for (var i = 0; i < clean.length; i++) {
    if (i > 0 && (clean.length - i) % 3 == 0) out.write(symbols.GROUP_SEP);
    out.writeCharCode(zero + clean.codeUnitAt(i) - 0x30);
  }
  return out.toString();
}

/// Only the Latin digits of [value].
String toLatinPlain(String value) =>
    value.replaceAll(RegExp('[^0-9]'), '').replaceFirst(RegExp('^0+(?=.)'), '');

/// A pay figure in its own currency: «۶۰٬۰۰۰٬۰۰۰ تومان», "€4,500", "4.500 €".
/// The toman through the dictionary's word for it; every ISO currency
/// through intl, which places the symbol the way the reader's language
/// does, as the web's formatMoneyIn.
String? formatMoneyIn(
  String? value,
  String currency,
  String language,
  String tomanLabel,
) {
  if (value == null) return null;
  final clean = toLatinPlain(value);
  if (clean.isEmpty) return null;
  if (currency == 'IRT') return '${groupedNumber(clean, language)} $tomanLabel';
  try {
    // The symbol where the language puts it: intl formats a zero, and the
    // amount (grouped as above) takes the zero's place.
    final format = NumberFormat.simpleCurrency(
      locale: language,
      name: currency,
      decimalDigits: 0,
    );
    return format
        .format(0)
        .replaceFirst(
          format.symbols.ZERO_DIGIT,
          groupedNumber(clean, language),
        );
  } catch (_) {
    return '${groupedNumber(clean, language)} $currency';
  }
}
