import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/capabilities.dart';
import '../core/settings.dart';
import '../design/theme.dart';
import '../features/settings/update_screen.dart';
import '../l10n/l10n.dart';
import 'router.dart';

/// The company's name: Persian in Persian, the transliteration everywhere
/// else. The launcher name follows the same rule, from Android's
/// values/values-fa strings and iOS's en.lproj/fa.lproj InfoPlist.strings.
String appName(String language) =>
    language == 'fa' ? 'رایان تمدن جهان گستر' : 'Rayan Tamaddon Jahan Gostar';

class CiviTechApp extends ConsumerWidget {
  const CiviTechApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final language = ref.watch(l10nProvider.select((l) => l.language));
    final router = ref.watch(routerProvider);
    final highContrast = MediaQuery.maybeHighContrastOf(context) ?? false;

    return MaterialApp.router(
      onGenerateTitle: (_) => appName(language),
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      locale: Locale(language),
      supportedLocales: [for (final l in supportedLanguages) Locale(l)],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      themeMode: settings.themeMode,
      theme: buildTheme(
        settings.palette,
        Brightness.light,
        highContrast: highContrast,
      ),
      darkTheme: buildTheme(
        settings.palette,
        Brightness.dark,
        highContrast: highContrast,
      ),
      // Palette and theme changes cross-fade through the colour tokens.
      themeAnimationDuration: const Duration(milliseconds: 320),
      builder: (context, child) =>
          _SystemBars(child: _UpdateGate(child: child!)),
    );
  }
}

/// The app draws edge to edge, under transparent system bars, as Android 15
/// and later require. The bars' icons follow the app's own theme rather than
/// the phone's, so light pages get dark icons even on a phone set to dark.
class _SystemBars extends StatelessWidget {
  const _SystemBars({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
    value: systemBarsFor(Theme.of(context).brightness),
    child: child,
  );
}

/// Below the server's version floor nothing else is shown; below the latest
/// release, a one-time note offers the update.
class _UpdateGate extends ConsumerStatefulWidget {
  const _UpdateGate({required this.child});

  final Widget child;

  @override
  ConsumerState<_UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends ConsumerState<_UpdateGate> {
  bool _suggested = false;

  @override
  Widget build(BuildContext context) {
    final need = ref.watch(updateNeedProvider).value ?? UpdateNeed.none;
    if (need == UpdateNeed.required) return const UpdateRequiredScreen();
    if (need == UpdateNeed.suggested && !_suggested) {
      _suggested = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        final s = ref.read(stringsProvider);
        messenger?.showSnackBar(
          SnackBar(
            content: Text(s.mobile.updateAvailable),
            action: SnackBarAction(
              label: s.mobile.updateAction,
              onPressed: () => openStore(ref),
            ),
          ),
        );
      });
    }
    return widget.child;
  }
}
