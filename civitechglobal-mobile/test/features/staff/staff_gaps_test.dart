import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/features/intake/track_screen.dart';
import 'package:civitech_global_flutter/features/staff/staff_collection_screens.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

class _Staff extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'a@b.c',
    firstName: 'Maryam',
    lastName: 'Ahmadi',
    role: 'SUPER_ADMIN',
  );
}

const _project = <String, Object?>{
  'id': 'sp1',
  'title': 'Portal',
  'screenshots': [
    {'id': 'sh1', 'url': '/showcase/admin/shot/sh1', 'caption': 'First'},
    {'id': 'sh2', 'url': '/showcase/admin/shot/sh2', 'caption': 'Second'},
  ],
};

List<String> _calls(FakeServer server) => [
  for (final r in server.requests)
    if (!r.path.contains('/shot/'))
      '${r.method} ${r.path}${r.data is Map ? ' ${jsonEncode(r.data)}' : ''}',
];

Future<FakeServer> _pump(WidgetTester tester, Widget child) async {
  final server = FakeServer(
    (o) async => (
      200,
      {
        'data': o.path.endsWith('/showcase/admin/projects') ? [_project] : null,
      },
    ),
  );
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
        sessionProvider.overrideWith(_Staff.new),
      ],
      child: MaterialApp(
        theme: buildTheme(GardenPalette.pistachio, Brightness.light),
        home: Scaffold(body: ListView(children: [child])),
      ),
    ),
  );
  await _settle(tester);
  return server;
}

/// Requests wait on Dio's timers, which only real time runs.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 300));
  }
}

void main() {
  group('portfolio gallery', () {
    testWidgets('lists the pictures with their captions and what is left', (
      tester,
    ) async {
      await _pump(tester, const StaffShotsEditor(row: _project));
      expect(find.text('First'), findsOneWidget);
      expect(find.text('Second'), findsOneWidget);
      expect(
        find.text(_strings.showcase.shotLimit.fill({'count': 10})),
        findsOneWidget,
      );
      // The first cannot go further up, nor the last further down.
      final up = tester.widgetList<IconButton>(
        find.widgetWithIcon(IconButton, Icons.arrow_upward_rounded),
      );
      expect(up.first.onPressed, isNull);
      final down = tester.widgetList<IconButton>(
        find.widgetWithIcon(IconButton, Icons.arrow_downward_rounded),
      );
      expect(down.last.onPressed, isNull);
    });

    testWidgets('moving one down sends the whole new order', (tester) async {
      final server = await _pump(tester, const StaffShotsEditor(row: _project));
      await tester.tap(
        find.widgetWithIcon(IconButton, Icons.arrow_downward_rounded).first,
      );
      await _settle(tester);
      expect(
        _calls(server),
        contains(
          'POST /showcase/admin/projects/sp1/shots/reorder '
          '{"ids":["sh2","sh1"]}',
        ),
      );
    });

    testWidgets('removing one deletes that picture only', (tester) async {
      final server = await _pump(tester, const StaffShotsEditor(row: _project));
      await tester.tap(
        find.widgetWithIcon(IconButton, Icons.delete_outline_rounded).last,
      );
      await _settle(tester);
      expect(_calls(server), contains('DELETE /showcase/admin/shots/sh2'));
      expect(_calls(server).where((c) => c.startsWith('DELETE')), hasLength(1));
    });
  });

  testWidgets('a previewed proposal cannot be answered', (tester) async {
    const proposal = <String, Object?>{
      'id': 'pp1',
      'status': 'DRAFT',
      'scopeSummary': 'Build the portal',
      'priceMin': '700000000',
      'priceMax': '1500000000',
      'currency': 'IRT',
    };
    await _pump(
      tester,
      ProposalView(
        proposal: proposal,
        trackingCode: 'PROJ1',
        onAnswered: () {},
        preview: true,
      ),
    );
    expect(find.text('Build the portal'), findsOneWidget);
    expect(find.text(_strings.proposal.accept), findsNothing);
    expect(find.text(_strings.proposal.cannotAnswer), findsNothing);
    // A draft is named as one, not by its code.
    expect(
      find.text(_strings.proposal.proposalStatuses.label('DRAFT')),
      findsOneWidget,
    );
    expect(find.text('DRAFT'), findsNothing);
  });
}
