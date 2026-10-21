import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/geo.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/design/widgets/bagh_key.dart';
import 'package:civitech_global_flutter/features/jobs/job_screen.dart';
import 'package:civitech_global_flutter/features/jobs/jobs_data.dart';
import 'package:civitech_global_flutter/features/jobs/jobs_format.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

final _geo = GeoNames.fromJson(
  jsonDecode(File('assets/geo/en.json').readAsStringSync())
      as Map<String, Object?>,
);

JobSummary _job(Map<String, Object?> fields) => JobSummary.fromJson({
  'id': 'j1',
  'code': 'J1',
  'title': 'T',
  'employmentType': 'FULL_TIME',
  'workArrangement': 'ONSITE',
  'salaryUndisclosed': false,
  ...fields,
});

class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async =>
      const AuthUser(id: 'u1', email: 'a@b.c', firstName: 'M', lastName: 'A');
}

class _SignedOut extends SessionController {
  @override
  Future<AuthUser?> build() async => null;
}

void main() {
  group('the board query', () {
    test('sends only what is set, as the server reads it', () {
      const q = JobQuery(
        search: '  react ',
        benefits: ['INSURANCE', 'BONUS'],
        urgent: true,
      );
      expect(q.toParams(), {
        'search': 'react',
        'sort': 'newest',
        'benefits': 'INSURANCE,BONUS',
        'urgent': 'true',
      });
    });

    test('a pay floor travels with its currency, and only then', () {
      expect(
        const JobQuery(currency: 'EUR').toParams().containsKey('currency'),
        isFalse,
      );
      expect(
        const JobQuery(salaryMin: '4000', currency: 'EUR').toParams(),
        containsPair('currency', 'EUR'),
      );
    });

    test(
      'equal filters are the same list; clearing keeps search and place',
      () {
        expect(
          const JobQuery(benefits: ['A']),
          equals(const JobQuery(benefits: ['A'])),
        );
        const q = JobQuery(
          search: 'x',
          province: 'تهران',
          seniority: 'SENIOR',
          urgent: true,
        );
        expect(q.activeFilters, 2);
        expect(q.cleared().toParams(), {
          'search': 'x',
          'sort': 'newest',
          'province': 'تهران',
        });
      },
    );
  });

  group('the pay line', () {
    test('tomans a month read as a range with the toman once', () {
      final job = _job({'salaryMin': '70000000', 'salaryMax': '100000000'});
      expect(
        salaryText(job, _strings, 'en'),
        '70,000,000 ${_strings.market.to} 100,000,000 ${_strings.market.currency}',
      );
    });

    test('any other currency or period names itself', () {
      final job = _job({
        'salaryMin': '45',
        'salaryMax': '95',
        'currency': 'EUR',
        'salaryPeriod': 'HOUR',
      });
      expect(
        salaryText(job, _strings, 'en'),
        '€45 ${_strings.market.to} €95 / ${_strings.jobs.periods.label('HOUR')}',
      );
    });

    test('undisclosed says so; none given says nothing', () {
      expect(
        salaryText(_job({'salaryUndisclosed': true}), _strings, 'en'),
        _strings.market.salaryUndisclosed,
      );
      expect(salaryText(_job({}), _strings, 'en'), isNull);
    });
  });

  group('the place', () {
    test('a capital named after its province says it once', () {
      final job = _job({'province': 'تهران', 'city': 'Tehran'});
      expect(placeText(job, _geo, 'en'), 'Tehran');
    });

    test('abroad, the country is part of the place', () {
      final job = _job({'country': 'DE', 'city': 'Berlin'});
      expect(placeText(job, _geo, 'en'), 'Berlin, Germany');
    });

    test('abroad, a city named as its province says it once', () {
      final job = _job({
        'country': 'TR',
        'city': 'Istanbul',
        'province': 'İstanbul',
      });
      expect(placeText(job, _geo, 'en'), 'Istanbul, Türkiye');
    });

    test('a role anyone anywhere may take says so instead of a place', () {
      final job = _job({
        'workArrangement': 'REMOTE',
        'remoteWorldwide': true,
        'country': 'DE',
        'city': 'Berlin',
      });
      expect(
        wherePosting(job, _strings, _geo, 'en'),
        _strings.jobs.remoteWorldwide,
      );
    });
  });

  test('posting age is coarse, as boards say it', () {
    final now = DateTime(2026, 10, 20, 12);
    String ago(int days) =>
        postedAgo(now.subtract(Duration(days: days)), _strings, 'en', now);
    expect(ago(0), _strings.jobs.today);
    expect(ago(1), 'yesterday');
    expect(ago(3), '3 days ago');
    expect(ago(8), 'last week');
    expect(ago(21), '3 weeks ago');
    expect(ago(45), 'last month');
    expect(ago(95), '3 months ago');
  });

  test('days left count by date, so the day after tomorrow is 2', () {
    final now = DateTime(2026, 10, 20, 23, 30);
    expect(daysUntil(DateTime(2026, 10, 22, 0, 30), now), 2);
    expect(daysUntil(DateTime(2026, 10, 20, 23, 45), now), 0);
    expect(daysUntil(DateTime(2026, 10, 19), now), isNull);
  });

  group('the apply section', () {
    const job = {
      'id': 'j1',
      'code': 'J1',
      'title': 'Senior engineer',
      'employmentType': 'FULL_TIME',
      'workArrangement': 'ONSITE',
      'salaryUndisclosed': true,
      'description': 'Build things.',
      'skills': <String>[],
      'benefits': <String>[],
    };

    Future<FakeServer> pump(
      WidgetTester tester, {
      required bool signedIn,
      String verification = 'APPROVED',
    }) async {
      final server = FakeServer((o) async {
        return switch (o.path) {
          '/market/jobs/J1' => (200, {'data': job}),
          '/market/me/verification' => (
            200,
            {
              'data': {'status': verification},
            },
          ),
          '/market/me/jobs/j1/apply' => (201, {'data': <String, Object?>{}}),
          '/market/me/applications' ||
          '/market/me/jobs' => (200, {'data': <Object>[]}),
          _ => (200, {'data': null}),
        };
      });
      tester.view
        ..physicalSize = const Size(900, 5000)
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
            sessionProvider.overrideWith(
              signedIn ? _SignedIn.new : _SignedOut.new,
            ),
          ],
          child: MaterialApp(
            theme: buildTheme(GardenPalette.pistachio, Brightness.light),
            home: const JobScreen(code: 'J1'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // Requests started once the page settled (the reader's applications,
      // their verification) wait on timers that only advancing time runs.
      for (var i = 0; i < 3; i++) {
        await tester.pump(const Duration(milliseconds: 200));
        await tester.pumpAndSettle();
      }
      return server;
    }

    testWidgets('signed out, it is the way to sign in', (tester) async {
      await pump(tester, signedIn: false);
      expect(find.text(_strings.market.loginToApply), findsOneWidget);
      expect(find.text(_strings.market.coverLetter), findsNothing);
    });

    testWidgets('unverified, it says so with the way to verification', (
      tester,
    ) async {
      await pump(tester, signedIn: true, verification: 'PENDING');
      expect(find.text(_strings.market.verificationRequired), findsOneWidget);
      expect(find.text(_strings.market.goToVerification), findsOneWidget);
      expect(find.text(_strings.market.coverLetter), findsNothing);
    });

    testWidgets('verified, the application goes as the server reads it', (
      tester,
    ) async {
      final server = await pump(tester, signedIn: true);
      await tester.enterText(
        find.widgetWithText(TextField, _strings.market.coverLetter),
        '  Hello  ',
      );
      await tester.enterText(
        find.widgetWithText(TextField, _strings.market.expectedSalary),
        '۵۰۰۰۰۰۰۰',
      );
      await tester.tap(find.text(_strings.market.apply));
      await tester.pumpAndSettle();

      final sent = server.requests.firstWhere(
        (o) => o.path == '/market/me/jobs/j1/apply',
      );
      final fields = {
        for (final f in (sent.data as FormData).fields) f.key: f.value,
      };
      expect(jsonDecode(fields['payload']!), {
        'coverLetter': 'Hello',
        'expectedSalary': '50000000',
      });
      expect(find.text(_strings.jobs.appliedDirect), findsOneWidget);
      // Still said after the reader's applications reload and know of it,
      // and nothing is left for the pinned key to do.
      for (var i = 0; i < 3; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(find.text(_strings.jobs.appliedDirect), findsOneWidget);
      expect(
        find.widgetWithText(BaghKey, _strings.jobs.applyCta),
        findsNothing,
      );
    });
  });
}
