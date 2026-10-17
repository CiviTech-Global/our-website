import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'core/settings.dart';
import 'core/telemetry.dart';
import 'l10n/l10n.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Telemetry.install();
  // Edge to edge on every Android version, not only the ones that force it,
  // so the app looks the same on an Android 10 phone as on Android 16.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Everything the first frame needs, before it is drawn: the person's
  // settings and the words of their language. The splash screen covers it.
  final prefs = await SharedPreferences.getInstance();
  final saved = prefs.getString('settings.language');
  final language = supportedLanguages.contains(saved)
      ? saved!
      : deviceLanguage();
  final strings = await loadStrings(language);
  Telemetry.release = (await PackageInfo.fromPlatform()).version;

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState(language, strings)),
        ),
      ],
      child: const CiviTechApp(),
    ),
  );
}
