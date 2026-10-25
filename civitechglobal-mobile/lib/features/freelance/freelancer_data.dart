import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../design/widgets/attachments_field.dart';
import '../me/workspace_data.dart';
import 'freelance_data.dart';

/// The freelancer's side, and the contracts both sides share: proposals,
/// invitations, saved projects, project alerts and awards, as the web's
/// dashboard pages read them.

int? _int(Object? v) => v is num ? v.toInt() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// The stages a proposal is still in play at.
const activeBidStages = {'PENDING', 'SHORTLISTED', 'INTERVIEW'};

/// One of the freelancer's proposals, under its project:
/// `GET /work/me/proposals`.
class MyProposal {
  MyProposal.fromJson(Map<String, Object?> b)
    : bid = MyBid.fromJson(b),
      project = ProjectSummary.fromJson(_map(b['project'])),
      invited = b['invited'] == true,
      createdAt = _date(b['createdAt']),
      awardId = _text(_map(b['award'])['id']);

  final MyBid bid;
  final ProjectSummary project;
  final bool invited;
  final DateTime? createdAt;
  final String? awardId;

  /// Still in play: a stage that can move, on a project still open.
  bool get live =>
      activeBidStages.contains(bid.outcome) && project.state == 'OPEN';
}

final myProposalsProvider = FutureProvider.autoDispose<List<MyProposal>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/proposals',
        parse: (d) => [
          for (final b in (d as List? ?? const []))
            if (b is Map<String, Object?>) MyProposal.fromJson(b),
        ],
      );
});

/// An invitation to bid: `GET /work/me/invites`.
typedef ReceivedInvite = ({
  String id,
  String status,
  String? message,
  DateTime? createdAt,
  ProjectSummary project,
});

final myInvitesProvider = FutureProvider.autoDispose<List<ReceivedInvite>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/invites',
        parse: (d) => [
          for (final i in (d as List? ?? const []))
            if (i is Map)
              (
                id: '${i['id']}',
                status: '${i['status'] ?? 'PENDING'}',
                message: _text(i['message']),
                createdAt: _date(i['createdAt']),
                project: ProjectSummary.fromJson(_map(i['project'])),
              ),
        ],
      );
});

/// The projects the member bookmarked, newest saved first.
typedef SavedProject = ({DateTime? savedAt, ProjectSummary project});

final savedProjectsProvider = FutureProvider.autoDispose<List<SavedProject>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  // Saving or unsaving anywhere changes this list too.
  ref.watch(savedProjectIdsProvider);
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/saved-projects',
        parse: (d) => [
          for (final p in (d as List? ?? const []))
            if (p is Map<String, Object?>)
              (
                savedAt: _date(p['savedAt']),
                project: ProjectSummary.fromJson(p),
              ),
        ],
      );
});

/// A saved project search that notifies.
class ProjectAlert {
  ProjectAlert.fromJson(Map<Object?, Object?> a)
    : id = '${a['id']}',
      name = '${a['name'] ?? ''}',
      query = {
        for (final MapEntry(:key, :value)
            in ((a['query'] as Map?) ?? const {}).entries)
          if (value is String && value.isNotEmpty) '$key': value,
      },
      skills = [
        for (final s in (_map(a['query'])['skills'] as List? ?? const []))
          if (s is String) s,
      ],
      active = a['active'] != false,
      lastNotifiedAt = _date(a['lastNotifiedAt']);

  final String id;
  final String name;
  final Map<String, String> query;
  final List<String> skills;
  final bool active;
  final DateTime? lastNotifiedAt;
}

final projectAlertsProvider = FutureProvider.autoDispose<List<ProjectAlert>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/project-alerts',
        parse: (d) => [
          for (final a in (d as List? ?? const []))
            if (a is Map) ProjectAlert.fromJson(a),
        ],
      );
});

/// One step of a contract's plan.
typedef AwardMilestone = ({
  String id,
  String title,
  String? description,
  DateTime? dueDate,
  String status,
  String? deliveryNote,
  DateTime? deliveredAt,
  String? deliveryName,
  DateTime? approvedAt,
});

/// One logged week on an hourly contract.
typedef Timesheet = ({
  String id,
  DateTime? weekStart,
  int minutes,
  String memo,
  String status,
  String? clientNote,
});

