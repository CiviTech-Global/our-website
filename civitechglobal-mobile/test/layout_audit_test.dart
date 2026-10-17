import 'dart:async';

import 'package:civitech_global_flutter/app/app.dart';
import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/capabilities.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/features/account/security_screen.dart';
import 'package:civitech_global_flutter/features/help/help_sheet.dart';
import 'package:civitech_global_flutter/features/start/modules.dart';
import 'package:civitech_global_flutter/features/start/start_sheet.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api_client_test.dart' show MemoryTokens;

/// Every screen, in every place it can be squeezed.
///
/// A layout that overflows raises an exception in a widget test, so this
/// renders each screen and sheet across the dimensions that break layouts:
/// the narrowest common phone and a tablet, portrait and landscape, short
/// and long languages (German has the longest words of the six), normal and
/// doubled text, and every theme in light and dark (the glass style lays out
/// some parts differently). Any overflow fails the test with the screen and
/// the conditions in its name.
class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'maryam.ahmadi.long.address@example.com',
    firstName: 'Maryam-Alexandra',
    lastName: 'Ahmadi-Khorasani',
    role: 'ADMIN',
  );
}

const _sizes = {
  'small phone': Size(320, 568),
  'phone': Size(412, 915),
  'landscape': Size(915, 412),
  'tablet': Size(800, 1280),
};

const _screens = [
  '/',
  '/explore',
  '/inbox',
  '/me',
  '/me/settings',
  '/me/security',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=t',
  '/reset-password',
];

const _sheets = ['start', 'module', 'help'];

Future<void> _pump(
  WidgetTester tester, {
  required String language,
  required Size size,
  required double textScale,
  required GardenPalette palette,
  required ThemeMode mode,
  bool signedIn = false,
}) async {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  SharedPreferences.setMockInitialValues({
    'settings.reduceMotion': true,
    'settings.language': language,
    'settings.palette': palette.name,
    'settings.themeMode': mode.name,
  });
  final prefs = await SharedPreferences.getInstance();
  final strings = await loadStrings(language);
  await tester.pumpWidget(
    ProviderScope(
      // A new container every time: a rebuilt scope keeps its first
      // overrides, so a second language or palette would never apply.
      key: UniqueKey(),
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState(language, strings)),
        ),
        tokenStoreProvider.overrideWithValue(MemoryTokens()),
        capabilitiesProvider.overrideWith(
          (ref) async => const Capabilities(
            email: true,
            features: {
              'tradeMaster': true,
              'booksV2': true,
              'projectsV2': true,
              'jobsV2': true,
            },
          ),
        ),
        updateNeedProvider.overrideWith((ref) async => UpdateNeed.none),
        mfaStatusProvider.overrideWith(
          (ref) async => (enabled: true, codesLeft: 2),
        ),
        if (signedIn) sessionProvider.overrideWith(_SignedIn.new),
      ],
      child: const CiviTechApp(),
    ),
  );
  await _settle(tester);
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 300));
  }
}

void _open(WidgetTester tester, String target) {
  final context = tester.element(find.byType(Scaffold).first);
  // Opened, not awaited: a sheet's future completes only when it closes.
  switch (target) {
    case 'start':
      unawaited(showStartSheet(context));
    case 'module':
      unawaited(showModuleSoon(context, exploreModules.first));
    case 'help':
      unawaited(showHelp(context, 'home'));
    default:
      GoRouter.of(context).go(target);
  }
}

