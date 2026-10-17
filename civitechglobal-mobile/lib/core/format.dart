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
String formatDate(DateTime date, String language) {
  final local = date.toLocal();
  if (language == 'fa') {
    final j = Jalali.fromDateTime(local);
    return toPersianDigits('${j.day} ${_jalaliMonths[j.month - 1]} ${j.year}');
  }
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)}';
}
