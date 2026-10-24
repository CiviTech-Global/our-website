import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../me/workspace_data.dart';
import 'jobs_data.dart';

/// The employer's side of the board, as the web's MyJobsPage reads it: their
/// own postings in every review state, where each one's applicants stand, and
/// the applicants themselves.

int? _int(Object? v) => v is num ? v.toInt() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// One of the employer's own postings: `GET /market/me/jobs`.
///
/// The posting itself has the board's field names, so it reads as a
/// [JobSummary] and every place, pay and deadline line is said the same way.
/// Drafts are here too, which the board never shows: this is the only place
/// the review state reaches the person it concerns.
class OwnJob {
  OwnJob.fromJson(Map<String, Object?> j)
    : posting = JobSummary.fromJson(j),
      moderationStatus = '${j['moderationStatus'] ?? 'DRAFT'}',
      state = '${j['state'] ?? 'OPEN'}',
      reviewNote = _text(j['reviewNote']),
      createdAt = _date(j['createdAt']),
      viewCount = _int(j['viewCount']) ?? 0,
      applicationCount = _int((j['_count'] as Map?)?['applications']) ?? 0;

  final JobSummary posting;

  /// DRAFT, PENDING_REVIEW, APPROVED, CHANGES_REQUESTED or REJECTED.
  final String moderationStatus;

  /// OPEN, CLOSED or AWARDED.
  final String state;
  final String? reviewNote;
  final DateTime? createdAt;
  final int viewCount;

  /// Every application, reviewed or not: the count before the pipeline's.
  final int applicationCount;

  String get id => posting.id;
  String get code => posting.code;
  String get title => posting.title;

  bool get approved => moderationStatus == 'APPROVED';

  /// The two states the server lets an author change and send again.
  bool get editable =>
      moderationStatus == 'DRAFT' || moderationStatus == 'CHANGES_REQUESTED';

  bool get closable => approved && state == 'OPEN';
}

final ownJobsProvider = FutureProvider.autoDispose<List<OwnJob>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/jobs',
        parse: (d) => [
          for (final j in (d as List? ?? const []))
            if (j is Map<String, Object?>) OwnJob.fromJson(j),
        ],
      );
});

/// Where one posting's reviewed applicants stand: `GET /jobs/me/pipeline`.
/// Withdrawn ones are left out of [total]; [unseen] is how many the employer
/// has not opened yet.
typedef Pipeline = ({int total, int unseen, Map<String, int> byOutcome});

Map<String, Pipeline> parsePipelines(Object? d) => {
  for (final MapEntry(:key, :value) in ((d as Map?) ?? const {}).entries)
    if (value is Map)
      '$key': (
        total: _int(value['total']) ?? 0,
        unseen: _int(value['unseen']) ?? 0,
        byOutcome: {
          for (final MapEntry(:key, :value)
              in ((value['byOutcome'] as Map?) ?? const {}).entries)
            if (value is num) '$key': value.toInt(),
        },
      ),
};

/// Per posting id; empty on the old board, which has no pipeline.
final pipelineProvider = FutureProvider.autoDispose<Map<String, Pipeline>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const {};
  final caps = await ref.watch(capabilitiesProvider.future);
  if (!caps.feature('jobsV2')) return const {};
  return ref
      .read(apiClientProvider)
      .get('/jobs/me/pipeline', parse: parsePipelines);
});

