/// The base the generated string classes stand on.
///
/// `strings.g.dart` is generated from the web's dictionaries; each section
/// becomes a class over a slice of the language's JSON. A missing key never
/// throws: it reads as the key itself, which is visible in a screenshot and
/// harmless in production, the way the web shows a key it cannot find.
class L10nNode {
  const L10nNode(this.raw);

  final Map<String, Object?> raw;

  String string(String key) {
    final value = raw[key];
    return value is String ? value : key;
  }

  List<String> strings(String key) {
    final value = raw[key];
    return value is List ? value.whereType<String>().toList() : const [];
  }

  List<List<String>> pairs(String key) {
    final value = raw[key];
    if (value is! List) return const [];
    return [
      for (final item in value)
        if (item is List) item.whereType<String>().toList(),
    ];
  }

  Map<String, Object?> node(String key) {
    final value = raw[key];
    return value is Map<String, Object?> ? value : const {};
  }
}

/// A section keyed by values the server sends (NEW_BUILD, IN_REVIEW, ...).
class L10nMap extends L10nNode {
  const L10nMap(super.raw);

  /// The label for [key], or null when the dictionary has none.
  String? operator [](String key) {
    final value = raw[key];
    return value is String ? value : null;
  }

  /// The label for [key], falling back to [key] itself.
  String label(String key) => this[key] ?? key;

  Iterable<String> get keys => raw.keys;
}

extension Interpolate on String {
  /// Fills `{name}` placeholders, as the web's `.replace('{name}', ...)` does.
  String fill(Map<String, Object> values) => replaceAllMapped(
    RegExp(r'\{(\w+)\}'),
    (match) => values[match[1]]?.toString() ?? match[0]!,
  );
}
