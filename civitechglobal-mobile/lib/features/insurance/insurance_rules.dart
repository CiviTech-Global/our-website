import '../../core/format.dart';
import '../../l10n/l10n.dart';

/// One question of a product's form, as the server's catalog declares it
/// (civitechglobal-server/src/insurance/catalog/types.ts). The app knows
/// how to draw and check each type; which questions a product asks, and
/// their bounds and options, come from the server alone.
class FieldDef {
  const FieldDef({
    required this.name,
    required this.label,
    required this.labelEn,
    required this.type,
    this.required = false,
    this.help,
    this.helpEn,
    this.showWhenField,
    this.showWhenEquals = const [],
    this.minLength,
    this.maxLength,
    this.min,
    this.max,
    this.unit,
    this.unitEn,
    this.options = const [],
    this.minSelected,
    this.maxSelected,
  });

  factory FieldDef.fromJson(Map<String, Object?> j) {
    final when = j['showWhen'] as Map<String, Object?>?;
    return FieldDef(
      name: '${j['name']}',
      label: '${j['label'] ?? ''}',
      labelEn: '${j['labelEn'] ?? j['label'] ?? ''}',
      type: '${j['type']}',
      required: j['required'] == true,
      help: j['help'] as String?,
      helpEn: j['helpEn'] as String?,
      showWhenField: when?['field'] as String?,
      showWhenEquals: [
        for (final v in (when?['equals'] as List? ?? const [])) '$v',
      ],
      minLength: (j['minLength'] as num?)?.toInt(),
      maxLength: (j['maxLength'] as num?)?.toInt(),
      min: j['min'],
      max: j['max'],
      unit: j['unit'] as String?,
      unitEn: j['unitEn'] as String?,
      options: [
        for (final o in (j['options'] as List? ?? const []))
          if (o is Map<String, Object?>)
            (
              value: '${o['value']}',
              label: '${o['label'] ?? ''}',
              labelEn: '${o['labelEn'] ?? o['label'] ?? ''}',
            ),
      ],
      minSelected: (j['minSelected'] as num?)?.toInt(),
      maxSelected: (j['maxSelected'] as num?)?.toInt(),
    );
  }

  final String name;
  final String label;
  final String labelEn;

  /// text, textarea, number, currency, date, select, multiselect, bool,
  /// nationalId, phone or plate.
  final String type;
  final bool required;
  final String? help;
  final String? helpEn;
  final String? showWhenField;
  final List<String> showWhenEquals;
  final int? minLength;
  final int? maxLength;

  /// A number, or for a date an ISO day or 'today'.
  final Object? min;
  final Object? max;
  final String? unit;
  final String? unitEn;
  final List<({String value, String label, String labelEn})> options;
  final int? minSelected;
  final int? maxSelected;

  /// The catalog is written in Persian and English; every other language
  /// reads the English.
  String labelIn(String language) => language == 'fa' ? label : labelEn;
  String? helpIn(String language) => language == 'fa' ? help : helpEn;
  String? unitIn(String language) => language == 'fa' ? unit : unitEn;
}

/// Answers by field name: a String, a bool or a list of option values.
typedef Answers = Map<String, Object?>;

/// Whether [field] is asked, given what has been answered so far.
bool isFieldVisible(FieldDef field, Answers answers) {
  final trigger = field.showWhenField;
  if (trigger == null) return true;
  final current = answers[trigger];
  if (current is List) {
    return current.any((v) => field.showWhenEquals.contains('$v'));
  }
  return current != null && field.showWhenEquals.contains('$current');
}

List<FieldDef> visibleFields(List<FieldDef> fields, Answers answers) => [
  for (final f in fields)
    if (isFieldVisible(f, answers)) f,
];

bool isEmptyAnswer(Object? value) => switch (value) {
  null => true,
  final String s => s.trim().isEmpty,
  final List<Object?> l => l.isEmpty,
  _ => false,
};

String _digitsOf(String value) =>
    toLatinDigits(value).replaceAll(RegExp(r'\D'), '');

String _today() => DateTime.now().toIso8601String().substring(0, 10);

/// Iranian national ID: ten digits, not all the same, with a check digit.
bool isValidNationalId(String value) {
  final d = _digitsOf(value);
  if (d.length != 10 || RegExp(r'^(\d)\1{9}$').hasMatch(d)) return false;
  var sum = 0;
  for (var i = 0; i < 9; i++) {
    sum += int.parse(d[i]) * (10 - i);
  }
  final check = int.parse(d[9]);
  final remainder = sum % 11;
  return remainder < 2 ? check == remainder : check == 11 - remainder;
}

/// An Iranian mobile number as 09xxxxxxxxx, from the ways people write it
/// (+98, 0098, 98, a bare 9...), or null when it is not one.
String? normalizeIranMobile(String value) {
  var d = toLatinDigits(value).replaceAll(RegExp(r'[\s()-]'), '');
  if (d.startsWith('+98')) {
    d = '0${d.substring(3)}';
  } else if (d.startsWith('0098')) {
    d = '0${d.substring(4)}';
  } else if (d.startsWith('98') && d.length == 12) {
    d = '0${d.substring(2)}';
  } else if (d.startsWith('9') && d.length == 10) {
    d = '0$d';
  }
  return RegExp(r'^09\d{9}$').hasMatch(d) ? d : null;
}

