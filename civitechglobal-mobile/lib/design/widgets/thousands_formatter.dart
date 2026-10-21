import 'package:flutter/services.dart';

import '../../core/format.dart';

/// Groups an amount by thousands as it is typed: 15000000 reads 15,000,000.
/// Amounts in tomans run to nine digits and more, which nobody can count at
/// a glance. Read the value back with [plainDigits].
class ThousandsFormatter extends TextInputFormatter {
  const ThousandsFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final grouped = groupThousands(newValue.text);
    return TextEditingValue(
      text: grouped,
      selection: TextSelection.collapsed(offset: grouped.length),
    );
  }
}

/// Only the digits, in Latin numerals: what the server parses.
String plainDigits(String value) =>
    toLatinDigits(value).replaceAll(RegExp(r'\D'), '');

/// "1250000" (in any numerals, grouped or not) as "1,250,000".
String groupThousands(String value) => plainDigits(
  value,
).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
