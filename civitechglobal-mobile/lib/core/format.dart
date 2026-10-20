import 'package:flutter/painting.dart' show TextDirection;
import 'package:shamsi_date/shamsi_date.dart';

const _persianDigits = '۰۱۲۳۴۵۶۷۸۹';

/// Latin digits to Persian (U+06F0-06F9), as the web's toPersianDigits.
String toPersianDigits(Object value) => value.toString().replaceAllMapped(
  RegExp('[0-9]'),
  (m) => _persianDigits[int.parse(m[0]!)],
);

/// Persian and Arabic-Indic digits back to Latin, for anything typed into a
/// field that the server will parse.
String toLatinDigits(String value) => value
    .replaceAllMapped(RegExp('[۰-۹]'), (m) => '${m[0]!.codeUnitAt(0) - 0x06F0}')
    .replaceAllMapped(
      RegExp('[٠-٩]'),
      (m) => '${m[0]!.codeUnitAt(0) - 0x0660}',
    );

/// Digits in the reader's script: Persian for Persian, Latin otherwise.
String localDigits(Object value, String language) =>
    language == 'fa' ? toPersianDigits(value) : value.toString();

/// [value] with [places] decimals in the reader's script. Persian takes its
/// own separator (٫): a Latin point beside Persian digits reads as their
/// dot-shaped zero, so «۵.۰» looks like fifty.
String localDecimal(num value, int places, String language) {
  final fixed = value.toStringAsFixed(places);
  return language == 'fa' ? toPersianDigits(fixed).replaceAll('.', '٫') : fixed;
}

const _jalaliMonths = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/// A date as its reader expects it: the Iranian calendar in Persian digits
/// for Persian ("۲۵ مهر ۱۴۰۵"), ISO-like Gregorian otherwise.
/// The hour and minute of [date], local, in the reader's digits.
String formatTime(DateTime date, String language) {
  final local = date.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return localDigits('${two(local.hour)}:${two(local.minute)}', language);
}

String formatDate(DateTime date, String language) {
  final local = date.toLocal();
  if (language == 'fa') {
    final j = Jalali.fromDateTime(local);
    return toPersianDigits('${j.day} ${_jalaliMonths[j.month - 1]} ${j.year}');
  }
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)}';
}

final _firstLetter = RegExp(r'\p{L}', unicode: true);

/// Hebrew, Arabic and Persian letters, with their presentation forms.
bool _isRtl(int c) =>
    (c >= 0x0590 && c <= 0x08FF) ||
    (c >= 0xFB1D && c <= 0xFDFF) ||
    (c >= 0xFE70 && c <= 0xFEFF);

/// The direction of what someone wrote, from its first letter: the web's
/// `dir="auto"`. A message in English reads left to right in a Persian
/// screen; one with no letters at all (a number, an emoji) takes [fallback].
TextDirection textDirectionOf(String text, TextDirection fallback) {
  final letter = _firstLetter.firstMatch(text)?.group(0);
  if (letter == null) return fallback;
  return _isRtl(letter.runes.first) ? TextDirection.rtl : TextDirection.ltr;
}
