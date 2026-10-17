import 'package:civitech_global_flutter/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('is named in Persian when the app speaks Persian', (
    tester,
  ) async {
    await tester.pumpWidget(const CiviTechApp(locale: Locale('fa')));

    expect(find.text('رایان تمدن جهان گستر'), findsOneWidget);
    expect(
      tester.widget<Title>(find.byType(Title)).title,
      'رایان تمدن جهان گستر',
    );
    expect(
      Directionality.of(tester.element(find.byType(Scaffold))),
      TextDirection.rtl,
    );
  });

  testWidgets('is transliterated in every other language', (tester) async {
    for (final locale in supportedLocales.where(
      (l) => l.languageCode != 'fa',
    )) {
      await tester.pumpWidget(CiviTechApp(locale: locale));

      expect(
        find.text('Rayan Tamaddon Jahan Gostar'),
        findsOneWidget,
        reason: '$locale',
      );
      expect(
        tester.widget<Title>(find.byType(Title)).title,
        'Rayan Tamaddon Jahan Gostar',
      );
    }
  });
}
