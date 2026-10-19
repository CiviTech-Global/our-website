import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/features/intake/code_issued.dart';
import 'package:civitech_global_flutter/features/intake/track_screen.dart';
import 'package:civitech_global_flutter/features/me/requests_screen.dart';
import 'package:civitech_global_flutter/features/me/workspace_data.dart';
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

class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'a@b.c',
    firstName: 'Maryam',
    lastName: 'Ahmadi',
  );
}

class _SignedOut extends SessionController {
  @override
  Future<AuthUser?> build() async => null;
}

ApiClient _client(FakeServer server) => ApiClient(
  tokens: MemoryTokens(),
  language: () => 'en',
  dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
    ..httpClientAdapter = server,
);

ProviderContainer _container(FakeServer server) {
  final container = ProviderContainer(
    overrides: [
      apiClientProvider.overrideWithValue(_client(server)),
      sessionProvider.overrideWith(_SignedIn.new),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

String _calls(FakeServer server) => server.requests
    .map(
      (r) => '${r.method} ${r.path} ${r.data == null ? '' : jsonEncode(r.data)}'
          .trim(),
    )
    .join('\n');

void main() {
  group('Workspace.fromJson', () {
    test('an empty answer is a member who plays no part yet', () {
      final w = Workspace.fromJson(const {});
      expect(w.verification, 'UNVERIFIED');
      expect(w.hiringPostings, 0);
      expect(w.recent, isEmpty);
      expect(w.changesRequested, 0);
    });

    test('listings sent back are counted across jobs, projects and books', () {
      final w = Workspace.fromJson({
        'hiring': {
          'byStatus': {'CHANGES_REQUESTED': 2},
        },
        'client': {
          'byStatus': {'CHANGES_REQUESTED': 1, 'PENDING_REVIEW': 4},
        },
        'selling': {
          'booksByStatus': {'CHANGES_REQUESTED': 3},
        },
        'recentNotifications': [
          {'id': 'n1', 'title': 'T', 'body': 'B', 'link': null, 'readAt': null},
        ],
      });
      expect(w.changesRequested, 6);
      expect(w.clientByStatus['PENDING_REVIEW'], 4);
      expect(w.recent.single.read, isFalse);
    });
  });

  group('TrackedRequest', () {
    test('a blank label is no label, and a lost request has no state', () {
      final r = TrackedRequest.fromJson({
        'code': 'ABC123',
        'label': '  ',
        'state': null,
      });
      expect(r.label, isNull);
      expect(r.kind, isNull);
      expect(r.status, isNull);
    });
  });

  test(
    'keeping and removing a code tell the server, and the list refreshes',
    () async {
      var listed = 0;
      final server = FakeServer((o) async {
        if (o.method == 'GET') listed++;
        return (
          200,
          {
            'data': o.method == 'GET' ? <Object>[] : {'code': 'X'},
          },
        );
      });
      final container = _container(server);
      await container.read(sessionProvider.future);
      await container.read(trackedRequestsProvider.future);
      final actions = container.read(trackingActionsProvider);

      await actions.track('ABC123');
      await actions.track('DEF456', label: 'Shop');
      await actions.untrack('A B/1');
      await container.read(trackedRequestsProvider.future);

      final calls = _calls(server);
      // No label sent at all, so a label already on the account is kept.
      expect(
        calls,
        contains('POST /market/me/tracked-requests {"code":"ABC123"}'),
      );
      expect(
        calls,
        contains(
          'POST /market/me/tracked-requests {"code":"DEF456","label":"Shop"}',
        ),
      );
      expect(calls, contains('DELETE /market/me/tracked-requests/A%20B%2F1'));
      expect(listed, greaterThan(1));
    },
  );

  group('statuses', () {
    test('read in the words of each kind of request', () {
      expect(
        requestStatusLabel(_strings, 'project', 'PROPOSAL_SENT'),
        _strings.proposal.statuses.label('PROPOSAL_SENT'),
      );
      expect(
        requestStatusLabel(_strings, 'consultation', 'SCHEDULED'),
        _strings.consult.statuses.label('SCHEDULED'),
      );
      expect(
        requestStatusLabel(_strings, 'resume', 'MATCHED'),
        _strings.join.statuses.label('MATCHED'),
      );
      expect(
        requestStatusLabel(_strings, 'insurance', 'CONTACTED'),
        _strings.admin.contacted,
      );
    });

    test('each status the server sends is labelled, never shown raw', () {
      for (final (kind, statuses) in [
        ('project', _strings.proposal.statuses.keys),
        ('consultation', _strings.consult.statuses.keys),
        ('resume', _strings.join.statuses.keys),
        (
          'insurance',
          ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        ),
      ]) {
        for (final status in statuses) {
          expect(requestStatusLabel(_strings, kind, status), isNot(status));
        }
      }
    });

    test('waiting on the client stands apart from settled and under way', () {
      expect(requestStatusTone('PROPOSAL_SENT'), 1);
      expect(requestStatusTone('ACCEPTED'), 0);
      expect(requestStatusTone('DECLINED'), 3);
      expect(requestStatusTone('IN_REVIEW'), 2);
    });
  });

  group('a freshly issued code', () {
    Future<FakeServer> pump(
      WidgetTester tester, {
      required bool signedIn,
    }) async {
      final server = FakeServer(
        (o) async => (
          201,
          {
            'data': {'code': 'PROJ1234'},
          },
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            stringsProvider.overrideWithValue(_strings),
            apiClientProvider.overrideWithValue(_client(server)),
            sessionProvider.overrideWith(
              signedIn ? _SignedIn.new : _SignedOut.new,
            ),
          ],
          child: MaterialApp(
            theme: buildTheme(GardenPalette.pistachio, Brightness.light),
            home: const CodeIssued(
              title: 'Sent',
              body: 'Keep the code',
              codeLabel: 'Code',
              code: 'PROJ1234',
              copyLabel: 'Copy',
              copiedLabel: 'Copied',
              trackLabel: 'Track',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return server;
    }

    testWidgets('is kept on a member\'s account, and they are told', (
      tester,
    ) async {
      final server = await pump(tester, signedIn: true);
      expect(
        _calls(server),
        'POST /market/me/tracked-requests {"code":"PROJ1234"}',
      );
      expect(find.text(_strings.workspace.savedToAccount), findsOneWidget);
    });

    testWidgets(
      'asks nothing of the server for a visitor, and offers sign-in',
      (tester) async {
        final server = await pump(tester, signedIn: false);
        expect(server.requests, isEmpty);
        expect(find.text(_strings.workspace.signInToKeep), findsOneWidget);
        expect(find.text(_strings.workspace.savedToAccount), findsNothing);
      },
    );
  });

  testWidgets('a removed request can be put back, label and all', (
    tester,
  ) async {
    var kept = true;
    final server = FakeServer((o) async {
      switch (o.method) {
        case 'DELETE':
          kept = false;
        case 'POST':
          kept = true;
      }
      return (
        200,
        {
          'data': o.method != 'GET'
              ? {'code': 'PROJ1234'}
              : [
                  if (kept)
                    {
                      'code': 'PROJ1234',
                      'label': 'Shop app',
                      'createdAt': '2026-10-01T10:00:00Z',
                      'state': {'kind': 'project', 'status': 'IN_REVIEW'},
                    },
                ],
        },
      );
    });
    SharedPreferences.setMockInitialValues({'settings.reduceMotion': true});
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          l10nProvider.overrideWith(
            () => L10nController(L10nState('en', _strings)),
          ),
          apiClientProvider.overrideWithValue(_client(server)),
          sessionProvider.overrideWith(_SignedIn.new),
        ],
        child: MaterialApp(
          theme: buildTheme(GardenPalette.pistachio, Brightness.light),
          home: const RequestsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Shop app'), findsOneWidget);

    await tester.tap(find.text(_strings.workspace.remove));
    await tester.pumpAndSettle();
    expect(find.text('Shop app'), findsNothing);
    expect(find.text(_strings.workspace.noRequests), findsOneWidget);

    await tester.tap(find.text(_strings.mobile.undo));
    await tester.pumpAndSettle();
    expect(find.text('Shop app'), findsOneWidget);
    expect(
      _calls(server),
      contains(
        'POST /market/me/tracked-requests {"code":"PROJ1234","label":"Shop app"}',
      ),
    );
  });
}
