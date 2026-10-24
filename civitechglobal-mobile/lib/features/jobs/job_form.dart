import '../../core/geo.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/thousands_formatter.dart';

/// The posting form as plain data, as the web's MyJobsPage form and
/// lib/jobForm.ts: what it holds, how a saved posting fills it, and what it
/// sends. Kept apart from the screen so the rules about blanks can be tested.

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

String _number(Object? v) => v is num ? '${v.toInt()}' : '';

const jobEmploymentTypes = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
];
const jobWorkArrangements = ['ONSITE', 'HYBRID', 'REMOTE'];
const jobEducationLevels = [
  'DIPLOMA',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
];
const jobSalaryPeriods = ['MONTH', 'YEAR', 'HOUR'];
const jobGenders = ['ANY', 'MALE', 'FEMALE'];
const jobMilitaryOptions = ['ANY', 'COMPLETED_OR_EXEMPT'];

class JobDraft {
  JobDraft();

  /// A saved posting, to edit. An absent salary stays absent rather than
  /// becoming a zero nobody typed.
  JobDraft.fromJob(Map<String, Object?> j)
    : title = '${j['title'] ?? ''}',
      description = '${j['description'] ?? ''}',
      employmentType = '${j['employmentType'] ?? 'FULL_TIME'}',
      workArrangement = '${j['workArrangement'] ?? 'ONSITE'}',
      province = _text(j['province']) ?? '',
      city = _text(j['city']) ?? '',
      salaryMin = _text(j['salaryMin']) ?? '',
      salaryMax = _text(j['salaryMax']) ?? '',
      salaryUndisclosed = j['salaryUndisclosed'] == true,
      skills = [
        for (final s in (j['skills'] as List? ?? const []))
          if (s is String) s,
      ].join('، '),
      category = _text(j['category']) ?? '',
      closesAt = switch (j['closesAt']) {
        final String at => DateTime.tryParse(at)?.toLocal(),
        _ => null,
      },
      openings = _number(j['openings']).isEmpty ? '1' : _number(j['openings']),
      country = _text(j['country']) ?? 'IR',
      currency = _text(j['currency']) ?? 'IRT',
      salaryPeriod = _text(j['salaryPeriod']) ?? 'MONTH',
      remoteWorldwide = j['remoteWorldwide'] == true,
      jobCategoryId = _text(j['jobCategoryId']) ?? '',
      seniority = _text(j['seniority']) ?? '',
      minExperienceYears = _number(j['minExperienceYears']),
      educationLevel = _text(j['educationLevel']) ?? '',
      fieldOfStudy = _text(j['fieldOfStudy']) ?? '',
      workingHours = _text(j['workingHours']) ?? '',
      benefits = {
        for (final b in (j['benefits'] as List? ?? const []))
          if (b is String) b,
      },
      urgent = j['urgent'] == true,
      genderRequirement = _text(j['genderRequirement']) ?? 'ANY',
      ageMin = _number(j['ageMin']),
      ageMax = _number(j['ageMax']),
      militaryService = _text(j['militaryService']) ?? 'ANY',
      amriehEligible = j['amriehEligible'] == true,
      disabilityFriendly = j['disabilityFriendly'] == true;

  String title = '';
  String description = '';
  String employmentType = 'FULL_TIME';
  String workArrangement = 'ONSITE';
  String province = '';
  String city = '';
  String salaryMin = '';
  String salaryMax = '';
  bool salaryUndisclosed = false;
  String skills = '';
  String category = '';
  DateTime? closesAt;
  String openings = '1';
  String country = 'IR';
  String currency = 'IRT';
  String salaryPeriod = 'MONTH';
  bool remoteWorldwide = false;

  // The second-generation fields.
  String jobCategoryId = '';
  String seniority = '';
  String minExperienceYears = '';
  String educationLevel = '';
  String fieldOfStudy = '';
  String workingHours = '';
  Set<String> benefits = {};
  bool urgent = false;
  String genderRequirement = 'ANY';
  String ageMin = '';
  String ageMax = '';
  String militaryService = 'ANY';
  bool amriehEligible = false;
  bool disabilityFriendly = false;

  /// A new country starts its region afresh, and takes its usual currency
  /// unless a salary has already been typed in another.
  void setCountry(String code) {
    country = code;
    province = '';
    if (salaryMin.isEmpty && salaryMax.isEmpty) {
      currency = defaultCurrency[code] ?? currency;
    }
  }

  /// What the form sends, as the web's handleSave.
  ///
  /// An emptied field means "remove it" on an edit, sent as null so the
  /// server clears the old value, and "not given" on a new posting, left
  /// out. The second-generation fields travel only on that board, whose form
  /// shows them. The free-text category is the old board's field; on the new
  /// one it stays empty, as the web sends it.
  Map<String, Object?> toPayload({required bool edit, required bool v2}) {
    final payload = <String, Object?>{};
    void put(String key, Object? value) {
      if (value != null || edit) payload[key] = value;
    }

    String? text(String v) => v.trim().isEmpty ? null : v.trim();
    int? whole(String v) => int.tryParse(plainDigits(v));
    String? money(String v) {
      if (salaryUndisclosed) return null;
      final digits = plainDigits(v);
      return digits.isEmpty ? null : digits;
    }

    final count = whole(openings);
    payload['title'] = title.trim();
    payload['description'] = description.trim();
    payload['employmentType'] = employmentType;
    payload['workArrangement'] = workArrangement;
    put('province', text(province));
    put('city', text(city));
    put('category', text(category));
    put('closesAt', closesAt == null ? null : isoDay(closesAt!));
    payload['openings'] = count != null && count >= 1 ? count : 1;
    if (v2) {
      payload['country'] = country;
      payload['currency'] = currency;
      payload['salaryPeriod'] = salaryPeriod;
      payload['remoteWorldwide'] =
          workArrangement == 'REMOTE' && remoteWorldwide;
    }
    payload['salaryUndisclosed'] = salaryUndisclosed;
    // Suppressed rather than merely ignored when negotiable: a number
    // alongside "undisclosed" states two different things.
    put('salaryMin', money(salaryMin));
    put('salaryMax', money(salaryMax));
    // Both commas: somebody typing Persian gets the Persian one.
    payload['skills'] = [
      for (final skill in skills.split(RegExp('[,،]')))
        if (skill.trim().isNotEmpty) skill.trim(),
    ];
    if (v2) {
      put('jobCategoryId', text(jobCategoryId));
      put('seniority', text(seniority));
      put('minExperienceYears', whole(minExperienceYears));
      put('educationLevel', text(educationLevel));
      put('fieldOfStudy', text(fieldOfStudy));
      put('workingHours', text(workingHours));
      payload['benefits'] = benefits.toList();
      payload['urgent'] = urgent;
      payload['genderRequirement'] = genderRequirement;
      put('ageMin', whole(ageMin));
      put('ageMax', whole(ageMax));
      payload['militaryService'] = militaryService;
      payload['amriehEligible'] = amriehEligible;
      payload['disabilityFriendly'] = disabilityFriendly;
    }
    return payload;
  }
}
