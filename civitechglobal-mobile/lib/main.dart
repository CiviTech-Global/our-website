import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  runApp(const CiviTechApp());
}

/// The languages the web offers, Persian first — the same six.
const supportedLocales = [
  Locale('fa'),
  Locale('en'),
  Locale('tr'),
  Locale('de'),
  Locale('fr'),
  Locale('es'),
];

/// The company's name: Persian in Persian, the transliteration everywhere
/// else. The launcher name follows the same rule, from Android's
/// values/values-fa strings and iOS's en.lproj/fa.lproj InfoPlist.strings.
String appName(Locale locale) => locale.languageCode == 'fa'
    ? 'رایان تمدن جهان گستر'
    : 'Rayan Tamaddon Jahan Gostar';

/// The app's root. A placeholder until routing, localisation and the API
/// client land; it exists so the project builds, analyses and tests clean.
class CiviTechApp extends StatelessWidget {
  const CiviTechApp({super.key, this.locale});

  /// The app's own language choice. Null follows the device.
  final Locale? locale;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      onGenerateTitle: (context) => appName(Localizations.localeOf(context)),
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        // The web's --color-brand-green-500, oklch(52.5% 0.093 182).
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF057B6E)),
      ),
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(child: Text(appName(Localizations.localeOf(context)))),
        ),
      ),
    );
  }
}
