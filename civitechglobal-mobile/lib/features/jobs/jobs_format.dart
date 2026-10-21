import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/l10n.dart';
import 'jobs_data.dart';

/// The helpers every job screen shares, as the web's lib/jobFormat.ts.

/// The pay line: the range in its own currency and period, "negotiable", or
/// null when it was not given. Toman per month, what every Iranian posting
/// means, reads with no "/ month"; anything else names its period.
String? salaryText(JobSummary job, Strings s, String language) {
  final m = s.market;
  if (job.salaryUndisclosed) return m.salaryUndisclosed;
  final low = formatMoneyIn(job.salaryMin, job.currency, language, m.currency);
  final high = formatMoneyIn(job.salaryMax, job.currency, language, m.currency);
  if (job.currency == 'IRT' && job.salaryPeriod == 'MONTH') {
    // The web's formatRange: the toman once, at the end.
    String bare(String? v) => groupedNumber(v ?? '', language);
    final a = bare(job.salaryMin), b = bare(job.salaryMax);
    if (a.isNotEmpty && b.isNotEmpty) {
      return '$a ${m.to} $b ${m.currency}';
    }
    if (a.isNotEmpty) return '${m.from} $a ${m.currency}';
    if (b.isNotEmpty) return '${m.to} $b ${m.currency}';
    return null;
  }
  final range = low != null && high != null
      ? '$low ${m.to} $high'
      : low != null
      ? '${m.from} $low'
      : high != null
      ? '${m.to} $high'
      : null;
  return range == null
      ? null
      : '$range / ${s.jobs.periods.label(job.salaryPeriod)}';
}

/// City and province in the reader's language; abroad, with the country.
String placeText(JobSummary job, GeoNames geo, String language) {
  final sep = language == 'fa' ? '، ' : ', ';
  if (job.country != null && job.country != homeCountry) {
    return [
      job.city,
      job.province,
      geo.country(job.country),
    ].whereType<String>().where((x) => x.isNotEmpty).join(sep);
  }
  final province = displayProvince(job.province, language);
  final city = job.city;
  // A provincial capital named after its province (Tehran, Tehran) says it once.
  final same =
      city != null &&
      province.isNotEmpty &&
      (city.trim().toLowerCase() == province.trim().toLowerCase() ||
          city.trim() == job.province?.trim());
  return (same ? [province] : [city ?? '', province])
      .where((x) => x.isNotEmpty)
      .join(sep);
}

/// Where a posting is, and for a remote role who may take it.
String wherePosting(JobSummary job, Strings s, GeoNames geo, String language) {
  final j = s.jobs;
  final remote = job.workArrangement != 'REMOTE'
      ? ''
      : job.remoteWorldwide
      ? j.remoteWorldwide
      : job.country == null || job.country == homeCountry
      ? j.remoteAnywhere
      : j.remoteAnywhereIn.fill({'country': geo.country(job.country)});
  if (job.remoteWorldwide) return remote;
  final place = placeText(job, geo, language);
  return place.isNotEmpty ? place : remote;
}

/// Calendar days until a deadline: 0 on its last day, null once it has
/// passed or when there is none. Counted by date, so the day after
/// tomorrow never reads as "tomorrow".
int? daysUntil(DateTime? closesAt, [DateTime? now]) {
  if (closesAt == null) return null;
  final today = now ?? DateTime.now();
  final end = closesAt.toLocal();
  if (end.isBefore(today)) return null;
  DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);
  return day(end).difference(day(today)).inDays;
}

/// How long ago, the way boards say it: "Today", "3 days ago", "last week".
/// Coarse on purpose: hours between two postings of the same day tell a
/// reader nothing.
String postedAgo(DateTime? at, Strings s, String language, [DateTime? now]) {
  if (at == null) return '';
  final days = (now ?? DateTime.now()).difference(at).inDays;
  final m = s.mobile;
  String n(int v) => localDigits(v, language);
  if (days <= 0) return s.jobs.today;
  if (days == 1) return m.agoYesterday;
  if (days < 7) return m.agoDays.fill({'n': n(days)});
  if (days < 14) return m.agoLastWeek;
  if (days < 30) return m.agoWeeks.fill({'n': n(days ~/ 7)});
  if (days < 60) return m.agoLastMonth;
  return m.agoMonths.fill({'n': n(days ~/ 30)});
}

/// "Closes today / tomorrow / in 5 days", within a week of the deadline.
String? closingText(DateTime? closesAt, Strings s, String language) {
  final left = daysUntil(closesAt);
  if (left == null || left > 7) return null;
  final j = s.jobs;
  if (left == 0) return j.closesToday;
  if (left == 1) return j.closesTomorrow;
  return j.closesIn.fill({'n': localDigits(left, language)});
}

/// Minimum experience, as the card and the facts say it.
String? experienceText(JobSummary job, Strings s, String language) {
  final years = job.minExperienceYears;
  if (years == null) return null;
  return years == 0
      ? s.jobs.noExperience
      : s.jobs.yearsOrMore.fill({'n': localDigits(years, language)});
}

/// Skills compared without case or surrounding space.
String skillKey(String skill) => skill.trim().toLowerCase();
