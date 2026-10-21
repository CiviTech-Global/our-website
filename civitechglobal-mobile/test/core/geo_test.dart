import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/geo.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:flutter_test/flutter_test.dart';

GeoNames _names(String language) => GeoNames.fromJson(
  jsonDecode(File('assets/geo/$language.json').readAsStringSync())
      as Map<String, Object?>,
);

void main() {
  test('every code the app offers has a name in every language', () {
    // The export script writes these only with --geo, so nothing else
    // notices a code added to the web's lists without regenerating them.
    for (final language in supportedLanguages) {
      final names = _names(language);
      final countries = {for (final (code, _) in names.countries) code};
      final currencies = {for (final (code, _) in names.currencies) code};
      for (final code in [...popularCountries, ...defaultCurrency.keys]) {
        expect(countries, contains(code), reason: '$language $code');
      }
      for (final code in currencyCodes.where((c) => c != 'IRT')) {
        expect(currencies, contains(code), reason: '$language $code');
      }
      expect(names.country('DE'), isNot('DE'), reason: language);
    }
  });

  test('popular countries come first, the rest without repeats', () {
    final options = _names('fa').countryOptions();
    expect(
      options.take(popularCountries.length).map((o) => o.$1),
      popularCountries,
    );
    expect(options.map((o) => o.$1).toSet(), hasLength(options.length));
  });

  test('amounts group in the reader\'s numerals, past 2^53', () {
    expect(groupedNumber('70000000', 'fa'), '۷۰٬۰۰۰٬۰۰۰');
    expect(groupedNumber('70000000', 'en'), '70,000,000');
    expect(groupedNumber('70000000', 'de'), '70.000.000');
    expect(
      groupedNumber('12345678901234567890', 'en'),
      '12,345,678,901,234,567,890',
    );
  });

  test('money names its currency the way the reader\'s language does', () {
    expect(formatMoneyIn('70000000', 'IRT', 'fa', 'تومان'), '۷۰٬۰۰۰٬۰۰۰ تومان');
    expect(formatMoneyIn('4500', 'EUR', 'en', 'toman'), '€4,500');
    expect(formatMoneyIn('4500', 'EUR', 'de', 'Toman'), contains('€'));
    expect(formatMoneyIn('', 'EUR', 'en', 'toman'), isNull);
  });

  test('a stored province reads in the reader\'s language', () {
    expect(displayProvince('اصفهان', 'en'), 'Isfahan');
    expect(displayProvince('اصفهان', 'fa'), 'اصفهان');
    expect(displayProvince('Somewhere', 'en'), 'Somewhere');
    expect(provinceBySlug('qazvin')?.fa, 'قزوین');
  });
}
