import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _read(String language) =>
    jsonDecode(File('assets/l10n/$language.json').readAsStringSync())
        as Map<String, Object?>;

Set<String> _keys(Object? node, [String prefix = '']) {
  if (node is! Map) return {prefix};
  return {
    for (final e in node.entries)
      ..._keys(e.value, prefix.isEmpty ? '${e.key}' : '$prefix.${e.key}'),
  };
}

void main() {
  test('every language has every key Persian has', () {
    // The export fills partial languages from English, as the web does at
    // runtime, so no language can render a key instead of a word.
    final reference = _keys(_read('fa'));
    for (final language in supportedLanguages) {
      final missing = reference.difference(_keys(_read(language)));
      expect(missing, isEmpty, reason: '$language is missing $missing');
    }
  });

  test('the generated accessors read the exported text', () {
    final fa = Strings(_read('fa'));
    final en = Strings(_read('en'));

    expect(en.common.save, 'Save');
    expect(fa.mobile.tabHome, 'خانه');
    expect(en.mobile.paletteB, 'Pistachio & Pomegranate');
    // A section keyed by server values is a lookup, not a getter.
    expect(en.project.types['WEB_APP'], isNotNull);
    expect(en.project.types['NO_SUCH_TYPE'], isNull);
  });

  test('placeholders are filled by name and left alone when unknown', () {
    expect('{count} of {total}'.fill({'count': 3, 'total': 7}), '3 of 7');
    expect('Hello {name}'.fill({}), 'Hello {name}');
  });

  test('Persian is the only right-to-left language', () {
    expect(supportedLanguages.where(isRtl), ['fa']);
  });
}
