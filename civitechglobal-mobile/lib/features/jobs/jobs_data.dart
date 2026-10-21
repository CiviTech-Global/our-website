import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../design/widgets/attachments_field.dart';
import '../me/workspace_data.dart';

int? _int(Object? v) => v is num ? v.toInt() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

/// A category in the reader's language: Persian for Persian, English otherwise.
typedef CategoryName = ({String name, String nameEn});

String categoryName(CategoryName? category, String language) {
  if (category == null) return '';
  return language == 'fa' || category.nameEn.isEmpty
      ? category.name
      : category.nameEn;
}

/// A posting as every list shows it: `GET /market/jobs`, the web's JobRowData.
class JobSummary {
  JobSummary.fromJson(Map<String, Object?> j)
    : id = '${j['id']}',
      code = '${j['code']}',
      title = '${j['title'] ?? ''}',
      companyName = _text(j['companyName']),
      companySlug = _text((j['company'] as Map?)?['slug']),
      companyLogo = _text((j['company'] as Map?)?['logoUrl']),
      companyDisplay = _text((j['company'] as Map?)?['name']),
      employmentType = '${j['employmentType'] ?? 'FULL_TIME'}',
      workArrangement = '${j['workArrangement'] ?? 'ONSITE'}',
      province = _text(j['province']),
      city = _text(j['city']),
      country = _text(j['country']),
      remoteWorldwide = j['remoteWorldwide'] == true,
      currency = '${j['currency'] ?? 'IRT'}',
      salaryPeriod = '${j['salaryPeriod'] ?? 'MONTH'}',
      salaryMin = _text(j['salaryMin']),
      salaryMax = _text(j['salaryMax']),
      salaryUndisclosed = j['salaryUndisclosed'] == true,
      seniority = _text(j['seniority']),
      minExperienceYears = _int(j['minExperienceYears']),
      urgent = j['urgent'] == true,
      featured = j['featured'] == true,
      publishedAt = _date(j['publishedAt']),
      closesAt = _date(j['closesAt']),
      skills = _strings(j['skills']),
      benefits = _strings(j['benefits']),
      openings = _int(j['openings']) ?? 1,
      amriehEligible = j['amriehEligible'] == true,
      disabilityFriendly = j['disabilityFriendly'] == true,
      category = switch (j['jobCategory']) {
        final Map<Object?, Object?> c => (
          name: '${c['name'] ?? ''}',
          nameEn: '${c['nameEn'] ?? ''}',
        ),
        _ => null,
      },
      authorVerified = (j['authorProfile'] as Map?)?['verified'] == true,
      authorRating =
          ((j['authorProfile'] as Map?)?['ratingAvg'] as num?)?.toDouble() ?? 0,
      authorRatingCount =
          _int((j['authorProfile'] as Map?)?['ratingCount']) ?? 0,
      authorUsername = _text((j['authorProfile'] as Map?)?['username']),
      applicantCount = _int(j['applicantCount']),
      reviewingNow = j['reviewingNow'] == true,
      responsiveEmployer = j['responsiveEmployer'] == true;

  final String id;
  final String code;
  final String title;
  final String? companyName;

  /// The employer's public company page, when there is one.
  final String? companySlug;
  final String? companyLogo;
  final String? companyDisplay;
  final String employmentType;
  final String workArrangement;
  final String? province;
  final String? city;
  final String? country;
  final bool remoteWorldwide;
  final String currency;

  /// HOUR, MONTH or YEAR.
  final String salaryPeriod;
  final String? salaryMin;
  final String? salaryMax;
  final bool salaryUndisclosed;
  final String? seniority;
  final int? minExperienceYears;
  final bool urgent;
  final bool featured;
  final DateTime? publishedAt;
  final DateTime? closesAt;
  final List<String> skills;
  final List<String> benefits;
  final int openings;
  final bool amriehEligible;
  final bool disabilityFriendly;
  final CategoryName? category;
  final bool authorVerified;
  final double authorRating;
  final int authorRatingCount;
  final String? authorUsername;

  /// How many have applied; absent from servers before job board v2.
  final int? applicantCount;
  final bool reviewingNow;
  final bool responsiveEmployer;

  /// The company's own name when it has a page, the posting's otherwise.
  String? get company => companyDisplay ?? companyName;

  /// Posted within the last two days.
  bool get isNew =>
      publishedAt != null &&
      DateTime.now().difference(publishedAt!) < const Duration(days: 2);
}

