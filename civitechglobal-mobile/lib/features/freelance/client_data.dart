import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../design/widgets/attachments_field.dart';
import '../me/workspace_data.dart';
import 'freelance_data.dart';

/// The client's side of the freelance board, as the web's ClientProjectsPage
/// and ProposalInbox read it: their own projects in every review state, the
/// pipeline across all of them, and each project's proposals.

int? _int(Object? v) => v is num ? v.toInt() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// The author's own project: `GET /market/me/projects`. The whole record is
/// kept for the form, which edits fields no card shows.
class OwnProject extends ProjectSummary {
  OwnProject.fromJson(super.p)
    : raw = p,
      description = '${p['description'] ?? ''}',
      moderationStatus = '${p['moderationStatus'] ?? 'DRAFT'}',
      reviewNote = _text(p['reviewNote']),
      createdAt = _date(p['createdAt']),
      viewCount = _int(p['viewCount']) ?? 0,
      unseenBids = _int(p['unseenBids']) ?? 0,
      screeningQuestions = [
        for (final q in (p['screeningQuestions'] as List? ?? const []))
          if (q is String) q,
      ],
      super.fromJson();

  final Map<String, Object?> raw;
  final String description;

  /// DRAFT, PENDING_REVIEW, APPROVED, CHANGES_REQUESTED or REJECTED.
  final String moderationStatus;
  final String? reviewNote;
  final DateTime? createdAt;
  final int viewCount;
  final int unseenBids;
  final List<String> screeningQuestions;

  bool get live => moderationStatus == 'APPROVED';

  /// The two states the server lets an author change and send again.
  bool get editable =>
      moderationStatus == 'DRAFT' || moderationStatus == 'CHANGES_REQUESTED';
}

final ownProjectsProvider = FutureProvider.autoDispose<List<OwnProject>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/projects',
        parse: (d) => [
          for (final p in (d as List? ?? const []))
            if (p is Map<String, Object?>) OwnProject.fromJson(p),
        ],
      );
});

/// Where all the client's projects stand: `GET /work/me/client-pipeline`.
typedef ClientPipeline = ({
  Map<String, int> projects,
  Map<String, int> bids,
  int unseenBids,
  int invites,
});

Map<String, int> _counts(Object? v) => {
  for (final MapEntry(:key, :value) in ((v as Map?) ?? const {}).entries)
    if (value is num) '$key': value.toInt(),
};

final clientPipelineProvider = FutureProvider.autoDispose<ClientPipeline?>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return null;
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/client-pipeline',
        parse: (d) {
          final m = _map(d);
          return (
            projects: _counts(m['projects']),
            bids: _counts(m['bids']),
            unseenBids: _int(m['unseenBids']) ?? 0,
            invites: _counts(m['invites']).values.fold(0, (a, b) => a + b),
          );
        },
      );
});

/// A proposal as the client's inbox shows it.
class InboxBid {
  InboxBid.fromJson(Map<String, Object?> b)
    : id = '${b['id']}',
      amount = '${b['amount'] ?? '0'}',
      currency = '${b['currency'] ?? 'IRT'}',
      deliveryDays = _int(b['deliveryDays']),
      message = '${b['message'] ?? ''}',
      isCompanyOffer = b['isCompanyOffer'] == true,
      attachmentName = _text(b['attachmentOriginalName']),
      outcome = '${b['outcome'] ?? 'PENDING'}',
      createdAt = _date(b['createdAt']),
      milestones = [
        for (final m in (b['milestones'] as List? ?? const []))
          if (m is Map)
            (
              title: '${m['title'] ?? ''}',
              amount: '${m['amount'] ?? ''}',
              days: _int(m['days']) ?? 1,
            ),
      ],
      screeningAnswers = [
        for (final a in (b['screeningAnswers'] as List? ?? const []))
          if (a is String) a,
      ],
      clientSeenAt = _date(b['clientSeenAt']),
      clientNote = _text(b['clientNote']),
      invited = b['invited'] == true,
      firstName = _text(_map(b['bidder'])['firstName']),
      lastName = _text(_map(b['bidder'])['lastName']),
      username = _text(_map(b['bidderProfile'])['username']),
      headline = _text(_map(b['bidderProfile'])['headline']),
      stats = switch (b['bidderStats']) {
        final Map<String, Object?> s => FreelancerStats.fromJson(s),
        _ => null,
      };

  final String id;
  final String amount;
  final String currency;
  final int? deliveryDays;
  final String message;

  /// The platform operator's own offer, which the client agreed to see.
  final bool isCompanyOffer;
  final String? attachmentName;

  /// PENDING, SHORTLISTED, INTERVIEW, ACCEPTED, DECLINED or WITHDRAWN.
  final String outcome;
  final DateTime? createdAt;
  final List<ProposedMilestone> milestones;
  final List<String> screeningAnswers;
  final DateTime? clientSeenAt;
  final String? clientNote;
  final bool invited;
  final String? firstName;
  final String? lastName;
  final String? username;
  final String? headline;
  final FreelancerStats? stats;

  String name(String companyOffer) => isCompanyOffer
      ? companyOffer
      : [firstName, lastName].whereType<String>().join(' ').trim().isEmpty
      ? '—'
      : [firstName, lastName].whereType<String>().join(' ');

  bool get decided => outcome == 'ACCEPTED' || outcome == 'WITHDRAWN';

