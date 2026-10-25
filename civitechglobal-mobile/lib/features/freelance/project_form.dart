import '../../design/widgets/date_field.dart';
import '../../design/widgets/thousands_formatter.dart';

/// The post-project form as plain data, as the web's PostProjectPage: what
/// it holds, how a saved project fills it, what it sends, and what still
/// stands in the way of sending it for review.

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

DateTime? _day(Object? v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;

const projectSteps = [
  'basics',
  'scope',
  'budget',
  'details',
  'options',
  'review',
];
const maxScreeningQuestions = 5;
const maxProjectFiles = 5;

class ProjectDraft {
  ProjectDraft();

  ProjectDraft.fromProject(Map<String, Object?> p)
    : title = '${p['title'] ?? ''}',
      workCategoryId = _text(p['workCategoryId']) ?? '',
      skills = _strings(p['skills']).join(', '),
      experienceLevel = _text(p['experienceLevel']) ?? '',
      duration = _text(p['duration']) ?? '',
      freelancersNeeded = (p['freelancersNeeded'] as num?)?.toInt() ?? 1,
      contractToHire = p['contractToHire'] == true,
      pricingType = _text(p['pricingType']) ?? 'FIXED',
      budgetMin = _text(p['budgetMin']) ?? '',
      budgetMax = _text(p['budgetMax']) ?? '',
      budgetUnknown = p['budgetUnknown'] == true,
      currency = _text(p['currency']) ?? 'IRT',
      weeklyHours = _text(p['weeklyHours']) ?? '',
      description = '${p['description'] ?? ''}',
      deliverBy = _day(p['deliverBy']),
      closesAt = _day(p['closesAt']),
      screeningQuestions = _strings(p['screeningQuestions']),
      visibility = _text(p['visibility']) ?? 'PUBLIC',
      sealed = p['sealed'] != false,
      nda = p['nda'] == true,
      urgent = p['urgent'] == true,
      onsite = p['onsite'] == true,
      country = _text(p['country']) ?? 'IR',
      province = _text(p['province']) ?? '',
      city = _text(p['city']) ?? '',
      preferredCountries = _strings(p['preferredCountries']),
      languages = _strings(p['languages']),
      openToCompanyOffer = p['openToCompanyOffer'] != false;

  String title = '';
  String workCategoryId = '';
  String skills = '';
  String experienceLevel = '';
  String duration = '';
  int freelancersNeeded = 1;
  bool contractToHire = false;
  String pricingType = 'FIXED';
  String budgetMin = '';
  String budgetMax = '';
  bool budgetUnknown = false;
  String currency = 'IRT';
  String weeklyHours = '';
  String description = '';
  DateTime? deliverBy;
  DateTime? closesAt;
  List<String> screeningQuestions = [];
  String visibility = 'PUBLIC';
  bool sealed = true;
  bool nda = false;
  bool urgent = false;
  bool onsite = false;
  String country = 'IR';
  String province = '';
  String city = '';
  List<String> preferredCountries = [];
  List<String> languages = ['fa'];
  bool openToCompanyOffer = true;

  bool get hourly => pricingType == 'HOURLY';

  List<String> get skillList => {
    for (final s in skills.split(RegExp('[,،\n]')))
      if (s.trim().isNotEmpty) s.trim(),
  }.take(20).toList();

  /// What the form sends, as the web's toPayload: what is not given is left
  /// out, on a new project and on an edit alike, and the place only for
  /// on-site work.
  Map<String, Object?> toPayload() {
    String? digits(String v) {
      final d = plainDigits(v);
      return d.isEmpty ? null : d;
    }

    return {
      'title': title.trim(),
      'description': description.trim(),
      'skills': skillList,
      if (!budgetUnknown) 'budgetMin': ?digits(budgetMin),
      if (!budgetUnknown) 'budgetMax': ?digits(budgetMax),
      'budgetUnknown': budgetUnknown,
      'currency': currency,
      if (deliverBy case final d?) 'deliverBy': isoDay(d),
      if (closesAt case final d?) 'closesAt': isoDay(d),
      'openToCompanyOffer': openToCompanyOffer,
      if (workCategoryId.isNotEmpty) 'workCategoryId': workCategoryId,
      'pricingType': pricingType,
      if (experienceLevel.isNotEmpty) 'experienceLevel': experienceLevel,
      if (duration.isNotEmpty) 'duration': duration,
      if (hourly && weeklyHours.isNotEmpty) 'weeklyHours': weeklyHours,
      'urgent': urgent,
      'sealed': sealed,
      'nda': nda,
      'visibility': visibility,
      'preferredCountries': preferredCountries,
      'languages': languages,
      'screeningQuestions': [
        for (final q in screeningQuestions)
          if (q.trim().isNotEmpty) q.trim(),
      ],
      'contractToHire': contractToHire,
      'freelancersNeeded': freelancersNeeded,
      'onsite': onsite,
      if (onsite) 'country': country,
      if (onsite && province.trim().isNotEmpty) 'province': province.trim(),
      if (onsite && city.trim().isNotEmpty) 'city': city.trim(),
    };
  }

  /// What still stands in the way of sending it, by step, as the web's
  /// problems: the step's name, and which of the strings says why.
  Map<String, ProjectProblem> problems() {
    final low = BigInt.tryParse(plainDigits(budgetMin));
    final high = BigInt.tryParse(plainDigits(budgetMax));
    return {
      if (title.trim().length < 5) 'basics': ProjectProblem.title,
      if (!budgetUnknown && low == null && high == null)
        'budget': ProjectProblem.budgetNeeded
      else if (!budgetUnknown && low != null && high != null && low > high)
        'budget': ProjectProblem.budgetOrder,
      if (description.trim().length < 50) 'details': ProjectProblem.description,
    };
  }

  /// Enough to keep as a draft: a title and a brief.
  bool get savable =>
      title.trim().length >= 5 && description.trim().length >= 50;
}

enum ProjectProblem { title, budgetNeeded, budgetOrder, description }