/// One posting in full: `GET /market/jobs/:code`.
class JobDetail extends JobSummary {
  JobDetail.fromJson(super.j)
    : description = '${j['description'] ?? ''}',
      educationLevel = _text(j['educationLevel']),
      fieldOfStudy = _text(j['fieldOfStudy']),
      workingHours = _text(j['workingHours']),
      genderRequirement = _text(j['genderRequirement']),
      ageMin = _int(j['ageMin']),
      ageMax = _int(j['ageMax']),
      militaryService = _text(j['militaryService']),
      viewCount = _int(j['viewCount']) ?? 0,
      applications = _int((j['_count'] as Map?)?['applications']) ?? 0,
      responsiveRate = switch (j['responsiveness']) {
        {'responsive': true, 'rate': final num rate} => rate.toDouble(),
        _ => null,
      },
      similar = [
        for (final s in (j['similar'] as List? ?? const []))
          // Older servers sent bare links here; only full rows are cards.
          if (s is Map<String, Object?> && s['id'] != null)
            JobSummary.fromJson(s),
      ],
      super.fromJson();

  final String description;
  final String? educationLevel;
  final String? fieldOfStudy;
  final String? workingHours;
  final String? genderRequirement;
  final int? ageMin;
  final int? ageMax;
  final String? militaryService;
  final int viewCount;
  final int applications;

  /// Share of applicants this employer answers, when it is a responsive one.
  final double? responsiveRate;
  final List<JobSummary> similar;
}

/// What the board is asked: the web's JobBoardQuery, without paging. Only
/// what is set travels; equal queries are the same list.
@immutable
class JobQuery {
  const JobQuery({
    this.search = '',
    this.sort = 'newest',
    this.country = '',
    this.province = '',
    this.categoryId = '',
    this.employmentType = '',
    this.workArrangement = '',
    this.seniority = '',
    this.maxExperience = '',
    this.salaryMin = '',
    this.currency = '',
    this.postedWithinDays = '',
    this.benefits = const [],
    this.urgent = false,
    this.amriehEligible = false,
    this.disabilityFriendly = false,
    this.remoteWorldwide = false,
  });

  final String search;
  final String sort;
  final String country;
  final String province;
  final String categoryId;
  final String employmentType;
  final String workArrangement;
  final String seniority;
  final String maxExperience;
  final String salaryMin;

  /// The pay floor's currency; travels only with a floor.
  final String currency;
  final String postedWithinDays;
  final List<String> benefits;
  final bool urgent;
  final bool amriehEligible;
  final bool disabilityFriendly;
  final bool remoteWorldwide;

  /// The filters (not search, sort or place) that are set: the badge on the
  /// filters key, and what "clear" undoes.
  int get activeFilters =>
      [
        categoryId,
        employmentType,
        workArrangement,
        seniority,
        maxExperience,
        salaryMin,
        postedWithinDays,
      ].where((v) => v.isNotEmpty).length +
      benefits.length +
      [
        urgent,
        amriehEligible,
        disabilityFriendly,
        remoteWorldwide,
      ].where((v) => v).length;

  Map<String, Object?> toParams() => {
    if (search.trim().isNotEmpty) 'search': search.trim(),
    'sort': sort,
    if (country.isNotEmpty) 'country': country,
    if (province.isNotEmpty) 'province': province,
    if (categoryId.isNotEmpty) 'jobCategoryId': categoryId,
    if (employmentType.isNotEmpty) 'employmentType': employmentType,
    if (workArrangement.isNotEmpty) 'workArrangement': workArrangement,
    if (seniority.isNotEmpty) 'seniority': seniority,
    if (maxExperience.isNotEmpty) 'maxExperience': maxExperience,
    if (salaryMin.isNotEmpty) ...{'salaryMin': salaryMin, 'currency': currency},
    if (postedWithinDays.isNotEmpty) 'postedWithinDays': postedWithinDays,
    // One comma-separated parameter, as the server's schema reads it.
    if (benefits.isNotEmpty) 'benefits': benefits.join(','),
    // Switches cross only when on: "false" is the same as not asking.
    if (urgent) 'urgent': 'true',
    if (amriehEligible) 'amriehEligible': 'true',
    if (disabilityFriendly) 'disabilityFriendly': 'true',
    if (remoteWorldwide) 'remoteWorldwide': 'true',
  };

