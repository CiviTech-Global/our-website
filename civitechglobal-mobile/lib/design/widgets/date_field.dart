import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../core/format.dart';
import '../../l10n/l10n.dart';

/// A date, chosen from the reader's calendar: the Iranian (Jalali) calendar
/// in Persian, as the web's DateField offers, the Gregorian one otherwise.
/// Whatever the calendar, the value is a plain DateTime, sent to the server
/// as yyyy-mm-dd.
class DateField extends ConsumerWidget {
  const DateField({
    required this.label,
    required this.value,
    required this.onChanged,
    this.firstDate,
    this.lastDate,
    this.errorText,
    super.key,
  });

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final String? errorText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final now = DateTime.now();
    final first = firstDate ?? DateTime(now.year - 1);
    final last = lastDate ?? DateTime(now.year + 5);

    Future<void> pick() async {
      final initial = value ?? (now.isBefore(first) ? first : now);
      DateTime? picked;
      if (language == 'fa') {
        final jalali = await showPersianDatePicker(
          context: context,
          initialDate: Jalali.fromDateTime(initial),
          firstDate: Jalali.fromDateTime(first),
          lastDate: Jalali.fromDateTime(last),
          // The picker names months and days through MaterialLocalizations;
          // the stock set would label a Jalali grid with Gregorian months.
          builder: (context, child) => Localizations.override(
            context: context,
            locale: const Locale('fa', 'IR'),
            delegates: const [
              _JalaliLabels.delegate,
              PersianCupertinoLocalizations.delegate,
            ],
            child: child,
          ),
        );
        picked = jalali?.toDateTime();
      } else {
        picked = await showDatePicker(
          context: context,
          initialDate: initial,
          firstDate: first,
          lastDate: last,
        );
      }
      if (picked != null) onChanged(picked);
    }

    return InkWell(
      onTap: pick,
      borderRadius: BorderRadius.circular(16),
      child: InputDecorator(
        isEmpty: value == null,
        decoration: InputDecoration(
          labelText: label,
          errorText: errorText,
          suffixIcon: value == null
              ? const Icon(Icons.calendar_month_outlined)
              : IconButton(
                  tooltip: s.common.date.clear,
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => onChanged(null),
                ),
        ),
        child: Text(value == null ? '' : formatDate(value!, language)),
      ),
    );
  }
}

/// yyyy-mm-dd, the form the API takes dates in.
String isoDay(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// The package's Jalali labels, in Persian digits like the rest of the app.
/// The compact and short forms stay Latin: the picker's typing mode reads
/// them back.
class _JalaliLabels extends PersianMaterialLocalizations {
  const _JalaliLabels();

  static const LocalizationsDelegate<MaterialLocalizations> delegate =
      _JalaliLabelsDelegate();

  String _fa(String value) => localDigits(value, 'fa');

  @override
  String formatDecimal(int number) => _fa(super.formatDecimal(number));

  @override
  String formatYear(DateTime date) => _fa(super.formatYear(date));

  @override
  String formatMediumDate(DateTime date) => _fa(super.formatMediumDate(date));

  @override
  String formatShortMonthDay(DateTime date) =>
      _fa(super.formatShortMonthDay(date));

  @override
  String formatMonthYear(DateTime date) => _fa(super.formatMonthYear(date));

  @override
  String formatFullDate(DateTime date) => _fa(super.formatFullDate(date));
}

class _JalaliLabelsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const _JalaliLabelsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'fa';

  @override
  Future<MaterialLocalizations> load(Locale locale) =>
      SynchronousFuture(const _JalaliLabels());

  @override
  bool shouldReload(_JalaliLabelsDelegate old) => false;
}
