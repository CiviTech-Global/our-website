import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/l10n.dart';

/// One guide, as the web's help system writes it (src/content/help/types.ts).
class HelpArticle {
  const HelpArticle({
    required this.id,
    required this.title,
    required this.summary,
    required this.intro,
    this.heading,
    this.steps = const [],
    this.points = const [],
    this.tips = const [],
    this.faqs = const [],
    this.faqTitle,
    this.related = const [],
    this.fallback = false,
  });

  factory HelpArticle.fromJson(
    String id,
    Map<String, Object?> json, {
    List<String> related = const [],
    bool fallback = false,
  }) {
    List<(String, String)> pairs(String key) => [
      for (final item in (json[key] as List?) ?? const [])
        if (item is List && item.length >= 2) ('${item[0]}', '${item[1]}'),
    ];
    return HelpArticle(
      id: id,
      title: '${json['title'] ?? id}',
      summary: '${json['summary'] ?? ''}',
      intro: '${json['intro'] ?? ''}',
      heading: json['heading'] as String?,
      steps: pairs('steps'),
      points: pairs('points'),
      tips: pairs('tips'),
      faqs: pairs('faqs'),
      faqTitle: json['faqTitle'] as String?,
      related: related,
      fallback: fallback,
    );
  }

  final String id;
  final String title;
  final String summary;
  final String intro;
  final String? heading;
  final List<(String, String)> steps;
  final List<(String, String)> points;
  final List<(String, String)> tips;
  final List<(String, String)> faqs;
  final String? faqTitle;
  final List<String> related;

  /// Shown in English because this language does not have it yet.
  final bool fallback;
}

class HelpLibrary {
  const HelpLibrary(
    this._own,
    this._english,
    this._related,
    this._isEnglish, {
    this.entries = const [],
  });

  final Map<String, Object?> _own;
  final Map<String, Object?>? _english;
  final Map<String, List<String>> _related;
  final bool _isEnglish;

  /// Every guide the app carries, in the manifest's order:
  /// (id, collection, audience).
  final List<(String, String, String)> entries;

  /// A collection's title and description in the reader's language.
  (String, String)? collection(String id) {
    final own =
        (_own['collections'] as Map?)?[id] ??
        (_english?['collections'] as Map?)?[id];
    if (own is! Map) return null;
    return ('${own['title'] ?? id}', '${own['description'] ?? ''}');
  }

  HelpArticle? article(String id) {
    final own = (_own['articles'] as Map?)?[id];
    if (own is Map<String, Object?>) {
      return HelpArticle.fromJson(id, own, related: _related[id] ?? const []);
    }
    final english = (_english?['articles'] as Map?)?[id];
    if (english is Map<String, Object?>) {
      return HelpArticle.fromJson(
        id,
        english,
        related: _related[id] ?? const [],
        fallback: !_isEnglish,
      );
    }
    return null;
  }
}

/// The guides in the reader's language, with English beside them for the
/// guides that language does not have yet, as on the web.
final helpLibraryProvider = FutureProvider<HelpLibrary>((ref) async {
  final language = ref.watch(l10nProvider.select((s) => s.language));
  final manifestBytes = await rootBundle.load('assets/help/manifest.json');
  final manifest =
      jsonDecode(utf8.decode(manifestBytes.buffer.asUint8List())) as List;
  final related = {
    for (final entry in manifest.cast<Map<String, Object?>>())
      entry['id']! as String: [
        for (final r in (entry['related'] as List? ?? const [])) '$r',
      ],
  };
  final own = await loadJsonAsset('assets/help/$language.json');
  final english = language == 'en'
      ? null
      : await loadJsonAsset('assets/help/en.json');
  return HelpLibrary(
    own,
    english,
    related,
    language == 'en',
    entries: [
      for (final e in manifest.cast<Map<String, Object?>>())
        ('${e['id']}', '${e['collection']}', '${e['audience']}'),
    ],
  );
});