  JobQuery copyWith({
    String? search,
    String? sort,
    String? country,
    String? province,
    String? categoryId,
    String? employmentType,
    String? workArrangement,
    String? seniority,
    String? maxExperience,
    String? salaryMin,
    String? currency,
    String? postedWithinDays,
    List<String>? benefits,
    bool? urgent,
    bool? amriehEligible,
    bool? disabilityFriendly,
    bool? remoteWorldwide,
  }) => JobQuery(
    search: search ?? this.search,
    sort: sort ?? this.sort,
    country: country ?? this.country,
    province: province ?? this.province,
    categoryId: categoryId ?? this.categoryId,
    employmentType: employmentType ?? this.employmentType,
    workArrangement: workArrangement ?? this.workArrangement,
    seniority: seniority ?? this.seniority,
    maxExperience: maxExperience ?? this.maxExperience,
    salaryMin: salaryMin ?? this.salaryMin,
    currency: currency ?? this.currency,
    postedWithinDays: postedWithinDays ?? this.postedWithinDays,
    benefits: benefits ?? this.benefits,
    urgent: urgent ?? this.urgent,
    amriehEligible: amriehEligible ?? this.amriehEligible,
    disabilityFriendly: disabilityFriendly ?? this.disabilityFriendly,
    remoteWorldwide: remoteWorldwide ?? this.remoteWorldwide,
  );

  /// The same search and place, every filter cleared.
  JobQuery cleared() => JobQuery(
    search: search,
    sort: sort,
    country: country,
    province: province,
  );

  @override
  bool operator ==(Object other) =>
      other is JobQuery && mapEquals(other.toParams(), toParams());

  @override
  int get hashCode => Object.hashAll(
    toParams().entries.map((e) => Object.hash(e.key, e.value)),
  );
}

typedef JobPage = ({
  List<JobSummary> items,
  int page,
  int totalPages,
  int total,
});

/// The board for one query, twenty at a time; the next page loads as the
/// list nears its end.
final jobBoardProvider = AsyncNotifierProvider.autoDispose
    .family<JobBoardController, JobPage, JobQuery>(JobBoardController.new);

class JobBoardController extends AsyncNotifier<JobPage> {
  JobBoardController(this.query);

  final JobQuery query;
  static const pageSize = 20;
  bool _loadingMore = false;

  Future<JobPage> _fetch(int page) => ref
      .read(apiClientProvider)
      .get(
        '/market/jobs',
        query: {...query.toParams(), 'page': page, 'pageSize': pageSize},
        parse: (d) {
          final map = d! as Map;
          return (
            items: [
              for (final j in (map['items'] as List? ?? const []))
                if (j is Map<String, Object?>) JobSummary.fromJson(j),
            ],
            page: _int(map['page']) ?? page,
            totalPages: _int(map['totalPages']) ?? 1,
            total: _int(map['total']) ?? 0,
          );
        },
      );

  @override
  Future<JobPage> build() => _fetch(1);

  bool get hasMore => switch (state.value) {
    final p? => p.page < p.totalPages,
    null => false,
  };

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !hasMore || _loadingMore) return;
    _loadingMore = true;
    try {
      final next = await _fetch(current.page + 1);
      // A posting published meanwhile moves the pages along; a repeat is
      // dropped rather than shown twice.
      final seen = {for (final j in current.items) j.id};
      state = AsyncData((
        items: [
          ...current.items,
          ...next.items.where((j) => !seen.contains(j.id)),
        ],
        page: next.page,
        totalPages: next.totalPages,
        total: next.total,
      ));
    } finally {
      _loadingMore = false;
    }
  }
}

final jobProvider = FutureProvider.autoDispose.family<JobDetail, String>(
  (ref, code) => ref
      .read(apiClientProvider)
      .get(
        '/market/jobs/${Uri.encodeComponent(code)}',
        parse: (d) => JobDetail.fromJson(d! as Map<String, Object?>),
      ),
);

/// A category of the board's tree. Choosing a parent matches its children.
typedef JobCategory = ({
  String id,
  String slug,
  String name,
  String nameEn,
  String? parentId,
});

final jobCategoriesProvider = FutureProvider<List<JobCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/jobs/categories',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map)
              (
                id: '${c['id']}',
                slug: '${c['slug']}',
                name: '${c['name'] ?? ''}',
                nameEn: '${c['nameEn'] ?? ''}',
                parentId: _text(c['parentId']),
              ),
        ],
      ),
);

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// The ids of the postings this member saved; empty when signed out.
final savedJobIdsProvider = FutureProvider<Set<String>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const {};
  return ref
      .read(apiClientProvider)
      .get(
        '/jobs/me/saved/ids',
        parse: (d) => {for (final id in (d as List? ?? const [])) '$id'},
      );
});

/// A member's application, as far as the board needs it.
typedef OwnApplication = ({
  String jobCode,
  String outcome,
  DateTime? createdAt,
});

