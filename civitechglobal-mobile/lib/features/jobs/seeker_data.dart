import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../design/widgets/attachments_field.dart';
import '../me/workspace_data.dart';
import 'jobs_data.dart';

/// The job seeker's own lists, as the web's dashboard pages read them:
/// saved postings, saved searches that notify, and postings picked for them.

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// A posting this member saved, and whether it is still open: a closed one
/// stays, marked, rather than vanishing from a list its owner was keeping.
typedef SavedJob = ({DateTime? savedAt, bool open, JobSummary job});

final savedJobsProvider = FutureProvider.autoDispose<List<SavedJob>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  // Saving or unsaving anywhere changes this list too.
  ref.watch(savedJobIdsProvider);
  return ref
      .read(apiClientProvider)
      .get(
        '/jobs/me/saved',
        parse: (d) => [
          for (final e in (d as List? ?? const []))
            if (e is Map && e['job'] is Map<String, Object?>)
              (
                savedAt: _date(e['savedAt']),
                open: e['open'] != false,
                job: JobSummary.fromJson(e['job']! as Map<String, Object?>),
              ),
        ],
      );
});

/// What a saved search runs, as the web's AlertQuery: only what is set.
typedef AlertQuery = Map<String, String>;

/// The part of a board query an alert can carry.
AlertQuery alertQueryOf(JobQuery q) => {
  if (q.search.trim().isNotEmpty) 'search': q.search.trim(),
  if (q.country.isNotEmpty) 'country': q.country,
  if (q.province.isNotEmpty) 'province': q.province,
  if (q.categoryId.isNotEmpty) 'jobCategoryId': q.categoryId,
  if (q.employmentType.isNotEmpty) 'employmentType': q.employmentType,
  if (q.workArrangement.isNotEmpty) 'workArrangement': q.workArrangement,
  if (q.seniority.isNotEmpty) 'seniority': q.seniority,
  if (q.salaryMin.isNotEmpty) 'salaryMin': q.salaryMin,
};

/// The board query an alert (or a board address's parameters) opens at.
/// The web's board reads search as `q`; an alert stores it as `search`.
JobQuery jobQueryOf(Map<String, String> a) => JobQuery(
  search: a['search'] ?? a['q'] ?? '',
  country: a['country'] ?? '',
  province: a['province'] ?? '',
  categoryId: a['jobCategoryId'] ?? '',
  employmentType: a['employmentType'] ?? '',
  workArrangement: a['workArrangement'] ?? '',
  seniority: a['seniority'] ?? '',
  salaryMin: a['salaryMin'] ?? '',
);

/// A saved search that notifies: `GET /jobs/me/alerts`.
class JobAlert {
  JobAlert.fromJson(Map<Object?, Object?> a)
    : id = '${a['id']}',
      name = '${a['name'] ?? ''}',
      query = {
        for (final MapEntry(:key, :value)
            in ((a['query'] as Map?) ?? const {}).entries)
          if (value is String && value.isNotEmpty) '$key': value,
      },
      active = a['active'] != false,
      lastNotifiedAt = _date(a['lastNotifiedAt']);

  final String id;
  final String name;
  final AlertQuery query;
  final bool active;
  final DateTime? lastNotifiedAt;
}

/// How many alerts an account may keep: the server's cap.
const maxJobAlerts = 20;

final jobAlertsProvider = FutureProvider.autoDispose<List<JobAlert>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/jobs/me/alerts',
        parse: (d) => [
          for (final a in (d as List? ?? const []))
            if (a is Map) JobAlert.fromJson(a),
        ],
      );
});

/// How many of a posting's skills the reader has, as the server worked it out.
typedef SkillFit = ({int matched, int total});

/// Postings picked for this member: from their skills, from what they have
/// been looking at, or nothing yet (basis none: ask them for skills).
typedef Recommended = ({String basis, List<(JobSummary, SkillFit?)> items});

final recommendedJobsProvider = FutureProvider.autoDispose<Recommended?>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return null;
  return ref
      .read(apiClientProvider)
      .get(
        '/jobs/me/recommended',
        parse: (d) {
          final m = (d as Map?) ?? const {};
          return (
            basis: '${m['basis'] ?? 'none'}',
            items: [
              for (final j in (m['items'] as List? ?? const []))
                if (j is Map<String, Object?>)
                  (
                    JobSummary.fromJson(j),
                    switch (j['match']) {
                      {'matched': final num a, 'total': final num b} => (
                        matched: a.toInt(),
                        total: b.toInt(),
                      ),
                      _ => null,
                    },
                  ),
            ],
          );
        },
      );
});

/// The seeker's writes: applications taken back or revised, alerts kept.
final seekerActionsProvider = Provider<SeekerActions>(SeekerActions.new);

class SeekerActions {
  const SeekerActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _applicationsChanged() => _ref
    ..invalidate(ownApplicationsProvider)
    ..invalidate(workspaceProvider);

  void _alertsChanged() => _ref
    ..invalidate(jobAlertsProvider)
    ..invalidate(workspaceProvider);

  Future<void> withdraw(String applicationId) async {
    await _api.post<void>(
      '/jobs/me/applications/${Uri.encodeComponent(applicationId)}/withdraw',
    );
    _applicationsChanged();
  }

  /// Answers a reviewer who asked for changes, back to the queue. Without a
  /// CV, the one on file stays.
  Future<void> revise({
    required String applicationId,
    required String coverLetter,
    required String expectedSalary,
    PickedFile? cv,
    void Function(double progress)? onProgress,
  }) async {
    final payload = <String, Object?>{
      if (coverLetter.trim().isNotEmpty) 'coverLetter': coverLetter.trim(),
      if (expectedSalary.isNotEmpty) 'expectedSalary': expectedSalary,
    };
    final parts = cv == null ? null : await multipartParts([cv]);
    await _api.upload<void>(
      '/market/me/applications/${Uri.encodeComponent(applicationId)}',
      method: 'PATCH',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        if (parts != null) 'cv': parts().first,
      }),
      onProgress: onProgress,
    );
    _applicationsChanged();
  }

  Future<void> createAlert(String name, AlertQuery query) async {
    await _api.post<void>(
      '/jobs/me/alerts',
      body: {'name': name.trim(), 'query': query},
    );
    _alertsChanged();
  }

  Future<void> setAlertActive(String id, {required bool active}) async {
    await _api.patch<void>(
      '/jobs/me/alerts/${Uri.encodeComponent(id)}',
      body: {'active': active},
    );
    _alertsChanged();
  }

  Future<void> deleteAlert(String id) async {
    await _api.delete<void>('/jobs/me/alerts/${Uri.encodeComponent(id)}');
    _alertsChanged();
  }
}