/// A collaboration the member is part of, on either side:
/// `GET /market/me/awards`.
class AwardView {
  AwardView.fromJson(Map<String, Object?> v)
    : id = '${_map(v['award'])['id']}',
      status = '${_map(v['award'])['status'] ?? 'ACTIVE'}',
      agreedAmount = _text(_map(v['award'])['agreedAmount']),
      currency = '${_map(v['award'])['currency'] ?? 'IRT'}',
      disputeStatus = '${_map(v['award'])['disputeStatus'] ?? 'NONE'}',
      disputeReason = _text(_map(v['award'])['disputeReason']),
      hourly = _map(v['award'])['pricingType'] == 'HOURLY',
      hourlyRate = _text(_map(v['award'])['hourlyRate']),
      weeklyHourLimit = _int(_map(v['award'])['weeklyHourLimit']),
      kind = '${v['kind'] ?? 'project'}',
      code = '${_map(v['listing'])['code'] ?? ''}',
      title = '${_map(v['listing'])['title'] ?? ''}',
      mine = v['myRole'] == 'author',
      counterparty = _text(_map(v['counterpartyProfile'])['username']),
      counterpartyVerified = _map(v['counterpartyProfile'])['verified'] == true,
      counterpartyRating =
          (_map(v['counterpartyProfile'])['ratingAvg'] as num?)?.toDouble() ??
          0,
      counterpartyRatings =
          _int(_map(v['counterpartyProfile'])['ratingCount']) ?? 0,
      milestones = [
        for (final m in (v['milestones'] as List? ?? const []))
          if (m is Map)
            (
              id: '${m['id']}',
              title: '${m['title'] ?? ''}',
              description: _text(m['description']),
              dueDate: _date(m['dueDate']),
              status: '${m['status'] ?? 'PENDING'}',
              deliveryNote: _text(m['deliveryNote']),
              deliveredAt: _date(m['deliveredAt']),
              deliveryName: _text(m['deliveryOriginalName']),
              approvedAt: _date(m['approvedAt']),
            ),
      ],
      reviewed = v['myReview'] is Map,
      theirRating = _int(_map(v['theirReview'])['rating']),
      timesheets = [
        for (final t in (v['timesheets'] as List? ?? const []))
          if (t is Map)
            (
              id: '${t['id']}',
              weekStart: _date(t['weekStart']),
              minutes: _int(t['minutes']) ?? 0,
              memo: '${t['memo'] ?? ''}',
              status: '${t['status'] ?? 'SUBMITTED'}',
              clientNote: _text(t['clientNote']),
            ),
      ];

  final String id;

  /// ACTIVE, COMPLETED or CANCELLED.
  final String status;
  final String? agreedAmount;
  final String currency;

  /// NONE, OPEN or RESOLVED.
  final String disputeStatus;
  final String? disputeReason;
  final bool hourly;
  final String? hourlyRate;
  final int? weeklyHourLimit;

  /// job, project, service or book: where its listing lives.
  final String kind;
  final String code;
  final String title;

  /// The author's side: who gave the work out.
  final bool mine;
  final String? counterparty;
  final bool counterpartyVerified;
  final double counterpartyRating;
  final int counterpartyRatings;
  final List<AwardMilestone> milestones;
  final bool reviewed;
  final int? theirRating;
  final List<Timesheet> timesheets;

  bool get active => status == 'ACTIVE';

  String get listingPath => switch (kind) {
    'job' => '/jobs/$code',
    'service' => '/freelance-services/$code',
    'book' => '/books/$code',
    _ => '/projects/$code',
  };

  bool get allApproved =>
      milestones.isNotEmpty && milestones.every((m) => m.status == 'APPROVED');
}

final myAwardsProvider = FutureProvider.autoDispose<List<AwardView>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/awards',
        parse: (d) => [
          for (final v in (d as List? ?? const []))
            if (v is Map<String, Object?>) AwardView.fromJson(v),
        ],
      );
});

/// The Saturday a day's week starts on, which a timesheet is keyed by.
DateTime weekStartOf(DateTime day) {
  final d = DateTime.utc(day.year, day.month, day.day);
  return d.subtract(Duration(days: (d.weekday + 1) % 7));
}

/// The freelancer's writes, and the contract moves both sides make.
final freelancerActionsProvider = Provider<FreelancerActions>(
  FreelancerActions.new,
);