final ownApplicationsProvider = FutureProvider<List<OwnApplication>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/applications',
        parse: (d) => [
          for (final a in (d as List? ?? const []))
            if (a is Map)
              (
                jobCode: '${(a['job'] as Map?)?['code'] ?? ''}',
                outcome: '${a['outcome'] ?? ''}',
                createdAt: _date(a['createdAt']),
              ),
        ],
      );
});

/// This member's live application to [code], if any: a withdrawn one does
/// not count, since its owner may apply again.
OwnApplication? applicationTo(List<OwnApplication> own, String code) {
  for (final a in own) {
    if (a.jobCode == code && a.outcome != 'WITHDRAWN') return a;
  }
  return null;
}

/// The postings of this member's own, by code: an employer cannot apply to
/// them.
final ownJobCodesProvider = FutureProvider<Set<String>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const {};
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/jobs',
        parse: (d) => {
          for (final j in (d as List? ?? const []))
            if (j is Map) '${j['code']}',
        },
      );
});

/// The reader's skills against a posting's: `GET /jobs/me/match/:jobId`.
typedef JobMatch = ({
  List<String> matched,
  List<String> missing,
  int total,
  bool hasProfileSkills,
});

final jobMatchProvider = FutureProvider.autoDispose.family<JobMatch?, String>((
  ref,
  jobId,
) async {
  if (ref.watch(_accountProvider) == null) return null;
  return ref
      .read(apiClientProvider)
      .get(
        '/jobs/me/match/${Uri.encodeComponent(jobId)}',
        parse: (d) {
          final m = (d as Map?) ?? const {};
          return (
            matched: _strings(m['matched']),
            missing: _strings(m['missing']),
            total: _int(m['total']) ?? 0,
            hasProfileSkills: m['hasProfileSkills'] == true,
          );
        },
      );
});

/// What a CV may be: the server's RESUME_EXTENSIONS.
const cvExtensions = ['pdf', 'docx', 'tex'];

/// The board's writes, for widgets.
final jobActionsProvider = Provider<JobActions>(JobActions.new);

class JobActions {
  const JobActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  /// Saves or unsaves, shown at once and put back if the server says no.
  Future<void> setSaved(String jobId, {required bool saved}) async {
    final ids = _ref.read(savedJobIdsProvider).value ?? const <String>{};
    _ref.read(_savedOverride.notifier).set(jobId, saved);
    try {
      if (saved) {
        await _api.put<void>('/jobs/me/saved/${Uri.encodeComponent(jobId)}');
      } else {
        await _api.delete<void>('/jobs/me/saved/${Uri.encodeComponent(jobId)}');
      }
      _ref.invalidate(savedJobIdsProvider);
    } catch (_) {
      _ref.read(_savedOverride.notifier).set(jobId, ids.contains(jobId));
      rethrow;
    } finally {
      _ref.invalidate(workspaceProvider);
    }
  }

  /// Applies to [jobId]: the form as one JSON field, the CV as a file.
  Future<void> apply({
    required String jobId,
    required String coverLetter,
    required String expectedSalary,
    PickedFile? cv,
    void Function(double progress)? onProgress,
  }) async {
    final payload = <String, Object?>{
      // Blank is not absent to the server's schema; blank is what fails.
      if (coverLetter.trim().isNotEmpty) 'coverLetter': coverLetter.trim(),
      if (expectedSalary.isNotEmpty) 'expectedSalary': expectedSalary,
    };
    final parts = cv == null ? null : await multipartParts([cv]);
    await _api.upload<void>(
      '/market/me/jobs/${Uri.encodeComponent(jobId)}/apply',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        if (parts != null) 'cv': parts().first,
      }),
      onProgress: onProgress,
    );
    _ref
      ..invalidate(ownApplicationsProvider)
      ..invalidate(workspaceProvider);
  }
}

/// Whether [jobId] is saved, taking a save still on its way into account.
final isJobSavedProvider = Provider.family<bool, String>((ref, jobId) {
  final pending = ref.watch(_savedOverride)[jobId];
  if (pending != null) return pending;
  return ref.watch(savedJobIdsProvider).value?.contains(jobId) ?? false;
});

/// Saves shown before the server answers.
final _savedOverride = NotifierProvider<_SavedOverride, Map<String, bool>>(
  _SavedOverride.new,
);

class _SavedOverride extends Notifier<Map<String, bool>> {
  @override
  Map<String, bool> build() {
    // A fresh list from the server is the truth again: only new data, not
    // the reload starting, which still holds the old list.
    ref.watch(savedJobIdsProvider.select((v) => v.value));
    return const {};
  }

  void set(String jobId, bool saved) => state = {...state, jobId: saved};
}
