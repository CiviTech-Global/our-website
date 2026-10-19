import 'package:civitech_global_flutter/app/app.dart';
import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/capabilities.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api_client_test.dart' show MemoryTokens;

/// The app as a person meets it, with the network and the Keystore replaced.
///
/// Motion is reduced in every test so the turning garden and the kinetic
/// headline settle instead of animating forever.
Future<void> pumpApp(
  WidgetTester tester, {
  String? language,
  Capabilities caps = const Capabilities(),
}) async {
  SharedPreferences.setMockInitialValues({
    'settings.reduceMotion': true,
    'settings.language': ?language,
  });
  final prefs = await SharedPreferences.getInstance();
  final start = language ?? 'fa';
  final strings = await loadStrings(start);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState(start, strings)),
        ),
        tokenStoreProvider.overrideWithValue(MemoryTokens()),
        capabilitiesProvider.overrideWith((ref) async => caps),
        updateNeedProvider.overrideWith((ref) async => UpdateNeed.none),
      ],
      child: const CiviTechApp(),
    ),
  );
  await settle(tester);
}

/// Lets a navigation finish: page transitions run for most of a second.
Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 300));
  }
}

void main() {
  testWidgets('a first launch asks for the language before anything else', (
    tester,
  ) async {
    await pumpApp(tester);

    expect(find.text('Choose your language'), findsOneWidget);
    await tester.tap(find.text('English'));
    await settle(tester);

    expect(find.text('Choose your language'), findsNothing);
    expect(find.text('Explore'), findsWidgets);
    expect(
      find.bySemanticsLabel('Building the future of civic technology'),
      findsOneWidget,
    );
  });

  testWidgets('Persian runs right to left, with the Persian name and tabs', (
    tester,
  ) async {
    await pumpApp(tester, language: 'fa');

    expect(find.text('کاوش'), findsWidgets);
    final home = tester.element(find.text('خانه').first);
    expect(Directionality.of(home), TextDirection.rtl);
    final title = tester.widget<Title>(find.byType(Title));
    expect(title.title, 'رایان تمدن جهان گستر');
  });

  testWidgets('Explore hides a module whose server switch is off', (
    tester,
  ) async {
    await pumpApp(tester, language: 'en');
    await tester.tap(find.text('Explore').last);
    await settle(tester);
    expect(find.text('Local Market'), findsNothing);
  });

  testWidgets('Explore shows it once the switch is on', (tester) async {
    await pumpApp(
      tester,
      language: 'en',
      caps: const Capabilities(features: {'tradeMaster': true}),
    );
    await tester.tap(find.text('Explore').last);
    await settle(tester);
    expect(find.text('Local Market'), findsOneWidget);
  });

  testWidgets('B is the default palette, and choosing another applies it', (
    tester,
  ) async {
    await pumpApp(tester, language: 'en');
    BaghColors colors() =>
        BaghColors.of(tester.element(find.byType(Scaffold).first));
    expect(
      colors().primary,
      BaghColors.resolve(GardenPalette.pistachio, Brightness.light).primary,
    );

    await tester.tap(find.text('Me').last);
    await settle(tester);
    await tester.tap(find.text('Settings'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Lapis & Apricot'), 120);
    await tester.tap(find.text('Lapis & Apricot'));
    await settle(tester);

    expect(
      colors().primary,
      BaghColors.resolve(GardenPalette.lapis, Brightness.light).primary,
    );
  });

  group('website addresses', () {
    Future<String> visit(WidgetTester tester, String path) async {
      final router = GoRouter.of(tester.element(find.byType(Scaffold).first));
      router.go(path);
      await settle(tester);
      return router.routerDelegate.currentConfiguration.uri.toString();
    }

    testWidgets('lose their language prefix', (tester) async {
      await pumpApp(tester, language: 'en');
      expect(await visit(tester, '/de/team'), '/team');
      expect(await visit(tester, '/fr'), '/');
      expect(await visit(tester, '/en/track?code=AB12'), '/track?code=AB12');
    });

    testWidgets('a proposal opens on the tracking screen', (tester) async {
      await pumpApp(tester, language: 'en');
      expect(await visit(tester, '/proposal/PROJ1234'), '/track?code=PROJ1234');
    });

    testWidgets('the member inbox is the Inbox tab', (tester) async {
      await pumpApp(tester, language: 'en');
      expect(await visit(tester, '/dashboard/messages'), '/inbox');
      expect(
        await visit(tester, '/dashboard/notifications'),
        '/inbox?tab=notifications',
      );
      // A message notice from before the thread kind was in its link.
      expect(await visit(tester, '/dashboard/messages/abc123'), '/inbox');
    });

    testWidgets('a thread asks a signed-out visitor to sign in', (
      tester,
    ) async {
      await pumpApp(tester, language: 'en');
      final at = Uri.parse(await visit(tester, '/dashboard/messages/b/t1'));
      expect(at.path, '/login');
      expect(at.queryParameters['from'], '/dashboard/messages/b/t1');
    });

    testWidgets('a guide opens over the help centre', (tester) async {
      await pumpApp(tester, language: 'en');
      expect(await visit(tester, '/help/consult'), '/help/consult');
      await settle(tester);
      // The intro is in the guide, not in the centre's list.
      expect(find.textContaining('Your career path'), findsOneWidget);
    });
  });

  testWidgets('the sign-in form checks its fields before asking the server', (
    tester,
  ) async {
    await pumpApp(tester, language: 'en');
    await tester.tap(find.text('Me').last);
    await settle(tester);
    await tester.tap(find.text('Login').first);
    await settle(tester);

    await tester.tap(find.text('Sign in').last);
    await tester.pump();

    expect(find.text('This field is required'), findsWidgets);
  });
}