class FreelancerActions {
  const FreelancerActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  Future<void> withdraw(String bidId) async {
    await _api.post<void>(
      '/work/me/bids/${Uri.encodeComponent(bidId)}/withdraw',
    );
    _ref
      ..invalidate(myProposalsProvider)
      ..invalidate(workspaceProvider);
  }

  Future<void> declineInvite(String inviteId) async {
    await _api.post<void>(
      '/work/me/invites/${Uri.encodeComponent(inviteId)}/decline',
    );
    _ref.invalidate(myInvitesProvider);
  }

  Future<void> setAlertActive(String id, {required bool active}) async {
    await _api.patch<void>(
      '/work/me/project-alerts/${Uri.encodeComponent(id)}',
      body: {'active': active},
    );
    _ref.invalidate(projectAlertsProvider);
  }

  Future<void> deleteAlert(String id) async {
    await _api.delete<void>(
      '/work/me/project-alerts/${Uri.encodeComponent(id)}',
    );
    _ref.invalidate(projectAlertsProvider);
  }

  void _awardsChanged() => _ref
    ..invalidate(myAwardsProvider)
    ..invalidate(workspaceProvider);

  Future<void> addMilestone(
    String awardId,
    String title, {
    DateTime? dueDate,
  }) async {
    await _api.post<void>(
      '/market/me/awards/${Uri.encodeComponent(awardId)}/milestones',
      body: {
        'title': title.trim(),
        if (dueDate != null)
          'dueDate':
              '${dueDate.year.toString().padLeft(4, '0')}-'
              '${dueDate.month.toString().padLeft(2, '0')}-'
              '${dueDate.day.toString().padLeft(2, '0')}',
      },
    );
    _awardsChanged();
  }

  /// A milestone handed in, with a note and one file if given.
  Future<void> deliver(
    String milestoneId,
    String note, {
    PickedFile? attachment,
    void Function(double progress)? onProgress,
  }) async {
    final parts = attachment == null
        ? null
        : await multipartParts([attachment]);
    await _api.upload<void>(
      '/market/me/milestones/${Uri.encodeComponent(milestoneId)}/deliver',
      form: () => FormData.fromMap({
        'payload': jsonEncode({'deliveryNote': note.trim()}),
        if (parts != null) 'attachment': parts().first,
      }),
      onProgress: onProgress,
    );
    _awardsChanged();
  }

  Future<void> approve(String milestoneId) async {
    await _api.post<void>(
      '/market/me/milestones/${Uri.encodeComponent(milestoneId)}/approve',
    );
    _awardsChanged();
  }

  Future<void> complete(String awardId) async {
    await _api.post<void>(
      '/market/me/awards/${Uri.encodeComponent(awardId)}/complete',
    );
    _awardsChanged();
  }

  Future<void> dispute(String awardId, String reason) async {
    await _api.post<void>(
      '/market/me/awards/${Uri.encodeComponent(awardId)}/dispute',
      body: {'reason': reason.trim()},
    );
    _awardsChanged();
  }

  Future<void> review(String awardId, int rating, String text) async {
    await _api.post<void>(
      '/market/me/awards/${Uri.encodeComponent(awardId)}/review',
      body: {'rating': rating, if (text.trim().isNotEmpty) 'text': text.trim()},
    );
    _awardsChanged();
  }

  Future<void> logHours(
    String awardId, {
    required DateTime week,
    required int minutes,
    required String memo,
  }) async {
    final start = weekStartOf(week);
    await _api.post<void>(
      '/work/me/awards/${Uri.encodeComponent(awardId)}/timesheets',
      body: {
        'weekStart':
            '${start.year.toString().padLeft(4, '0')}-'
            '${start.month.toString().padLeft(2, '0')}-'
            '${start.day.toString().padLeft(2, '0')}',
        'minutes': minutes,
        'memo': memo.trim(),
      },
    );
    _awardsChanged();
  }

  Future<void> reviewTimesheet(
    String timesheetId,
    String decision, {
    String note = '',
  }) async {
    await _api.patch<void>(
      '/work/me/timesheets/${Uri.encodeComponent(timesheetId)}',
      body: {
        'decision': decision,
        if (decision == 'QUERIED') 'note': note.trim(),
      },
    );
    _awardsChanged();
  }
}