void main() {
  // The real font, not the test font (Ahem draws every glyph as a full
  // square, which makes text far wider than on a phone): measurements here
  // must match what a person sees.
  setUpAll(() async {
    final vazirmatn = FontLoader('Vazirmatn')
      ..addFont(rootBundle.load('assets/fonts/Vazirmatn-Variable.ttf'));
    await vazirmatn.load();
  });

  final cases = <(String, Size, double, GardenPalette, ThemeMode)>[
    // Layout depends mostly on language, width and text size.
    for (final language in ['fa', 'en', 'de'])
      for (final size in _sizes.entries)
        for (final scale in [1.0, 2.0])
          (
            language,
            size.value,
            scale,
            GardenPalette.pistachio,
            ThemeMode.light,
          ),
    // The glass style lays out the bar, keys and surfaces differently.
    for (final size in _sizes.entries)
      for (final scale in [1.0, 2.0])
        (
          size.key == 'phone' ? 'en' : 'fa',
          size.value,
          scale,
          GardenPalette.abgineh,
          ThemeMode.dark,
        ),
    // And every other theme once, light and dark, at the tightest size.
    for (final palette in GardenPalette.values)
      for (final mode in [ThemeMode.light, ThemeMode.dark])
        ('de', const Size(320, 568), 1.3, palette, mode),
  ];

  for (final (language, size, scale, palette, mode) in cases) {
    final where =
        '$language ${size.width.toInt()}x${size.height.toInt()} '
        'text×$scale ${palette.name} ${mode.name}';
    for (final signedIn in [false, true]) {
      for (final target in [..._screens, ..._sheets]) {
        // Signed-in only changes Home and Me; skip the rest twice over.
        if (signedIn && !['/', '/me'].contains(target)) continue;
        testWidgets('$target ${signedIn ? '(signed in) ' : ''}fits: $where', (
          tester,
        ) async {
          await _pump(
            tester,
            language: language,
            size: size,
            textScale: scale,
            palette: palette,
            mode: mode,
            signedIn: signedIn,
          );
          _open(tester, target);
          await _settle(tester);
          final error = tester.takeException();
          // The full report names the widget that overflowed and by how much.
          expect(
            error,
            isNull,
            reason: error is FlutterError ? error.toStringDeep() : '$error',
          );
        });
      }
    }
  }

  testWidgets('the raised + key is drawn whole and tappable to its top edge', (
    tester,
  ) async {
    for (final palette in GardenPalette.values) {
      await _pump(
        tester,
        language: 'en',
        size: const Size(412, 915),
        textScale: 1,
        palette: palette,
        mode: ThemeMode.light,
      );
      final key = find.bySemanticsLabel('Start');
      final rect = tester.getRect(key);
      // Tap 4px inside its top edge: the part raised above the bar.
      await tester.tapAt(Offset(rect.center.dx, rect.top + 4));
      await _settle(tester);
      expect(
        find.text('What would you like to start?'),
        findsOneWidget,
        reason: '${palette.name}: the raised part of + did not respond',
      );
    }
  });

  testWidgets('tab labels stay readable in every language on a 320 px phone', (
    tester,
  ) async {
    // 1.0 and 1.3: the bar caps its own text scaling at 1.3, its largest.
    for (final (language, textScale) in [
      for (final l in supportedLanguages) ...[(l, 1.0), (l, 1.3)],
    ]) {
      await _pump(
        tester,
        language: language,
        size: const Size(320, 568),
        textScale: textScale,
        palette: GardenPalette.pistachio,
        mode: ThemeMode.light,
      );
      final strings = await loadStrings(language);
      final tabs = {
        strings.mobile.tabHome,
        strings.mobile.tabExplore,
        strings.mobile.tabInbox,
        strings.mobile.tabMe,
      };
      final labels = find.byWidgetPredicate(
        (w) =>
            w is FittedBox &&
            w.child is Text &&
            tabs.contains((w.child! as Text).data),
      );
      expect(labels, findsNWidgets(4), reason: language);
      for (final element in labels.evaluate()) {
        final box = element.renderObject! as RenderBox;
        final text =
            find
                    .descendant(
                      of: find.byWidget(element.widget),
                      matching: find.byType(Text),
                    )
                    .evaluate()
                    .single
                    .renderObject!
                as RenderBox;
        final fit = (box.size.width / text.size.width).clamp(0.0, 1.0);
        // What the reader sees: the 12 px label, grown by their text size,
        // shrunk to fit. Never below 11 px, i.e. never noticeably smaller
        // than at the normal text size.
        final onScreen = 12 * textScale * fit;
        expect(
          onScreen,
          greaterThanOrEqualTo(11),
          reason:
              '$language at text×$textScale: '
              '"${((element.widget as FittedBox).child! as Text).data}" '
              'renders at ${onScreen.toStringAsFixed(1)} px',
        );
      }
    }
  });

  testWidgets('pressing a key moves nothing around it', (tester) async {
    for (final palette in GardenPalette.values) {
      await _pump(
        tester,
        language: 'en',
        size: const Size(412, 915),
        textScale: 1,
        palette: palette,
        mode: ThemeMode.light,
      );
      await tester.tap(find.text('Me').last);
      await _settle(tester);
      final below = find.text('Settings');
      final before = tester.getRect(below);
      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Login').first),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.getRect(below), before, reason: palette.name);
      await gesture.cancel();
      await _settle(tester);
    }
  });
}