  /// "Best match", as the web sorts it: the operator's offer first, then
  /// invited people, then the earned record.
  double get score =>
      (isCompanyOffer ? 100 : 0) +
      (invited ? 5 : 0) +
      (stats?.ratingAvg ?? 0) * 2 +
      (stats?.jobSuccess ?? 0) / 20 +
      (stats?.completed ?? 0) / 5;
}

final projectInboxProvider = FutureProvider.autoDispose
    .family<List<InboxBid>, String>(
      (ref, projectId) => ref
          .read(apiClientProvider)
          .get(
            '/market/me/projects/${Uri.encodeComponent(projectId)}/bids',
            parse: (d) => [
              for (final b in (d as List? ?? const []))
                if (b is Map<String, Object?>) InboxBid.fromJson(b),
            ],
          ),
    );

/// An invitation the client sent for one project.
typedef SentInvite = ({
  String id,
  String status,
  String? username,
  String? level,
  DateTime? createdAt,
});

final projectInvitesProvider = FutureProvider.autoDispose
    .family<List<SentInvite>, String>(
      (ref, projectId) => ref
          .read(apiClientProvider)
          .get(
            '/work/me/projects/${Uri.encodeComponent(projectId)}/invites',
            parse: (d) => [
              for (final i in (d as List? ?? const []))
                if (i is Map)
                  (
                    id: '${i['id']}',
                    status: '${i['status'] ?? 'PENDING'}',
                    username: _text(_map(i['profile'])['username']),
                    level: _text(_map(i['stats'])['level']),
                    createdAt: _date(i['createdAt']),
                  ),
            ],
          ),
    );

/// Who signed a project's NDA, and when.
typedef NdaSignature = ({String name, String? username, DateTime? signedAt});

final ndaSignaturesProvider = FutureProvider.autoDispose
    .family<List<NdaSignature>, String>(
      (ref, projectId) => ref
          .read(apiClientProvider)
          .get(
            '/work/me/projects/${Uri.encodeComponent(projectId)}/nda',
            parse: (d) => [
              for (final s in (d as List? ?? const []))
                if (s is Map)
                  (
                    name: '${s['signedName'] ?? ''}',
                    username: _text(_map(s['user'])['username']),
                    signedAt: _date(s['signedAt']),
                  ),
            ],
          ),
    );

/// The client's writes.
final clientActionsProvider = Provider<ClientActions>(ClientActions.new);

class ClientActions {
  const ClientActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _projectsChanged() => _ref
    ..invalidate(ownProjectsProvider)
    ..invalidate(clientPipelineProvider)
    ..invalidate(workspaceProvider);

  /// A new project, as a draft, with its files: multipart, as the web sends
  /// it. Returns the new project's id.
  Future<String> create(
    Map<String, Object?> payload, {
    List<PickedFile> attachments = const [],
    void Function(double progress)? onProgress,
  }) async {
    final parts = attachments.isEmpty
        ? null
        : await multipartParts(attachments);
    final id = await _api.upload<String>(
      '/market/me/projects',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        if (parts != null) 'attachments': parts(),
      }),
      onProgress: onProgress,
      parse: (d) => '${(d! as Map)['id']}',
    );
    _projectsChanged();
    return id;
  }

  Future<void> update(String projectId, Map<String, Object?> payload) async {
    await _api.patch<void>(
      '/market/me/projects/${Uri.encodeComponent(projectId)}',
      body: payload,
    );
    _projectsChanged();
  }

  Future<void> submit(String projectId) async {
    await _api.post<void>(
      '/market/me/projects/${Uri.encodeComponent(projectId)}/submit',
    );
    _projectsChanged();
  }

  Future<void> close(String projectId) async {
    await _api.post<void>(
      '/market/me/projects/${Uri.encodeComponent(projectId)}/close',
    );
    _projectsChanged();
  }

  void _inboxChanged(String projectId) => _ref
    ..invalidate(projectInboxProvider(projectId))
    ..invalidate(clientPipelineProvider)
    ..invalidate(ownProjectsProvider);

  /// PENDING (restore), SHORTLISTED, INTERVIEW or DECLINED.
  Future<void> setStage(String projectId, String bidId, String outcome) async {
    await _api.patch<void>(
      '/work/me/bids/${Uri.encodeComponent(bidId)}/stage',
      body: {'outcome': outcome},
    );
    _inboxChanged(projectId);
  }

  /// The client's private note on a proposal; blank clears it.
  Future<void> setNote(String bidId, String note) => _api.patch<void>(
    '/work/me/bids/${Uri.encodeComponent(bidId)}/note',
    body: {'note': note.trim().isEmpty ? null : note.trim()},
  );

  Future<void> hire(String projectId, String bidId) async {
    await _api.post<void>(
      '/market/me/bids/${Uri.encodeComponent(bidId)}/accept',
    );
    _inboxChanged(projectId);
    _ref.invalidate(workspaceProvider);
  }

  Future<void> invite(String projectId, String username, String message) async {
    await _api.post<void>(
      '/work/me/projects/${Uri.encodeComponent(projectId)}/invites',
      body: {
        'username': username.trim().replaceFirst(RegExp('^@'), ''),
        if (message.trim().isNotEmpty) 'message': message.trim(),
      },
    );
    _ref.invalidate(projectInvitesProvider(projectId));
  }

  Future<({List<int> bytes, String mimeType})> bidAttachment(String bidId) =>
      _api.download('/work/me/bids/${Uri.encodeComponent(bidId)}/attachment');
}
