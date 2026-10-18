import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/design/widgets/leave_guard.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

/// A first page with a key that opens a guarded form.
Future<void> _open(WidgetTester tester, {required bool dirty}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [stringsProvider.overrideWithValue(_strings)],
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => LeaveGuard(
                    isDirty: () => dirty,
                    child: const Scaffold(body: Text('form')),
                  ),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
  expect(find.text('form'), findsOneWidget);
}

Future<void> _pressBack(WidgetTester tester) async {
  await tester.binding.handlePopRoute();
  await tester.pumpAndSettle();
}

void main() {
  final m = _strings.mobile;

  testWidgets('an untouched form is left at once', (tester) async {
    await _open(tester, dirty: false);
    await _pressBack(tester);
    expect(find.text('form'), findsNothing);
    expect(find.text(m.leaveTitle), findsNothing);
  });

  testWidgets('a filled form asks, and stays when told to', (tester) async {
    await _open(tester, dirty: true);
    await _pressBack(tester);
    expect(find.text(m.leaveTitle), findsOneWidget);
    await tester.tap(find.text(m.leaveStay));
    await tester.pumpAndSettle();
    expect(find.text('form'), findsOneWidget);
  });

  testWidgets('a filled form is left once that is confirmed', (tester) async {
    await _open(tester, dirty: true);
    await _pressBack(tester);
    await tester.tap(find.text(m.leaveConfirm));
    await tester.pumpAndSettle();
    expect(find.text('form'), findsNothing);
  });
}