/// Somebody who applied, as the employer sees them:
/// `GET /market/me/jobs/:id/applications`. Reviewed applications only.
class EmployerApplication {
  EmployerApplication.fromJson(Map<Object?, Object?> a)
    : id = '${a['id']}',
      firstName = '${(a['applicant'] as Map?)?['firstName'] ?? ''}',
      lastName = '${(a['applicant'] as Map?)?['lastName'] ?? ''}',
      email = _text((a['applicant'] as Map?)?['email']),
      username = _text((a['applicantProfile'] as Map?)?['username']),
      verified = (a['applicantProfile'] as Map?)?['verified'] == true,
      ratingAvg =
          ((a['applicantProfile'] as Map?)?['ratingAvg'] as num?)?.toDouble() ??
          0,
      ratingCount = _int((a['applicantProfile'] as Map?)?['ratingCount']) ?? 0,
      outcome = '${a['outcome'] ?? 'PENDING'}',
      coverLetter = _text(a['coverLetter']),
      expectedSalary = _text(a['expectedSalary']),
      cvOriginalName = _text(a['cvOriginalName']),
      employerNote = _text(a['employerNote']),
      createdAt = _date(a['createdAt']),
      employerSeenAt = _date(a['employerSeenAt']),
      skillFit = switch (a['skillMatch']) {
        {'matched': final num m, 'total': final num t} when t > 0 => (
          matched: m.toInt(),
          total: t.toInt(),
        ),
        _ => null,
      };

  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? username;
  final bool verified;
  final double ratingAvg;
  final int ratingCount;

  /// PENDING, SHORTLISTED, INTERVIEW, ACCEPTED, DECLINED or WITHDRAWN.
  final String outcome;
  final String? coverLetter;
  final String? expectedSalary;
  final String? cvOriginalName;
  final String? employerNote;
  final DateTime? createdAt;

  /// Null when this list is the first time the employer has it in front of
  /// them: the server marks it seen as it answers, so "new" is read from
  /// what it said before that.
  final DateTime? employerSeenAt;
  final ({int matched, int total})? skillFit;

  String get name => '$firstName $lastName'.trim();

  bool get withdrawn => outcome == 'WITHDRAWN';

  bool get isNew => employerSeenAt == null && !withdrawn;
}

final jobApplicantsProvider = FutureProvider.autoDispose
    .family<List<EmployerApplication>, String>((ref, jobId) async {
      final list = await ref
          .read(apiClientProvider)
          .get(
            '/market/me/jobs/${Uri.encodeComponent(jobId)}/applications',
            parse: (d) => [
              for (final a in (d as List? ?? const []))
                if (a is Map) EmployerApplication.fromJson(a),
            ],
          );
      // Opening the list marked them seen: the counts elsewhere move with it.
      ref.invalidate(pipelineProvider);
      return list;
    });

/// The employer's writes. Each one refreshes what it changes.
final employerActionsProvider = Provider<EmployerActions>(EmployerActions.new);

class EmployerActions {
  const EmployerActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _postingsChanged() => _ref
    ..invalidate(ownJobsProvider)
    ..invalidate(ownJobCodesProvider)
    ..invalidate(workspaceProvider);

  Future<void> submit(String jobId) async {
    await _api.post<void>(
      '/market/me/jobs/${Uri.encodeComponent(jobId)}/submit',
    );
    _postingsChanged();
  }

  Future<void> close(String jobId) async {
    await _api.post<void>(
      '/market/me/jobs/${Uri.encodeComponent(jobId)}/close',
    );
    _postingsChanged();
  }

  /// SHORTLISTED, INTERVIEW, ACCEPTED or DECLINED. Accepting the last
  /// opening closes the posting, so the postings refresh too.
  Future<void> setOutcome(
    String jobId,
    String applicationId,
    String outcome,
  ) async {
    await _api.patch<void>(
      '/market/me/applications/${Uri.encodeComponent(applicationId)}/outcome',
      body: {'outcome': outcome},
    );
    _ref
      ..invalidate(jobApplicantsProvider(jobId))
      ..invalidate(pipelineProvider);
    if (outcome == 'ACCEPTED') _postingsChanged();
  }

  /// The employer's private note on a candidate; never shown to them.
  Future<void> saveNote(String applicationId, String note) => _api.patch<void>(
    '/jobs/me/applications/${Uri.encodeComponent(applicationId)}/note',
    body: {'note': note.trim()},
  );

  Future<({List<int> bytes, String mimeType})> cv(String applicationId) =>
      _api.download(
        '/market/me/applications/${Uri.encodeComponent(applicationId)}/cv',
      );
}
