import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/features/insurance/insurance_rules.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:flutter_test/flutter_test.dart';

final _en = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
).mobile.fieldRules;

FieldDef _field(String type, [Map<String, Object?> extra = const {}]) =>
    FieldDef.fromJson({
      'name': 'x',
      'label': 'x',
      'labelEn': 'x',
      'type': type,
      'required': true,
      ...extra,
    });

String? _check(FieldDef f, Object? value) => validateField(f, value, _en, 'en');

void main() {
  group('visibility', () {
    final dependent = FieldDef.fromJson({
      'name': 'contents',
      'label': '',
      'type': 'currency',
      'showWhen': {
        'field': 'subject',
        'equals': ['BOTH', 'CONTENTS'],
      },
    });

    test('follows a single choice', () {
      expect(isFieldVisible(dependent, {}), isFalse);
      expect(isFieldVisible(dependent, {'subject': 'BUILDING'}), isFalse);
      expect(isFieldVisible(dependent, {'subject': 'BOTH'}), isTrue);
    });

    test('follows any of several choices', () {
      expect(
        isFieldVisible(dependent, {
          'subject': ['BUILDING', 'CONTENTS'],
        }),
        isTrue,
      );
    });

    test('a hidden answer is not sent', () {
      final payload = buildPayload(
        [_field('select'), dependent],
        {'x': 'A', 'contents': '5000', 'subject': 'BUILDING'},
      );
      expect(payload.containsKey('contents'), isFalse);
    });
  });

  group('national ID', () {
    test('accepts a valid check digit, in either script', () {
      expect(isValidNationalId('0499370899'), isTrue);
      expect(isValidNationalId('۰۴۹۹۳۷۰۸۹۹'), isTrue);
    });

    test('refuses a wrong check digit and a repeated digit', () {
      expect(isValidNationalId('0499370898'), isFalse);
      expect(isValidNationalId('1111111111'), isFalse);
    });

    test('explains length before the check digit', () {
      final f = _field('nationalId');
      expect(_check(f, '12345'), _en.nationalIdLength);
      expect(_check(f, '0499370898'), _en.nationalIdCheck);
      expect(_check(f, '0499370899'), isNull);
    });
  });

  test('mobile numbers are read the ways people write them', () {
    for (final written in [
      '09121234567',
      '+989121234567',
      '00989121234567',
      '989121234567',
      '9121234567',
      '۰۹۱۲ ۱۲۳ ۴۵۶۷',
    ]) {
      expect(normalizeIranMobile(written), '09121234567', reason: written);
    }
    expect(normalizeIranMobile('02112345678'), isNull);
    expect(normalizeIranMobile('12345'), isNull);
  });

  group('field types', () {
    test('an empty required field, and an empty optional one', () {
      expect(_check(_field('text'), '  '), _en.required);
      expect(
        validateField(
          FieldDef.fromJson({'name': 'x', 'label': '', 'type': 'text'}),
          '',
          _en,
          'en',
        ),
        isNull,
      );
    });

    test('text length', () {
      final f = _field('text', {'minLength': 3, 'maxLength': 5});
      expect(_check(f, 'ab'), 'At least 3 characters');
      expect(_check(f, 'abcdef'), 'At most 5 characters');
      expect(_check(f, 'abcd'), isNull);
    });

    test('amounts take separators and Persian digits', () {
      final f = _field('currency', {'min': 1000});
      expect(_check(f, '۱,۲۰۰'), isNull);
      expect(_check(f, '999'), 'At least 1000');
      expect(_check(f, '12.5'), _en.wholeAmount);
      expect(_check(f, 'abc'), _en.notNumber);
    });

    test('a date from today on', () {
      final f = _field('date', {'min': 'today'});
      expect(_check(f, '2000-01-01'), _en.datePast);
      expect(_check(f, '3000-01-01'), isNull);
      expect(_check(f, '01/01/3000'), _en.dateInvalid);
    });

    test('choices', () {
      final options = [
        {'value': 'A', 'label': 'A'},
        {'value': 'B', 'label': 'B'},
      ];
      expect(
        _check(_field('select', {'options': options}), 'C'),
        _en.optionInvalid,
      );
      final multi = _field('multiselect', {
        'options': options,
        'minSelected': 2,
      });
      expect(_check(multi, ['A']), 'Choose at least 2');
      expect(_check(multi, ['A', 'B']), isNull);
    });

    test('plate and phone', () {
      expect(_check(_field('plate'), '12 ب 345 - 67'), isNull);
      expect(_check(_field('plate'), '12'), _en.plateInvalid);
      expect(_check(_field('phone'), '0912'), _en.phoneFormat);
    });
  });

  test('amounts are sent as numbers and text trimmed', () {
    final payload = buildPayload(
      [_field('currency').copyName('amount'), _field('text').copyName('name')],
      {'amount': '۱,۲۰۰', 'name': '  Sara  '},
    );
    expect(payload, {'amount': 1200, 'name': 'Sara'});
  });

  test('the contact questions form the last step', () {
    final steps = splitIntoSteps([
      _field('text').copyName('fullName'),
      _field('select').copyName('vehicle'),
      _field('text').copyName('city'),
    ]);
    expect([for (final s in steps) s.key], ['details', 'contact']);
    expect([for (final f in steps.last.fields) f.name], ['fullName', 'city']);
    expect(splitIntoSteps([_field('text').copyName('fullName')]).length, 1);
  });

  test('amounts are grouped by thousands', () {
    expect(groupThousands('125000000'), '125,000,000');
    expect(groupThousands('۱۲۵۰'), '1,250');
    expect(groupThousands(''), '');
  });
}

extension on FieldDef {
  FieldDef copyName(String name) => FieldDef(
    name: name,
    label: label,
    labelEn: labelEn,
    type: type,
    required: required,
  );
}
