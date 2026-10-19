import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Every guide a screen opens exists.
///
/// A screen names its guide by id (`helpId: 'my-requests'`,
/// `HelpAction('messages')`). A wrong id fails quietly: the "?" opens a sheet
/// that says there is no guide. So this reads the ids written in lib/ and
/// looks each up in the exported manifest.
void main() {
  final manifest =
      jsonDecode(File('assets/help/manifest.json').readAsStringSync()) as List;
  final known = {for (final g in manifest) (g as Map)['id'] as String};

  final used = <String, String>{};
  final pattern = RegExp(
    r"(?:helpId:\s*|HelpAction\(\s*|showHelp\(\s*context,\s*|guide:\s*)'([a-z0-9-]+)'",
  );
  for (final file in Directory('lib').listSync(recursive: true)) {
    if (file is! File || !file.path.endsWith('.dart')) continue;
    if (file.path.contains('generated')) continue;
    for (final m in pattern.allMatches(file.readAsStringSync())) {
      used[m[1]!] = file.path;
    }
  }

  test('each guide id names a guide the app carries', () {
    final missing = {
      for (final MapEntry(:key, :value) in used.entries)
        if (!known.contains(key)) key: value,
    };
    expect(missing, isEmpty);
  });

  test('is looking at the ids that exist', () {
    // Guards the finder: a renamed parameter must not leave it checking nothing.
    expect(used.keys, containsAll(['my-requests', 'messages', 'track']));
    expect(used.length, greaterThan(20));
  });
}