/// The message for [value] in [field], or null when it passes; the same
/// branches, in the same order, as the web's and the server's checks.
/// Hidden fields are never checked.
String? validateField(
  FieldDef field,
  Object? value,
  StringsMobileFieldRules m,
  String language,
) {
  String n(Object x) => localDigits(x, language);
  if (isEmptyAnswer(value)) return field.required ? m.required : null;

  switch (field.type) {
    case 'text' || 'textarea':
      final text = '$value'.trim();
      if (field.minLength case final min? when text.length < min) {
        return m.minChars.fill({'n': n(min)});
      }
      if (field.maxLength case final max? when text.length > max) {
        return m.maxChars.fill({'n': n(max)});
      }
      return null;

    case 'number' || 'currency':
      final raw = toLatinDigits('$value').replaceAll(RegExp(r'[,\s]'), '');
      final number = num.tryParse(raw);
      if (number == null || !number.isFinite) return m.notNumber;
      if (field.type == 'currency' && number != number.truncate()) {
        return m.wholeAmount;
      }
      if (field.min case final num min when number < min) {
        return m.atLeast.fill({'n': n(min)});
      }
      if (field.max case final num max when number > max) {
        return m.atMost.fill({'n': n(max)});
      }
      return null;

    case 'date':
      final text = '$value';
      if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(text) ||
          DateTime.tryParse(text) == null) {
        return m.dateInvalid;
      }
      final min = field.min == 'today' ? _today() : field.min;
      final max = field.max == 'today' ? _today() : field.max;
      if (min is String && text.compareTo(min) < 0) return m.datePast;
      if (max is String && text.compareTo(max) > 0) return m.dateRange;
      return null;

    case 'select':
      return field.options.any((o) => o.value == '$value')
          ? null
          : m.optionInvalid;

    case 'multiselect':
      final values = value is List ? [for (final v in value) '$v'] : <String>[];
      final allowed = {for (final o in field.options) o.value};
      if (values.any((v) => !allowed.contains(v))) return m.optionInvalid;
      if (field.minSelected case final min? when values.length < min) {
        return m.minOptions.fill({'n': n(min)});
      }
      if (field.maxSelected case final max? when values.length > max) {
        return m.maxOptions.fill({'n': n(max)});
      }
      return null;

    case 'bool':
      return value is bool ? null : m.valueInvalid;

    case 'nationalId':
      if (_digitsOf('$value').length != 10) return m.nationalIdLength;
      return isValidNationalId('$value') ? null : m.nationalIdCheck;

    case 'phone':
      return normalizeIranMobile('$value') != null ? null : m.phoneFormat;

    case 'plate':
      final digits = RegExp(r'\d').allMatches(toLatinDigits('$value')).length;
      return digits >= 5 && digits <= 9 ? null : m.plateInvalid;

    default:
      return null;
  }
}

/// Messages for every field asked right now.
Map<String, String> validateAll(
  List<FieldDef> fields,
  Answers answers,
  StringsMobileFieldRules m,
  String language,
) => {
  for (final f in visibleFields(fields, answers))
    f.name: ?validateField(f, answers[f.name], m, language),
};

/// What is sent: answers to the questions still asked (a changed choice
/// can hide one that was already answered), numbers as numbers, text
/// trimmed.
Answers buildPayload(List<FieldDef> fields, Answers answers) => {
  for (final f in visibleFields(fields, answers))
    if (!isEmptyAnswer(answers[f.name]))
      f.name: switch (answers[f.name]) {
        final String s when f.type == 'number' || f.type == 'currency' =>
          num.parse(toLatinDigits(s).replaceAll(RegExp(r'[,\s]'), '')),
        final String s => s.trim(),
        final other => other,
      },
};

/// The contact questions, which every product shares and which always form
/// the last step.
const contactFieldNames = {
  'fullName',
  'organizationName',
  'role',
  'province',
  'city',
  'preferredContactTime',
  'notes',
};

/// The product's own questions, then the contact ones; a product with only
/// contact questions is a single step.
List<({String key, List<FieldDef> fields})> splitIntoSteps(
  List<FieldDef> fields,
) {
  final details = [
    for (final f in fields)
      if (!contactFieldNames.contains(f.name)) f,
  ];
  final contact = [
    for (final f in fields)
      if (contactFieldNames.contains(f.name)) f,
  ];
  return [
    if (details.isNotEmpty) (key: 'details', fields: details),
    (key: 'contact', fields: contact),
  ];
}

/// 125000000 as 125,000,000: an amount that decides a premium is easy to
/// get wrong by a zero without the grouping.
String groupThousands(String value) {
  final digits = _digitsOf(value);
  return digits.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
}
