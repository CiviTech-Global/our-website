import 'dart:convert';
import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/settings.dart';
import 'generated/strings.g.dart';

export 'generated/strings.g.dart';
export 'l10n_node.dart' show Interpolate, L10nMap;

/// The interface text, from the JSON the web's dictionaries are exported to
/// (civitechglobal-web/scripts/export-mobile-l10n.mjs).
Future<Strings> loadStrings(String language) async =>
    Strings(await loadJsonAsset('assets/l10n/$language.json'));

/// A JSON asset, decoded on this isolate.
///
/// `rootBundle.loadString` hands anything over 50 KB to a background isolate.
/// For a couple of hundred kilobytes that costs more than it saves, and in
/// widget tests, which run on a fake clock, that isolate never answers.
Future<Map<String, Object?>> loadJsonAsset(String path) async {
  final bytes = await rootBundle.load(path);
  return jsonDecode(utf8.decode(bytes.buffer.asUint8List()))
      as Map<String, Object?>;
}

/// A JSON asset whose top level is a list.
Future<List<Object?>> loadJsonList(String path) async {
  final bytes = await rootBundle.load(path);
  return jsonDecode(utf8.decode(bytes.buffer.asUint8List())) as List<Object?>;
}

/// The language to start in before anyone has chosen: the device's, when it
/// is one of the six, otherwise Persian, the platform's first language.
String deviceLanguage() {
  for (final locale in PlatformDispatcher.instance.locales) {
    if (supportedLanguages.contains(locale.languageCode)) {
      return locale.languageCode;
    }
  }
  return 'fa';
}

/// Right-to-left languages among the six.
bool isRtl(String language) => language == 'fa';

class L10nState {
  const L10nState(this.language, this.strings);

  final String language;
  final Strings strings;
}

/// Seeded in main() with the starting language, loaded before the first
/// frame, so nothing ever renders without its words.
final l10nProvider = NotifierProvider<L10nController, L10nState>(
  L10nController.new,
);

class L10nController extends Notifier<L10nState> {
  L10nController([this._initial]);

  final L10nState? _initial;

  @override
  L10nState build() =>
      _initial ?? (throw UnimplementedError('Seeded in main()'));

  /// Loads first, then switches, so a language change is one clean swap.
  Future<void> use(String language) async {
    if (language == state.language) {
      await ref.read(settingsProvider.notifier).setLanguage(language);
      return;
    }
    final strings = await loadStrings(language);
    state = L10nState(language, strings);
    await ref.read(settingsProvider.notifier).setLanguage(language);
  }
}

/// The current language's strings: `ref.watch(stringsProvider).common.save`.
final stringsProvider = Provider<Strings>(
  (ref) => ref.watch(l10nProvider.select((s) => s.strings)),
);

/// Each language's own name, as its speakers write it.
const languageNames = {
  'fa': 'فارسی',
  'en': 'English',
  'tr': 'Türkçe',
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español',
};
