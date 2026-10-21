import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/features/intake/track_screen.dart'
    show StatusPill;
import 'package:civitech_global_flutter/features/jobs/job_board_screen.dart';
import 'package:civitech_global_flutter/features/jobs/jobs_data.dart';
import 'package:civitech_global_flutter/features/jobs/seeker_data.dart';
import 'package:civitech_global_flutter/features/jobs/seeker_screens.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async =>
      const AuthUser(id: 'u1', email: 'a@b.c', firstName: 'M', lastName: 'A');
}

Map<String, Object?> _application(String status, String outcome) => {
  'id': 'a-$status',
  'moderationStatus': status,
  'outcome': outcome,
  'createdAt': '2026-10-01T10:00:00Z',
  'job': {'code': 'J1', 'title': 'Engineer $status', 'state': 'OPEN'},
};

/// [screen] at [path] in a small router (pages push), against [server].
Future<void> _pump(
  WidgetTester tester,
  FakeServer server,
  Widget screen,
) async {
  tester.view
    ..physicalSize = const Size(900, 4000)
    ..devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({'settings.reduceMotion': true});
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState('en', _strings)),
        ),
        apiClientProvider.overrideWithValue(
          ApiClient(
            tokens: MemoryTokens(),
            language: () => 'en',
            dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
              ..httpClientAdapter = server,
          ),
        ),
        sessionProvider.overrideWith(_SignedIn.new),
      ],
      child: MaterialApp.router(
        theme: buildTheme(GardenPalette.pistachio, Brightness.light),
        routerConfig: GoRouter(
          routes: [GoRoute(path: '/', builder: (_, _) => screen)],
        ),
      ),
    ),
  );
  await _settle(tester);
}

/// Requests started after a frame wait on timers the fake clock only runs
/// as time passes.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
  await tester.pumpAndSettle();
}

List<String> _writes(FakeServer server) => [
  for (final o in server.requests)
    if (o.method != 'GET') '${o.method} ${o.path}',
];

void main() {
  group('a saved search', () {
    test('carries only what it can, and opens at the same filters', () {
      const q = JobQuery(
        search: ' react ',
        province: 'تهران',
        seniority: 'SENIOR',
        // Not part of an alert: they are not saved.
        benefits: ['INSURANCE'],
        urgent: true,
      );
      final alert = alertQueryOf(q);
      expect(alert, {
        'search': 'react',
        'province': 'تهران',
        'seniority': 'SENIOR',
      });
      expect(
        jobQueryOf(alert),
        const JobQuery(search: 'react', province: 'تهران', seniority: 'SENIOR'),
      );
    });

    test("reads the website board's own address, where search is q", () {
      expect(jobQueryOf({'q': 'flutter'}).search, 'flutter');
    });
  });

  testWidgets('the employer\'s verdict shows only once the review passed it', (
    tester,
  ) async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': [
            _application('APPROVED', 'SHORTLISTED'),
            _application('PENDING_REVIEW', 'PENDING'),
          ],
        },
      ),
    );
    await _pump(tester, server, const MyApplicationsScreen());

    Finder pill(String status) =>
        find.widgetWithText(StatusPill, _strings.market.label(status));
    // The status pills; the stage lamps below say "Shortlisted" too.
    expect(pill('SHORTLISTED'), findsOneWidget);
    // In review: "pending" is about the review, so no outcome is shown.
    // In review: one pill for the review and none for an outcome (the two
    // read alike, "Under review", so they are counted, not told apart).
    expect(pill('PENDING_REVIEW'), findsOneWidget);
  });

  testWidgets('withdrawing asks first, then takes the application back', (
    tester,
  ) async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': o.method == 'GET'
              ? [_application('APPROVED', 'INTERVIEW')]
              : null,
        },
      ),
    );
    await _pump(tester, server, const MyApplicationsScreen());

    await tester.tap(find.text(_strings.jobs.withdraw));
    await tester.pumpAndSettle();
    expect(_writes(server), isEmpty);
    await tester.tap(find.widgetWithText(FilledButton, _strings.jobs.withdraw));
    await _settle(tester);
    expect(_writes(server), ['POST /jobs/me/applications/a-APPROVED/withdraw']);
  });

  testWidgets('a revision goes back as the server reads it', (tester) async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': o.method == 'GET'
              ? [
                  {
                    ..._application('CHANGES_REQUESTED', 'PENDING'),
                    'coverLetter': 'Old letter',
                    'reviewNote': 'Please say more about your projects.',
                  },
                ]
              : null,
        },
      ),
    );
    await _pump(tester, server, const MyApplicationsScreen());

    await tester.tap(find.text(_strings.market.revise));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, _strings.market.expectedSalary),
      '5000000',
    );
    await tester.tap(find.text(_strings.market.revise).last);
    await _settle(tester);

    final sent = server.requests.lastWhere((o) => o.method == 'PATCH');
    expect(sent.path, '/market/me/applications/a-CHANGES_REQUESTED');
    final fields = {
      for (final f in (sent.data as FormData).fields) f.key: f.value,
    };
    expect(jsonDecode(fields['payload']!), {
      'coverLetter': 'Old letter',
      'expectedSalary': '5000000',
    });
  });

  testWidgets('an alert pauses and goes', (tester) async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': switch (o.path) {
            '/jobs/me/alerts' when o.method == 'GET' => [
              {
                'id': 'al1',
                'name': 'Remote React',
                'query': {'search': 'react'},
                'active': true,
              },
            ],
            '/jobs/categories' => <Object>[],
            _ => null,
          },
        },
      ),
    );
    await _pump(tester, server, const JobAlertsScreen());

    expect(find.text('“react”'), findsOneWidget);
    await tester.tap(find.text(_strings.jobs.pause));
    await _settle(tester);
    await tester.tap(find.byTooltip(_strings.jobs.delete));
    await _settle(tester);

    expect(_writes(server), [
      'PATCH /jobs/me/alerts/al1',
      'DELETE /jobs/me/alerts/al1',
    ]);
    expect(server.requests.firstWhere((o) => o.method == 'PATCH').data, {
      'active': false,
    });
  });

  testWidgets('saving the board\'s search keeps its filters as an alert', (
    tester,
  ) async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': switch (o.path) {
            '/market/jobs' => {
              'items': <Object>[],
              'page': 1,
              'totalPages': 1,
              'total': 0,
            },
            _ => null,
          },
        },
      ),
    );
    await _pump(
      tester,
      server,
      const JobBoardScreen(
        initialParams: {'q': 'react', 'workArrangement': 'REMOTE'},
      ),
    );

    await tester.tap(find.byTooltip(_strings.jobs.saveSearch));
    await tester.pumpAndSettle();
    await tester.tap(find.text(_strings.jobs.saveSearch).last);
    await _settle(tester);

    final sent = server.requests.firstWhere((o) => o.method == 'POST');
    expect(sent.path, '/jobs/me/alerts');
    expect(sent.data, {
      'name': 'react',
      'query': {'search': 'react', 'workArrangement': 'REMOTE'},
    });
  });
}
